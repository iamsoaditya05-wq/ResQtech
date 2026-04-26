import React from 'react';
import { useToastProvider } from '../hooks/useToast';

const TYPE_STYLES = {
  info:    { bg: 'var(--blue-light)',   color: 'var(--blue)',   icon: 'ℹ️' },
  success: { bg: 'var(--green-light)',  color: 'var(--green)',  icon: '✅' },
  warning: { bg: 'var(--amber-light)',  color: 'var(--amber)',  icon: '⚠️' },
  error:   { bg: 'var(--red-light)',    color: 'var(--red)',    icon: '🚨' },
  sos:     { bg: '#FEE2E2',             color: '#DC2626',       icon: '🆘' },
};

export default function Toaster() {
  const { toasts, remove } = useToastProvider();

  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      maxWidth: 360,
      width: '100%',
    }}>
      {toasts.map((t) => {
        const style = TYPE_STYLES[t.type] || TYPE_STYLES.info;
        return (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            style={{
              background: style.bg,
              color: style.color,
              border: `1.5px solid ${style.color}30`,
              borderRadius: 10,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              cursor: 'pointer',
              animation: 'slideInRight 0.25s ease',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>{style.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{t.message}</span>
            <span style={{ fontSize: 16, opacity: 0.5, flexShrink: 0, lineHeight: 1 }}>✕</span>
          </div>
        );
      })}
    </div>
  );
}
