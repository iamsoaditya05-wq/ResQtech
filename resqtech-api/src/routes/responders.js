const express = require('express');
const router  = express.Router();
const { state } = require('../mockData');
const { asyncHandler } = require('../middleware/errorHandler');
const { query }        = require('../db');

const DEMO = () => process.env.DEMO_MODE === 'true';

function emit(req, event, data) {
  const io = req.app.get('io');
  if (io) io.emit(event, data);
}

// ── GET /api/responders ───────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  if (DEMO()) {
    let data = state.respondersLive;
    if (req.query.available === 'true') data = data.filter((r) => r.is_available);
    return res.json({ data, count: data.length });
  }

  let q = (sb) => sb.from('responders_live').select(`
    user_id, name, vehicle_type, lat, lng, is_available, last_seen,
    users!inner(phone, is_trained)
  `);
  if (req.query.available === 'true') {
    q = (sb) => sb.from('responders_live').select(`
      user_id, name, vehicle_type, lat, lng, is_available, last_seen,
      users!inner(phone, is_trained)
    `).eq('is_available', true);
  }
  const data = await query(q);
  res.json({ data, count: data.length });
}));

// ── GET /api/responders/:id ───────────────────────────────────────────────────
router.get('/:id', asyncHandler(async (req, res) => {
  if (DEMO()) {
    const r = state.respondersLive.find((r) => r.user_id === req.params.id);
    if (!r) return res.status(404).json({ error: 'Responder not found' });
    return res.json({ data: r });
  }

  const data = await query((sb) =>
    sb.from('responders_live').select('*').eq('user_id', req.params.id).single()
  );
  res.json({ data });
}));

// ── PATCH /api/responders/:id/location ───────────────────────────────────────
router.patch('/:id/location', asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

  if (DEMO()) {
    const r = state.respondersLive.find((r) => r.user_id === req.params.id);
    if (!r) return res.status(404).json({ error: 'Responder not found' });
    r.lat = parseFloat(lat);
    r.lng = parseFloat(lng);
    r.last_seen = new Date().toISOString();
    emit(req, 'responder:location', { user_id: r.user_id, lat: r.lat, lng: r.lng });
    return res.json({ data: r });
  }

  const data = await query((sb) =>
    sb.from('responders_live')
      .update({ lat: parseFloat(lat), lng: parseFloat(lng), last_seen: new Date().toISOString() })
      .eq('user_id', req.params.id)
      .select().single()
  );
  emit(req, 'responder:location', { user_id: data.user_id, lat: data.lat, lng: data.lng });
  res.json({ data });
}));

// ── PATCH /api/responders/:id/availability ────────────────────────────────────
router.patch('/:id/availability', asyncHandler(async (req, res) => {
  if (DEMO()) {
    const r = state.respondersLive.find((r) => r.user_id === req.params.id);
    if (!r) return res.status(404).json({ error: 'Responder not found' });
    r.is_available = req.body.is_available ?? !r.is_available;
    r.last_seen    = new Date().toISOString();
    emit(req, 'responder:availability', { user_id: r.user_id, is_available: r.is_available });
    return res.json({ data: r });
  }

  const current = await query((sb) =>
    sb.from('responders_live').select('is_available').eq('user_id', req.params.id).single()
  );
  const newAvail = req.body.is_available ?? !current.is_available;

  const data = await query((sb) =>
    sb.from('responders_live')
      .update({ is_available: newAvail, last_seen: new Date().toISOString() })
      .eq('user_id', req.params.id)
      .select().single()
  );
  emit(req, 'responder:availability', { user_id: data.user_id, is_available: data.is_available });
  res.json({ data });
}));

// ── GET /api/responders/:id/history ──────────────────────────────────────────
router.get('/:id/history', asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (DEMO()) {
    const responder = state.respondersLive.find((r) => r.user_id === id);
    if (!responder) return res.status(404).json({ error: 'Responder not found' });

    const rides = state.rides
      .filter((r) => r.responder_id === id)
      .sort((a, b) => new Date(b.pickup_time) - new Date(a.pickup_time));

    const emergencies = state.emergencies
      .filter((e) => e.responder_id === id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const totalEarnings = rides.filter(r => r.status === 'completed').reduce((s, r) => s + r.total_inr, 0);
    const totalKm       = rides.filter(r => r.status === 'completed').reduce((s, r) => s + r.distance_km, 0);
    const user          = state.users.find((u) => u.id === id);

    return res.json({
      data: {
        responder,
        user,
        rides,
        emergencies,
        stats: {
          total_rides:     rides.filter(r => r.status === 'completed').length,
          active_rides:    rides.filter(r => r.status === 'active').length,
          total_earnings:  totalEarnings,
          total_km:        +totalKm.toFixed(1),
          avg_per_ride:    rides.filter(r => r.status === 'completed').length
            ? Math.round(totalEarnings / rides.filter(r => r.status === 'completed').length)
            : 0,
        },
      },
    });
  }

  const [responder, rides, emergencies] = await Promise.all([
    query((sb) => sb.from('responders_live').select('*').eq('user_id', id).single()),
    query((sb) => sb.from('rides').select('*').eq('responder_id', id).order('pickup_time', { ascending: false })),
    query((sb) => sb.from('emergencies').select('*').eq('responder_id', id).order('created_at', { ascending: false })),
  ]);

  const completed = rides.filter(r => r.status === 'completed');
  res.json({
    data: {
      responder, rides, emergencies,
      stats: {
        total_rides:    completed.length,
        total_earnings: completed.reduce((s, r) => s + r.total_inr, 0),
        total_km:       +completed.reduce((s, r) => s + r.distance_km, 0).toFixed(1),
      },
    },
  });
}));

module.exports = router;
