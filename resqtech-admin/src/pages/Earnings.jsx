import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { api } from '../api';

const COLORS = ['#F97316','#DC2626','#D97706','#1D4ED8','#166534','#7C3AED','#0891B2','#BE185D'];

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Earnings() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['earnings-summary'],
    queryFn:  api.getEarningsSummary,
    refetchInterval: 10000,
  });
  const { data: ridesData } = useQuery({
    queryKey: ['earnings-rides'],
    queryFn:  api.getEarnings,
    refetchInterval: 8000,
  });

  const completeMutation = useMutation({
    mutationFn: (ride_id) => api.completeRide(ride_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['earnings-rides'] });
      qc.invalidateQueries({ queryKey: ['earnings-summary'] });
      qc.invalidateQueries({ queryKey: ['responders'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const summary = data?.data;
  const rides   = ridesData?.data ?? [];
  const active  = rides.filter((r) => r.status === 'active');
  const done    = rides.filter((r) => r.status === 'completed');

  if (isLoading || !summary) {
    return <div className="loading-center" style={{ height: '60vh' }}><div className="rangoli-spinner" /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Earnings Tracker</div>
        <div className="page-sub">Responder compensation, ride history, and UPI payouts</div>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Paid Out',  value: `₹${summary.total_paid_inr}`, icon: '💰', color: 'green'  },
          { label: 'Completed Rides', value: summary.total_rides,           icon: '✅', color: 'orange' },
          { label: 'Avg per Ride',    value: `₹${summary.avg_per_ride}`,    icon: '📊', color: 'blue'   },
          { label: 'Active Rides',    value: active.length,                 icon: '🔴', color: 'red'    },
        ].map((s) => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Active rides — complete button */}
      {active.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderTop: '3px solid var(--saffron)' }}>
          <div className="card-header">
            <span>🚗</span>
            <span className="card-title">Active Rides</span>
            <span className="badge badge-en_route" style={{ marginLeft: 'auto' }}>{active.length} in progress</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Responder</th>
                  <th>Village</th>
                  <th>Distance</th>
                  <th>Earnings</th>
                  <th>Started</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {active.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.responder_name}</td>
                    <td>{r.village}</td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: 12 }}>{r.distance_km} km</td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: 13, fontWeight: 700, color: 'var(--earth)' }}>₹{r.total_inr}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(r.pickup_time)}</td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => completeMutation.mutate(r.id)}
                        disabled={completeMutation.isPending}
                      >
                        {completeMutation.isPending ? '...' : '✓ Complete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="two-col" style={{ marginBottom: 20 }}>
        {/* 7-day earnings trend */}
        <div className="card">
          <div className="card-header"><span>📈</span><span className="card-title">7-Day Earnings Trend</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary.trend} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D3" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#78716C' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716C' }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(v) => [`₹${v}`, 'Earnings']}
                  contentStyle={{ background: '#fff', border: '1px solid #F0E6D3', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="earnings" radius={[4, 4, 0, 0]}>
                  {summary.trend.map((_, i) => (
                    <Cell key={i} fill={i === summary.trend.length - 1 ? '#F97316' : '#FED7AA'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="card">
          <div className="card-header"><span>🏆</span><span className="card-title">Responder Leaderboard</span></div>
          <div className="card-body" style={{ padding: '8px 16px' }}>
            {summary.leaderboard.length === 0 ? (
              <div className="empty-state"><p>No completed rides yet</p></div>
            ) : summary.leaderboard.map((r, i) => (
              <div key={r.responder_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: COLORS[i % COLORS.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Mono', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{r.responder_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.total_rides} rides · {r.total_km} km</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Space Mono', fontWeight: 700, fontSize: 15, color: 'var(--green)' }}>₹{r.total_inr}</div>
                  <UpiButton name={r.responder_name} amount={r.total_inr} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Completed ride history */}
      <div className="card">
        <div className="card-header">
          <span>📋</span>
          <span className="card-title">Completed Ride History</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{done.length} rides</span>
        </div>
        {done.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🚗</div><p>No completed rides yet</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Responder</th>
                  <th>Village</th>
                  <th>Distance</th>
                  <th>Base</th>
                  <th>Bonus</th>
                  <th>Total</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {done.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="responder-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{r.responder_name?.charAt(0)}</div>
                        <span style={{ fontWeight: 600 }}>{r.responder_name}</span>
                      </div>
                    </td>
                    <td>{r.village}</td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: 12 }}>{r.distance_km} km</td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: 12 }}>₹{r.base_rate}</td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: 12, color: 'var(--green)' }}>+₹{r.distance_bonus}</td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: 13, fontWeight: 700, color: 'var(--earth)' }}>₹{r.total_inr}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(r.drop_time || r.pickup_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function UpiButton({ name, amount }) {
  function handleClick() {
    const url = `upi://pay?pa=resqtech@upi&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=ResQtech+Ride+Earnings`;
    window.open(url, '_blank');
  }
  return (
    <button
      onClick={handleClick}
      style={{ marginTop: 2, fontSize: 10, padding: '2px 8px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
    >
      💳 UPI
    </button>
  );
}
