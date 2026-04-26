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

// ── GET /api/hospitals ────────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  if (DEMO()) return res.json({ data: state.hospitals, count: state.hospitals.length });

  const data = await query((sb) =>
    sb.from('hospitals').select('*').order('name')
  );
  res.json({ data, count: data.length });
}));

// ── POST /api/hospitals — add a new hospital ──────────────────────────────────
router.post('/', asyncHandler(async (req, res) => {
  const { name, phone, district = 'Pune', lat, lng, total_beds, beds_available, specializations = [] } = req.body;
  if (!name || !lat || !lng || !total_beds) {
    return res.status(400).json({ error: 'name, lat, lng, total_beds are required' });
  }

  const { uid } = require('../mockData');
  const newHospital = {
    id:             uid(),
    name,
    phone:          phone || '',
    district,
    lat:            parseFloat(lat),
    lng:            parseFloat(lng),
    total_beds:     parseInt(total_beds),
    beds_available: parseInt(beds_available ?? total_beds),
    specializations,
  };

  if (DEMO()) {
    state.hospitals.push(newHospital);
    emit(req, 'hospital:added', newHospital);
    return res.status(201).json({ data: newHospital });
  }

  await query((sb) => sb.from('hospitals').insert(newHospital));
  emit(req, 'hospital:added', newHospital);
  res.status(201).json({ data: newHospital });
}));

// ── GET /api/hospitals/:id ────────────────────────────────────────────────────
router.get('/:id', asyncHandler(async (req, res) => {
  if (DEMO()) {
    const h = state.hospitals.find((h) => h.id === req.params.id);
    if (!h) return res.status(404).json({ error: 'Hospital not found' });
    return res.json({ data: h });
  }

  const data = await query((sb) =>
    sb.from('hospitals').select('*').eq('id', req.params.id).single()
  );
  res.json({ data });
}));

// ── PATCH /api/hospitals/:id/beds ─────────────────────────────────────────────
router.patch('/:id/beds', asyncHandler(async (req, res) => {
  const { beds_available } = req.body;
  if (beds_available === undefined || beds_available < 0) {
    return res.status(400).json({ error: 'beds_available must be >= 0' });
  }

  if (DEMO()) {
    const h = state.hospitals.find((h) => h.id === req.params.id);
    if (!h) return res.status(404).json({ error: 'Hospital not found' });
    h.beds_available = Math.min(parseInt(beds_available), h.total_beds);
    emit(req, 'hospital:beds_updated', { id: h.id, beds_available: h.beds_available });
    return res.json({ data: h });
  }

  // Clamp to total_beds
  const current = await query((sb) =>
    sb.from('hospitals').select('total_beds').eq('id', req.params.id).single()
  );
  const clamped = Math.min(parseInt(beds_available), current.total_beds);

  const data = await query((sb) =>
    sb.from('hospitals').update({ beds_available: clamped }).eq('id', req.params.id).select().single()
  );
  emit(req, 'hospital:beds_updated', { id: data.id, beds_available: data.beds_available });
  res.json({ data });
}));

// ── GET /api/hospitals/:id/incoming — emergencies en route to this hospital ───
router.get('/:id/incoming', asyncHandler(async (req, res) => {
  if (DEMO()) {
    const h = state.hospitals.find((h) => h.id === req.params.id);
    if (!h) return res.status(404).json({ error: 'Hospital not found' });

    // Find nearest active emergencies (within 30km)
    const { haversine } = require('../services/matching');
    const incoming = state.emergencies
      .filter((e) => ['matched', 'en_route'].includes(e.status))
      .map((e) => ({
        ...e,
        distance_to_hospital: +haversine(e.lat, e.lng, h.lat, h.lng).toFixed(1),
      }))
      .filter((e) => e.distance_to_hospital <= 30)
      .sort((a, b) => a.distance_to_hospital - b.distance_to_hospital);

    return res.json({ data: incoming, count: incoming.length });
  }

  const h = await query((sb) => sb.from('hospitals').select('lat,lng').eq('id', req.params.id).single());
  const data = await query((sb) =>
    sb.from('emergencies').select('*').in('status', ['matched', 'en_route'])
  );
  res.json({ data, count: data.length });
}));

module.exports = router;
