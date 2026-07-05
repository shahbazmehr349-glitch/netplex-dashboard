const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    const { rows } = await db.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: rows[0].id, username: rows[0].username, role: rows[0].role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: rows[0].id, username: rows[0].username, role: rows[0].role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  const { rows } = await db.query('SELECT id, username, role FROM admin_users WHERE id = $1', [req.user.id]);
  res.json(rows[0]);
});

module.exports = router;
