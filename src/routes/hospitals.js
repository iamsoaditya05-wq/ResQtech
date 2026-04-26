const express = require('express');
const router  = express.Router();

const DEMO = () => process.env.DEMO_MODE === 'true';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// GET /api/hospitals
router.get('/', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      let list = [...state.hospitals];

      if (req.query.specialization) {
        list = list.filter((h) =>
          h.specializations.includes(req.query.specialization)
        );
      }
      if (req.query.district) {
        list = list.filter((h) => h.district === req.query.district);
      }

      return res.json({ data: list });
    }

    const { query } = require('../db');
    const data = await query((sb) =>
      sb.from('hospitals').select('*').order('name')
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/hospitals/:id/incoming
router.get('/:id/incoming', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      const incoming = state.emergencies.filter(
        (e) => e.hospital_id === req.params.id && ['matched', 'en_route'].includes(e.status)
      );
      return res.json({ data: incoming });
    }

    const { query } = require('../db');
    const data = await query((sb) =>
      sb
        .from('emergencies')
        .select('*')
        .eq('hospital_id', req.params.id)
        .in('status', ['matched', 'en_route'])
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// POST /api/hospitals
router.post('/', async (req, res, next) => {
  try {
    const { name, lat, lng, total_beds, specializations, phone, district } = req.body;
    if (!name || !lat || !lng) {
      return res.status(400).json({ error: 'name, lat, and lng are required' });
    }

    if (DEMO()) {
      const { state } = require('../mockData');
      const hospital = {
        id:              uid(),
        name,
        lat:             parseFloat(lat),
        lng:             parseFloat(lng),
        beds_available:  total_beds || 0,
        total_beds:      total_beds || 0,
        specializations: specializations || ['general'],
        phone:           phone || '',
        district:        district || '',
      };
      state.hospitals.push(hospital);
      return res.status(201).json(hospital);
    }

    const { query } = require('../db');
    const [created] = await query((sb) =>
      sb.from('hospitals').insert(req.body).select()
    );
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/hospitals/:id/beds
router.patch('/:id/beds', async (req, res, next) => {
  try {
    const { beds_available } = req.body;
    if (beds_available === undefined) {
      return res.status(400).json({ error: 'beds_available is required' });
    }

    const io = req.app.get('io');

    if (DEMO()) {
      const { state } = require('../mockData');
      const h = state.hospitals.find((h) => h.id === req.params.id);
      if (!h) return res.status(404).json({ error: 'Hospital not found' });

      h.beds_available = parseInt(beds_available, 10);
      io?.emit('hospital:beds_updated', { id: h.id, beds_available: h.beds_available });
      return res.json(h);
    }

    const { query } = require('../db');
    const [updated] = await query((sb) =>
      sb
        .from('hospitals')
        .update({ beds_available })
        .eq('id', req.params.id)
        .select()
    );
    if (!updated) return res.status(404).json({ error: 'Hospital not found' });
    io?.emit('hospital:beds_updated', { id: req.params.id, beds_available });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
