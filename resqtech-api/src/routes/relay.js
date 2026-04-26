const express = require('express');
const router  = express.Router();
const { state, uid } = require('../mockData');
const { haversine }    = require('../services/matching');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate }     = require('../middleware/validate');
const { query }        = require('../db');

const DEMO = () => process.env.DEMO_MODE === 'true';

function emit(req, event, data) {
  const io = req.app.get('io');
  if (io) io.emit(event, data);
}

// ── GET /api/relay ────────────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  if (DEMO()) {
    let segs = [...state.relaySegments];
    if (req.query.emergency_id) segs = segs.filter((s) => s.emergency_id === req.query.emergency_id);
    return res.json({ data: segs, count: segs.length });
  }

  let q = (sb) => sb.from('relay_segments').select('*').order('segment_num');
  if (req.query.emergency_id) {
    q = (sb) => sb.from('relay_segments').select('*').eq('emergency_id', req.query.emergency_id).order('segment_num');
  }
  const data = await query(q);
  res.json({ data, count: data.length });
}));

// ── POST /api/relay/plan ──────────────────────────────────────────────────────
router.post('/plan',
  validate({ lat: 'number', lng: 'number' }),
  asyncHandler(async (req, res) => {
    const { emergency_id, lat, lng } = req.body;

    const available = (DEMO() ? state.respondersLive : await query((sb) =>
      sb.from('responders_live').select('*').eq('is_available', true)
    ))
      .filter((r) => r.is_available)
      .map((r) => ({ ...r, dist: haversine(parseFloat(lat), parseFloat(lng), r.lat, r.lng) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 2);

    if (available.length < 2) {
      return res.status(422).json({ error: 'Not enough available responders for relay' });
    }

    const [leg1, leg2] = available;
    const midLat = (parseFloat(lat) + leg2.lat) / 2;
    const midLng = (parseFloat(lng) + leg2.lng) / 2;

    const seg1 = {
      id: uid(), ride_id: null, emergency_id: emergency_id || null,
      segment_num: 1,
      responder_id: leg1.user_id, responder_name: leg1.name, vehicle_type: leg1.vehicle_type,
      from_village: 'Patient Location', to_village: 'Handoff Point',
      from_lat: parseFloat(lat), from_lng: parseFloat(lng),
      to_lat: midLat, to_lng: midLng,
      distance_km: +(leg1.dist / 2).toFixed(1),
      status: 'planned', handoff_time: null,
    };

    const seg2 = {
      id: uid(), ride_id: null, emergency_id: emergency_id || null,
      segment_num: 2,
      responder_id: leg2.user_id, responder_name: leg2.name, vehicle_type: leg2.vehicle_type,
      from_village: 'Handoff Point', to_village: 'Hospital',
      from_lat: midLat, from_lng: midLng,
      to_lat: leg2.lat, to_lng: leg2.lng,
      distance_km: +(leg2.dist / 2).toFixed(1),
      status: 'planned', handoff_time: null,
    };

    if (DEMO()) {
      state.relaySegments.push(seg1, seg2);
    } else {
      await query((sb) => sb.from('relay_segments').insert([seg1, seg2]));
    }

    emit(req, 'relay:planned', { emergency_id, segments: [seg1, seg2] });
    res.status(201).json({ data: [seg1, seg2], message: 'Relay chain planned' });
  })
);

// ── PATCH /api/relay/:id ──────────────────────────────────────────────────────
router.patch('/:id', asyncHandler(async (req, res) => {
  if (DEMO()) {
    const seg = state.relaySegments.find((s) => s.id === req.params.id);
    if (!seg) return res.status(404).json({ error: 'Segment not found' });
    if (req.body.status) seg.status = req.body.status;
    if (req.body.status === 'completed') seg.handoff_time = new Date().toISOString();
    emit(req, 'relay:updated', seg);
    return res.json({ data: seg });
  }

  const updates = {};
  if (req.body.status) {
    updates.status = req.body.status;
    if (req.body.status === 'completed') updates.handoff_time = new Date().toISOString();
  }

  const data = await query((sb) =>
    sb.from('relay_segments').update(updates).eq('id', req.params.id).select().single()
  );
  emit(req, 'relay:updated', data);
  res.json({ data });
}));

module.exports = router;
