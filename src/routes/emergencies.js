const express = require('express');
const router  = express.Router();

const DEMO = () => process.env.DEMO_MODE === 'true';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── GET /api/emergencies ──────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      let list = [...state.emergencies];

      // Optional filters
      if (req.query.status)   list = list.filter((e) => e.status === req.query.status);
      if (req.query.type)     list = list.filter((e) => e.type   === req.query.type);
      if (req.query.village)  list = list.filter((e) => e.village === req.query.village);

      // Search
      if (req.query.q) {
        const q = req.query.q.toLowerCase();
        list = list.filter(
          (e) =>
            e.patient_name?.toLowerCase().includes(q) ||
            e.village?.toLowerCase().includes(q) ||
            e.type?.toLowerCase().includes(q)
        );
      }

      // Sort newest first
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Pagination
      const page  = parseInt(req.query.page  || '1', 10);
      const limit = parseInt(req.query.limit || '50', 10);
      const start = (page - 1) * limit;
      const data  = list.slice(start, start + limit);

      return res.json({ data, total: list.length, page, limit });
    }

    const { query } = require('../db');
    const data = await query((sb) =>
      sb.from('emergencies').select('*').order('created_at', { ascending: false })
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/emergencies/active ───────────────────────────────────────────────
router.get('/active', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      const active = state.emergencies.filter((e) =>
        ['pending', 'matched', 'en_route'].includes(e.status)
      );
      return res.json({ data: active });
    }

    const { query } = require('../db');
    const data = await query((sb) =>
      sb
        .from('emergencies')
        .select('*')
        .in('status', ['pending', 'matched', 'en_route'])
        .order('created_at', { ascending: false })
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/emergencies/export ───────────────────────────────────────────────
router.get('/export', async (req, res, next) => {
  try {
    let list;
    if (DEMO()) {
      const { state } = require('../mockData');
      list = state.emergencies;
    } else {
      const { query } = require('../db');
      list = await query((sb) =>
        sb.from('emergencies').select('*').order('created_at', { ascending: false })
      );
    }

    const header = 'id,patient_name,village,type,status,severity,responder_name,eta_minutes,created_at\n';
    const rows   = list
      .map((e) =>
        [
          e.id, e.patient_name, e.village, e.type, e.status,
          e.severity, e.responder_name || '', e.eta_minutes || '', e.created_at,
        ].join(',')
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="emergencies.csv"');
    res.send(header + rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/emergencies/:id ──────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      const em = state.emergencies.find((e) => e.id === req.params.id);
      if (!em) return res.status(404).json({ error: 'Emergency not found' });
      return res.json(em);
    }

    const { query } = require('../db');
    const [em] = await query((sb) =>
      sb.from('emergencies').select('*').eq('id', req.params.id).limit(1)
    );
    if (!em) return res.status(404).json({ error: 'Emergency not found' });
    res.json(em);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/emergencies ─────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { patient_id, patient_name, lat, lng, village, type, severity } = req.body;
    if (!lat || !lng || !type) {
      return res.status(400).json({ error: 'lat, lng, and type are required' });
    }

    const io = req.app.get('io');

    if (DEMO()) {
      const { state, uid: mkUid } = require('../mockData');
      const { findNearestResponders } = require('../services/matching');
      const { logAudit }             = require('../services/audit');

      const em = {
        id:             uid(),
        patient_id:     patient_id || null,
        patient_name:   patient_name || 'Unknown',
        lat:            parseFloat(lat),
        lng:            parseFloat(lng),
        village:        village || 'Unknown',
        type,
        severity:       severity || 3,
        status:         'pending',
        responder_id:   null,
        responder_name: null,
        eta_minutes:    null,
        created_at:     new Date().toISOString(),
      };

      state.emergencies.unshift(em);
      await logAudit('emergency.created', { id: em.id, type, village, status: 'pending' });
      io?.emit('emergency:new', em);

      // Auto-match
      try {
        const candidates = await findNearestResponders(em.lat, em.lng, 20, 5, type);
        if (candidates.length) {
          const best = candidates[0];
          em.status         = 'matched';
          em.responder_id   = best.user_id;
          em.responder_name = best.name;
          em.eta_minutes    = Math.round((best.distance_km / 30) * 60);

          const r = state.respondersLive.find((r) => r.user_id === best.user_id);
          if (r) r.is_available = false;

          await logAudit('emergency.status_changed', { id: em.id, from: 'pending', to: 'matched' });
          io?.emit('emergency:updated', em);

          const notif = {
            id: mkUid(), user_id: best.user_id,
            type: 'emergency_assigned',
            message: `New emergency: ${type} in ${village || 'Unknown'} — ETA ${em.eta_minutes} min`,
            payload: { emergency_id: em.id },
            channel: 'push', sent_at: new Date().toISOString(), read: false,
          };
          state.notifications.unshift(notif);
          io?.emit('notification:new', notif);
        }
      } catch (matchErr) {
        console.error('[MATCH] Auto-match failed:', matchErr.message);
      }

      return res.status(201).json(em);
    }

    const { query } = require('../db');
    const em = {
      patient_id, patient_name, lat, lng, village, type,
      severity: severity || 3,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    const [created] = await query((sb) =>
      sb.from('emergencies').insert(em).select()
    );
    io?.emit('emergency:new', created);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/emergencies/:id ────────────────────────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const io = req.app.get('io');

    if (DEMO()) {
      const { state } = require('../mockData');
      const { logAudit } = require('../services/audit');

      const em = state.emergencies.find((e) => e.id === req.params.id);
      if (!em) return res.status(404).json({ error: 'Emergency not found' });

      const prevStatus = em.status;
      Object.assign(em, req.body);

      if (req.body.status && req.body.status !== prevStatus) {
        await logAudit('emergency.status_changed', { id: em.id, from: prevStatus, to: req.body.status });
      }

      io?.emit('emergency:updated', em);
      return res.json(em);
    }

    const { query } = require('../db');
    const [updated] = await query((sb) =>
      sb.from('emergencies').update(req.body).eq('id', req.params.id).select()
    );
    if (!updated) return res.status(404).json({ error: 'Emergency not found' });
    io?.emit('emergency:updated', updated);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/emergencies/:id/assign ─────────────────────────────────────────
router.post('/:id/assign', async (req, res, next) => {
  try {
    const { responder_id } = req.body;
    if (!responder_id) return res.status(400).json({ error: 'responder_id is required' });

    const io = req.app.get('io');

    if (DEMO()) {
      const { state } = require('../mockData');
      const em = state.emergencies.find((e) => e.id === req.params.id);
      if (!em) return res.status(404).json({ error: 'Emergency not found' });

      const responder = state.respondersLive.find((r) => r.user_id === responder_id);
      if (!responder) return res.status(404).json({ error: 'Responder not found' });

      em.status         = 'matched';
      em.responder_id   = responder_id;
      em.responder_name = responder.name;
      em.eta_minutes    = 10;
      responder.is_available = false;

      io?.emit('emergency:updated', em);
      return res.json(em);
    }

    const { query } = require('../db');
    const [updated] = await query((sb) =>
      sb
        .from('emergencies')
        .update({ status: 'matched', responder_id })
        .eq('id', req.params.id)
        .select()
    );
    if (!updated) return res.status(404).json({ error: 'Emergency not found' });
    io?.emit('emergency:updated', updated);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
