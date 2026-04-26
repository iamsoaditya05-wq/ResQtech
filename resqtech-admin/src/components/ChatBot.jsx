import React, { useState, useRef, useEffect } from 'react';
import { useLang } from '../i18n/LanguageContext';

const SYSTEM_PROMPT = `You are ResQtech Assistant, an AI helper for the ResQtech emergency ambulance dispatch system in rural India.
You help dispatchers, hospital staff, and responders with:
- Understanding emergency status and triage
- Explaining how the relay transport system works
- Answering questions about responder availability
- Providing first aid guidance
- Explaining earnings and training
- General queries about the ResQtech platform

Keep answers concise (2-4 sentences). If asked in Hindi or Marathi, respond in that language.
Always be calm, clear, and helpful — lives may depend on quick answers.`;

const QUICK_QUESTIONS = {
  en: [
    'How does auto-matching work?',
    'What is relay transport?',
    'How to trigger an SOS?',
    'What is severity level 1?',
  ],
  hi: [
    'ऑटो-मैचिंग कैसे काम करती है?',
    'रिले ट्रांसपोर्ट क्या है?',
    'SOS कैसे भेजें?',
    'गंभीरता स्तर 1 क्या है?',
  ],
  mr: [
    'ऑटो-मॅचिंग कसे काम करते?',
    'रिले वाहतूक म्हणजे काय?',
    'SOS कसे पाठवायचे?',
    'तीव्रता पातळी 1 म्हणजे काय?',
  ],
};

// Fallback answers when no Claude key
const FALLBACK = {
  'auto-match': 'Auto-matching finds the nearest available responder using weighted scoring — distance, training status, and vehicle type. Cardiac/delivery cases prefer cars.',
  'relay': 'Relay transport splits a long journey into legs. Two responders are assigned — one picks up the patient, hands off at a midpoint, and the second takes them to hospital.',
  'sos': 'Click "TRIGGER SOS" on the Dashboard, select village and emergency type. The system auto-matches the nearest responder within seconds.',
  'severity': 'Severity 1 = Critical (life-threatening, immediate CPR/action needed). Severity 5 = Minimal (walk-in, no immediate risk).',
  'default': 'I\'m ResQtech Assistant. I can help with emergency dispatch, triage, relay transport, responder management, and training. What would you like to know?',
};

function getFallback(msg) {
  const m = msg.toLowerCase();
  if (m.includes('match') || m.includes('assign')) return FALLBACK['auto-match'];
  if (m.includes('relay') || m.includes('transport')) return FALLBACK['relay'];
  if (m.includes('sos') || m.includes('trigger') || m.includes('emergency')) return FALLBACK['sos'];
  if (m.includes('severity') || m.includes('critical') || m.includes('level')) return FALLBACK['severity'];
  return FALLBACK['default'];
}

export default function ChatBot() {
  const { t, lang } = useLang();
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Namaste! I\'m ResQtech Assistant 🚑 How can I help you today? You can ask in English, हिंदी, or मराठी.' }
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking]   = useState(false);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function sendMessage(text) {
    if (!text.trim()) return;
    const userMsg = text.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      // Try Claude API via backend
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: `[CHATBOT] ${userMsg}`, emergencyType: 'general' }),
      });

      // Use a dedicated chat endpoint if available, else fallback
      let reply = getFallback(userMsg);

      // Try the chat endpoint
      try {
        const chatRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMsg, lang }),
        });
        if (chatRes.ok) {
          const data = await chatRes.json();
          reply = data.reply || reply;
        }
      } catch (_) {}

      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
      speakText(reply);
    } catch (err) {
      const reply = getFallback(userMsg);
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
      speakText(reply);
    } finally {
      setLoading(false);
    }
  }

  function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.onstart = () => setSpeaking(true);
    utter.onend   = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input not supported in this browser. Try Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart  = () => setListening(true);
    recognition.onend    = () => setListening(false);
    recognition.onerror  = () => setListening(false);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      sendMessage(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  const quickQs = QUICK_QUESTIONS[lang] || QUICK_QUESTIONS.en;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--saffron)', color: '#fff',
          border: 'none', cursor: 'pointer',
          fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(249,115,22,0.5)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          transform: open ? 'scale(0.9)' : 'scale(1)',
        }}
        title={t('chatbotTitle')}
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 92, right: 24, zIndex: 1999,
          width: 360, maxWidth: 'calc(100vw - 32px)',
          height: 520, maxHeight: 'calc(100vh - 120px)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          animation: 'slideInRight 0.25s ease',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, var(--earth) 0%, var(--saffron-dark) 100%)',
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              🤖
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{t('chatbotTitle')}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{t('chatbotSub')}</div>
            </div>
            {speaking && (
              <button onClick={stopSpeaking} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, padding: '4px 8px', color: '#fff', cursor: 'pointer', fontSize: 12 }}>
                🔇 Stop
              </button>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--saffron-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginRight: 6, alignSelf: 'flex-end' }}>
                    🤖
                  </div>
                )}
                <div style={{
                  maxWidth: '78%',
                  padding: '9px 13px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? 'var(--saffron)' : 'var(--sand)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--saffron-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
                <div style={{ background: 'var(--sand)', padding: '9px 14px', borderRadius: '16px 16px 16px 4px', fontSize: 13, color: 'var(--text-muted)' }}>
                  <span style={{ display: 'inline-flex', gap: 3 }}>
                    {[0,1,2].map(i => (
                      <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--saffron)', display: 'inline-block', animation: `bounce 1s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick questions */}
          {messages.length <= 1 && (
            <div style={{ padding: '0 14px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {quickQs.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  style={{
                    padding: '4px 10px', fontSize: 11, fontWeight: 600,
                    border: '1.5px solid var(--saffron)', borderRadius: 20,
                    background: 'var(--saffron-light)', color: 'var(--saffron-dark)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              style={{
                flex: 1, padding: '9px 12px', borderRadius: 20,
                border: '1.5px solid var(--border-dark)',
                background: 'var(--sand)', fontSize: 13,
                fontFamily: 'inherit', outline: 'none', color: 'var(--text)',
              }}
              placeholder={listening ? t('listening') : t('typeMessage')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage(input)}
              disabled={loading || listening}
            />

            {/* Voice button */}
            <button
              onClick={listening ? stopListening : startListening}
              disabled={loading}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none',
                background: listening ? 'var(--red)' : 'var(--sand)',
                color: listening ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                animation: listening ? 'pulse-dot 1s infinite' : 'none',
              }}
              title={listening ? 'Stop listening' : 'Voice input'}
            >
              {listening ? '⏹' : '🎤'}
            </button>

            {/* Send button */}
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none',
                background: input.trim() ? 'var(--saffron)' : 'var(--border)',
                color: '#fff', cursor: input.trim() ? 'pointer' : 'default',
                fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.15s',
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
}
