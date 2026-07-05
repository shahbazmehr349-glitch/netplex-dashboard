const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const QRCode = require('qrcode');
const P = require('pino');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../db');

// In-memory store of active connections: profileId -> { sock, qr, status, phone }
const connections = {};

function getSessionPath(profileId) {
  return path.join(__dirname, '..', '..', 'sessions', profileId);
}

async function getAIReply(profile, incomingMessage, customerPhone) {
  try {
    const genAI = new GoogleGenerativeAI(profile.gemini_api_key);
    const modelName = profile.gemini_model === 'gemini-flash-lite' ? 'gemini-1.5-flash' : (profile.gemini_model || 'gemini-1.5-flash');
    const model = genAI.getGenerativeModel({ model: modelName });

    const systemPrompt = profile.manual_prompt || 'Aap ek helpful customer support agent hain.';

    const convResult = await db.query(
      'SELECT id, human_takeover FROM conversations WHERE profile_id=$1 AND customer_phone=$2',
      [profile.profile_id, customerPhone]
    );
    let conversationId;
    if (convResult.rows.length === 0) {
      const insert = await db.query(
        'INSERT INTO conversations (profile_id, customer_phone, last_message, last_message_time) VALUES ($1,$2,$3,NOW()) RETURNING id',
        [profile.profile_id, customerPhone, incomingMessage]
      );
      conversationId = insert.rows[0].id;
    } else {
      conversationId = convResult.rows[0].id;
      if (convResult.rows[0].human_takeover) {
        return null;
      }
    }

    await db.query('INSERT INTO messages (conversation_id, direction, content) VALUES ($1,$2,$3)', [conversationId, 'in', incomingMessage]);

    const prompt = `${systemPrompt}\n\nCustomer ka message: "${incomingMessage}"\n\nAapka jawab (short, 2-3 sentences, Roman Urdu mein):`;
    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    await db.query('INSERT INTO messages (conversation_id, direction, content) VALUES ($1,$2,$3)', [conversationId, 'out', reply]);
    await db.query('UPDATE conversations SET last_message=$1, last_message_time=NOW(), updated_at=NOW() WHERE id=$2', [reply, conversationId]);

    if (reply.includes('[ASK_ADMIN]')) {
      await db.query('INSERT INTO pending_actions (profile_id, customer_phone, reason) VALUES ($1,$2,$3)',
        [profile.profile_id, customerPhone, 'Bot needs admin input for this query']);
    }

    return reply.replace(/\[ASK_ADMIN\]/g, '').replace(/\[REGISTER_COMPLAINT:.*?\]/g, '').replace(/\[NEW_CONNECTION:.*?\]/g, '').trim();
  } catch (err) {
    console.error('AI reply error:', err.message);
    return 'Maazrat, kuch technical masla ho gaya hai. Thodi dair mein dobara koshish karein.';
  }
}

async function startConnection(profileId, onQR, onStatusChange) {
  const sessionPath = getSessionPath(profileId);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
  });

  connections[profileId] = { sock, qr: null, status: 'connecting', phone: null };

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const qrImage = await QRCode.toDataURL(qr);
      connections[profileId].qr = qrImage;
      connections[profileId].status = 'qr_ready';
      if (onQR) onQR(qrImage);
      if (onStatusChange) onStatusChange('qr_ready');
    }

    if (connection === 'close') {
      const shouldReconnect = new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      connections[profileId].status = 'disconnected';
      if (onStatusChange) onStatusChange('disconnected');
      await db.query('UPDATE profiles SET whatsapp_status=$1 WHERE profile_id=$2', ['disconnected', profileId]);

      if (shouldReconnect) {
        startConnection(profileId, onQR, onStatusChange);
      }
    } else if (connection === 'open') {
      const phone = sock.user?.id?.split(':')[0] || 'unknown';
      connections[profileId].status = 'connected';
      connections[profileId].phone = phone;
      connections[profileId].qr = null;
      if (onStatusChange) onStatusChange('connected', phone);
      await db.query('UPDATE profiles SET whatsapp_status=$1, whatsapp_number=$2 WHERE profile_id=$3', ['connected', phone, profileId]);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const customerPhone = msg.key.remoteJid.split('@')[0];
    const incomingText = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (!incomingText) return;

    const blacklisted = await db.query('SELECT id FROM blacklist WHERE profile_id=$1 AND phone_number=$2', [profileId, customerPhone]);
    if (blacklisted.rows.length > 0) return;

    const profileResult = await db.query('SELECT * FROM profiles WHERE profile_id=$1', [profileId]);
    const profile = profileResult.rows[0];
    if (!profile || !profile.bot_active) return;

    const reply = await getAIReply(profile, incomingText, customerPhone);
    if (reply) {
      const settingsResult = await db.query('SELECT reply_delay_min, reply_delay_max FROM profile_settings WHERE profile_id=$1', [profileId]);
      const { reply_delay_min = 2, reply_delay_max = 5 } = settingsResult.rows[0] || {};
      const delay = (Math.random() * (reply_delay_max - reply_delay_min) + reply_delay_min) * 1000;
      setTimeout(async () => {
        await sock.sendMessage(msg.key.remoteJid, { text: reply });
      }, delay);
    }
  });

  return sock;
}

function getConnection(profileId) {
  return connections[profileId] || null;
}

async function logout(profileId) {
  const conn = connections[profileId];
  if (conn?.sock) {
    await conn.sock.logout().catch(() => {});
  }
  delete connections[profileId];
  await db.query('UPDATE profiles SET whatsapp_status=$1, whatsapp_number=NULL WHERE profile_id=$2', ['disconnected', profileId]);
}

module.exports = { startConnection, getConnection, logout };
