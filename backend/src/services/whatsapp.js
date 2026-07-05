const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const QRCode = require('qrcode');
const P = require('pino');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../db');

const connections = {};

function getSessionPath(profileId) {
  return path.join(__dirname, '..', '..', 'sessions', profileId);
}

async function
