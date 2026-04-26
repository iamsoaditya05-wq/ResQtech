const express = require('express');
const router  = express.Router();
const { state, uid } = require('../mockData');
const { asyncHandler } = require('../middleware/errorHandler');
const { query }        = require('../db');

const DEMO = () => process.env.DEMO_MODE === 'true';

function emit(req, event, data) {
  const io = req.app.get('io');
  if (io) io.emit(event, data);
}

// ── GET /api/notifications ────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  if (DEMO()) {
    let notifs = [...state.notifications].sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
    if (req.query.unread === 'true') notifs = notifs.filter((n) => !n.read);
    return res.json({ data: notifs, count: notifs.length, unread: notifs.filter((n) => !n.read).length });
  }

  const data = await query((sb) =>
    sb.from('notifications').select('*').order('sent_at', { ascending: false }).limit(100)
  );
  const unread = data.filter((n) => !n.read).length;
  res.json({ data, count: data.length, unread });
}));

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────
router.patch('/:id/read', asyncHandler(async (req, res) => {
  if (DEMO()) {
    const n = state.notifications.find((n) => n.id === req.params.id);
    if (!n) return res.status(404).json({ error: 'Notification not found' });
    n.read = true;
    return res.json({ data: n });
  }

  const data = await query((sb) =>
    sb.from('notifications').update({ read: true }).eq('id', req.params.id).select().single()
  );
  res.json({ data });
}));

// ── POST /api/notifications/read-all ─────────────────────────────────────────
router.post('/read-all', asyncHandler(async (req, res) => {
  if (DEMO()) {
    state.notifications.forEach((n) => (n.read = true));
    return res.json({ message: 'All notifications marked read' });
  }

  await query((sb) => sb.from('notifications').update({ read: true }).eq('read', false));
  res.json({ message: 'All notifications marked read' });
}));

// ── DELETE /api/notifications/:id ────────────────────────────────────────────
router.delete('/:id', asyncHandler(async (req, res) => {
  if (DEMO()) {
    const idx = state.notifications.findIndex((n) => n.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Notification not found' });
    state.notifications.splice(idx, 1);
    return res.json({ message: 'Deleted' });
  }

  await query((sb) => sb.from('notifications').delete().eq('id', req.params.id));
  res.json({ message: 'Deleted' });
}));

// ── POST /api/notifications ───────────────────────────────────────────────────
router.post('/', asyncHandler(async (req, res) => {
  const { user_id, type, message, payload, channel = 'push' } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  const notif = {
    id:      uid(),
    user_id: user_id || null,
    type:    type || 'system',
    message,
    payload: payload || {},
    channel,
    sent_at: new Date().toISOString(),
    read:    false,
  };

  if (DEMO()) {
    state.notifications.unshift(notif);
  } else {
    await query((sb) => sb.from('notifications').insert(notif));
  }

  emit(req, 'notification:new', notif);
  res.status(201).json({ data: notif });
}));

module.exports = router;
