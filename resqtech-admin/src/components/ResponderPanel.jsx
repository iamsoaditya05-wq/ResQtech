import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ResponderPanel({ responder, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['responder-history', responder.user_id],
    queryFn:  () => api.getResponderHistory(responder.user_id),
  });

  const history = data?.data;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      display: 'flex', justifyContent: 'flex-end',
    }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 420,
        background: 'var(--bg-card)',
        height: '100%',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
        animation: 'slideInRight 0.25s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="responder-avatar" style={{ width: 48, height: 48, fontSize: 20 }}>
            {responder.name.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--earth)' }}>{responder.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {responder.vehicle_type === 'car' ? '🚗' : '🏍️'} {responder.vehicle_type} ·
              <span className={`badge badge-${responder.is_available ? 'online' : 'offline'}`} style={{ marginLeft: 6 }}>
                {responder.is_available ? '● Online' : '○ Offline'}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {isLoading ? (
            <div className="loading-center"><div className="rangoli-spinner" /></div>
          ) : !history ? (
            <div className="empty-state"><p>No history found</p></div>
          ) : (
            <>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Total Rides',    value: history.stats.total_rides,    icon: '🚗' },
                  { label: 'Total Earnings', value: `₹${history.stats.total_earnings}`, icon: '💰' },
                  { label: 'Total Distance', value: `${history.stats.total_km} km`, icon: '📍' },
                  { label: 'Avg per Ride',   value: `₹${history.stats.avg_per_ride}`, icon: '📊' },
                ].map(({ label, value, icon }) => (
                  <div key={label} style={{ background: 'var(--sand)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                    <div style={{ fontFamily: 'Space Mono', fontWeight: 700, fontSize: 16, color: 'var(--earth)' }}>{value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Location */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>Current Location</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <code style={{ fontFamily: 'Space Mono', fontSize: 12, background: 'var(--sand)', padding: '4px 8px', borderRadius: 6, color: 'var(--earth)' }}>
                    {responder.lat?.toFixed(5)}, {responder.lng?.toFixed(5)}
                  </code>
                  <a
                    href={`https://maps.google.com/?q=${responder.lat},${responder.lng}`}
                    target="_blank" rel="noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    🗺️ View
                  </a>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Last seen: {timeAgo(responder.last_seen)}
                </div>
              </div>

              {/* Ride history */}
              <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
                Ride History ({history.rides.length})
              </div>
              {history.rides.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>No rides yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {history.rides.slice(0, 8).map((ride) => (
                    <div key={ride.id} style={{ padding: '10px 12px', background: 'var(--sand)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{ride.village}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {ride.distance_km} km · {timeAgo(ride.pickup_time)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Space Mono', fontWeight: 700, color: 'var(--green)', fontSize: 14 }}>₹{ride.total_inr}</div>
                        <span className={`badge badge-${ride.status === 'completed' ? 'done' : 'en_route'}`} style={{ fontSize: 10 }}>
                          {ride.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Emergency history */}
              <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
                Emergency History ({history.emergencies.length})
              </div>
              {history.emergencies.slice(0, 5).map((em) => (
                <div key={em.id} style={{ padding: '8px 12px', background: 'var(--sand)', borderRadius: 8, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{em.patient_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{em.type} · {em.village} · {timeAgo(em.created_at)}</div>
                  </div>
                  <span className={`badge badge-${em.status}`}>{em.status}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
