const express = require('express');
const router  = express.Router();

const DEMO = () => process.env.DEMO_MODE === 'true';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// GET /api/notifications
router.get('/', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      let list = [...state.notifications];

      if (req.query.user_id) list = list.filter((n) => n.user_id === req.query.user_id);
      if (req.query.type)    list = list.filter((n) => n.type    === req.query.type);
      if (req.query.unread === 'true') list = list.filter((n) => !n.read);

      list.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));

      const page  = parseInt(req.query.page  || '1', 10);
      const limit = parseInt(req.query.limit || '50', 10);
      const start = (page - 1) * limit;

      return res.json({ data: list.slice(start, start + limit), total: list.length });
    }

    const { query } = require('../db');
    const data = await query((sb) =>
      sb.from('notifications').select('*').order('sent_at', { ascending: false }).limit(100)
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications
router.post('/', async (req, res, next) => {
  try {
    const { user_id, type, message, channel, payload } = req.body;
    if (!type || !message) {
      return res.status(400).json({ error: 'type and message are required' });
    }

    const io = req.app.get('io');
    const notif = {
      id:      uid(),
      user_id: user_id || null,
      type,
      message,
      payload: payload || {},
      channel: channel || 'push',
      sent_at: new Date().toISOString(),
      read:    false,
    };

    if (DEMO()) {
      const { state } = require('../mockData');
      state.notifications.unshift(notif);
    } else {
      const { query } = require('../db');
      await query((sb) => sb.from('notifications').insert(notif));
    }

    io?.emit('notification:new', notif);
    res.status(201).json(notif);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      const notif = state.notifications.find((n) => n.id === req.params.id);
      if (!notif) return res.status(404).json({ error: 'Notification not found' });
      notif.read = true;
      return res.json(notif);
    }

    const { query } = require('../db');
    const [updated] = await query((sb) =>
      sb.from('notifications').update({ read: true }).eq('id', req.params.id).select()
    );
    if (!updated) return res.status(404).json({ error: 'Notification not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/read-all
router.post('/read-all', async (req, res, next) => {
  try {
    const { user_id } = req.body;

    if (DEMO()) {
      const { state } = require('../mockData');
      state.notifications
        .filter((n) => !user_id || n.user_id === user_id)
        .forEach((n) => { n.read = true; });
      return res.json({ success: true });
    }

    const { query } = require('../db');
    let q = (sb) => sb.from('notifications').update({ read: true }).eq('read', false);
    if (user_id) {
      q = (sb) => sb.from('notifications').update({ read: true }).eq('user_id', user_id).eq('read', false);
    }
    await query(q);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      const idx = state.notifications.findIndex((n) => n.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Notification not found' });
      state.notifications.splice(idx, 1);
      return res.json({ success: true });
    }

    const { query } = require('../db');
    await query((sb) => sb.from('notifications').delete().eq('id', req.params.id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
