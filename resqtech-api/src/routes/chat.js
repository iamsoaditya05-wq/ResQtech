const express = require('express');
const router  = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');

const SYSTEM = `You are ResQtech Assistant, an AI helper for the ResQtech emergency ambulance dispatch system in rural India.
You help dispatchers, hospital staff, and responders with:
- Emergency status, triage, and first aid
- Relay transport system
- Responder availability and matching
- Earnings and training
- General platform queries

Keep answers concise (2-4 sentences max). 
If the user writes in Hindi, respond in Hindi. If Marathi, respond in Marathi. Otherwise English.
Always be calm, clear, and helpful.`;

const FALLBACKS = {
  match:    'Auto-matching finds the nearest available responder using weighted scoring — distance, training status, and vehicle type. Cardiac/delivery cases prefer cars over bikes.',
  relay:    'Relay transport splits a long journey into legs. Two responders are assigned — one picks up the patient, hands off at a midpoint, and the second takes them to hospital.',
  sos:      'Click "TRIGGER SOS" on the Dashboard, select village and emergency type. The system auto-matches the nearest responder within seconds. SMS SOS also works: send "SOS Shirur" to the Twilio number.',
  severity: 'Severity 1 = Critical (life-threatening, immediate action). Severity 2 = Serious. Severity 3 = Moderate. Severity 4 = Minor. Severity 5 = Minimal (walk-in).',
  triage:   'AI triage uses Claude to assess symptoms and assign severity 1-5. It generates first aid steps in Hindi and recommends the right hospital department.',
  earnings: 'Responders earn ₹50 base rate + ₹5 per km. After completing a ride, earnings are credited and can be paid via UPI deep link.',
  training: 'Responders must complete 2 required modules (CPR, Trauma) to earn the Responder Badge. Optional modules include Childbirth, Snake Bite, and Heat Stroke.',
  default:  'I\'m ResQtech Assistant 🚑 I can help with emergency dispatch, triage, relay transport, responder management, earnings, and training. What would you like to know?',
};

function getFallback(msg) {
  const m = msg.toLowerCase();
  if (m.includes('match') || m.includes('assign') || m.includes('nearest')) return FALLBACKS.match;
  if (m.includes('relay') || m.includes('transport') || m.includes('handoff')) return FALLBACKS.relay;
  if (m.includes('sos') || m.includes('trigger') || m.includes('emergency') || m.includes('dispatch')) return FALLBACKS.sos;
  if (m.includes('severity') || m.includes('critical') || m.includes('level') || m.includes('triage score')) return FALLBACKS.severity;
  if (m.includes('triage') || m.includes('claude') || m.includes('ai') || m.includes('assess')) return FALLBACKS.triage;
  if (m.includes('earn') || m.includes('pay') || m.includes('upi') || m.includes('money')) return FALLBACKS.earnings;
  if (m.includes('train') || m.includes('module') || m.includes('badge') || m.includes('cpr')) return FALLBACKS.training;
  return FALLBACKS.default;
}

// POST /api/chat
router.post('/', asyncHandler(async (req, res) => {
  const { message, lang = 'en' } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  // Try Claude if key is set
  if (process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant')) {
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const client    = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const langHint = lang === 'hi' ? ' (Respond in Hindi)' : lang === 'mr' ? ' (Respond in Marathi)' : '';

      const response = await client.messages.create({
        model:      'claude-sonnet-4-5-20251001',
        max_tokens: 300,
        system:     SYSTEM + langHint,
        messages:   [{ role: 'user', content: message }],
      });

      return res.json({ reply: response.content[0].text, source: 'claude' });
    } catch (err) {
      console.error('[CHAT] Claude error:', err.message);
    }
  }

  // Fallback
  res.json({ reply: getFallback(message), source: 'fallback' });
}));

module.exports = router;
