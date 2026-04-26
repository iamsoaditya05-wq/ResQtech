import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { socket } from '../socket';
import { useLang } from '../i18n/LanguageContext';

export default function Sidebar({ open, onClose }) {
  const { t } = useLang();
  const { data: activeData } = useQuery({ queryKey: ['active'],        queryFn: api.getActiveEmergencies, refetchInterval: 5000 });
  const { data: notifData  } = useQuery({ queryKey: ['notifications'], queryFn: api.getNotifications,    refetchInterval: 8000 });

  const activeCount = activeData?.count ?? 0;
  const unreadCount = notifData?.unread  ?? 0;

  const [connected, setConnected] = useState(socket.connected);
  useEffect(() => {
    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect',    onConnect);
    socket.on('disconnect', onDisconnect);
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); };
  }, []);

  const NAV_MAIN = [
    { to: '/',              icon: '🗺️', key: 'liveDashboard'  },
    { to: '/hospitals',     icon: '🏥', key: 'hospitals'       },
    { to: '/responders',    icon: '🚗', key: 'responders'      },
    { to: '/analytics',     icon: '📊', key: 'analytics'       },
    { to: '/earnings',      icon: '💰', key: 'earnings'        },
    { to: '/training',      icon: '🎓', key: 'training'        },
    { to: '/triage',        icon: '🤖', key: 'aiTriage'        },
    { to: '/notifications', icon: '🔔', key: 'notifications'   },
    { to: '/history',       icon: '📜', key: 'history'         },
  ];

  const NAV_ADMIN = [
    { to: '/register', icon: '➕', key: 'register'  },
    { to: '/audit',    icon: '📋', key: 'auditLog'  },
    { to: '/settings', icon: '⚙️', key: 'settings'  },
  ];

  return (
    <aside className={`sidebar${open ? ' sidebar-mobile-open' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">🚑</div>
          <div>
            <div className="logo-text">ResQtech</div>
            <div className="logo-sub">Admin Console</div>
          </div>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">✕</button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Operations</div>
        {NAV_MAIN.map(({ to, icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            onClick={onClose}
          >
            <span className="nav-icon">{icon}</span>
            <span>{t(key)}</span>
            {to === '/' && activeCount > 0 && (
              <span className="nav-badge">{activeCount}</span>
            )}
            {to === '/notifications' && unreadCount > 0 && (
              <span className="nav-badge">{unreadCount}</span>
            )}
          </NavLink>
        ))}

        <div className="nav-section-label" style={{ marginTop: 8 }}>Admin</div>
        {NAV_ADMIN.map(({ to, icon, key }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            onClick={onClose}
          >
            <span className="nav-icon">{icon}</span>
            <span>{t(key)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="demo-badge">
          <div className="demo-dot" />
          DEMO MODE
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: connected ? '#86efac' : 'rgba(255,255,255,0.35)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#4ade80' : '#6b7280', flexShrink: 0 }} />
          {connected ? 'Socket connected' : 'Socket offline'}
        </div>
      </div>
    </aside>
  );
}
