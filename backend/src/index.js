require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Prevent WhatsApp library errors (or any unexpected async error) from crashing the entire server
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception (server stays alive):', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection (server stays alive):', reason);
});

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/profiles', require('./routes/dashboard'));
app.use('/api/profiles', require('./routes/whatsapp'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Internal server error' }); });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 NetPlex backend running on port ${PORT}`);
  // Resume any WhatsApp sessions that were connected before this restart
  require('./services/whatsapp').resumeAllConnections();
});
