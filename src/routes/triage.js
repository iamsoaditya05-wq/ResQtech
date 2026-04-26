const express = require('express');
const router  = express.Router();

const DEMO = () => process.env.DEMO_MODE === 'true';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// POST /api/triage — AI triage assessment
router.post('/', async (req, res, next) => {
  try {
    const { emergency_id, symptoms, type } = req.body;
    if (!emergency_id || !symptoms) {
      return res.status(400).json({ error: 'emergency_id and symptoms are required' });
    }

    // Severity scoring heuristic (1 = critical, 4 = minor)
    const criticalKeywords = ['cardiac', 'heart', 'unconscious', 'not breathing', 'chest pain'];
    const seriousKeywords  = ['accident', 'bleeding', 'fracture', 'trauma', 'head injury'];
    const moderateKeywords = ['delivery', 'labour', 'pregnancy', 'fever', 'vomiting'];

    const text = (symptoms + ' ' + (type || '')).toLowerCase();
    let severity = 4;
    if (criticalKeywords.some((k) => text.includes(k))) severity = 1;
    else if (seriousKeywords.some((k) => text.includes(k))) severity = 2;
    else if (moderateKeywords.some((k) => text.includes(k))) severity = 3;

    const firstAidMap = {
      1: ['Call 108 immediately', 'Keep patient still', 'Loosen tight clothing', 'Do not give water'],
      2: ['Control bleeding with cloth', 'Keep patient warm', 'Check breathing', 'Do not move spine'],
      3: ['Keep patient calm', 'Monitor breathing', 'Do not give food or water', 'Note time of onset'],
      4: ['Keep patient comfortable', 'Monitor vitals', 'Reassure patient', 'Await responder'],
    };

    const deptMap = {
      1: 'Cardiac ICU',
      2: 'Trauma',
      3: 'Maternity / General',
      4: 'General OPD',
    };

    const hindiMap = {
      1: 'मरीज को हिलाएं नहीं। तुरंत अस्पताल ले जाएं।',
      2: 'खून रोकें। मरीज को गर्म रखें।',
      3: 'मरीज को शांत रखें। खाना-पानी न दें।',
      4: 'मरीज को आराम दें। सहायता का इंतजार करें।',
    };

    const log = {
      id:              uid(),
      emergency_id,
      ai_severity:     severity,
      first_aid_steps: firstAidMap[severity],
      hospital_dept:   deptMap[severity],
      hindi_message:   hindiMap[severity],
      created_at:      new Date().toISOString(),
    };

    if (DEMO()) {
      const { state } = require('../mockData');
      state.triageLogs.unshift(log);
    } else {
      const { query } = require('../db');
      await query((sb) => sb.from('triage_logs').insert(log));
    }

    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
});

// GET /api/triage/:emergency_id
router.get('/:emergency_id', async (req, res, next) => {
  try {
    if (DEMO()) {
      const { state } = require('../mockData');
      const log = state.triageLogs.find((t) => t.emergency_id === req.params.emergency_id);
      if (!log) return res.status(404).json({ error: 'Triage log not found' });
      return res.json(log);
    }

    const { query } = require('../db');
    const [log] = await query((sb) =>
      sb
        .from('triage_logs')
        .select('*')
        .eq('emergency_id', req.params.emergency_id)
        .order('created_at', { ascending: false })
        .limit(1)
    );
    if (!log) return res.status(404).json({ error: 'Triage log not found' });
    res.json(log);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
