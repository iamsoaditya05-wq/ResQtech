import React, { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { socket } from '../socket';

export default function StatsBar() {
  const qc = useQueryClient();
  const prevRef = useRef({});

  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn:  api.getAnalytics,
    refetchInterval: 10000,
  });

  // Invalidate on any emergency event
  useEffect(() => {
    const refresh = () => qc.invalidateQueries({ queryKey: ['analytics'] });
    socket.on('emergency:created', refresh);
    socket.on('emergency:updated', refresh);
    return () => {
      socket.off('emergency:created', refresh);
      socket.off('emergency:updated', refresh);
    };
  }, [qc]);

  const s = data?.data?.summary;

  if (isLoading || !s) {
    return (
      <div className="stats-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="stat-card" style={{ height: 100, background: 'var(--sand)', opacity: 0.6 }} />
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: 'Active Emergencies',
      value: s.active_emergencies,
      icon: '🚨',
      color: s.active_emergencies > 0 ? 'red' : 'orange',
      mono: true,
    },
    {
      label: 'Total Today',
      value: s.total_emergencies,
      icon: '📋',
      color: 'orange',
      mono: true,
    },
    {
      label: 'Avg ETA',
      value: `${s.avg_eta_minutes}m`,
      icon: '⏱️',
      color: s.avg_eta_minutes > 15 ? 'red' : 'amber',
      mono: true,
    },
    {
      label: 'Responders Online',
      value: `${s.active_responders}/${s.total_responders}`,
      icon: '🚗',
      color: s.active_responders > 0 ? 'green' : 'red',
    },
    {
      label: 'Beds Available',
      value: s.total_beds_available,
      icon: '🏥',
      color: s.total_beds_available < 10 ? 'red' : 'blue',
      mono: true,
    },
    {
      label: 'Total Paid',
      value: `₹${s.total_earnings_paid || 0}`,
      icon: '💰',
      color: 'green',
    },
  ];

  return (
    <div className="stats-grid">
      {stats.map((stat) => {
        const prev = prevRef.current[stat.label];
        const numVal = typeof stat.value === 'number' ? stat.value : null;
        const delta = prev !== undefined && numVal !== null ? numVal - prev : null;
        if (numVal !== null) prevRef.current[stat.label] = numVal;

        return (
          <div key={stat.label} className={`stat-card ${stat.color}`}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-value" style={stat.mono ? { fontFamily: 'Space Mono' } : {}}>
              {stat.value}
            </div>
            <div className="stat-label">{stat.label}</div>
            {delta !== null && delta !== 0 && (
              <div className={`stat-delta ${delta > 0 ? 'up' : 'down'}`}>
                {delta > 0 ? `↑ +${delta}` : `↓ ${delta}`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
