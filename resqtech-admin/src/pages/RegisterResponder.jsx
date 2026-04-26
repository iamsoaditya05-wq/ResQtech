import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

const VILLAGES = [
  { name: 'Shirur',   lat: 18.8268, lng: 74.3677 },
  { name: 'Daund',    lat: 18.4607, lng: 74.5826 },
  { name: 'Baramati', lat: 18.1522, lng: 74.5815 },
  { name: 'Indapur',  lat: 18.1167, lng: 75.0167 },
  { name: 'Bhor',     lat: 18.1500, lng: 73.8500 },
  { name: 'Velhe',    lat: 18.2667, lng: 73.6500 },
  { name: 'Junnar',   lat: 19.2000, lng: 73.8833 },
  { name: 'Ambegaon', lat: 19.1167, lng: 73.7167 },
  { name: 'Khed',     lat: 18.8500, lng: 73.9833 },
  { name: 'Maval',    lat: 18.7167, lng: 73.5833 },
];

const EMPTY_FORM = { name: '', phone: '', vehicle_type: 'bike', village: 'Shirur', role: 'responder' };

export default function RegisterResponder() {
  const qc = useQueryClient();
  const [form, setForm]       = useState(EMPTY_FORM);
  const [success, setSuccess] = useState(null);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users-responders'],
    queryFn:  () => api.getUsers('responder'),
    refetchInterval: 10000,
  });
  const responders = usersData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (body) => api.createUser(body),
    onSuccess: (data) => {
      setSuccess(data.data);
      setForm(EMPTY_FORM);
      qc.invalidateQueries({ queryKey: ['users-responders'] });
      qc.invalidateQueries({ queryKey: ['responders'] });
    },
  });

  const trainMutation = useMutation({
    mutationFn: ({ id, is_trained }) => api.updateUser(id, { is_trained }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users-responders'] }),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setSuccess(null);
    const village = VILLAGES.find((v) => v.name === form.village) || VILLAGES[0];
    createMutation.mutate({ ...form, lat: village.lat, lng: village.lng });
  }

  const trained   = responders.filter((r) => r.is_trained);
  const untrained = responders.filter((r) => !r.is_trained);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Responder Registration</div>
        <div className="page-sub">Onboard new community responders to the network</div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Responders', value: responders.length,  icon: '👥', color: 'orange' },
          { label: 'Trained',          value: trained.length,     icon: '🎖️', color: 'green'  },
          { label: 'Untrained',        value: untrained.length,   icon: '📚', color: 'amber'  },
          { label: 'Bikes',            value: responders.filter(r => r.vehicle_type === 'bike').length, icon: '🏍️', color: 'blue' },
        ].map((s) => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="two-col">
        {/* Registration form */}
        <div className="card card-accent">
          <div className="card-header">
            <span>➕</span>
            <span className="card-title">Register New Responder</span>
          </div>
          <div className="card-body">
            {success && (
              <div style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--green-light)', borderRadius: 8, fontSize: 13 }}>
                <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>✅ Responder registered!</div>
                <div><strong>{success.name}</strong> added to the network</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>ID: {success.id}</div>
                <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={() => setSuccess(null)}>Dismiss</button>
              </div>
            )}

            {createMutation.isError && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--red-light)', color: 'var(--red)', borderRadius: 8, fontSize: 13 }}>
                ⚠️ {createMutation.error?.message || 'Registration failed'}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. Ramesh Patil"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  className="form-input"
                  placeholder="+91XXXXXXXXXX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>

              <div className="two-col" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label className="form-label">Vehicle Type</label>
                  <select className="form-select" value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}>
                    <option value="bike">🏍️ Bike</option>
                    <option value="car">🚗 Car</option>
                    <option value="auto">🛺 Auto</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Home Village</label>
                  <select className="form-select" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })}>
                    {VILLAGES.map((v) => <option key={v.name}>{v.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="responder">Responder</option>
                  <option value="admin">Admin</option>
                  <option value="patient">Patient</option>
                </select>
              </div>

              <button
                className="btn btn-primary"
                type="submit"
                style={{ width: '100%' }}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? '⏳ Registering...' : '➕ Register Responder'}
              </button>
            </form>
          </div>
        </div>

        {/* Responder list */}
        <div className="card">
          <div className="card-header">
            <span>👥</span>
            <span className="card-title">All Responders</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
              Click 🎖️ to toggle training status
            </span>
          </div>
          {isLoading ? (
            <div className="loading-center"><div className="rangoli-spinner" /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Vehicle</th>
                    <th>Trained</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {responders.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="responder-avatar">{r.name?.charAt(0)}</div>
                          <span style={{ fontWeight: 600 }}>{r.name}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'Space Mono', fontSize: 11 }}>{r.phone}</td>
                      <td>{r.vehicle_type === 'car' ? '🚗' : r.vehicle_type === 'auto' ? '🛺' : '🏍️'} {r.vehicle_type}</td>
                      <td>
                        <span className={`badge badge-${r.is_trained ? 'done' : 'offline'}`}>
                          {r.is_trained ? '🎖️ Trained' : '📚 Untrained'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => trainMutation.mutate({ id: r.id, is_trained: !r.is_trained })}
                          disabled={trainMutation.isPending}
                          className="btn btn-outline btn-sm"
                        >
                          {r.is_trained ? 'Revoke' : 'Mark Trained'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {responders.length === 0 && (
                    <tr><td colSpan={5}><div className="empty-state"><p>No responders registered yet</p></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
