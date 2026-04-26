const express = require('express');
const router  = express.Router({ mergeParams: true });

const DEMO = () => process.env.DEMO_MODE === 'true';

// GET /api/emergencies/:id/timeline
router.get('/', async (req, res, next) => {
  try {
    const emergencyId = req.params.id;

    if (DEMO()) {
      const { state } = require('../mockData');

      // Build a timeline from audit logs + triage + ride events for this emergency
      const auditEvents = state.auditLogs
        .filter((l) => l.details?.id === emergencyId)
        .map((l) => ({
          type:       'audit',
          action:     l.action,
          details:    l.details,
          actor:      l.actor,
          created_at: l.created_at,
        }));

      const triageEvents = state.triageLogs
        .filter((t) => t.emergency_id === emergencyId)
        .map((t) => ({
          type:       'triage',
          action:     'triage.assessed',
          details:    { severity: t.ai_severity, dept: t.hospital_dept },
          actor:      'ai',
          created_at: t.created_at,
        }));

      const rideEvents = state.rides
        .filter((r) => r.emergency_id === emergencyId)
        .map((r) => ({
          type:       'ride',
          action:     r.status === 'completed' ? 'ride.completed' : 'ride.started',
          details:    { ride_id: r.id, responder: r.responder_name, distance_km: r.distance_km },
          actor:      r.responder_id,
          created_at: r.pickup_time,
        }));

      const timeline = [...auditEvents, ...triageEvents, ...rideEvents].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );

      return res.json({ data: timeline });
    }

    const { query } = require('../db');
    const data = await query((sb) =>
      sb
        .from('audit_logs')
        .select('*')
        .eq('details->>id', emergencyId)
        .order('created_at', { ascending: true })
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
