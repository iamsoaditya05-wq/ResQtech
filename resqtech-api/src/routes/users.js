const express = require('express');
const router  = express.Router();
const { state, uid } = require('../mockData');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate }     = require('../middleware/validate');
const { query }        = require('../db');

const DEMO = () => process.env.DEMO_MODE === 'true';

// ── GET /api/users ────────────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  if (DEMO()) {
    let users = state.users;
    if (req.query.role) users = users.filter((u) => u.role === req.query.role);
    return res.json({ data: users, count: users.length });
  }

  let q = (sb) => sb.from('users').select('id,name,phone,role,is_trained,vehicle_type,created_at').order('name');
  if (req.query.role) {
    q = (sb) => sb.from('users').select('id,name,phone,role,is_trained,vehicle_type,created_at').eq('role', req.query.role).order('name');
  }
  const data = await query(q);
  res.json({ data, count: data.length });
}));

// ── GET /api/users/:id ────────────────────────────────────────────────────────
router.get('/:id', asyncHandler(async (req, res) => {
  if (DEMO()) {
    const u = state.users.find((u) => u.id === req.params.id);
    if (!u) return res.status(404).json({ error: 'User not found' });
    return res.json({ data: u });
  }

  const data = await query((sb) =>
    sb.from('users').select('*').eq('id', req.params.id).single()
  );
  res.json({ data });
}));

// ── POST /api/users — register a new responder ────────────────────────────────
router.post('/',
  validate({ name: 'string', phone: 'string' }),
  asyncHandler(async (req, res) => {
    const { name, phone, role = 'responder', vehicle_type = 'bike', lat, lng } = req.body;

    const newUser = {
      id:           uid(),
      name,
      phone,
      role,
      is_trained:   false,
      vehicle_type,
      created_at:   new Date().toISOString(),
    };

    if (DEMO()) {
      // Check duplicate phone
      if (state.users.find((u) => u.phone === phone)) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }
      state.users.push(newUser);

      // Add to respondersLive if responder
      if (role === 'responder') {
        state.respondersLive.push({
          user_id:      newUser.id,
          name,
          vehicle_type,
          lat:          lat ? parseFloat(lat) : 18.5204,
          lng:          lng ? parseFloat(lng) : 73.8567,
          is_available: false,
          last_seen:    new Date().toISOString(),
        });
      }
      return res.status(201).json({ data: newUser });
    }

    // Live mode — check duplicate
    const existing = await query((sb) => sb.from('users').select('id').eq('phone', phone));
    if (existing.length) return res.status(409).json({ error: 'Phone number already registered' });

    await query((sb) => sb.from('users').insert(newUser));

    if (role === 'responder') {
      await query((sb) => sb.from('responders_live').insert({
        user_id:      newUser.id,
        name,
        vehicle_type,
        lat:          lat ? parseFloat(lat) : 18.5204,
        lng:          lng ? parseFloat(lng) : 73.8567,
        is_available: false,
        last_seen:    new Date().toISOString(),
      }));
    }

    res.status(201).json({ data: newUser });
  })
);

// ── PATCH /api/users/:id ──────────────────────────────────────────────────────
router.patch('/:id', asyncHandler(async (req, res) => {
  const allowed = ['name', 'vehicle_type', 'is_trained'];
  const updates = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  if (DEMO()) {
    const u = state.users.find((u) => u.id === req.params.id);
    if (!u) return res.status(404).json({ error: 'User not found' });
    Object.assign(u, updates);
    // Sync name/vehicle to respondersLive
    const r = state.respondersLive.find((r) => r.user_id === req.params.id);
    if (r) {
      if (updates.name)         r.name         = updates.name;
      if (updates.vehicle_type) r.vehicle_type = updates.vehicle_type;
    }
    return res.json({ data: u });
  }

  const data = await query((sb) =>
    sb.from('users').update(updates).eq('id', req.params.id).select().single()
  );
  if (updates.name || updates.vehicle_type) {
    const liveUpdates = {};
    if (updates.name)         liveUpdates.name         = updates.name;
    if (updates.vehicle_type) liveUpdates.vehicle_type = updates.vehicle_type;
    await query((sb) => sb.from('responders_live').update(liveUpdates).eq('user_id', req.params.id));
  }
  res.json({ data });
}));

module.exports = router;
