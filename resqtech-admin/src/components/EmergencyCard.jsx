import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useEtaCountdown } from '../hooks/useEtaCountdown';

const TYPE_ICONS  = { cardiac: '❤️', accident: '🚗', delivery: '👶', general: '🏥' };
const SEV_LABELS  = { 1: 'Critical', 2: 'Serious', 3: 'Moderate', 4: 'Minor', 5: 'Minimal' };

const STATUS_FLOW = {
  pending:  { next: 'matched',  label: 'Mark Matched',  color: 'var(--blue)'    },
  matched:  { next: 'en_route', label: 'En Route →',    color: 'var(--saffron)' },
  en_route: { next: 'done',     label: 'Mark Done ✓',   color: 'var(--green)'   },
};

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function EmergencyCard({ emergency, showActions = false, onClick }) {
  const qc = useQueryClient();
  const { type, status, severity, patient_name, village, responder_name, eta_minutes, created_at, id } = emergency;
  const countdown = useEtaCountdown(status !== 'done' ? emergency : null);

  const mutation = useMutation({
    mutationFn: (newStatus) => api.updateEmergency(id, { status: newStatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergencies-active'] });
      qc.invalidateQueries({ queryKey: ['emergencies-all'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      qc.invalidateQueries({ queryKey: ['active'] });
    },
  });

  const flow = STATUS_FLOW[status];

  return (
    <div
      className={`emergency-card severity-${severity}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="emergency-type-icon">{TYPE_ICONS[type] || '🏥'}</div>
      <div className="emergency-info">
        <div className="emergency-name">{patient_name}</div>
        <div className="emergency-meta">📍 {village} · {timeAgo(created_at)}</div>
        <div className="emergency-footer">
          <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>
          <span className={`badge badge-${severity <= 2 ? 'critical' : 'matched'}`}>
            {SEV_LABELS[severity]}
          </span>
          {responder_name && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🚗 {responder_name}</span>
          )}
          {countdown && (
            <span className="eta-chip" style={{ fontFamily: 'Space Mono' }}>
              ⏱ {countdown}
            </span>
          )}
        </div>

        {showActions && flow && (
          <button
            onClick={(e) => { e.stopPropagation(); mutation.mutate(flow.next); }}
            disabled={mutation.isPending}
            style={{
              marginTop: 8,
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 700,
              border: `1.5px solid ${flow.color}`,
              borderRadius: 6,
              background: 'transparent',
              color: flow.color,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            {mutation.isPending ? '...' : flow.label}
          </button>
        )}
      </div>
    </div>
  );
}
