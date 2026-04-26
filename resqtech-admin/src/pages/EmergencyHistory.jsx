import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import EmergencyModal from '../components/EmergencyModal';

const TYPE_EMOJI  = { cardiac: '❤️', accident: '🚗', delivery: '👶', general: '🏥' };
const SEV_COLORS  = { 1: '#DC2626', 2: '#EA580C', 3: '#D97706', 4: '#1D4ED8', 5: '#166534' };
const SEV_LABELS  = { 1: 'Critical', 2: 'Serious', 3: 'Moderate', 4: 'Minor', 5: 'Minimal' };
const PAGE_SIZE   = 15;

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN');
}

export default function EmergencyHistory() {
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [type, setType]       = useState('');
  const [page, setPage]       = useState(0);
  const [modalEm, setModalEm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['emergency-history', search, status, type],
    queryFn:  () => api.searchEmergencies({
      ...(search ? { q: search } : {}),
      ...(status ? { status } : {}),
      ...(type   ? { type }   : {}),
      limit: 200,
    }),
    keepPreviousData: true,
  });

  const all       = data?.data ?? [];
  const total     = all.length;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const paged     = all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleSearchChange(val) {
    setSearch(val);
    setPage(0);
  }

  const statusCounts = {
    all:      all.length,
    pending:  all.filter(e => e.status === 'pending').length,
    matched:  all.filter(e => e.status === 'matched').length,
    en_route: all.filter(e => e.status === 'en_route').length,
    done:     all.filter(e => e.status === 'done').length,
  };

  return (
    <div>
      {modalEm && <EmergencyModal emergency={modalEm} onClose={() => setModalEm(null)} />}

      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Emergency History</div>
          <div className="page-sub">Full searchable record of all emergencies</div>
        </div>
        <a
          href={api.exportEmergenciesUrl()}
          download="resqtech-emergencies.csv"
          className="btn btn-outline btn-sm"
        >
          ⬇️ Export CSV
        </a>
      </div>

      {/* Status summary chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: '',        label: `All (${statusCounts.all})`,           color: 'var(--earth)'    },
          { key: 'pending', label: `Pending (${statusCounts.pending})`,   color: 'var(--amber)'    },
          { key: 'matched', label: `Matched (${statusCounts.matched})`,   color: 'var(--blue)'     },
          { key: 'en_route',label: `En Route (${statusCounts.en_route})`, color: 'var(--saffron)'  },
          { key: 'done',    label: `Done (${statusCounts.done})`,         color: 'var(--green)'    },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => { setStatus(key); setPage(0); }}
            style={{
              padding: '5px 14px', fontSize: 12, fontWeight: 700,
              border: `1.5px solid ${status === key ? color : 'var(--border-dark)'}`,
              borderRadius: 20,
              background: status === key ? `${color}18` : 'transparent',
              color: status === key ? color : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--sand)', border: '1.5px solid var(--border-dark)', borderRadius: 8, padding: '8px 12px', flex: '1 1 240px', maxWidth: 320 }}>
          <span style={{ fontSize: 14 }}>🔍</span>
          <input
            style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', flex: 1 }}
            placeholder="Search patient, village, responder…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {search && <button onClick={() => handleSearchChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14 }}>✕</button>}
        </div>

        <select className="form-select" style={{ width: 'auto', padding: '8px 12px' }} value={type} onChange={(e) => { setType(e.target.value); setPage(0); }}>
          <option value="">All types</option>
          <option value="cardiac">❤️ Cardiac</option>
          <option value="accident">🚗 Accident</option>
          <option value="delivery">👶 Delivery</option>
          <option value="general">🏥 General</option>
        </select>

        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {total} results · page {page + 1}/{Math.max(1, pageCount)}
        </span>
      </div>

      {/* Table */}
      <div className="card">
        {isLoading ? (
          <div className="loading-center" style={{ padding: 48 }}><div className="rangoli-spinner" /></div>
        ) : paged.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>No emergencies found{search ? ` for "${search}"` : ''}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Type</th>
                  <th>Village</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Responder</th>
                  <th>ETA</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((em) => (
                  <tr key={em.id} style={{ cursor: 'pointer' }} onClick={() => setModalEm(em)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{em.patient_name}</div>
                      <div style={{ fontSize: 10, fontFamily: 'Space Mono', color: 'var(--text-muted)' }}>{em.id.slice(0, 8)}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: 16 }}>{TYPE_EMOJI[em.type]}</span>
                      <span style={{ fontSize: 12, marginLeft: 4, textTransform: 'capitalize' }}>{em.type}</span>
                    </td>
                    <td>📍 {em.village}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: SEV_COLORS[em.severity], flexShrink: 0 }} />
                        <span style={{ fontSize: 12 }}>{SEV_LABELS[em.severity]}</span>
                      </div>
                    </td>
                    <td><span className={`badge badge-${em.status}`}>{em.status.replace('_', ' ')}</span></td>
                    <td style={{ fontSize: 13 }}>{em.responder_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: 12 }}>
                      {em.eta_minutes ? `${em.eta_minutes}m` : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(em.created_at)}</td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={(e) => { e.stopPropagation(); setModalEm(em); }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pageCount > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-outline btn-sm" onClick={() => setPage(0)} disabled={page === 0}>«</button>
            <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>‹ Prev</button>
            {[...Array(Math.min(5, pageCount))].map((_, i) => {
              const p = Math.max(0, Math.min(page - 2, pageCount - 5)) + i;
              return (
                <button
                  key={p}
                  className="btn btn-sm"
                  onClick={() => setPage(p)}
                  style={{ background: p === page ? 'var(--saffron)' : 'transparent', color: p === page ? '#fff' : 'var(--text-muted)', border: '1.5px solid var(--border-dark)' }}
                >
                  {p + 1}
                </button>
              );
            })}
            <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>Next ›</button>
            <button className="btn btn-outline btn-sm" onClick={() => setPage(pageCount - 1)} disabled={page >= pageCount - 1}>»</button>
          </div>
        )}
      </div>
    </div>
  );
}
