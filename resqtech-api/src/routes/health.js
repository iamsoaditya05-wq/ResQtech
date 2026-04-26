const express = require('express');
const router  = express.Router();
const { state } = require('../mockData');

// GET /api/health — detailed system health
router.get('/', (req, res) => {
  const DEMO = process.env.DEMO_MODE === 'true';

  const activeEmergencies = state.emergencies.filter(
    (e) => ['pending', 'matched', 'en_route'].includes(e.status)
  ).length;

  const availableResponders = state.respondersLive.filter((r) => r.is_available).length;
  const totalBeds = state.hospitals.reduce((s, h) => s + h.beds_available, 0);
  const unreadNotifs = state.notifications.filter((n) => !n.read).length;

  res.json({
    status:    'healthy',
    version:   '3.0.0',
    mode:      DEMO ? 'demo' : 'live',
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()),
    services: {
      database:    DEMO ? 'mock'      : 'supabase',
      ai_triage:   process.env.ANTHROPIC_API_KEY ? 'claude' : 'mock',
      sms:         process.env.TWILIO_SID ? 'twilio' : 'mock',
      realtime:    'socket.io',
      rate_limit:  '200/min',
    },
    live_stats: {
      active_emergencies:   activeEmergencies,
      available_responders: availableResponders,
      total_responders:     state.respondersLive.length,
      beds_available:       totalBeds,
      unread_notifications: unreadNotifs,
      total_users:          state.users.length,
    },
  });
});

module.exports = router;
