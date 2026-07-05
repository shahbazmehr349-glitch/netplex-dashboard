const router = require('express').Router({ mergeParams: true });
const auth = require('../middleware/auth');
const wa = require('../services/whatsapp');

// POST /api/profiles/:id/whatsapp/connect - start a new connection, generates QR
router.post('/:id/whatsapp/connect', auth, async (req, res) => {
  const profileId = req.params.id;
  try {
    const existing = wa.getConnection(profileId);
    if (existing && existing.status === 'connected') {
      return res.json({ status: 'connected', phone: existing.phone });
    }
    await wa.startConnection(profileId);
    res.json({ status: 'connecting', message: 'QR code generate ho raha hai, /qr endpoint poll karein' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start WhatsApp connection' });
  }
});

// GET /api/profiles/:id/whatsapp/qr - poll this until QR is ready
router.get('/:id/whatsapp/qr', auth, async (req, res) => {
  const conn = wa.getConnection(req.params.id);
  if (!conn) return res.status(404).json({ error: 'No active connection. Call /connect first.' });
  if (conn.status === 'connected') return res.json({ status: 'connected', phone: conn.phone });
  if (conn.qr) return res.json({ status: 'qr_ready', qr: conn.qr });
  res.json({ status: conn.status || 'connecting' });
});

// GET /api/profiles/:id/whatsapp/status
router.get('/:id/whatsapp/status', auth, async (req, res) => {
  const conn = wa.getConnection(req.params.id);
  if (!conn) return res.json({ status: 'disconnected' });
  res.json({ status: conn.status, phone: conn.phone });
});

// POST /api/profiles/:id/whatsapp/logout
router.post('/:id/whatsapp/logout', auth, async (req, res) => {
  try {
    await wa.logout(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to logout' });
  }
});

module.exports = router;
