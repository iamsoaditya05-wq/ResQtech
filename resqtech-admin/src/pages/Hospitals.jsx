import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import MapView from '../components/MapView';

const SPECIALIZATIONS = ['general', 'cardiac', 'trauma', 'maternity', 'orthopaedics', 'paediatrics'];

export default function Hospitals() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['hospitals'],
    queryFn:  api.getHospitals,
    refetchInterval: 15000,
  });
  const hospitals = data?.data ?? [];

  const [editing, setEditing]         = useState({});
  const [selectedHospital, setSelected] = useState(null);
  const [showAddForm, setShowAddForm]  = useState(false);

  const bedMutation = useMutation({
    mutationFn: ({ id, beds }) => api.updateBeds(id, beds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hospitals'] }),
  });

  const { data: incomingData } = useQuery({
    queryKey: ['hospital-incoming', selectedHospital?.id],
    queryFn:  () => api.getHospitalIncoming(selectedHospital.id),
    enabled:  !!selectedHospital,
    refetchInterval: 8000,
  });
  const incoming = incomingData?.data ?? [];

  function handleBedSave(hospital) {
    const val = editing[hospital.id];
    if (val === undefined) return;
    bedMutation.mutate({ id: hospital.id, beds: parseInt(val) });
    setEditing((prev) => { const n = { ...prev }; delete n[hospital.id]; return n; });
  }

  const occupancyColor = (h) => {
    const pct = 1 - h.beds_available / h.total_beds;
    if (pct > 0.9) return 'var(--red)';
    if (pct > 0.7) return 'var(--amber)';
    return 'var(--green)';
  };

  const totalBeds     = hospitals.reduce((s, h) => s + h.beds_available, 0);
  const totalCapacity = hospitals.reduce((s, h) => s + h.total_beds, 0);
  const criticalCount = hospitals.filter(h => (1 - h.beds_available / h.total_beds) > 0.9).length;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Hospital Network</div>
          <div className="page-sub">Manage bed availability across the district</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? '✕ Cancel' : '➕ Add Hospital'}
        </button>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Hospitals',  value: hospitals.length,  icon: '🏥', color: 'green'  },
          { label: 'Beds Available',   value: totalBeds,          icon: '🛏️', color: 'orange' },
          { label: 'Total Capacity',   value: totalCapacity,      icon: '📊', color: 'blue'   },
          { label: 'Near Full',        value: criticalCount,      icon: '🔴', color: criticalCount > 0 ? 'red' : 'green' },
        ].map((s) => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add hospital form */}
      {showAddForm && (
        <AddHospitalForm onClose={() => setShowAddForm(false)} onSaved={() => { setShowAddForm(false); qc.invalidateQueries({ queryKey: ['hospitals'] }); }} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedHospital ? '1fr 340px' : '1fr', gap: 20, marginBottom: 20 }}>
        {/* Table */}
        <div className="card">
          <div className="card-header">
            <span>🛏️</span>
            <span className="card-title">Bed Availability</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              Click a row to see incoming emergencies
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {isLoading ? (
              <div className="loading-center"><div className="rangoli-spinner" /></div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hospital</th>
                    <th>Specializations</th>
                    <th>Occupancy</th>
                    <th>Beds</th>
                    <th>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {hospitals.map((h) => {
                    const pct        = Math.round((1 - h.beds_available / h.total_beds) * 100);
                    const currentVal = editing[h.id] !== undefined ? editing[h.id] : h.beds_available;
                    const isSelected = selectedHospital?.id === h.id;

                    return (
                      <tr
                        key={h.id}
                        onClick={() => setSelected(isSelected ? null : h)}
                        style={{ cursor: 'pointer', background: isSelected ? 'var(--saffron-light)' : undefined }}
                      >
                        <td>
                          <div style={{ fontWeight: 600 }}>{h.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.district}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {h.specializations.map((s) => (
                              <span key={s} className="badge badge-matched" style={{ textTransform: 'capitalize', fontSize: 10 }}>{s}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, minWidth: 60 }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: occupancyColor(h), borderRadius: 3, transition: 'width 0.3s' }} />
                            </div>
                            <span style={{ fontFamily: 'Space Mono', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{pct}%</span>
                          </div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="bed-counter">
                            <input
                              type="number" min={0} max={h.total_beds}
                              value={currentVal}
                              onChange={(e) => setEditing((prev) => ({ ...prev, [h.id]: e.target.value }))}
                            />
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ {h.total_beds}</span>
                            {editing[h.id] !== undefined && (
                              <button className="btn btn-primary btn-sm" onClick={() => handleBedSave(h)}>Save</button>
                            )}
                          </div>
                        </td>
                        <td>
                          <a href={`tel:${h.phone}`} style={{ color: 'var(--saffron)', fontFamily: 'Space Mono', fontSize: 11 }} onClick={(e) => e.stopPropagation()}>
                            {h.phone}
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Incoming emergencies panel */}
        {selectedHospital && (
          <div className="card" style={{ borderTop: '3px solid var(--saffron)' }}>
            <div className="card-header">
              <span>🚨</span>
              <span className="card-title" style={{ fontSize: 13 }}>Incoming</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{selectedHospital.name.split(' ')[0]}</span>
            </div>
            <div className="card-body" style={{ padding: '8px 16px' }}>
              {incoming.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <div className="empty-icon">✅</div>
                  <p>No incoming emergencies</p>
                </div>
              ) : (
                incoming.map((em) => (
                  <div key={em.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{em.patient_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {em.type} · {em.village} · {em.distance_to_hospital} km away
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <span className={`badge badge-${em.status}`}>{em.status}</span>
                      {em.eta_minutes && <span className="eta-chip">ETA {em.eta_minutes}m</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="card">
        <div className="card-header">
          <span>🗺️</span>
          <span className="card-title">Hospital Locations</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
            🟢 available &nbsp;🟡 filling up &nbsp;🔴 near full
          </span>
        </div>
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <MapView emergencies={[]} responders={[]} hospitals={hospitals} height={320} />
        </div>
      </div>
    </div>
  );
}

function AddHospitalForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', phone: '', district: 'Pune',
    lat: '', lng: '', total_beds: '', beds_available: '',
    specializations: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // In demo mode this won't persist to server but shows the flow
      const res = await fetch('/api/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          lat: parseFloat(form.lat),
          lng: parseFloat(form.lng),
          total_beds: parseInt(form.total_beds),
          beds_available: parseInt(form.beds_available),
        }),
      });
      if (!res.ok) throw new Error('Failed to add hospital');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleSpec(s) {
    setForm((f) => ({
      ...f,
      specializations: f.specializations.includes(s)
        ? f.specializations.filter((x) => x !== s)
        : [...f.specializations, s],
    }));
  }

  return (
    <div className="card card-accent" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <span>🏥</span>
        <span className="card-title">Add New Hospital</span>
        <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose}>Cancel</button>
      </div>
      <div className="card-body">
        {error && <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--red-light)', color: 'var(--red)', borderRadius: 8, fontSize: 13 }}>⚠️ {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="two-col">
            <div className="form-group">
              <label className="form-label">Hospital Name</label>
              <input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Shirur Rural Hospital" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+912137222111" />
            </div>
            <div className="form-group">
              <label className="form-label">Latitude</label>
              <input className="form-input" required type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="18.8268" />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude</label>
              <input className="form-input" required type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="74.3677" />
            </div>
            <div className="form-group">
              <label className="form-label">Total Beds</label>
              <input className="form-input" required type="number" value={form.total_beds} onChange={(e) => setForm({ ...form, total_beds: e.target.value })} placeholder="30" />
            </div>
            <div className="form-group">
              <label className="form-label">Beds Available</label>
              <input className="form-input" required type="number" value={form.beds_available} onChange={(e) => setForm({ ...form, beds_available: e.target.value })} placeholder="12" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Specializations</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SPECIALIZATIONS.map((s) => (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${form.specializations.includes(s) ? 'var(--saffron)' : 'var(--border-dark)'}`, background: form.specializations.includes(s) ? 'var(--saffron-light)' : 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                  <input type="checkbox" checked={form.specializations.includes(s)} onChange={() => toggleSpec(s)} style={{ display: 'none' }} />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? '⏳ Saving...' : '🏥 Add Hospital'}
          </button>
        </form>
      </div>
    </div>
  );
}
