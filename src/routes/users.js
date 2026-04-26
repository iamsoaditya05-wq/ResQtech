const express = require('express');
const router  = express.Router();

const DEMO = () => process.env.DEMO_MODE === 'true';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// GET /api/users
router.get('/', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      let list = [...state.users];
      if (req.query.role) list = list.filter((u) => u.role === req.query.role);
      return res.json({ data: list });
    }

    const { query } = require('../db');
    let q = (sb) => sb.from('users').select('*').order('name');
    if (req.query.role) {
      q = (sb) => sb.from('users').select('*').eq('role', req.query.role).order('name');
    }
    const data = await query(q);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      const user = state.users.find((u) => u.id === req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json(user);
    }

    const { query } = require('../db');
    const [user] = await query((sb) =>
      sb.from('users').select('*').eq('id', req.params.id).limit(1)
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// POST /api/users
router.post('/', async (req, res, next) => {
  try {
    const { name, phone, role } = req.body;
    if (!name || !phone || !role) {
      return res.status(400).json({ error: 'name, phone, and role are required' });
    }

    if (DEMO()) {
      const { state } = require('../mockData');
      const user = { id: uid(), ...req.body };
      state.users.push(user);

      // If responder, add to respondersLive
      if (role === 'responder') {
        state.respondersLive.push({
          user_id:      user.id,
          name:         user.name,
          vehicle_type: user.vehicle_type || 'bike',
          lat:          0,
          lng:          0,
          is_available: true,
          last_seen:    new Date().toISOString(),
        });
      }

      return res.status(201).json(user);
    }

    const { query } = require('../db');
    const [created] = await query((sb) =>
      sb.from('users').insert(req.body).select()
    );
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id
router.patch('/:id', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      const user = state.users.find((u) => u.id === req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      Object.assign(user, req.body);
      return res.json(user);
    }

    const { query } = require('../db');
    const [updated] = await query((sb) =>
      sb.from('users').update(req.body).eq('id', req.params.id).select()
    );
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
