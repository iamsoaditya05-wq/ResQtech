const express = require('express');
const router  = express.Router();

const DEMO = () => process.env.DEMO_MODE === 'true';

// GET /api/responders
router.get('/', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      let list = [...state.respondersLive];

      if (req.query.available === 'true')  list = list.filter((r) => r.is_available);
      if (req.query.available === 'false') list = list.filter((r) => !r.is_available);
      if (req.query.vehicle_type)          list = list.filter((r) => r.vehicle_type === req.query.vehicle_type);

      return res.json({ data: list });
    }

    const { query } = require('../db');
    const data = await query((sb) =>
      sb.from('responders_live').select('*').order('last_seen', { ascending: false })
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/responders/:id/history
router.get('/:id/history', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      const rides = state.rides.filter((r) => r.responder_id === req.params.id);
      return res.json({ data: rides });
    }

    const { query } = require('../db');
    const data = await query((sb) =>
      sb
        .from('rides')
        .select('*')
        .eq('responder_id', req.params.id)
        .order('pickup_time', { ascending: false })
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/responders/:id/location
router.patch('/:id/location', async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const io = req.app.get('io');

    if (DEMO()) {
      const { state } = require('../mockData');
      const r = state.respondersLive.find((r) => r.user_id === req.params.id);
      if (!r) return res.status(404).json({ error: 'Responder not found' });

      r.lat       = parseFloat(lat);
      r.lng       = parseFloat(lng);
      r.last_seen = new Date().toISOString();

      io?.emit('responder:location', { user_id: req.params.id, lat: r.lat, lng: r.lng });
      return res.json(r);
    }

    const { query } = require('../db');
    const [updated] = await query((sb) =>
      sb
        .from('responders_live')
        .update({ lat, lng, last_seen: new Date().toISOString() })
        .eq('user_id', req.params.id)
        .select()
    );
    if (!updated) return res.status(404).json({ error: 'Responder not found' });
    io?.emit('responder:location', { user_id: req.params.id, lat, lng });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/responders/:id/availability
router.patch('/:id/availability', async (req, res, next) => {
  try {
    const { is_available } = req.body;
    if (is_available === undefined) {
      return res.status(400).json({ error: 'is_available is required' });
    }

    const io = req.app.get('io');

    if (DEMO()) {
      const { state } = require('../mockData');
      const r = state.respondersLive.find((r) => r.user_id === req.params.id);
      if (!r) return res.status(404).json({ error: 'Responder not found' });

      r.is_available = Boolean(is_available);
      r.last_seen    = new Date().toISOString();

      io?.emit('responder:availability', { user_id: req.params.id, is_available: r.is_available });
      return res.json(r);
    }

    const { query } = require('../db');
    const [updated] = await query((sb) =>
      sb
        .from('responders_live')
        .update({ is_available, last_seen: new Date().toISOString() })
        .eq('user_id', req.params.id)
        .select()
    );
    if (!updated) return res.status(404).json({ error: 'Responder not found' });
    io?.emit('responder:availability', { user_id: req.params.id, is_available });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
