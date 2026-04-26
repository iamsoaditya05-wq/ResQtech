import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useLang } from '../i18n/LanguageContext';

const PAGE_KEYS = {
  '/':              { title: 'liveDashboard',  sub: 'Real-time emergency monitoring'           },
  '/hospitals':     { title: 'hospitals',       sub: 'Bed availability management'              },
  '/responders':    { title: 'responders',      sub: 'Fleet tracking & status'                  },
  '/analytics':     { title: 'analytics',       sub: 'Response metrics & trends'                },
  '/triage':        { title: 'aiTriage',        sub: 'Claude-powered medical assessment'        },
  '/earnings':      { title: 'earnings',        sub: 'Responder compensation & UPI payouts'     },
  '/training':      { title: 'training',        sub: 'First aid modules for rural responders'   },
  '/notifications': { title: 'notifications',   sub: 'System alerts & SMS events'               },
  '/register':      { title: 'register',        sub: 'Onboard new community responders'         },
  '/audit':         { title: 'auditLog',        sub: 'All system actions and events'            },
  '/settings':      { title: 'settings',        sub: 'System configuration & integrations'      },
  '/history':       { title: 'history',         sub: 'Full searchable record of all emergencies'},
};

export default function Header({ onMenuClick }) {
  const { pathname }          = useLocation();
  const { t, lang, changeLang, languages } = useLang();
  const pageMeta = PAGE_KEYS[pathname] || PAGE_KEYS['/'];

  const [time, setTime]           = useState(new Date());
  const [langOpen, setLangOpen]   = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: notifData } = useQuery({ queryKey: ['notifications'], queryFn: api.getNotifications });
  const unread = notifData?.unread ?? 0;

  const timeStr = time.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

  const currentLang = languages.find((l) => l.code === lang) || languages[0];

  return (
    <header className="header">
      <button className="hamburger-btn" onClick={onMenuClick} aria-label="Open menu">☰</button>

      <div>
        <div className="header-title">{t(pageMeta.title)}</div>
        <div className="header-sub">{pageMeta.sub}</div>
      </div>

      <div className="header-spacer" />

      {/* Language switcher */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setLangOpen((o) => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 8,
            border: '1.5px solid var(--border-dark)',
            background: 'var(--sand)', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: 'var(--earth)',
            fontFamily: 'inherit',
          }}
        >
          <span>{currentLang.flag}</span>
          <span>{currentLang.label}</span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
        </button>

        {langOpen && (
          <div style={{
            position: 'absolute', top: '110%', right: 0, zIndex: 500,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: 'var(--shadow-lg)',
            minWidth: 130, overflow: 'hidden',
          }}>
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => { changeLang(l.code); setLangOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '9px 14px',
                  background: l.code === lang ? 'var(--saffron-light)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: l.code === lang ? 700 : 400,
                  color: l.code === lang ? 'var(--saffron-dark)' : 'var(--text)',
                  fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
                {l.code === lang && <span style={{ marginLeft: 'auto', fontSize: 12 }}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {unread > 0 && (
        <div style={{
          background: 'var(--red)', color: '#fff',
          borderRadius: '50%', width: 22, height: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>
          {unread}
        </div>
      )}

      <div className="live-indicator">
        <div className="live-dot" />
        LIVE
      </div>
      <div className="header-time">{timeStr} IST</div>
    </header>
  );
}
