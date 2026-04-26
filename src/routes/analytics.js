const express = require('express');
const router  = express.Router();

const DEMO = () => process.env.DEMO_MODE === 'true';

// GET /api/analytics
router.get('/', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      const emergencies = state.emergencies;
      const rides       = state.rides;

      const total      = emergencies.length;
      const active     = emergencies.filter((e) => ['pending', 'matched', 'en_route'].includes(e.status)).length;
      const resolved   = emergencies.filter((e) => e.status === 'done').length;
      const pending    = emergencies.filter((e) => e.status === 'pending').length;

      // By type
      const byType = {};
      for (const e of emergencies) {
        byType[e.type] = (byType[e.type] || 0) + 1;
      }

      // By village
      const byVillage = {};
      for (const e of emergencies) {
        byVillage[e.village] = (byVillage[e.village] || 0) + 1;
      }

      // By severity
      const bySeverity = { 1: 0, 2: 0, 3: 0, 4: 0 };
      for (const e of emergencies) {
        if (e.severity) bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
      }

      // Average ETA (completed rides)
      const completedWithEta = emergencies.filter((e) => e.status === 'done' && e.eta_minutes > 0);
      const avgEta = completedWithEta.length
        ? +(completedWithEta.reduce((s, e) => s + e.eta_minutes, 0) / completedWithEta.length).toFixed(1)
        : 0;

      // Daily trend (last 30 days)
      const dailyMap = {};
      for (const e of emergencies) {
        const day = e.created_at?.slice(0, 10);
        if (day) dailyMap[day] = (dailyMap[day] || 0) + 1;
      }
      const dailyTrend = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-30)
        .map(([date, count]) => ({ date, count }));

      // Top responders
      const responderMap = {};
      for (const r of rides.filter((r) => r.status === 'completed')) {
        if (!responderMap[r.responder_id]) {
          responderMap[r.responder_id] = { name: r.responder_name, rides: 0, earnings: 0 };
        }
        responderMap[r.responder_id].rides    += 1;
        responderMap[r.responder_id].earnings += r.total_inr || 0;
      }
      const topResponders = Object.values(responderMap)
        .sort((a, b) => b.rides - a.rides)
        .slice(0, 5);

      return res.json({
        total, active, resolved, pending,
        byType, byVillage, bySeverity,
        avgEta, dailyTrend, topResponders,
      });
    }

    const { query } = require('../db');
    const [stats] = await query((sb) => sb.rpc('get_analytics_summary'));
    res.json(stats || {});
  } catch (err) {
    next(err);
  }
});

module.exports = router;
