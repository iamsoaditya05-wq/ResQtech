const express = require('express');
const router  = express.Router();

const DEMO = () => process.env.DEMO_MODE === 'true';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// GET /api/relay
router.get('/', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      let list = [...state.relaySegments];

      if (req.query.emergency_id) {
        list = list.filter((s) => s.emergency_id === req.query.emergency_id);
      }
      if (req.query.ride_id) {
        list = list.filter((s) => s.ride_id === req.query.ride_id);
      }

      list.sort((a, b) => a.segment_num - b.segment_num);
      return res.json({ data: list });
    }

    const { query } = require('../db');
    const data = await query((sb) =>
      sb.from('relay_segments').select('*').order('segment_num')
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// POST /api/relay/plan — plan a multi-segment relay
router.post('/plan', async (req, res, next) => {
  try {
    const { emergency_id, ride_id, segments } = req.body;
    if (!emergency_id || !segments?.length) {
      return res.status(400).json({ error: 'emergency_id and segments[] are required' });
    }

    const io = req.app.get('io');

    if (DEMO()) {
      const { state } = require('../mockData');
      const created = segments.map((seg, i) => ({
        id:           uid(),
        ride_id:      ride_id || null,
        emergency_id,
        segment_num:  i + 1,
        ...seg,
        status:       'planned',
        handoff_time: null,
      }));
      state.relaySegments.push(...created);
      io?.emit('relay:planned', { emergency_id, segments: created });
      return res.status(201).json({ data: created });
    }

    const { query } = require('../db');
    const rows = segments.map((seg, i) => ({
      ride_id: ride_id || null,
      emergency_id,
      segment_num: i + 1,
      ...seg,
      status: 'planned',
    }));
    const created = await query((sb) =>
      sb.from('relay_segments').insert(rows).select()
    );
    io?.emit('relay:planned', { emergency_id, segments: created });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/relay/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const io = req.app.get('io');

    if (DEMO()) {
      const { state } = require('../mockData');
      const seg = state.relaySegments.find((s) => s.id === req.params.id);
      if (!seg) return res.status(404).json({ error: 'Relay segment not found' });

      Object.assign(seg, req.body);
      if (req.body.status === 'completed' && !seg.handoff_time) {
        seg.handoff_time = new Date().toISOString();
      }

      io?.emit('relay:updated', seg);
      return res.json(seg);
    }

    const { query } = require('../db');
    const [updated] = await query((sb) =>
      sb.from('relay_segments').update(req.body).eq('id', req.params.id).select()
    );
    if (!updated) return res.status(404).json({ error: 'Relay segment not found' });
    io?.emit('relay:updated', updated);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
