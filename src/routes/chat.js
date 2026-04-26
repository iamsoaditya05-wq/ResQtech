const express = require('express');
const router  = express.Router();

// POST /api/chat — AI-assisted emergency guidance chat
router.post('/', async (req, res, next) => {
  try {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    // If Anthropic SDK is configured, use it; otherwise return a canned response
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.json({
        reply: 'AI chat is not configured. Please set ANTHROPIC_API_KEY to enable this feature.',
        demo:  true,
      });
    }

    const Anthropic = require('@anthropic-ai/sdk');
    const client    = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

    const systemPrompt = `You are ResQtech AI, an emergency medical guidance assistant for rural India.
You help first responders and dispatchers with:
- Triage guidance and severity assessment
- First aid instructions in simple language
- Emergency protocol advice
- Responder coordination tips

Keep responses concise, practical, and appropriate for field use.
${context ? `Current context: ${JSON.stringify(context)}` : ''}`;

    const response = await client.messages.create({
      model:      'claude-3-haiku-20240307',
      max_tokens: 512,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: message }],
    });

    res.json({ reply: response.content[0]?.text || 'No response generated.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
