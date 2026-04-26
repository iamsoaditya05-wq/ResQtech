import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import TriagePanel from '../components/TriagePanel';

const PRESETS = [
  {
    label: '❤️ Cardiac Arrest',
    form: { emergencyType: 'cardiac', age: '58', symptoms: 'Severe chest pain radiating to left arm, difficulty breathing, sweating, patient is semi-conscious' },
  },
  {
    label: '🚗 Road Accident',
    form: { emergencyType: 'accident', age: '32', symptoms: 'Head injury, bleeding from forehead, possible broken leg, patient is conscious but confused' },
  },
  {
    label: '👶 Emergency Delivery',
    form: { emergencyType: 'delivery', age: '24', symptoms: 'Contractions every 3 minutes, water broke 2 hours ago, first pregnancy, no hospital nearby' },
  },
  {
    label: '🤒 High Fever + Seizure',
    form: { emergencyType: 'general', age: '8', symptoms: 'Child with 104°F fever, had a seizure lasting 2 minutes, now unconscious, possible malaria' },
  },
];

export default function TriageDemo() {
  const { data: emData } = useQuery({ queryKey: ['emergencies-all'], queryFn: api.getEmergencies });
  const recentEmergencies = (emData?.data ?? []).slice(0, 8);
  const activeEmergencies = (emData?.data ?? []).filter(e => ['pending','matched','en_route'].includes(e.status));

  const [linkedEmId, setLinkedEmId] = React.useState('');

  function handlePreset(form) {
    const detail = linkedEmId ? { ...form, emergency_id: linkedEmId } : form;
    window.dispatchEvent(new CustomEvent('triage-preset', { detail }));
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">AI Triage Demo</div>
        <div className="page-sub">Claude-powered medical assessment for rural emergency responders</div>
      </div>

      {/* How it works */}
      <div className="card" style={{ marginBottom: 20, background: 'var(--sand)', border: '1px solid var(--sand-dark)' }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { icon: '🗣️', title: 'Responder describes symptoms', sub: 'Voice or text input in Hindi/English' },
              { icon: '🤖', title: 'Claude assesses severity', sub: 'Rates 1–5, identifies emergency type' },
              { icon: '📋', title: 'First aid steps generated', sub: 'Simple steps for untrained volunteers' },
              { icon: '🏥', title: 'Hospital dept recommended', sub: 'Routes patient to right department' },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: '1 1 180px' }}>
                <div style={{ fontSize: 24, flexShrink: 0 }}>{step.icon}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{step.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{step.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="two-col">
        {/* Triage form */}
        <div className="card card-accent">
          <div className="card-header">
            <span>🤖</span>
            <span className="card-title">Run Triage Assessment</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', background: 'var(--sand)', padding: '2px 8px', borderRadius: 6 }}>
              {process.env.NODE_ENV === 'production' ? 'Claude API' : 'Demo Mode'}
            </span>
          </div>
          <div className="card-body">
            {/* Quick presets */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
                Quick Presets
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PRESETS.map((p) => (
                  <PresetButton key={p.label} preset={p} />
                ))}
              </div>
            </div>
            <div className="saree-divider" style={{ margin: '12px 0' }} />
            <TriagePanel />
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Severity guide */}
          <div className="card">
            <div className="card-header">
              <span>⚠️</span>
              <span className="card-title">Severity Scale</span>
            </div>
            <div className="card-body">
              {[
                { sev: 1, label: 'Critical', desc: 'Life-threatening, immediate action', color: '#DC2626' },
                { sev: 2, label: 'Serious',  desc: 'Urgent, transport within 15 min',   color: '#EA580C' },
                { sev: 3, label: 'Moderate', desc: 'Needs care, stable for now',         color: '#D97706' },
                { sev: 4, label: 'Minor',    desc: 'Non-urgent, can wait',               color: '#1D4ED8' },
                { sev: 5, label: 'Minimal',  desc: 'Walk-in, no immediate risk',         color: '#166534' },
              ].map((s) => (
                <div key={s.sev} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Mono', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {s.sev}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent emergencies needing triage */}
          <div className="card">
            <div className="card-header">
              <span>📋</span>
              <span className="card-title">Recent Emergencies</span>
            </div>
            <div className="card-body" style={{ padding: '8px 16px' }}>
              {recentEmergencies.length === 0 ? (
                <div className="empty-state"><p>No emergencies yet</p></div>
              ) : (
                recentEmergencies.map((em) => (
                  <div key={em.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: em.severity <= 2 ? '#DC2626' : em.severity === 3 ? '#D97706' : '#166534', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{em.patient_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{em.type} · {em.village}</div>
                    </div>
                    <span className={`badge badge-${em.status}`}>{em.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Preset button that pre-fills the TriagePanel form via a custom event
function PresetButton({ preset }) {
  function handleClick() {
    window.dispatchEvent(new CustomEvent('triage-preset', { detail: preset.form }));
  }
  return (
    <button className="btn btn-outline btn-sm" onClick={handleClick}>
      {preset.label}
    </button>
  );
}
