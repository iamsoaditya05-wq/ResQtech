import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import TriagePanel from './TriagePanel';

const SEV_COLORS = { 1: '#DC2626', 2: '#EA580C', 3: '#D97706', 4: '#1D4ED8', 5: '#166534' };
const SEV_LABELS = { 1: 'Critical', 2: 'Serious', 3: 'Moderate', 4: 'Minor', 5: 'Minimal' };
const TYPE_EMOJI = { cardiac: '❤️', accident: '🚗', delivery: '👶', general: '🏥' };

const STATUS_FLOW = {
  pending:  { next: 'matched',  label: 'Mark Matched'  },
  matched:  { next: 'en_route', label: 'Mark En Route' },
  en_route: { next: 'done',     label: 'Mark Done ✓'   },
};

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleString('en-IN');
}

const TABS = [
  { id: 'details',  label: '📋 Details'     },
  { id: 'triage',   label: '🤖 AI Triage'   },
  { id: 'timeline', label: '⏱️ Timeline'    },
  { id: 'assign',   label: '🚗 Assign'      },
];

export default function EmergencyModal({ emergency: initialEm, onClose }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState('details');

  // Keep local copy so status updates reflect immediately
  const [em, setEm] = useState(initialEm);

  const { data: triageData } = useQuery({
    queryKey: ['triage', em.id],
    queryFn:  () => api.getTriageLog(em.id),
    retry: false,
  });

  const { data: timelineData } = useQuery({
    queryKey: ['timeline', em.id],
    queryFn:  () => api.getTimeline(em.id),
    enabled:  tab === 'timeline',
  });

  const { data: respondersData } = useQuery({
    queryKey: ['responders'],
    queryFn:  api.getResponders,
    enabled:  tab === 'assign',
  });

  const triage    = triageData?.data;
  const timeline  = timelineData?.data?.timeline ?? [];
  const responders = respondersData?.data ?? [];

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['emergencies-active'] });
    qc.invalidateQueries({ queryKey: ['emergencies-all'] });
    qc.invalidateQueries({ queryKey: ['analytics'] });
    qc.invalidateQueries({ queryKey: ['active'] });
  }

  const statusMutation = useMutation({
    mutationFn: (status) => api.updateEmergency(em.id, { status }),
    onSuccess: (data) => { setEm(data.data); invalidate(); },
  });

  const assignMutation = useMutation({
    mutationFn: (responder_id) => api.assignResponder(em.id, responder_id),
    onSuccess: (data) => { setEm(data.data); invalidate(); setTab('details'); },
  });

  const flow     = STATUS_FLOW[em.status];
  const sevColor = SEV_COLORS[em.severity] || '#F97316';

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 680, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', borderTop: `4px solid ${sevColor}` }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: sevColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Mono', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
            {em.severity}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--earth)' }}>
              {TYPE_EMOJI[em.type]} {em.patient_name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              📍 {em.village} · {em.type} · {timeAgo(em.created_at)}
            </div>
          </div>
          <span className={`badge badge-${em.status}`}>{em.status.replace('_', ' ')}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)', padding: '0 4px', lineHeight: 1 }}>✕</button>
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          {TABS.filter(t => t.id !== 'assign' || em.status === 'pending').map((t) => (
            <button key={t.id} className={`tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {/* ── DETAILS ── */}
          {tab === 'details' && (
            <div>
              <div className="info-grid">
                {[
                  { label: 'Type',       value: em.type },
                  { label: 'Severity',   value: `${em.severity} — ${SEV_LABELS[em.severity]}` },
                  { label: 'Village',    value: em.village },
                  { label: 'Coords',     value: `${em.lat?.toFixed(4)}, ${em.lng?.toFixed(4)}` },
                  { label: 'Responder',  value: em.responder_name || '—' },
                  { label: 'ETA',        value: em.eta_minutes ? `${em.eta_minutes} min` : '—' },
                  { label: 'Created',    value: new Date(em.created_at).toLocaleString('en-IN') },
                  { label: 'Source',     value: em.source || 'app' },
                ].map(({ label, value }) => (
                  <div key={label} className="info-cell">
                    <div className="info-cell-label">{label}</div>
                    <div className="info-cell-value">{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <a href={`https://maps.google.com/?q=${em.lat},${em.lng}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                  🗺️ Google Maps
                </a>
                <a href={`https://maps.google.com/maps?saddr=&daddr=${em.lat},${em.lng}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                  🧭 Get Directions
                </a>
              </div>

              {flow && (
                <div style={{ padding: '12px 14px', background: 'var(--sand)', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Advance status:</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={() => statusMutation.mutate(flow.next)} disabled={statusMutation.isPending}>
                      {statusMutation.isPending ? '⏳...' : flow.label}
                    </button>
                    {em.status !== 'done' && (
                      <button className="btn btn-danger" onClick={() => statusMutation.mutate('done')} disabled={statusMutation.isPending} style={{ background: 'var(--red-light)', color: 'var(--red)' }}>
                        Cancel Emergency
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TRIAGE ── */}
          {tab === 'triage' && (
            <div>
              {triage ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 14px', background: 'var(--sand)', borderRadius: 8 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: sevColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Mono', fontSize: 20, fontWeight: 700 }}>
                      {triage.ai_severity || triage.severity}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{SEV_LABELS[triage.ai_severity || triage.severity]} Emergency</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Recommended dept: <strong>{triage.hospital_dept}</strong></div>
                    </div>
                  </div>

                  <div style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--earth)', marginBottom: 8 }}>First Aid Steps</div>
                  <ol className="triage-steps">
                    {(triage.first_aid_steps || []).map((step, i) => (
                      <li key={i}><span className="step-num">{i + 1}</span><span>{step}</span></li>
                    ))}
                  </ol>

                  {triage.hindi_message && (
                    <div className="hindi-msg" style={{ marginTop: 12 }}>
                      🗣️ <strong>हिंदी:</strong> {triage.hindi_message}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--amber-light)', borderRadius: 8, fontSize: 13, color: 'var(--amber)' }}>
                    ⚠️ No triage assessment yet. Run one below.
                  </div>
                  <TriagePanel prefill={{ emergencyType: em.type, emergency_id: em.id }} />
                </div>
              )}
            </div>
          )}

          {/* ── TIMELINE ── */}
          {tab === 'timeline' && (
            <div>
              {timeline.length === 0 ? (
                <div className="loading-center"><div className="rangoli-spinner" /></div>
              ) : (
                <div style={{ padding: '4px 0' }}>
                  {timeline.map((event, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: 16, alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--sand)', border: '2px solid var(--border-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                          {event.icon}
                        </div>
                        {i < timeline.length - 1 && (
                          <div style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: 4, minHeight: 20 }} />
                        )}
                      </div>
                      <div style={{ flex: 1, paddingTop: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--earth)' }}>{event.label}</div>
                        {event.detail && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{event.detail}</div>}
                        <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4, fontFamily: 'Space Mono' }}>
                          {new Date(event.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ASSIGN RESPONDER ── */}
          {tab === 'assign' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Manually assign an available responder to this emergency. This overrides auto-matching.
              </p>
              {assignMutation.isSuccess && (
                <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--green-light)', borderRadius: 8, fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
                  ✅ Responder assigned successfully
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {responders.filter(r => r.is_available).length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">🚗</div><p>No available responders right now</p></div>
                ) : (
                  responders.filter(r => r.is_available).map((r) => (
                    <div key={r.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--sand)', borderRadius: 8, border: '1.5px solid var(--border-dark)' }}>
                      <div className="responder-avatar">{r.name.charAt(0)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {r.vehicle_type === 'car' ? '🚗' : '🏍️'} {r.vehicle_type} · {r.lat?.toFixed(3)}, {r.lng?.toFixed(3)}
                        </div>
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => assignMutation.mutate(r.user_id)}
                        disabled={assignMutation.isPending}
                      >
                        {assignMutation.isPending ? '...' : 'Assign'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
