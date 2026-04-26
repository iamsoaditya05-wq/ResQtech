import React, { useState, useEffect } from 'react';
import { api } from '../api';

const SEV_LABELS = { 1: 'Critical', 2: 'Serious', 3: 'Moderate', 4: 'Minor', 5: 'Minimal' };

export default function TriagePanel({ prefill = null }) {
  const [form, setForm] = useState({ symptoms: '', age: '', emergencyType: 'general' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Apply prefill when provided (from EmergencyModal)
  useEffect(() => {
    if (prefill) {
      setForm((f) => ({ ...f, ...prefill }));
      setResult(null);
      setError(null);
    }
  }, [prefill]);

  // Listen for preset events from TriageDemo page
  useEffect(() => {
    function onPreset(e) {
      setForm(e.detail);
      setResult(null);
      setError(null);
    }
    window.addEventListener('triage-preset', onPreset);
    return () => window.removeEventListener('triage-preset', onPreset);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.triage(form);
      setResult(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="two-col" style={{ marginBottom: 0 }}>
          <div className="form-group">
            <label className="form-label">Emergency Type</label>
            <select
              className="form-select"
              value={form.emergencyType}
              onChange={(e) => setForm({ ...form, emergencyType: e.target.value })}
            >
              <option value="general">General</option>
              <option value="cardiac">Cardiac</option>
              <option value="accident">Accident / Trauma</option>
              <option value="delivery">Delivery / Maternity</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Patient Age</label>
            <input
              className="form-input"
              type="number"
              placeholder="e.g. 45"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Symptoms / Description</label>
          <textarea
            className="form-textarea"
            placeholder="Describe symptoms... e.g. chest pain, difficulty breathing, unconscious"
            value={form.symptoms}
            onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
            required
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? '⏳ Assessing...' : '🤖 Run AI Triage'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--red-light)', color: 'var(--red)', borderRadius: 8, fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div className="loading-center" style={{ padding: 24 }}>
          <div className="rangoli-spinner" />
          <span>Claude is assessing the emergency...</span>
        </div>
      )}

      {result && <TriageResult result={result} />}
    </div>
  );
}

function TriageResult({ result }) {
  const { severity, first_aid_steps, hospital_dept, hindi_message } = result;

  return (
    <div className="triage-result">
      <div className="triage-severity">
        <div className={`severity-orb sev-${severity}`}>{severity}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{SEV_LABELS[severity]} Emergency</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Recommended: <strong>{hospital_dept}</strong>
          </div>
        </div>
      </div>

      <div className="saree-divider" />

      <div style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--earth)', marginBottom: 8 }}>
        First Aid Steps
      </div>
      <ol className="triage-steps">
        {first_aid_steps.map((step, i) => (
          <li key={i}>
            <span className="step-num">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {hindi_message && (
        <div className="hindi-msg">
          🗣️ <strong>हिंदी निर्देश:</strong> {hindi_message}
        </div>
      )}
    </div>
  );
}
