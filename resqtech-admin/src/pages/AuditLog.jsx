import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

const ACTION_COLORS = {
  'emergency.created':        'var(--red)',
  'emergency.status_changed': 'var(--saffron)',
  'responder.matched':        'var(--blue)',
  'ride.completed':           'var(--green)',
  'training.completed':       'var(--green)',
  'system':                   'var(--text-muted)',
};

const ACTION_ICONS = {
  'emergency.created':        '🚨',
  'emergency.status_changed': '🔄',
  'responder.matched':        '🚗',
  'ride.completed':           '✅',
  'training.completed':       '🎖️',
};

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleString('en-IN');
}

export default function AuditLog() {
  const [filter, setFilter] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit', filter],
    queryFn:  () => api.getAuditLog(filter || null),
    refetchInterval: 10000,
  });

  const logs = data?.data ?? [];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Audit Log</div>
          <div className="page-sub">All system actions — emergencies, dispatches, completions</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '6px 10px' }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All actions</option>
            <option value="emergency">Emergencies</option>
            <option value="responder">Responders</option>
            <option value="ride">Rides</option>
            <option value="training">Training</option>
          </select>
          <button className="btn btn-outline btn-sm" onClick={() => refetch()}>↻ Refresh</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Events',      value: logs.length,                                                    icon: '📋', color: 'orange' },
          { label: 'Emergencies',       value: logs.filter(l => l.action.includes('emergency')).length,        icon: '🚨', color: 'red'    },
          { label: 'Status Changes',    value: logs.filter(l => l.action.includes('status')).length,           icon: '🔄', color: 'blue'   },
          { label: 'Rides Completed',   value: logs.filter(l => l.action.includes('ride')).length,             icon: '✅', color: 'green'  },
        ].map((s) => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span>📋</span>
          <span className="card-title">Event Timeline</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{logs.length} events</span>
        </div>

        {isLoading ? (
          <div className="loading-center"><div className="rangoli-spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No audit events yet. Trigger an SOS on the Dashboard to see events here.</p>
          </div>
        ) : (
          <div style={{ padding: '8px 0' }}>
            {logs.map((log, i) => {
              const color = ACTION_COLORS[log.action] || 'var(--text-muted)';
              const icon  = ACTION_ICONS[log.action] || '⚙️';
              return (
                <div key={log.id} style={{
                  display: 'flex', gap: 14, padding: '12px 20px',
                  borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none',
                  alignItems: 'flex-start',
                }}>
                  {/* Timeline dot */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${color}18`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                      {icon}
                    </div>
                    {i < logs.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: 4, minHeight: 16 }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--earth)', fontFamily: 'Space Mono' }}>
                        {log.action}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(log.created_at)}</span>
                      {log.actor && log.actor !== 'system' && (
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'var(--sand)', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {log.actor}
                        </span>
                      )}
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Space Mono', background: 'var(--sand)', padding: '4px 8px', borderRadius: 6, display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
