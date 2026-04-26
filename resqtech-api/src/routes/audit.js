const express = require('express');
const router  = express.Router();
const { state } = require('../mockData');
const { asyncHandler } = require('../middleware/errorHandler');
const { query }        = require('../db');

const DEMO = () => process.env.DEMO_MODE === 'true';

// ── GET /api/audit — recent audit log entries ─────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const limit  = parseInt(req.query.limit)  || 50;
  const action = req.query.action || null;

  if (DEMO()) {
    let logs = state.auditLogs || [];
    if (action) logs = logs.filter((l) => l.action.includes(action));
    return res.json({ data: logs.slice(0, limit), count: logs.length });
  }

  let q = (sb) => sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
  if (action) {
    q = (sb) => sb.from('audit_logs').select('*').ilike('action', `%${action}%`).order('created_at', { ascending: false }).limit(limit);
  }
  const data = await query(q);
  res.json({ data, count: data.length });
}));

module.exports = router;
