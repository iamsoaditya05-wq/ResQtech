const express = require('express');
const router  = express.Router();
const { state, uid } = require('../mockData');
const { assignResponder } = require('../services/matching');
const { asyncHandler }    = require('../middleware/errorHandler');
const { validate }        = require('../middleware/validate');
const { query }           = require('../db');
const { createNotification, sendSms } = require('../services/notifications');
const audit               = require('../services/audit');

const DEMO = () => process.env.DEMO_MODE === 'true';

function emit(req, event, data) {
  const io = req.app.get('io');
  if (io) io.emit(event, data);
}

// ── GET /api/emergencies ──────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  if (DEMO()) {
    let data = [...state.emergencies].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (req.query.status) data = data.filter((e) => e.status === req.query.status);
    return res.json({ data, count: data.length });
  }

  let q = query((sb) => sb.from('emergencies').select('*').order('created_at', { ascending: false }));
  if (req.query.status) q = query((sb) => sb.from('emergencies').select('*').eq('status', req.query.status).order('created_at', { ascending: false }));
  const data = await q;
  res.json({ data, count: data.length });
}));

// ── GET /api/emergencies/search ───────────────────────────────────────────────
router.get('/search', asyncHandler(async (req, res) => {
  const { q = '', status, type, limit = 50 } = req.query;
  const search = q.toLowerCase();

  if (DEMO()) {
    let results = [...state.emergencies];
    if (search) {
      results = results.filter((e) =>
        e.patient_name?.toLowerCase().includes(search) ||
        e.village?.toLowerCase().includes(search) ||
        e.responder_name?.toLowerCase().includes(search) ||
        e.type?.toLowerCase().includes(search)
      );
    }
    if (status) results = results.filter((e) => e.status === status);
    if (type)   results = results.filter((e) => e.type === type);
    results = results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, parseInt(limit));
    return res.json({ data: results, count: results.length });
  }

  let q2 = (sb) => sb.from('emergencies').select('*').order('created_at', { ascending: false }).limit(parseInt(limit));
  if (search) q2 = (sb) => sb.from('emergencies').select('*').or(`patient_name.ilike.%${search}%,village.ilike.%${search}%`).order('created_at', { ascending: false }).limit(parseInt(limit));
  const data = await query(q2);
  res.json({ data, count: data.length });
}));

// ── GET /api/emergencies/export — CSV export ──────────────────────────────────
router.get('/export', (req, res) => {
  const emergencies = DEMO() ? state.emergencies : [];
  const rows = [
    ['ID', 'Patient', 'Village', 'Type', 'Status', 'Severity', 'Responder', 'ETA (min)', 'Created At'],
    ...emergencies.map((e) => [
      e.id, e.patient_name, e.village, e.type, e.status,
      e.severity, e.responder_name || '', e.eta_minutes || '',
      new Date(e.created_at).toLocaleString('en-IN'),
    ]),
  ];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="resqtech-emergencies.csv"');
  res.send(csv);
});
router.get('/active', asyncHandler(async (req, res) => {
  if (DEMO()) {
    const active = state.emergencies.filter((e) => ['pending', 'matched', 'en_route'].includes(e.status));
    return res.json({ data: active, count: active.length });
  }

  const data = await query((sb) =>
    sb.from('emergencies').select('*').in('status', ['pending', 'matched', 'en_route']).order('created_at', { ascending: false })
  );
  res.json({ data, count: data.length });
}));

// ── GET /api/emergencies/:id ──────────────────────────────────────────────────
router.get('/:id', asyncHandler(async (req, res) => {
  if (DEMO()) {
    const em = state.emergencies.find((e) => e.id === req.params.id);
    if (!em) return res.status(404).json({ error: 'Emergency not found' });
    return res.json({ data: em });
  }

  const data = await query((sb) => sb.from('emergencies').select('*').eq('id', req.params.id).single());
  res.json({ data });
}));

// ── POST /api/emergencies ─────────────────────────────────────────────────────
router.post('/',
  validate({ lat: 'number', lng: 'number' }),
  asyncHandler(async (req, res) => {
    const { lat, lng, type = 'general', patient_name, village, patient_id } = req.body;

    const newEmergency = {
      id:             uid(),
      patient_id:     patient_id || 'p_demo',
      patient_name:   patient_name || 'Unknown Patient',
      lat:            parseFloat(lat),
      lng:            parseFloat(lng),
      village:        village || 'Unknown Village',
      type,
      status:         'pending',
      severity:       3,
      responder_id:   null,
      responder_name: null,
      eta_minutes:    null,
      created_at:     new Date().toISOString(),
    };

    if (DEMO()) {
      state.emergencies.unshift(newEmergency);
    } else {
      await query((sb) => sb.from('emergencies').insert(newEmergency));
    }

    // Auto-match
    try {
      const responder = await assignResponder(newEmergency);
      if (responder) {
        newEmergency.status         = 'matched';
        newEmergency.responder_id   = responder.user_id;
        newEmergency.responder_name = responder.name;
        newEmergency.eta_minutes    = responder.eta_minutes;

        if (!DEMO()) {
          await query((sb) =>
            sb.from('emergencies').update({
              status: 'matched', responder_id: responder.user_id,
              eta_minutes: responder.eta_minutes,
            }).eq('id', newEmergency.id)
          );
          // Create ride record
          await query((sb) => sb.from('rides').insert({
            id:             uid(),
            emergency_id:   newEmergency.id,
            responder_id:   responder.user_id,
            responder_name: responder.name,
            distance_km:    parseFloat(responder.distance_km?.toFixed(1) || 0),
            base_rate:      50,
            distance_bonus: Math.round((responder.distance_km || 0) * 5),
            total_inr:      50 + Math.round((responder.distance_km || 0) * 5),
            status:         'active',
            pickup_time:    new Date().toISOString(),
            village:        newEmergency.village,
          }));
        } else {
          // Demo: create ride in mock state
          state.rides.unshift({
            id:             uid(),
            emergency_id:   newEmergency.id,
            responder_id:   responder.user_id,
            responder_name: responder.name,
            distance_km:    parseFloat(responder.distance_km?.toFixed(1) || 0),
            base_rate:      50,
            distance_bonus: Math.round((responder.distance_km || 0) * 5),
            total_inr:      50 + Math.round((responder.distance_km || 0) * 5),
            status:         'active',
            pickup_time:    new Date().toISOString(),
            drop_time:      null,
            village:        newEmergency.village,
          });
        }

        const io = req.app.get('io');
        await createNotification(io, {
          user_id: responder.user_id,
          type:    'emergency_assigned',
          message: `New emergency: ${newEmergency.type} in ${newEmergency.village} — ETA ${responder.eta_minutes} min`,
          payload: { emergency_id: newEmergency.id },
          channel: 'push',
        });

        // SMS the responder their dispatch details
        const responderUser = DEMO()
          ? state.users.find((u) => u.id === responder.user_id)
          : null;
        if (responderUser?.phone) {
          sendSms(responderUser.phone,
            `ResQtech: ${newEmergency.type.toUpperCase()} in ${newEmergency.village}. ` +
            `Patient: ${newEmergency.patient_name}. ` +
            `Maps: https://maps.google.com/?q=${newEmergency.lat},${newEmergency.lng} ` +
            `ETA ~${responder.eta_minutes} min.`
          ).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Matching error:', err.message);
    }

    emit(req, 'emergency:created', newEmergency);
    audit.log('emergency.created', { id: newEmergency.id, type: newEmergency.type, village: newEmergency.village, status: newEmergency.status });
    res.status(201).json({ data: newEmergency, message: 'Emergency created' });
  })
);

// ── PATCH /api/emergencies/:id ────────────────────────────────────────────────
router.patch('/:id', asyncHandler(async (req, res) => {
  const allowed = ['status', 'severity', 'responder_id', 'responder_name', 'eta_minutes'];
  const updates = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  if (DEMO()) {
    const em = state.emergencies.find((e) => e.id === req.params.id);
    if (!em) return res.status(404).json({ error: 'Emergency not found' });
    const prevStatus = em.status;
    Object.assign(em, updates);

    if (req.body.status === 'done' && em.responder_id) {
      const r = state.respondersLive.find((r) => r.user_id === em.responder_id);
      if (r) r.is_available = true;
    }

    emit(req, 'emergency:updated', em);

    // Notify patient when responder is en_route
    if (req.body.status === 'en_route' && em.responder_name) {
      const io = req.app.get('io');
      createNotification(io, {
        user_id: em.patient_id,
        type:    'responder_matched',
        message: `${em.responder_name} is on the way — ETA ${em.eta_minutes} min`,
        payload: { emergency_id: em.id },
        channel: 'sms',
      });
    }

    audit.log('emergency.status_changed', { id: em.id, from: prevStatus, to: em.status });
    return res.json({ data: em });
  }

  const data = await query((sb) =>
    sb.from('emergencies').update(updates).eq('id', req.params.id).select().single()
  );

  if (req.body.status === 'done' && data.responder_id) {
    await query((sb) =>
      sb.from('responders_live').update({ is_available: true }).eq('user_id', data.responder_id)
    );
  }

  emit(req, 'emergency:updated', data);
  audit.log('emergency.status_changed', { id: data.id, to: data.status });
  res.json({ data });
}));

// ── POST /api/emergencies/:id/assign — manual responder assignment ────────────
router.post('/:id/assign', asyncHandler(async (req, res) => {
  const { responder_id } = req.body;
  if (!responder_id) return res.status(400).json({ error: 'responder_id required' });

  if (DEMO()) {
    const em = state.emergencies.find((e) => e.id === req.params.id);
    if (!em) return res.status(404).json({ error: 'Emergency not found' });

    const responder = state.respondersLive.find((r) => r.user_id === responder_id);
    if (!responder) return res.status(404).json({ error: 'Responder not found' });

    const { haversine } = require('../services/matching');
    const dist = haversine(em.lat, em.lng, responder.lat, responder.lng);
    const eta  = Math.round((dist / 30) * 60);

    em.status         = 'matched';
    em.responder_id   = responder_id;
    em.responder_name = responder.name;
    em.eta_minutes    = eta;
    responder.is_available = false;

    const io = req.app.get('io');
    await createNotification(io, {
      user_id: responder_id,
      type:    'emergency_assigned',
      message: `[MANUAL] Emergency assigned: ${em.type} in ${em.village} — ETA ${eta} min`,
      payload: { emergency_id: em.id },
      channel: 'push',
    });

    emit(req, 'emergency:updated', em);
    audit.log('emergency.manual_assign', { emergency_id: em.id, responder_id, eta });
    return res.json({ data: em, message: `Assigned to ${responder.name}` });
  }

  // Live mode
  const em = await query((sb) => sb.from('emergencies').select('*').eq('id', req.params.id).single());
  const responder = await query((sb) => sb.from('responders_live').select('*').eq('user_id', responder_id).single());
  const { haversine } = require('../services/matching');
  const dist = haversine(em.lat, em.lng, responder.lat, responder.lng);
  const eta  = Math.round((dist / 30) * 60);

  const updated = await query((sb) =>
    sb.from('emergencies').update({
      status: 'matched', responder_id, responder_name: responder.name, eta_minutes: eta,
    }).eq('id', req.params.id).select().single()
  );
  await query((sb) => sb.from('responders_live').update({ is_available: false }).eq('user_id', responder_id));

  emit(req, 'emergency:updated', updated);
  res.json({ data: updated, message: `Assigned to ${responder.name}` });
}));

module.exports = router;
