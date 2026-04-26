import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { socket } from '../socket';
import StatsBar from '../components/StatsBar';
import MapView from '../components/MapView';
import EmergencyCard from '../components/EmergencyCard';
import EmergencyModal from '../components/EmergencyModal';

const VILLAGES = [
  { name: 'Shirur',   lat: 18.8268, lng: 74.3677 },
  { name: 'Daund',    lat: 18.4607, lng: 74.5826 },
  { name: 'Baramati', lat: 18.1522, lng: 74.5815 },
  { name: 'Indapur',  lat: 18.1167, lng: 75.0167 },
  { name: 'Junnar',   lat: 19.2000, lng: 73.8833 },
  { name: 'Khed',     lat: 18.8500, lng: 73.9833 },
  { name: 'Bhor',     lat: 18.1500, lng: 73.8500 },
  { name: 'Maval',    lat: 18.7167, lng: 73.5833 },
];

const TYPES = ['cardiac', 'accident', 'delivery', 'general'];

export default function Dashboard() {
  const qc = useQueryClient();

  const { data: emData,   isLoading: emLoading } = useQuery({
    queryKey: ['emergencies-active'],
    queryFn:  api.getActiveEmergencies,
    refetchInterval: 8000,
  });
  const { data: allData } = useQuery({
    queryKey: ['emergencies-all'],
    queryFn:  api.getEmergencies,
    refetchInterval: 10000,
  });
  const { data: respData } = useQuery({
    queryKey: ['responders'],
    queryFn:  api.getResponders,
    refetchInterval: 6000,
  });
  const { data: relayData } = useQuery({
    queryKey: ['relay'],
    queryFn:  () => api.getRelay(),
    refetchInterval: 15000,
  });
  const { data: hospData } = useQuery({
    queryKey: ['hospitals'],
    queryFn:  api.getHospitals,
    refetchInterval: 30000,
  });

  const activeEmergencies = emData?.data  ?? [];
  const allEmergencies    = allData?.data ?? [];
  const responders        = respData?.data ?? [];
  const relaySegments     = relayData?.data ?? [];
  const hospitals         = hospData?.data ?? [];

  // Real-time socket updates
  useEffect(() => {
    function invalidateAll() {
      qc.invalidateQueries({ queryKey: ['emergencies-active'] });
      qc.invalidateQueries({ queryKey: ['emergencies-all'] });
      qc.invalidateQueries({ queryKey: ['active'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    }

    socket.on('emergency:updated',          invalidateAll);
    socket.on('emergency:escalation_failed', invalidateAll);
    socket.on('notification:new',           () => qc.invalidateQueries({ queryKey: ['notifications'] }));

    return () => {
      socket.off('emergency:updated',          invalidateAll);
      socket.off('emergency:escalation_failed', invalidateAll);
      socket.off('notification:new');
    };
  }, [qc]);

  // SOS demo form
  const [sosForm, setSosForm]     = useState({ village: 'Shirur', type: 'cardiac', patient_name: 'Demo Patient' });
  const [sosResult, setSosResult] = useState(null);
  const [modalEm, setModalEm]     = useState(null);
  const [emFilter, setEmFilter]   = useState('all');

  const filteredActive = emFilter === 'all'
    ? activeEmergencies
    : activeEmergencies.filter((e) => e.type === emFilter);

  const sosMutation = useMutation({
    mutationFn: (body) => api.createEmergency(body),
    onSuccess: (data) => {
      setSosResult(data.data);
      qc.invalidateQueries({ queryKey: ['emergencies-active'] });
      qc.invalidateQueries({ queryKey: ['emergencies-all'] });
      qc.invalidateQueries({ queryKey: ['active'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  // Relay planner
  const [relayEmId, setRelayEmId] = useState('');
  const [relayResult, setRelayResult] = useState(null);
  const relayMutation = useMutation({
    mutationFn: (em) => api.planRelay({ emergency_id: em.id, lat: em.lat, lng: em.lng }),
    onSuccess: (data) => {
      setRelayResult(data.data);
      qc.invalidateQueries({ queryKey: ['relay'] });
    },
  });

  function handleSOS() {
    const v = VILLAGES.find((x) => x.name === sosForm.village) || VILLAGES[0];
    sosMutation.mutate({
      lat:          v.lat + (Math.random() - 0.5) * 0.02,
      lng:          v.lng + (Math.random() - 0.5) * 0.02,
      type:         sosForm.type,
      patient_name: sosForm.patient_name,
      village:      v.name,
    });
  }

  return (
    <div>
      {modalEm && <EmergencyModal emergency={modalEm} onClose={() => setModalEm(null)} />}
      <div className="page-header">
        <div className="page-title">Live Dashboard</div>
        <div className="page-sub">Real-time emergency monitoring · Maharashtra Rural Network</div>
      </div>

      <StatsBar />

      {/* Full-width map */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span>🗺️</span>
          <span className="card-title">Live Emergency Map</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            {activeEmergencies.length} active · {responders.filter(r => r.is_available).length} responders online
          </span>
        </div>
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <MapView emergencies={allEmergencies} responders={responders} hospitals={hospitals} height={400} />
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            {[
              { color: '#DC2626', label: 'Critical (Sev 1)' },
              { color: '#EA580C', label: 'Serious (Sev 2)'  },
              { color: '#D97706', label: 'Moderate (Sev 3)' },
              { color: '#166534', label: 'Responder (available)' },
              { color: '#78716C', label: 'Responder (busy)' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        {/* Active emergencies feed */}
        <div className="card card-accent">
          <div className="card-header">
            <span>🚨</span>
            <span className="card-title">Active Emergencies</span>
            <span className="badge badge-critical" style={{ marginLeft: 'auto' }}>{activeEmergencies.length}</span>
          </div>
          <div className="card-body">
            {/* Filter bar */}
            {activeEmergencies.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {['all', 'cardiac', 'accident', 'delivery', 'general'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setEmFilter(f)}
                    style={{
                      padding: '3px 10px', fontSize: 11, fontWeight: 600,
                      border: `1.5px solid ${emFilter === f ? 'var(--saffron)' : 'var(--border-dark)'}`,
                      borderRadius: 20, background: emFilter === f ? 'var(--saffron-light)' : 'transparent',
                      color: emFilter === f ? 'var(--saffron-dark)' : 'var(--text-muted)',
                      cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
                    }}
                  >
                    {f === 'all' ? 'All' : f}
                  </button>
                ))}
              </div>
            )}
            {emLoading ? (
              <div className="loading-center"><div className="rangoli-spinner" /></div>
            ) : filteredActive.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">✅</div><p>No active emergencies</p></div>
            ) : (
              <div className="emergency-list">
                {filteredActive.map((em) => (
                  <EmergencyCard key={em.id} emergency={em} showActions onClick={() => setModalEm(em)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SOS Demo Trigger */}
        <div className="card" style={{ borderTop: '3px solid var(--red)' }}>
          <div className="card-header">
            <span>🆘</span>
            <span className="card-title">SOS Demo Trigger</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, background: 'var(--red-light)', color: 'var(--red)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>DEMO</span>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Simulate a patient triggering SOS. The system auto-matches the nearest available responder using weighted scoring.
            </p>

            <div className="form-group">
              <label className="form-label">Village</label>
              <select className="form-select" value={sosForm.village} onChange={(e) => setSosForm({ ...sosForm, village: e.target.value })}>
                {VILLAGES.map((v) => <option key={v.name}>{v.name}</option>)}
              </select>
            </div>

            <div className="two-col" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Emergency Type</label>
                <select className="form-select" value={sosForm.type} onChange={(e) => setSosForm({ ...sosForm, type: e.target.value })}>
                  {TYPES.map((t) => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Patient Name</label>
                <input className="form-input" value={sosForm.patient_name} onChange={(e) => setSosForm({ ...sosForm, patient_name: e.target.value })} />
              </div>
            </div>

            <button
              className="btn btn-danger"
              style={{ width: '100%', fontSize: 15, padding: '12px', background: 'var(--red)', color: '#fff' }}
              onClick={handleSOS}
              disabled={sosMutation.isPending}
            >
              {sosMutation.isPending ? '⏳ Dispatching...' : '🆘 TRIGGER SOS'}
            </button>

            {sosResult && (
              <div style={{ marginTop: 14, padding: '12px 14px', background: sosResult.responder_id ? 'var(--green-light)' : 'var(--amber-light)', borderRadius: 8, fontSize: 13 }}>
                {sosResult.responder_id ? (
                  <>
                    <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>✅ Responder Matched!</div>
                    <div>🚗 <strong>{sosResult.responder_name}</strong> dispatched</div>
                    <div style={{ fontFamily: 'Space Mono', fontSize: 12, marginTop: 4, color: 'var(--earth)' }}>
                      ETA: {sosResult.eta_minutes} min · Status: {sosResult.status}
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--amber)', fontWeight: 600 }}>⚠️ Emergency created — no responders nearby. Auto-escalation will retry in 3 min.</div>
                )}
                <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={() => setSosResult(null)}>Dismiss</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="two-col">
        {/* Recent history */}
        <div className="card">
          <div className="card-header">
            <span>📋</span>
            <span className="card-title">Recent History</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              {allEmergencies.filter(e => e.status === 'done').length} resolved
            </span>
          </div>
          <div className="card-body">
            {allEmergencies.filter((e) => e.status === 'done').length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📋</div><p>No completed emergencies yet</p></div>
            ) : (
              <div className="emergency-list">
                {allEmergencies.filter((e) => e.status === 'done').slice(0, 6).map((em) => (
                  <EmergencyCard key={em.id} emergency={em} onClick={() => setModalEm(em)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Relay Transport */}
        <div className="card">
          <div className="card-header">
            <span>🔗</span>
            <span className="card-title">Relay Transport</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{relaySegments.length} segments</span>
          </div>
          <div className="card-body" style={{ padding: '8px 16px' }}>
            {/* Plan relay for an active emergency */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
                Plan New Relay Chain
              </div>
              <select
                className="form-select"
                style={{ marginBottom: 8 }}
                value={relayEmId}
                onChange={(e) => { setRelayEmId(e.target.value); setRelayResult(null); }}
              >
                <option value="">Select active emergency…</option>
                {activeEmergencies.map((em) => (
                  <option key={em.id} value={em.id}>
                    {em.patient_name} — {em.village} ({em.type})
                  </option>
                ))}
              </select>
              <button
                className="btn btn-primary btn-sm"
                disabled={!relayEmId || relayMutation.isPending}
                onClick={() => {
                  const em = activeEmergencies.find(e => e.id === relayEmId);
                  if (em) relayMutation.mutate(em);
                }}
              >
                {relayMutation.isPending ? '⏳ Planning...' : '🔗 Plan Relay'}
              </button>
              {relayMutation.isError && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--red)' }}>
                  ⚠️ Not enough available responders for relay
                </div>
              )}
              {relayResult && (
                <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--green-light)', borderRadius: 8, fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>✅ Relay chain planned!</div>
                  {relayResult.map((seg) => (
                    <div key={seg.id} style={{ marginBottom: 2 }}>
                      Leg {seg.segment_num}: <strong>{seg.responder_name}</strong> ({seg.vehicle_type}) · {seg.distance_km} km
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="saree-divider" style={{ margin: '12px 0' }} />

            {/* Existing segments */}
            {relaySegments.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div className="empty-icon">🔗</div>
                <p>No relay chains active</p>
              </div>
            ) : (
              relaySegments.map((seg) => (
                <div key={seg.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'Space Mono', fontSize: 11, background: 'var(--sand)', padding: '1px 6px', borderRadius: 4, color: 'var(--earth)', fontWeight: 700 }}>
                      Leg {seg.segment_num}
                    </span>
                    <span className={`badge badge-${seg.status === 'completed' ? 'done' : seg.status === 'active' ? 'en_route' : 'pending'}`}>
                      {seg.status}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{seg.distance_km} km</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{seg.responder_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {seg.vehicle_type === 'car' ? '🚗' : '🏍️'} {seg.from_village} → {seg.to_village}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
