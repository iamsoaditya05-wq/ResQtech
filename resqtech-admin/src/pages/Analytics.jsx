import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../api';

const COLORS     = ['#F97316','#DC2626','#D97706','#1D4ED8','#166534','#7C3AED'];
const SEV_COLORS = { 1: '#DC2626', 2: '#EA580C', 3: '#D97706', 4: '#1D4ED8', 5: '#166534' };

// Hourly distribution mock (realistic rural India pattern)
const HOURLY = [
  { hour: '00', count: 1 }, { hour: '01', count: 0 }, { hour: '02', count: 1 },
  { hour: '03', count: 0 }, { hour: '04', count: 1 }, { hour: '05', count: 2 },
  { hour: '06', count: 3 }, { hour: '07', count: 4 }, { hour: '08', count: 5 },
  { hour: '09', count: 6 }, { hour: '10', count: 5 }, { hour: '11', count: 4 },
  { hour: '12', count: 7 }, { hour: '13', count: 5 }, { hour: '14', count: 4 },
  { hour: '15', count: 3 }, { hour: '16', count: 4 }, { hour: '17', count: 6 },
  { hour: '18', count: 8 }, { hour: '19', count: 7 }, { hour: '20', count: 5 },
  { hour: '21', count: 4 }, { hour: '22', count: 3 }, { hour: '23', count: 2 },
];

// Village-level distribution
const VILLAGE_DATA = [
  { village: 'Shirur',   emergencies: 12, resolved: 11, avg_eta: 4  },
  { village: 'Daund',    emergencies: 9,  resolved: 8,  avg_eta: 7  },
  { village: 'Baramati', emergencies: 15, resolved: 13, avg_eta: 6  },
  { village: 'Indapur',  emergencies: 6,  resolved: 6,  avg_eta: 12 },
  { village: 'Junnar',   emergencies: 8,  resolved: 7,  avg_eta: 9  },
  { village: 'Khed',     emergencies: 5,  resolved: 5,  avg_eta: 8  },
  { village: 'Bhor',     emergencies: 4,  resolved: 3,  avg_eta: 14 },
  { village: 'Maval',    emergencies: 3,  resolved: 3,  avg_eta: 11 },
];

export default function Analytics() {
  const [tab, setTab] = useState('overview');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn:  api.getAnalytics,
    refetchInterval: 15000,
  });
  const d = data?.data;

  if (isLoading || !d) {
    return (
      <div className="loading-center" style={{ height: '60vh' }}>
        <div className="rangoli-spinner" />
        <span>Loading analytics...</span>
      </div>
    );
  }

  const { summary, by_type, by_severity, trend, response_time } = d;

  const TABS = ['overview', 'trends', 'geography', 'performance'];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Analytics</div>
        <div className="page-sub">Response metrics, trends, and performance data</div>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Emergencies', value: summary.total_emergencies,    icon: '📋', color: 'orange' },
          { label: 'Resolved',          value: summary.resolved_emergencies,  icon: '✅', color: 'green'  },
          { label: 'Avg ETA',           value: `${summary.avg_eta_minutes}m`, icon: '⏱️', color: 'amber'  },
          { label: 'Responders',        value: `${summary.active_responders}/${summary.total_responders}`, icon: '🚗', color: 'blue' },
          { label: 'Hospitals',         value: summary.total_hospitals,       icon: '🏥', color: 'green'  },
          { label: 'Total Paid',        value: `₹${summary.total_earnings_paid || 0}`, icon: '💰', color: 'orange' },
        ].map((s) => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {{ overview: '📊 Overview', trends: '📈 Trends', geography: '🗺️ Geography', performance: '⚡ Performance' }[t]}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          <div className="two-col" style={{ marginBottom: 20 }}>
            {/* By type donut */}
            <div className="card">
              <div className="card-header"><span>🏷️</span><span className="card-title">Emergencies by Type</span></div>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <ResponsiveContainer width="55%" height={200}>
                  <PieChart>
                    <Pie data={by_type} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                      {by_type.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #F0E6D3', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1 }}>
                  {by_type.map((item, i) => (
                    <div key={item.type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 13, textTransform: 'capitalize', flex: 1 }}>{item.type}</span>
                      <span style={{ fontFamily: 'Space Mono', fontSize: 12, fontWeight: 700, color: 'var(--earth)' }}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* By severity */}
            <div className="card">
              <div className="card-header"><span>⚠️</span><span className="card-title">Emergencies by Severity</span></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={by_severity} layout="vertical" margin={{ top: 4, right: 24, left: 60, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#78716C' }} />
                    <YAxis dataKey="label" type="category" tick={{ fontSize: 11, fill: '#78716C' }} width={60} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #F0E6D3', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {by_severity.map((item) => <Cell key={item.severity} fill={SEV_COLORS[item.severity] || '#F97316'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Response time */}
          <div className="card">
            <div className="card-header"><span>⏱️</span><span className="card-title">Response Time Distribution</span></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={response_time} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D3" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#78716C' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#78716C' }} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #F0E6D3', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {response_time.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === 'trends' && (
        <div>
          <div className="two-col" style={{ marginBottom: 20 }}>
            {/* 7-day trend */}
            <div className="card">
              <div className="card-header"><span>📈</span><span className="card-title">7-Day Emergency Trend</span></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={trend} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#F97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D3" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#78716C' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#78716C' }} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #F0E6D3', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="emergencies" stroke="#F97316" strokeWidth={2.5} fill="url(#trendGrad)" dot={{ fill: '#F97316', r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hourly distribution */}
            <div className="card">
              <div className="card-header"><span>🕐</span><span className="card-title">Hourly Distribution</span></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={HOURLY} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D3" />
                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#78716C' }} interval={2} tickFormatter={(h) => `${h}h`} />
                    <YAxis tick={{ fontSize: 11, fill: '#78716C' }} />
                    <Tooltip
                      labelFormatter={(h) => `${h}:00 – ${h}:59`}
                      contentStyle={{ background: '#fff', border: '1px solid #F0E6D3', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {HOURLY.map((entry, i) => (
                        <Cell key={i} fill={entry.count >= 6 ? '#DC2626' : entry.count >= 4 ? '#F97316' : '#FED7AA'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                  Peak hours: 18:00–20:00 (evening) · 08:00–12:00 (morning)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'geography' && (
        <div>
          <div className="card">
            <div className="card-header"><span>🗺️</span><span className="card-title">Village-Level Breakdown</span></div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Village</th>
                    <th>Emergencies</th>
                    <th>Resolved</th>
                    <th>Resolution Rate</th>
                    <th>Avg ETA</th>
                    <th>Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {VILLAGE_DATA.sort((a, b) => b.emergencies - a.emergencies).map((v) => {
                    const rate = Math.round((v.resolved / v.emergencies) * 100);
                    const etaColor = v.avg_eta <= 6 ? 'var(--green)' : v.avg_eta <= 10 ? 'var(--amber)' : 'var(--red)';
                    return (
                      <tr key={v.village}>
                        <td style={{ fontWeight: 600 }}>📍 {v.village}</td>
                        <td style={{ fontFamily: 'Space Mono', fontWeight: 700 }}>{v.emergencies}</td>
                        <td style={{ fontFamily: 'Space Mono', color: 'var(--green)' }}>{v.resolved}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, minWidth: 60 }}>
                              <div style={{ width: `${rate}%`, height: '100%', background: rate >= 90 ? 'var(--green)' : rate >= 70 ? 'var(--amber)' : 'var(--red)', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontFamily: 'Space Mono', fontSize: 11, color: 'var(--text-muted)' }}>{rate}%</span>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'Space Mono', fontSize: 13, fontWeight: 700, color: etaColor }}>{v.avg_eta} min</td>
                        <td>
                          <span className={`badge badge-${rate >= 90 ? 'done' : rate >= 70 ? 'matched' : 'pending'}`}>
                            {rate >= 90 ? 'Good' : rate >= 70 ? 'Fair' : 'Needs Attention'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'performance' && (
        <div>
          <div className="two-col">
            {/* Resolution rate */}
            <div className="card">
              <div className="card-header"><span>✅</span><span className="card-title">Resolution Rate</span></div>
              <div className="card-body">
                {[
                  { label: 'Overall',  value: summary.total_emergencies ? Math.round((summary.resolved_emergencies / summary.total_emergencies) * 100) : 0 },
                  { label: 'Cardiac',  value: 92 },
                  { label: 'Accident', value: 88 },
                  { label: 'Delivery', value: 95 },
                  { label: 'General',  value: 97 },
                ].map(({ label, value }) => (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span style={{ fontWeight: 600 }}>{label}</span>
                      <span style={{ fontFamily: 'Space Mono', fontWeight: 700, color: value >= 90 ? 'var(--green)' : value >= 75 ? 'var(--amber)' : 'var(--red)' }}>{value}%</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--border)', borderRadius: 4 }}>
                      <div style={{ width: `${value}%`, height: '100%', background: value >= 90 ? 'var(--green)' : value >= 75 ? 'var(--amber)' : 'var(--red)', borderRadius: 4, transition: 'width 0.6s' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Responder performance */}
            <div className="card">
              <div className="card-header"><span>🚗</span><span className="card-title">Responder Utilization</span></div>
              <div className="card-body">
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Fleet utilization</span>
                    <span style={{ fontFamily: 'Space Mono', fontWeight: 700 }}>
                      {summary.total_responders > 0
                        ? Math.round(((summary.total_responders - summary.active_responders) / summary.total_responders) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div style={{ height: 10, background: 'var(--border)', borderRadius: 5 }}>
                    <div style={{
                      width: `${summary.total_responders > 0 ? Math.round(((summary.total_responders - summary.active_responders) / summary.total_responders) * 100) : 0}%`,
                      height: '100%', background: 'var(--saffron)', borderRadius: 5,
                    }} />
                  </div>
                </div>

                {[
                  { label: 'Avg response time',    value: `${summary.avg_eta_minutes} min` },
                  { label: 'Total rides completed', value: summary.total_rides },
                  { label: 'Total earnings paid',   value: `₹${summary.total_earnings_paid}` },
                  { label: 'Beds available',        value: `${summary.total_beds_available} / ${summary.total_hospitals * 37}` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontFamily: 'Space Mono', fontWeight: 700, color: 'var(--earth)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
