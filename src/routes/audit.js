const express = require('express');
const router  = express.Router();

const DEMO = () => process.env.DEMO_MODE === 'true';

// GET /api/audit
router.get('/', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      let list = [...state.auditLogs];

      if (req.query.action) {
        list = list.filter((l) => l.action === req.query.action || l.action.startsWith(req.query.action));
      }
      if (req.query.actor) {
        list = list.filter((l) => l.actor === req.query.actor);
      }

      // Sort newest first
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const page  = parseInt(req.query.page  || '1', 10);
      const limit = parseInt(req.query.limit || '50', 10);
      const start = (page - 1) * limit;

      return res.json({ data: list.slice(start, start + limit), total: list.length });
    }

    const { query } = require('../db');
    const data = await query((sb) =>
      sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200)
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
