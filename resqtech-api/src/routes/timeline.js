// GET /api/emergencies/:id/timeline — full event history for one emergency
const express = require('express');
const router  = express.Router({ mergeParams: true });
const { state } = require('../mockData');
const { asyncHandler } = require('../middleware/errorHandler');
const { query }        = require('../db');

const DEMO = () => process.env.DEMO_MODE === 'true';

router.get('/', asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (DEMO()) {
    const em      = state.emergencies.find((e) => e.id === id);
    if (!em) return res.status(404).json({ error: 'Emergency not found' });

    const triage  = state.triageLogs.find((t) => t.emergency_id === id);
    const ride    = state.rides.find((r) => r.emergency_id === id);
    const relays  = state.relaySegments.filter((s) => s.emergency_id === id);
    const notifs  = state.notifications.filter((n) => n.payload?.emergency_id === id);
    const audits  = (state.auditLogs || []).filter((a) => a.details?.id === id || a.details?.emergency_id === id);

    // Build chronological timeline
    const events = [];

    events.push({ time: em.created_at, type: 'created', icon: '🆘', label: `Emergency created — ${em.type} in ${em.village}`, detail: `Patient: ${em.patient_name}` });

    if (em.responder_id) {
      const matchTime = new Date(new Date(em.created_at).getTime() + 30000).toISOString();
      events.push({ time: matchTime, type: 'matched', icon: '🚗', label: `Responder matched: ${em.responder_name}`, detail: `ETA: ${em.eta_minutes} min` });
    }

    if (triage) {
      events.push({ time: triage.created_at, type: 'triage', icon: '🤖', label: `AI triage completed — Severity ${triage.ai_severity || triage.severity}`, detail: triage.hospital_dept });
    }

    if (ride) {
      events.push({ time: ride.pickup_time, type: 'pickup', icon: '🏃', label: 'Patient picked up', detail: `Ride started · ₹${ride.total_inr} earnings` });
      if (ride.drop_time) {
        events.push({ time: ride.drop_time, type: 'completed', icon: '✅', label: 'Patient delivered to hospital', detail: `${ride.distance_km} km · ₹${ride.total_inr}` });
      }
    }

    relays.forEach((seg) => {
      if (seg.handoff_time) {
        events.push({ time: seg.handoff_time, type: 'relay', icon: '🔗', label: `Relay handoff — Leg ${seg.segment_num}`, detail: `${seg.from_village} → ${seg.to_village} · ${seg.responder_name}` });
      }
    });

    notifs.forEach((n) => {
      events.push({ time: n.sent_at, type: 'notification', icon: '🔔', label: n.message, detail: `via ${n.channel}` });
    });

    audits.forEach((a) => {
      if (a.action === 'emergency.status_changed') {
        events.push({ time: a.created_at, type: 'status', icon: '🔄', label: `Status: ${a.details.from} → ${a.details.to}`, detail: '' });
      }
    });

    events.sort((a, b) => new Date(a.time) - new Date(b.time));

    return res.json({ data: { emergency: em, timeline: events } });
  }

  // Live mode
  const em = await query((sb) => sb.from('emergencies').select('*').eq('id', id).single());
  const [triage, rides, relays, notifs] = await Promise.all([
    query((sb) => sb.from('triage_logs').select('*').eq('emergency_id', id)),
    query((sb) => sb.from('rides').select('*').eq('emergency_id', id)),
    query((sb) => sb.from('relay_segments').select('*').eq('emergency_id', id)),
    query((sb) => sb.from('notifications').select('*').contains('payload', { emergency_id: id })),
  ]);

  res.json({ data: { emergency: em, triage, rides, relays, notifications: notifs } });
}));

module.exports = router;
