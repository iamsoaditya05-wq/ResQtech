const express = require('express');
const router  = express.Router();
const { state, uid } = require('../mockData');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate }     = require('../middleware/validate');
const { query }        = require('../db');

const DEMO = () => process.env.DEMO_MODE === 'true';

const MOCK_RESPONSES = {
  cardiac: {
    severity: 1,
    first_aid_steps: [
      'Call 108 immediately — do not delay',
      'Make patient sit or lie down comfortably',
      'Loosen tight clothing around chest and neck',
      'Do NOT give food or water',
      'If unconscious, start CPR: 30 compressions + 2 breaths',
      'Keep patient calm and still until help arrives',
    ],
    hospital_dept: 'Cardiac ICU / Emergency',
    hindi_message: 'मरीज को तुरंत अस्पताल ले जाएं। छाती पर दबाव डालें। पानी न दें।',
  },
  accident: {
    severity: 2,
    first_aid_steps: [
      'Do NOT move the patient — possible spine injury',
      'Control bleeding: press clean cloth firmly on wound',
      'Keep patient warm with a blanket',
      'Check breathing every 2 minutes',
      'Do not remove any object stuck in wound',
      'Talk to patient to keep them conscious',
    ],
    hospital_dept: 'Trauma / Orthopaedics',
    hindi_message: 'मरीज को हिलाएं नहीं। खून रोकें। गर्म रखें।',
  },
  delivery: {
    severity: 2,
    first_aid_steps: [
      'Keep mother lying down, legs slightly elevated',
      'Do NOT pull the baby — let nature take its course',
      'Keep area clean with fresh cloth',
      'Time contractions — if < 5 min apart, delivery is near',
      'After delivery, keep baby warm on mother\'s chest',
      'Do not cut cord without sterile scissors',
    ],
    hospital_dept: 'Maternity / Obstetrics',
    hindi_message: 'माँ को लेटाएं। साफ कपड़ा रखें। बच्चे को गर्म रखें।',
  },
  general: {
    severity: 3,
    first_aid_steps: [
      'Keep patient calm and comfortable',
      'Check for breathing and pulse',
      'Do not give any medication without doctor advice',
      'Note symptoms and time they started',
      'Keep patient hydrated if conscious',
    ],
    hospital_dept: 'General OPD / Emergency',
    hindi_message: 'मरीज को आराम दें। सांस और नाड़ी जांचें।',
  },
};

async function runClaude(emergencyType, age, symptoms) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client    = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model:      'claude-sonnet-4-5-20251001',
    max_tokens: 1024,
    system: `You are ResQtech's medical triage AI for rural India emergencies.
Respond ONLY with valid JSON — no markdown, no explanation:
{
  "severity": <integer 1-5, 1=critical 5=minimal>,
  "first_aid_steps": ["step1","step2","step3","step4","step5"],
  "hospital_dept": "<department>",
  "hindi_message": "<short Hindi instruction>"
}
Steps must be simple enough for an untrained rural volunteer. Max 6 steps.`,
    messages: [{
      role:    'user',
      content: `Patient age: ${age || 'unknown'}. Emergency: ${emergencyType}. Symptoms: ${symptoms}`,
    }],
  });

  return JSON.parse(response.content[0].text);
}

// ── POST /api/triage ──────────────────────────────────────────────────────────
router.post('/',
  validate({ symptoms: 'string' }),
  asyncHandler(async (req, res) => {
    const { symptoms, age, emergencyType = 'general', emergency_id } = req.body;

    let triageData;
    const hasClaudeKey = process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant');

    if (hasClaudeKey) {
      try {
        triageData = await runClaude(emergencyType, age, symptoms);
      } catch (err) {
        console.error('Claude error, using mock:', err.message);
        triageData = MOCK_RESPONSES[emergencyType] || MOCK_RESPONSES.general;
      }
    } else {
      triageData = MOCK_RESPONSES[emergencyType] || MOCK_RESPONSES.general;
    }

    const log = {
      id:           uid(),
      emergency_id: emergency_id || null,
      symptoms,
      age:          age || null,
      ...triageData,
      created_at:   new Date().toISOString(),
    };

    if (DEMO()) {
      state.triageLogs.unshift(log);
      if (emergency_id) {
        const em = state.emergencies.find((e) => e.id === emergency_id);
        if (em) em.severity = triageData.severity;
      }
    } else {
      await query((sb) => sb.from('triage_logs').insert({
        emergency_id:    log.emergency_id,
        ai_severity:     log.severity,
        first_aid_steps: log.first_aid_steps,
        hospital_dept:   log.hospital_dept,
        hindi_message:   log.hindi_message,
        vitals_json:     { symptoms, age },
      }));
      if (emergency_id) {
        await query((sb) =>
          sb.from('emergencies').update({ severity: triageData.severity }).eq('id', emergency_id)
        );
      }
    }

    res.json({ data: triageData, log_id: log.id });
  })
);

// ── GET /api/triage/:emergency_id ─────────────────────────────────────────────
router.get('/:emergency_id', asyncHandler(async (req, res) => {
  if (DEMO()) {
    const log = state.triageLogs.find((t) => t.emergency_id === req.params.emergency_id);
    if (!log) return res.status(404).json({ error: 'No triage log found' });
    return res.json({ data: log });
  }

  const data = await query((sb) =>
    sb.from('triage_logs').select('*').eq('emergency_id', req.params.emergency_id).order('created_at', { ascending: false }).limit(1).single()
  );
  res.json({ data });
}));

module.exports = router;
