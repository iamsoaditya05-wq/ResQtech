const express = require('express');
const router  = express.Router();

// GET /api/health — liveness probe used by Railway healthcheck
router.get('/', (req, res) => {
  res.json({
    status:    'ok',
    service:   'ResQtech API',
    version:   '3.0.0',
    mode:      process.env.DEMO_MODE === 'true' ? 'demo' : 'live',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
