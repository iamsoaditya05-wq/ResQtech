import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { socket } from '../socket';

const TYPE_ICONS = {
  emergency_assigned: '🚨',
  responder_matched:  '🚗',
  ride_completed:     '✅',
  training_completed: '🎖️',
  system:             '⚙️',
};

const TYPE_COLORS = {
  emergency_assigned: 'var(--red)',
  responder_matched:  'var(--saffron)',
  ride_completed:     'var(--green)',
  training_completed: 'var(--blue)',
  system:             'var(--text-muted)',
};

const ALL_TYPES = ['emergency_assigned', 'responder_matched', 'ride_completed', 'training_completed', 'system'];

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Notifications() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter]     = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn:  api.getNotifications,
    refetchInterval: 10000,
  });

  const readAllMutation = useMutation({
    mutationFn: api.readAllNotifications,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const readOneMutation = useMutation({
    mutationFn: api.readNotification,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteNotification,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
    socket.on('notification:new', refresh);
    return () => socket.off('notification:new', refresh);
  }, [qc]);

  const all   = data?.data ?? [];
  const unread = data?.unread ?? 0;

  let filtered = all;
  if (typeFilter)    filtered = filtered.filter(n => n.type === typeFilter);
  if (channelFilter) filtered = filtered.filter(n => n.channel === channelFilter);
  if (showUnreadOnly) filtered = filtered.filter(n => !n.read);

  const grouped = filtered.reduce((acc, n) => {
    const d = new Date(n.sent_at).toDateString();
    if (!acc[d]) acc[d] = [];
    acc[d].push(n);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Notifications</div>
          <div className="page-sub">System alerts, SMS events, and responder updates</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unread > 0 && (
            <button className="btn btn-outline btn-sm" onClick={() => readAllMutation.mutate()}>
              ✓ Mark all read ({unread})
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total',    value: all.length,                                  icon: '🔔', color: 'orange' },
          { label: 'Unread',   value: unread,                                       icon: '🔴', color: unread > 0 ? 'red' : 'green' },
          { label: 'Push',     value: all.filter(n => n.channel === 'push').length, icon: '📱', color: 'blue'   },
          { label: 'SMS',      value: all.filter(n => n.channel === 'sms').length,  icon: '📨', color: 'amber'  },
        ].map((s) => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="form-select" style={{ width: 'auto', padding: '7px 10px' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>{TYPE_ICONS[t]} {t.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <select className="form-select" style={{ width: 'auto', padding: '7px 10px' }} value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
          <option value="">All channels</option>
          <option value="push">📱 Push</option>
          <option value="sms">📨 SMS</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={showUnreadOnly} onChange={(e) => setShowUnreadOnly(e.target.checked)} style={{ accentColor: 'var(--saffron)' }} />
          Unread only
        </label>

        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {filtered.length} notifications
        </span>
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="rangoli-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">🔕</div><p>No notifications{typeFilter || channelFilter || showUnreadOnly ? ' matching filters' : ''}</p></div></div>
      ) : (
        Object.entries(grouped).map(([day, items]) => (
          <div key={day} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8, paddingLeft: 4 }}>
              {day === new Date().toDateString() ? 'Today' : day}
            </div>
            <div className="card">
              {items.map((n, i) => (
                <div
                  key={n.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '14px 16px',
                    borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                    background: n.read ? 'transparent' : 'rgba(249,115,22,0.04)',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Icon */}
                  <div
                    onClick={() => !n.read && readOneMutation.mutate(n.id)}
                    style={{ width: 36, height: 36, borderRadius: '50%', background: `${TYPE_COLORS[n.type] || 'var(--text-muted)'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, cursor: n.read ? 'default' : 'pointer' }}
                  >
                    {TYPE_ICONS[n.type] || '🔔'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: 'var(--text)', lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(n.sent_at)}</span>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: n.channel === 'sms' ? 'var(--amber-light)' : 'var(--blue-light)', color: n.channel === 'sms' ? 'var(--amber)' : 'var(--blue)', fontWeight: 600, textTransform: 'uppercase' }}>
                        {n.channel}
                      </span>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'var(--sand)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                        {n.type?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {!n.read && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--saffron)' }} />
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(n.id)}
                      disabled={deleteMutation.isPending}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '2px 4px', borderRadius: 4, lineHeight: 1 }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
