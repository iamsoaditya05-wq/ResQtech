const express = require('express');
const router  = express.Router();
const { state, uid } = require('../mockData');
const { asyncHandler } = require('../middleware/errorHandler');
const { query }        = require('../db');

const DEMO = () => process.env.DEMO_MODE === 'true';

function emit(req, event, data) {
  const io = req.app.get('io');
  if (io) io.emit(event, data);
}

// ── GET /api/training ─────────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  if (DEMO()) {
    const modules = state.trainingModules
      .sort((a, b) => a.order - b.order)
      .map((m) => ({
        ...m,
        completion_count: m.completions.length,
        total_responders: state.respondersLive.length,
      }));
    return res.json({ data: modules, count: modules.length });
  }

  const [modules, completions, responderCount] = await Promise.all([
    query((sb) => sb.from('training_modules').select('*').order('order')),
    query((sb) => sb.from('training_completions').select('module_id')),
    query((sb) => sb.from('responders_live').select('user_id', { count: 'exact', head: true })),
  ]);

  const countMap = completions.reduce((acc, c) => { acc[c.module_id] = (acc[c.module_id] || 0) + 1; return acc; }, {});
  const data = modules.map((m) => ({
    ...m,
    completion_count: countMap[m.id] || 0,
    total_responders: responderCount?.length || 0,
  }));
  res.json({ data, count: data.length });
}));

// ── GET /api/training/progress/:user_id ──────────────────────────────────────
// Must be before /:id to avoid conflict
router.get('/progress/:user_id', asyncHandler(async (req, res) => {
  const { user_id } = req.params;

  if (DEMO()) {
    const modules = state.trainingModules.map((m) => ({
      id: m.id, title: m.title, is_required: m.is_required,
      completed: m.completions.includes(user_id), duration_mins: m.duration_mins,
    }));
    const completed   = modules.filter((m) => m.completed).length;
    const required    = modules.filter((m) => m.is_required);
    const reqDone     = required.filter((m) => m.completed).length;
    return res.json({
      data: {
        user_id, modules, completed, total: modules.length,
        required_completed: reqDone, required_total: required.length,
        badge_earned: reqDone === required.length,
        pct: Math.round((completed / modules.length) * 100),
      },
    });
  }

  const [modules, completions] = await Promise.all([
    query((sb) => sb.from('training_modules').select('id,title,is_required,duration_mins').order('order')),
    query((sb) => sb.from('training_completions').select('module_id').eq('user_id', user_id)),
  ]);

  const doneSet = new Set(completions.map((c) => c.module_id));
  const enriched = modules.map((m) => ({ ...m, completed: doneSet.has(m.id) }));
  const completed = enriched.filter((m) => m.completed).length;
  const required  = enriched.filter((m) => m.is_required);
  const reqDone   = required.filter((m) => m.completed).length;

  res.json({
    data: {
      user_id, modules: enriched, completed, total: enriched.length,
      required_completed: reqDone, required_total: required.length,
      badge_earned: reqDone === required.length,
      pct: Math.round((completed / enriched.length) * 100),
    },
  });
}));

// ── GET /api/training/:id ─────────────────────────────────────────────────────
router.get('/:id', asyncHandler(async (req, res) => {
  if (DEMO()) {
    const m = state.trainingModules.find((m) => m.id === req.params.id);
    if (!m) return res.status(404).json({ error: 'Module not found' });
    return res.json({ data: m });
  }

  const data = await query((sb) =>
    sb.from('training_modules').select('*').eq('id', req.params.id).single()
  );
  res.json({ data });
}));

// ── POST /api/training/:id/complete ──────────────────────────────────────────
router.post('/:id/complete', asyncHandler(async (req, res) => {
  const { user_id, quiz_score } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  if (DEMO()) {
    const m = state.trainingModules.find((m) => m.id === req.params.id);
    if (!m) return res.status(404).json({ error: 'Module not found' });
    if (!m.completions.includes(user_id)) m.completions.push(user_id);

    const requiredIds = state.trainingModules.filter((x) => x.is_required).map((x) => x.id);
    const allDone = requiredIds.every((rid) => {
      const mod = state.trainingModules.find((x) => x.id === rid);
      return mod?.completions.includes(user_id);
    });

    const user = state.users.find((u) => u.id === user_id);
    if (user && allDone) user.is_trained = true;

    const notif = {
      id: uid(), user_id,
      type: 'training_completed',
      message: `Module "${m.title}" completed${allDone ? ' 🎖️ Responder badge unlocked!' : ''}`,
      payload: { module_id: m.id, quiz_score },
      channel: 'push', sent_at: new Date().toISOString(), read: false,
    };
    state.notifications.unshift(notif);
    emit(req, 'notification:new', notif);

    return res.json({
      data: { module_id: m.id, user_id, badge_unlocked: allDone, quiz_score },
      message: allDone ? 'Module complete! Responder badge unlocked.' : 'Module complete!',
    });
  }

  // Upsert completion
  await query((sb) => sb.from('training_completions').upsert(
    { user_id, module_id: req.params.id, quiz_score, completed_at: new Date().toISOString() },
    { onConflict: 'user_id,module_id' }
  ));

  // Check badge
  const [required, completions] = await Promise.all([
    query((sb) => sb.from('training_modules').select('id').eq('is_required', true)),
    query((sb) => sb.from('training_completions').select('module_id').eq('user_id', user_id)),
  ]);
  const doneSet  = new Set(completions.map((c) => c.module_id));
  const allDone  = required.every((m) => doneSet.has(m.id));

  if (allDone) {
    await query((sb) => sb.from('users').update({ is_trained: true }).eq('id', user_id));
  }

  const notif = {
    user_id, type: 'training_completed',
    message: `Module completed${allDone ? ' 🎖️ Responder badge unlocked!' : ''}`,
    payload: { module_id: req.params.id, quiz_score },
    channel: 'push', sent_at: new Date().toISOString(), read: false,
  };
  await query((sb) => sb.from('notifications').insert(notif));
  emit(req, 'notification:new', notif);

  res.json({
    data: { module_id: req.params.id, user_id, badge_unlocked: allDone, quiz_score },
    message: allDone ? 'Module complete! Responder badge unlocked.' : 'Module complete!',
  });
}));

module.exports = router;
