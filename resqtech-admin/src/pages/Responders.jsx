import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { socket } from '../socket';
import MapView from '../components/MapView';
import ResponderPanel from '../components/ResponderPanel';

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// Simulate GPS drift for demo — nudges a responder's position slightly every 4s
function useGpsDrift(responders, enabled) {
  const qc = useQueryClient();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !responders.length) return;

    timerRef.current = setInterval(() => {
      // Pick a random available responder
      const available = responders.filter((r) => r.is_available);
      if (!available.length) return;
      const r = available[Math.floor(Math.random() * available.length)];
      const newLat = r.lat + (Math.random() - 0.5) * 0.003;
      const newLng = r.lng + (Math.random() - 0.5) * 0.003;
      api.updateResponderLocation(r.user_id, newLat, newLng)
        .then(() => qc.invalidateQueries({ queryKey: ['responders'] }))
        .catch(() => {});
    }, 4000);

    return () => clearInterval(timerRef.current);
  }, [responders, enabled, qc]);
}

export default function Responders() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['responders'],
    queryFn:  api.getResponders,
    refetchInterval: 5000,
  });
  const responders = data?.data ?? [];

  // Real-time location updates via socket
  useEffect(() => {
    function onLocation({ user_id, lat, lng }) {
      qc.setQueryData(['responders'], (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((r) =>
            r.user_id === user_id ? { ...r, lat, lng, last_seen: new Date().toISOString() } : r
          ),
        };
      });
    }
    socket.on('responder:location', onLocation);
    return () => socket.off('responder:location', onLocation);
  }, [qc]);

  // GPS drift simulation (demo)
  useGpsDrift(responders, true);

  const availMutation = useMutation({
    mutationFn: ({ id, available }) => api.updateResponderAvail(id, available),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['responders'] }),
  });

  const [selectedResponder, setSelectedResponder] = useState(null);

  const online  = responders.filter((r) => r.is_available);
  const offline = responders.filter((r) => !r.is_available);

  return (
    <div>
      {selectedResponder && (
        <ResponderPanel responder={selectedResponder} onClose={() => setSelectedResponder(null)} />
      )}
      <div className="page-header">
        <div className="page-title">Responder Fleet</div>
        <div className="page-sub">Live tracking · availability management · GPS updates every 4s</div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Online & Available', value: online.length,                                        icon: '🟢', color: 'green'  },
          { label: 'Offline / Busy',     value: offline.length,                                       icon: '🔴', color: 'red'    },
          { label: 'Bikes',              value: responders.filter(r => r.vehicle_type === 'bike').length, icon: '🏍️', color: 'orange' },
          { label: 'Cars',               value: responders.filter(r => r.vehicle_type === 'car').length,  icon: '🚗', color: 'blue'   },
        ].map((s) => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="two-col">
        {/* Responder table */}
        <div className="card">
          <div className="card-header">
            <span>🚗</span>
            <span className="card-title">All Responders</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
              Toggle to go online/offline
            </span>
          </div>
          {isLoading ? (
            <div className="loading-center"><div className="rangoli-spinner" /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Responder</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Last Seen</th>
                    <th>Location</th>
                    <th>Toggle</th>
                  </tr>
                </thead>
                <tbody>
                  {responders.map((r) => (
                    <tr key={r.user_id} style={{ cursor: 'pointer' }} onClick={() => setSelectedResponder(r)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="responder-avatar">{r.name.charAt(0)}</div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{r.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {r.vehicle_type === 'car' ? '🚗' : '🏍️'} {r.vehicle_type}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 18 }}>{r.vehicle_type === 'car' ? '🚗' : '🏍️'}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${r.is_available ? 'online' : 'offline'}`}>
                          {r.is_available ? '● Online' : '○ Offline'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'Space Mono', fontSize: 11, color: 'var(--text-muted)' }}>
                        {timeAgo(r.last_seen)}
                      </td>
                      <td style={{ fontFamily: 'Space Mono', fontSize: 11, color: 'var(--text-muted)' }}>
                        {r.lat?.toFixed(4)}, {r.lng?.toFixed(4)}
                      </td>
                      <td>
                        <button
                          onClick={() => availMutation.mutate({ id: r.user_id, available: !r.is_available })}
                          disabled={availMutation.isPending}
                          style={{
                            padding: '4px 12px',
                            fontSize: 11,
                            fontWeight: 700,
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            background: r.is_available ? 'var(--red-light)' : 'var(--green-light)',
                            color: r.is_available ? 'var(--red)' : 'var(--green)',
                            fontFamily: 'inherit',
                            transition: 'all 0.15s',
                          }}
                        >
                          {r.is_available ? 'Go Offline' : 'Go Online'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live map */}
        <div className="card">
          <div className="card-header">
            <span>📍</span>
            <span className="card-title">Live Positions</span>
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--green)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse-dot 1.5s infinite' }} />
              GPS updating
            </span>
          </div>
          <div className="card-body" style={{ padding: '12px 16px' }}>
            <MapView emergencies={[]} responders={responders} hospitals={[]} height={420} />
          </div>
        </div>
      </div>

      {/* Availability breakdown */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <span>📊</span>
          <span className="card-title">Fleet Availability Breakdown</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {['bike', 'car'].map((vtype) => {
              const group    = responders.filter(r => r.vehicle_type === vtype);
              const avail    = group.filter(r => r.is_available).length;
              const pct      = group.length ? Math.round((avail / group.length) * 100) : 0;
              const barColor = pct > 60 ? 'var(--green)' : pct > 30 ? 'var(--amber)' : 'var(--red)';
              return (
                <div key={vtype} style={{ flex: '1 1 200px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                    <span>{vtype === 'car' ? '🚗 Cars' : '🏍️ Bikes'}</span>
                    <span style={{ fontFamily: 'Space Mono', color: barColor }}>{avail}/{group.length}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--border)', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4, transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{pct}% available</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
