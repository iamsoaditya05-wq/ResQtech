const express = require('express');
const router  = express.Router();

const DEMO = () => process.env.DEMO_MODE === 'true';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// GET /api/training
router.get('/', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      const list = [...state.trainingModules].sort((a, b) => a.order - b.order);
      return res.json({ data: list });
    }

    const { query } = require('../db');
    const data = await query((sb) =>
      sb.from('training_modules').select('*').order('order')
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/training/:id
router.get('/:id', async (req, res, next) => {
  try {
    // Guard against /progress/* being caught here
    if (req.params.id === 'progress') return next();

    if (DEMO()) {
      const { state } = require('../mockData');
      const mod = state.trainingModules.find((m) => m.id === req.params.id);
      if (!mod) return res.status(404).json({ error: 'Training module not found' });
      return res.json(mod);
    }

    const { query } = require('../db');
    const [mod] = await query((sb) =>
      sb.from('training_modules').select('*').eq('id', req.params.id).limit(1)
    );
    if (!mod) return res.status(404).json({ error: 'Training module not found' });
    res.json(mod);
  } catch (err) {
    next(err);
  }
});

// POST /api/training/:id/complete
router.post('/:id/complete', async (req, res, next) => {
  try {
    const { user_id, score } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const io = req.app.get('io');

    if (DEMO()) {
      const { state } = require('../mockData');
      const mod = state.trainingModules.find((m) => m.id === req.params.id);
      if (!mod) return res.status(404).json({ error: 'Training module not found' });

      if (!mod.completions.includes(user_id)) {
        mod.completions.push(user_id);
      }

      // Update user trained status if all required modules completed
      const requiredIds = state.trainingModules.filter((m) => m.is_required).map((m) => m.id);
      const userDone    = requiredIds.every((id) => {
        const m = state.trainingModules.find((m) => m.id === id);
        return m?.completions.includes(user_id);
      });

      if (userDone) {
        const user = state.users.find((u) => u.id === user_id);
        if (user) user.is_trained = true;
      }

      const notif = {
        id:      uid(),
        user_id,
        type:    'training_completed',
        message: `Module "${mod.title}" completed`,
        payload: { module_id: mod.id, score },
        channel: 'push',
        sent_at: new Date().toISOString(),
        read:    false,
      };
      state.notifications.unshift(notif);
      io?.emit('notification:new', notif);
      io?.emit('training:completed', { user_id, module_id: mod.id, score });

      return res.json({ success: true, module: mod, is_trained: userDone });
    }

    const { query } = require('../db');
    await query((sb) =>
      sb.from('training_completions').insert({ user_id, module_id: req.params.id, score, completed_at: new Date().toISOString() })
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/training/progress/:user_id
router.get('/progress/:user_id', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      const progress = state.trainingModules.map((m) => ({
        module_id:    m.id,
        title:        m.title,
        is_required:  m.is_required,
        completed:    m.completions.includes(req.params.user_id),
        duration_mins: m.duration_mins,
        order:        m.order,
      }));
      const completed = progress.filter((p) => p.completed).length;
      const total     = progress.length;
      return res.json({ data: progress, completed, total, pct: Math.round((completed / total) * 100) });
    }

    const { query } = require('../db');
    const completions = await query((sb) =>
      sb.from('training_completions').select('module_id').eq('user_id', req.params.user_id)
    );
    const completedIds = completions.map((c) => c.module_id);
    const modules = await query((sb) =>
      sb.from('training_modules').select('id,title,is_required,duration_mins,order').order('order')
    );
    const data = modules.map((m) => ({ ...m, completed: completedIds.includes(m.id) }));
    res.json({ data, completed: completedIds.length, total: modules.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
