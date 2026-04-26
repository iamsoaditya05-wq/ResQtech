import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { socket } from '../socket';
import MapView from '../components/MapView';
import { useEtaCountdown } from '../hooks/useEtaCountdown';

const SEV_COLORS = { 1: '#DC2626', 2: '#EA580C', 3: '#D97706', 4: '#1D4ED8', 5: '#166534' };
const SEV_LABELS = { 1: 'Critical', 2: 'Serious', 3: 'Moderate', 4: 'Minor', 5: 'Minimal' };
const TYPE_EMOJI = { cardiac: '❤️', accident: '🚗', delivery: '👶', general: '🏥' };

const STATUS_STEPS = ['pending', 'matched', 'en_route', 'done'];
const STATUS_LABELS = {
  pending:  { label: 'Waiting for responder', icon: '⏳', color: 'var(--amber)'   },
  matched:  { label: 'Responder assigned',    icon: '🚗', color: 'var(--blue)'    },
  en_route: { label: 'Help is on the way',    icon: '🏃', color: 'var(--saffron)' },
  done:     { label: 'Arrived safely',        icon: '✅', color: 'var(--green)'   },
};

export default function PatientView() {
  const { id } = useParams();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['emergency', id],
    queryFn:  () => api.getEmergency(id),
    refetchInterval: 5000,
  });

  const { data: respData } = useQuery({
    queryKey: ['responders'],
    queryFn:  api.getResponders,
    refetchInterval: 4000,
  });

  const { data: triageData } = useQuery({
    queryKey: ['triage', id],
    queryFn:  () => api.getTriageLog(id),
    retry: false,
  });

  // Real-time updates
  useEffect(() => {
    function onUpdated(em) {
      if (em.id === id) {
        qc.invalidateQueries({ queryKey: ['emergency', id] });
      }
    }
    socket.on('emergency:updated', onUpdated);
    socket.on('emergency:created', onUpdated);
    return () => {
      socket.off('emergency:updated', onUpdated);
      socket.off('emergency:created', onUpdated);
    };
  }, [id, qc]);

  const em       = data?.data;
  const triage   = triageData?.data;
  const responders = respData?.data ?? [];
  const countdown  = useEtaCountdown(em?.status !== 'done' ? em : null);

  // Find the assigned responder's live location
  const assignedResponder = em?.responder_id
    ? responders.find(r => r.user_id === em.responder_id)
    : null;

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
        <div className="rangoli-spinner" />
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading emergency status…</div>
      </div>
    );
  }

  if (isError || !em) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 16, padding: 24 }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--earth)' }}>Emergency not found</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>ID: {id}</div>
        <Link to="/" className="btn btn-primary">← Back to Dashboard</Link>
      </div>
    );
  }

  const statusInfo  = STATUS_LABELS[em.status] || STATUS_LABELS.pending;
  const sevColor    = SEV_COLORS[em.severity] || '#F97316';
  const currentStep = STATUS_STEPS.indexOf(em.status);

  // Build map data — show patient + responder
  const mapEmergencies = [em];
  const mapResponders  = assignedResponder ? [assignedResponder] : [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Top bar */}
      <div style={{ background: 'var(--earth)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 24 }}>🚑</div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>ResQtech</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Emergency Tracking</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4ade80' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse-dot 1.5s infinite' }} />
          LIVE
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px' }}>

        {/* Status hero */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px 20px', marginBottom: 16, borderTop: `4px solid ${statusInfo.color}`, boxShadow: 'var(--shadow-lg)', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{statusInfo.icon}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--earth)', marginBottom: 4 }}>{statusInfo.label}</div>
          {em.status !== 'done' && countdown && (
            <div style={{ fontFamily: 'Space Mono', fontSize: 36, fontWeight: 700, color: statusInfo.color, margin: '12px 0' }}>
              {countdown}
            </div>
          )}
          {em.status !== 'done' && em.eta_minutes && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Estimated arrival in {em.eta_minutes} min
            </div>
          )}
          {em.status === 'done' && (
            <div style={{ fontSize: 14, color: 'var(--green)', fontWeight: 600, marginTop: 8 }}>
              Patient has been safely transported 🙏
            </div>
          )}
        </div>

        {/* Progress stepper */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {STATUS_STEPS.map((step, i) => {
              const done    = i <= currentStep;
              const current = i === currentStep;
              const info    = STATUS_LABELS[step];
              return (
                <React.Fragment key={step}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: done ? info.color : 'var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16,
                      boxShadow: current ? `0 0 0 4px ${info.color}30` : 'none',
                      transition: 'all 0.3s',
                    }}>
                      {done ? info.icon : '○'}
                    </div>
                    <div style={{ fontSize: 10, color: done ? info.color : 'var(--text-muted)', fontWeight: done ? 700 : 400, textAlign: 'center', maxWidth: 60 }}>
                      {step.replace('_', ' ')}
                    </div>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div style={{ height: 2, flex: 1, background: i < currentStep ? 'var(--green)' : 'var(--border)', transition: 'background 0.3s', marginBottom: 20 }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Emergency details */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--earth)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Emergency Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Patient',   value: em.patient_name },
              { label: 'Type',      value: `${TYPE_EMOJI[em.type]} ${em.type}` },
              { label: 'Location',  value: em.village },
              { label: 'Severity',  value: SEV_LABELS[em.severity] },
              { label: 'Responder', value: em.responder_name || 'Searching…' },
              { label: 'Status',    value: em.status.replace('_', ' ') },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--sand)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--earth)', textTransform: 'capitalize' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live map */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, color: 'var(--earth)' }}>
            📍 Live Location
          </div>
          <MapView
            emergencies={mapEmergencies}
            responders={mapResponders}
            hospitals={[]}
            height={280}
          />
        </div>

        {/* Triage instructions (if available) */}
        {triage && (
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 16, boxShadow: 'var(--shadow)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--earth)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🤖 First Aid Instructions
            </div>
            <ol className="triage-steps">
              {(triage.first_aid_steps || []).map((step, i) => (
                <li key={i}><span className="step-num">{i + 1}</span><span>{step}</span></li>
              ))}
            </ol>
            {triage.hindi_message && (
              <div className="hindi-msg" style={{ marginTop: 12 }}>
                🗣️ {triage.hindi_message}
              </div>
            )}
          </div>
        )}

        {/* Google Maps link */}
        <a
          href={`https://maps.google.com/?q=${em.lat},${em.lng}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-outline"
          style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
        >
          🗺️ Open Location in Google Maps
        </a>

        {/* Admin link */}
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          <Link to="/" style={{ color: 'var(--saffron)' }}>← Admin Dashboard</Link>
          {' · '}
          <span>Emergency ID: {em.id.slice(0, 8)}</span>
        </div>
      </div>
    </div>
  );
}
