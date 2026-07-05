const router = require('express').Router({ mergeParams: true });
const db = require('../db');
const auth = require('../middleware/auth');

// ==================== CONVERSATIONS ====================

router.get('/:id/conversations', auth, async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  try {
    let q = `SELECT * FROM conversations WHERE profile_id=$1 AND archived=false`;
    const params = [req.params.id];
    if (search) { q += ` AND (customer_phone ILIKE $2 OR last_message ILIKE $2)`; params.push(`%${search}%`); }
    q += ` ORDER BY updated_at DESC LIMIT ${limit} OFFSET ${offset}`;
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id/conversations/:phone', auth, async (req, res) => {
  try {
    const conv = await db.query('SELECT * FROM conversations WHERE profile_id=$1 AND customer_phone=$2', [req.params.id, req.params.phone]);
    if (!conv.rows.length) return res.status(404).json({ error: 'Not found' });
    const msgs = await db.query('SELECT * FROM messages WHERE conversation_id=$1 ORDER BY timestamp ASC', [conv.rows[0].id]);
    res.json({ conversation: conv.rows[0], messages: msgs.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/conversations/:phone/takeover', auth, async (req, res) => {
  const { active } = req.body;
  try {
    await db.query('UPDATE conversations SET human_takeover=$1, updated_at=NOW() WHERE profile_id=$2 AND customer_phone=$3', [active, req.params.id, req.params.phone]);
    res.json({ success: true, human_takeover: active });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/conversations/archive-all', auth, async (req, res) => {
  try {
    await db.query('UPDATE conversations SET archived=true WHERE profile_id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ==================== RECORDS ====================

router.get('/:id/records', auth, async (req, res) => {
  const { status } = req.query;
  try {
    let q = 'SELECT * FROM records WHERE profile_id=$1';
    const params = [req.params.id];
    if (status) { q += ' AND status=$2'; params.push(status); }
    q += ' ORDER BY created_at DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id/records/:recordId', auth, async (req, res) => {
  const { status } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE records SET status=$1, updated_at=NOW() WHERE id=$2 AND profile_id=$3 RETURNING *',
      [status, req.params.recordId, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id/records/export', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM records WHERE profile_id=$1 ORDER BY created_at DESC', [req.params.id]);
    const csv = ['ID,Customer Phone,Username,Area,Issue,Status,Created At',
      ...rows.map(r => `${r.id},${r.customer_phone},${r.username},${r.area},"${r.issue}",${r.status},${r.created_at}`)
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=records.csv');
    res.send(csv);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ==================== PENDING ACTIONS ====================

router.get('/:id/pending-actions', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM pending_actions WHERE profile_id=$1 AND resolved=false ORDER BY created_at ASC',
      [req.params.id]
    );
    const withWait = rows.map(r => ({
      ...r,
      wait_minutes: Math.floor((Date.now() - new Date(r.created_at).getTime()) / 60000)
    }));
    res.json(withWait);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id/pending-actions/:actionId', auth, async (req, res) => {
  try {
    await db.query('UPDATE pending_actions SET resolved=true WHERE id=$1 AND profile_id=$2', [req.params.actionId, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ==================== AUTO FORWARD RULES ====================

router.get('/:id/auto-forward', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM auto_forward_rules WHERE profile_id=$1', [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/auto-forward', auth, async (req, res) => {
  const { tag_name, tag_keyword, destination_group } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO auto_forward_rules (profile_id, tag_name, tag_keyword, destination_group) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, tag_name, tag_keyword, destination_group]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id/auto-forward/:ruleId', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM auto_forward_rules WHERE id=$1 AND profile_id=$2', [req.params.ruleId, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ==================== BLACKLIST ====================

router.get('/:id/blacklist', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM blacklist WHERE profile_id=$1', [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/blacklist', auth, async (req, res) => {
  const { phone_number, reason } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO blacklist (profile_id, phone_number, reason) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, phone_number, reason]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id/blacklist/:entryId', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM blacklist WHERE id=$1 AND profile_id=$2', [req.params.entryId, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ==================== KNOWLEDGE DB ====================

router.get('/:id/knowledge', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM knowledge_entries WHERE profile_id=$1 ORDER BY created_at DESC', [req.params.id]);
    res.json({ auto: rows.filter(r => r.entry_type === 'auto'), taught: rows.filter(r => r.entry_type === 'taught') });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/knowledge', auth, async (req, res) => {
  const { entry_type, question, answer } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO knowledge_entries (profile_id, entry_type, question, answer) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, entry_type || 'taught', question, answer]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id/knowledge/:entryId', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM knowledge_entries WHERE id=$1 AND profile_id=$2', [req.params.entryId, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ==================== BILLING AUDIT ====================

router.get('/:id/billing/audit', auth, async (req, res) => {
  const { start_date, end_date, action_type, username } = req.query;
  try {
    let q = 'SELECT * FROM billing_audit WHERE profile_id=$1';
    const params = [req.params.id];
    if (start_date) { params.push(start_date); q += ` AND created_at >= $${params.length}`; }
    if (end_date) { params.push(end_date); q += ` AND created_at <= $${params.length}`; }
    if (action_type) { params.push(action_type); q += ` AND action_type = $${params.length}`; }
    if (username) { params.push(`%${username}%`); q += ` AND username ILIKE $${params.length}`; }
    q += ' ORDER BY created_at DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id/billing/audit/export', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM billing_audit WHERE profile_id=$1 ORDER BY created_at DESC', [req.params.id]);
    const csv = ['Timestamp,Admin,Action,Username,Old Expiry,New Expiry,Amount,Old Package,New Package,Notes,Status',
      ...rows.map(r => `${r.created_at},${r.admin_phone},${r.action_type},${r.username},${r.old_expiry},${r.new_expiry},${r.amount},${r.package_old},${r.package_new},"${r.notes}",${r.status}`)
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=billing-audit.csv');
    res.send(csv);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
