import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api';
import { socket } from '../socket';

export default function Settings() {
  const [smsTo, setSmsTo]         = useState('+919876543210');
  const [smsMsg, setSmsMsg]       = useState('ResQtech test message from admin dashboard');
  const [smsResult, setSmsResult] = useState(null);
  const [connected, setConnected] = useState(socket.connected);

  React.useEffect(() => {
    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect',    onConnect);
    socket.on('disconnect', onDisconnect);
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); };
  }, []);

  // Live health check from API
  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['health'],
    queryFn:  api.getHealth,
    refetchInterval: 30000,
    retry: false,
  });
  const health = healthData;

  const smsMutation = useMutation({
    mutationFn: () => api.sendSms({ to: smsTo, message: smsMsg }),
    onSuccess: (data) => setSmsResult(data),
  });

  const statusItems = health ? [
    { label: 'API Version',      value: `v${health.version}`,                                    color: 'var(--text-muted)' },
    { label: 'Mode',             value: health.mode === 'demo' ? '🟡 DEMO (mock data)' : '🟢 LIVE (Supabase)', color: health.mode === 'demo' ? 'var(--amber)' : 'var(--green)' },
    { label: 'Socket.io',        value: connected ? '🟢 Connected' : '🔴 Disconnected',           color: connected ? 'var(--green)' : 'var(--red)' },
    { label: 'Database',         value: health.services?.database === 'supabase' ? '🟢 Supabase' : '🟡 Mock', color: 'var(--text-muted)' },
    { label: 'AI Triage',        value: health.services?.ai_triage === 'claude' ? '🟢 Claude API' : '🟡 Mock fallback', color: 'var(--text-muted)' },
    { label: 'SMS',              value: health.services?.sms === 'twilio' ? '🟢 Twilio' : '🟡 Demo (console)', color: 'var(--text-muted)' },
    { label: 'Rate Limit',       value: health.services?.rate_limit || '200/min',                 color: 'var(--text-muted)' },
    { label: 'Uptime',           value: `${Math.floor((health.uptime || 0) / 60)}m ${(health.uptime || 0) % 60}s`, color: 'var(--text-muted)' },
  ] : [];

  const liveStats = health?.live_stats;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Settings</div>
        <div className="page-sub">System configuration, integrations, and testing tools</div>
      </div>

      {/* Live stats from health endpoint */}
      {liveStats && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[
            { label: 'Active Emergencies',   value: liveStats.active_emergencies,   icon: '🚨', color: liveStats.active_emergencies > 0 ? 'red' : 'green' },
            { label: 'Available Responders', value: `${liveStats.available_responders}/${liveStats.total_responders}`, icon: '🚗', color: 'green' },
            { label: 'Beds Available',       value: liveStats.beds_available,        icon: '🏥', color: 'blue'   },
            { label: 'Unread Notifications', value: liveStats.unread_notifications,  icon: '🔔', color: liveStats.unread_notifications > 0 ? 'amber' : 'green' },
          ].map((s) => (
            <div key={s.label} className={`stat-card ${s.color}`}>
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="two-col">
        {/* System status */}
        <div className="card card-accent">
          <div className="card-header">
            <span>⚙️</span>
            <span className="card-title">System Status</span>
            <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={() => refetchHealth()}>
              {healthLoading ? '⏳' : '↻ Refresh'}
            </button>
          </div>
          <div className="card-body" style={{ padding: '8px 20px' }}>
            {healthLoading ? (
              <div className="loading-center"><div className="rangoli-spinner" /></div>
            ) : !health ? (
              <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--red)' }}>
                ⚠️ Cannot reach API — is the server running?
              </div>
            ) : (
              statusItems.map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SMS test tool */}
        <div className="card">
          <div className="card-header">
            <span>📨</span>
            <span className="card-title">SMS Test Tool</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, background: health?.services?.sms === 'twilio' ? 'var(--green-light)' : 'var(--amber-light)', color: health?.services?.sms === 'twilio' ? 'var(--green)' : 'var(--amber)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
              {health?.services?.sms === 'twilio' ? 'LIVE' : 'DEMO'}
            </span>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Send a test SMS to verify Twilio integration. In demo mode, messages are logged to the API console.
            </p>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" value={smsTo} onChange={(e) => setSmsTo(e.target.value)} placeholder="+91XXXXXXXXXX" />
            </div>
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea className="form-textarea" value={smsMsg} onChange={(e) => setSmsMsg(e.target.value)} rows={3} />
            </div>
            <button className="btn btn-primary" onClick={() => smsMutation.mutate()} disabled={smsMutation.isPending || !smsTo || !smsMsg}>
              {smsMutation.isPending ? '⏳ Sending...' : '📨 Send SMS'}
            </button>
            {smsResult && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--green-light)', borderRadius: 8, fontSize: 13 }}>
                <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>✅ SMS sent!</div>
                <div style={{ fontFamily: 'Space Mono', fontSize: 11, color: 'var(--text-muted)' }}>
                  SID: {smsResult.sid} {smsResult.demo && '(demo — check API console)'}
                </div>
              </div>
            )}
            {smsMutation.isError && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--red-light)', color: 'var(--red)', borderRadius: 8, fontSize: 13 }}>
                ⚠️ {smsMutation.error?.message}
              </div>
            )}
          </div>
        </div>

        {/* SMS SOS format */}
        <div className="card">
          <div className="card-header"><span>📟</span><span className="card-title">SMS SOS Format</span></div>
          <div className="card-body">
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Patients without internet can trigger an emergency by SMS.
            </p>
            {[
              { format: 'SOS Shirur',      desc: 'By village name' },
              { format: 'SOS 18.82 74.36', desc: 'By GPS coordinates' },
              { format: 'SOS',             desc: 'Generic (defaults to district center)' },
            ].map(({ format, desc }) => (
              <div key={format} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <code style={{ fontFamily: 'Space Mono', fontSize: 13, background: 'var(--sand)', padding: '3px 8px', borderRadius: 6, color: 'var(--earth)', fontWeight: 700 }}>{format}</code>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Environment variables */}
        <div className="card">
          <div className="card-header"><span>🔑</span><span className="card-title">Environment Variables</span></div>
          <div className="card-body" style={{ padding: '8px 20px' }}>
            {[
              { key: 'DEMO_MODE',            required: false, desc: 'true = mock data, false = Supabase' },
              { key: 'SUPABASE_URL',         required: true,  desc: 'Your Supabase project URL' },
              { key: 'SUPABASE_SERVICE_KEY', required: true,  desc: 'Service role key (not anon)' },
              { key: 'ANTHROPIC_API_KEY',    required: false, desc: 'Claude API key for real triage' },
              { key: 'TWILIO_SID',           required: false, desc: 'Twilio account SID' },
              { key: 'TWILIO_TOKEN',         required: false, desc: 'Twilio auth token' },
              { key: 'TWILIO_PHONE',         required: false, desc: 'Your Twilio phone number' },
            ].map(({ key, required, desc }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <code style={{ fontFamily: 'Space Mono', fontSize: 11, background: 'var(--sand)', padding: '2px 6px', borderRadius: 4, color: 'var(--earth)', flexShrink: 0 }}>{key}</code>
                <div style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 700, background: required ? 'var(--red-light)' : 'var(--green-light)', color: required ? 'var(--red)' : 'var(--green)', flexShrink: 0 }}>
                  {required ? 'required' : 'optional'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
