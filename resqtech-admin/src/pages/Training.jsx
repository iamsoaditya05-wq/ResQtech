import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

const LANG_LABELS = { hi: '🇮🇳 Hindi', mr: '🟠 Marathi', en: '🇬🇧 English' };

// Demo responders for user selector
const DEMO_USERS = [
  { id: 'u1', name: 'Ramesh Patil'   },
  { id: 'u2', name: 'Sunita Jadhav'  },
  { id: 'u3', name: 'Vijay Shinde'   },
  { id: 'u4', name: 'Priya Deshmukh' },
  { id: 'u5', name: 'Anil Kulkarni'  },
  { id: 'u6', name: 'Meena Bhosale'  },
  { id: 'u7', name: 'Santosh More'   },
  { id: 'u8', name: 'Kavita Pawar'   },
];

export default function Training() {
  const qc = useQueryClient();
  const [userId, setUserId]       = useState('u3');
  const [selected, setSelected]   = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult]   = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['training'],
    queryFn:  api.getTraining,
    refetchInterval: 15000,
  });
  const { data: progressData } = useQuery({
    queryKey: ['training-progress', userId],
    queryFn:  () => api.getProgress(userId),
    refetchInterval: 15000,
  });

  const modules  = data?.data ?? [];
  const progress = progressData?.data;

  const completeMutation = useMutation({
    mutationFn: ({ id, score }) => api.completeTraining(id, { user_id: userId, quiz_score: score }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training'] });
      qc.invalidateQueries({ queryKey: ['training-progress', userId] });
      setQuizResult(null);
      setQuizAnswers({});
    },
  });

  const required  = modules.filter((m) => m.is_required);
  const optional  = modules.filter((m) => !m.is_required);
  const totalDone = progress?.completed ?? 0;

  function handleSelect(m) {
    setSelected(m);
    setQuizAnswers({});
    setQuizResult(null);
  }

  function handleQuizSubmit(module) {
    const correct = module.quiz.filter((q, i) => quizAnswers[i] === q.answer).length;
    const score   = Math.round((correct / module.quiz.length) * 100);
    setQuizResult({ correct, total: module.quiz.length, score });
    if (score >= 60) completeMutation.mutate({ id: module.id, score });
  }

  function isCompleted(moduleId) {
    return progress?.modules?.find((m) => m.id === moduleId)?.completed ?? false;
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Training Portal</div>
          <div className="page-sub">First aid modules — Hindi, Marathi & English</div>
        </div>
        {/* User selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Viewing as:</label>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '6px 10px' }}
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setSelected(null); setQuizResult(null); setQuizAnswers({}); }}
          >
            {DEMO_USERS.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: 20, background: 'var(--sand)', border: '1px solid var(--sand-dark)' }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 32 }}>🎖️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--earth)', marginBottom: 6 }}>
                {DEMO_USERS.find(u => u.id === userId)?.name}'s Progress — {totalDone}/{modules.length} modules complete
              </div>
              <div style={{ height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${modules.length ? (totalDone / modules.length) * 100 : 0}%`,
                  background: progress?.badge_earned ? 'var(--green)' : 'var(--saffron)',
                  borderRadius: 5, transition: 'width 0.4s',
                }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {progress?.required_completed}/{progress?.required_total} required · Complete all required modules to earn Responder Badge
              </div>
            </div>
            {progress?.badge_earned && (
              <div style={{ background: 'var(--green)', color: '#fff', padding: '6px 14px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>
                🏅 Badge Earned!
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="two-col">
        {/* Module list */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--earth)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Required Modules
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {isLoading
              ? [...Array(2)].map((_, i) => <div key={i} style={{ height: 72, background: 'var(--sand)', borderRadius: 10, animation: 'pulse-dot 1.5s infinite' }} />)
              : required.map((m) => (
                <ModuleCard key={m.id} module={m} selected={selected} onSelect={handleSelect} done={isCompleted(m.id)} />
              ))
            }
          </div>

          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--earth)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Optional Modules
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {optional.map((m) => (
              <ModuleCard key={m.id} module={m} selected={selected} onSelect={handleSelect} done={isCompleted(m.id)} />
            ))}
          </div>
        </div>

        {/* Module detail / quiz */}
        <div>
          {selected ? (
            <div className="card card-accent">
              <div className="card-header">
                <span>📖</span>
                <span className="card-title">{selected.title}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12 }}>{LANG_LABELS[selected.language]}</span>
              </div>
              <div className="card-body">
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{selected.description}</p>

                {/* Video embed */}
                <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden', marginBottom: 16, aspectRatio: '16/9' }}>
                  <iframe
                    src={selected.video_url}
                    title={selected.title}
                    width="100%" height="100%"
                    style={{ border: 'none', display: 'block' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                    allowFullScreen
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span>⏱️ {selected.duration_mins} min</span>
                  <span>👥 {selected.completion_count}/{selected.total_responders} completed</span>
                  {selected.is_required && <span className="badge badge-critical">Required</span>}
                  {isCompleted(selected.id) && <span className="badge badge-done">✅ Completed</span>}
                </div>

                <div className="saree-divider" />

                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--earth)', marginBottom: 12 }}>📝 Quick Quiz</div>
                {selected.quiz.map((q, qi) => (
                  <div key={qi} style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{qi + 1}. {q.q}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {q.options.map((opt, oi) => {
                        const isSel     = quizAnswers[qi] === oi;
                        const isCorrect = quizResult && oi === q.answer;
                        const isWrong   = quizResult && isSel && oi !== q.answer;
                        return (
                          <label key={oi} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 12px', borderRadius: 8, fontSize: 13, cursor: quizResult ? 'default' : 'pointer',
                            border: `1.5px solid ${isCorrect ? 'var(--green)' : isWrong ? 'var(--red)' : isSel ? 'var(--saffron)' : 'var(--border-dark)'}`,
                            background: isCorrect ? 'var(--green-light)' : isWrong ? 'var(--red-light)' : isSel ? 'var(--saffron-light)' : '#fff',
                          }}>
                            <input type="radio" name={`q${qi}`} checked={isSel} onChange={() => !quizResult && setQuizAnswers({ ...quizAnswers, [qi]: oi })} style={{ accentColor: 'var(--saffron)' }} />
                            {opt}{isCorrect && ' ✅'}{isWrong && ' ❌'}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {quizResult ? (
                  <div style={{ padding: '12px 16px', borderRadius: 8, marginTop: 8, fontWeight: 600, fontSize: 14, background: quizResult.score >= 60 ? 'var(--green-light)' : 'var(--red-light)', color: quizResult.score >= 60 ? 'var(--green)' : 'var(--red)' }}>
                    {quizResult.score >= 60
                      ? `✅ Passed! ${quizResult.correct}/${quizResult.total} correct (${quizResult.score}%)`
                      : `❌ ${quizResult.correct}/${quizResult.total} correct — need 60% to pass`}
                    {quizResult.score < 60 && (
                      <button className="btn btn-outline btn-sm" style={{ marginLeft: 12 }} onClick={() => { setQuizResult(null); setQuizAnswers({}); }}>
                        Retry
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: 8, width: '100%' }}
                    onClick={() => handleQuizSubmit(selected)}
                    disabled={Object.keys(quizAnswers).length < selected.quiz.length || completeMutation.isPending}
                  >
                    {completeMutation.isPending ? '⏳ Saving...' : 'Submit Quiz'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ background: 'var(--sand)', border: '1px solid var(--sand-dark)' }}>
              <div className="card-body">
                <div className="empty-state">
                  <div className="empty-icon">📚</div>
                  <p>Select a module to start learning</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModuleCard({ module: m, selected, onSelect, done }) {
  const isSelected = selected?.id === m.id;
  const pct = m.total_responders ? Math.round((m.completion_count / m.total_responders) * 100) : 0;

  return (
    <div
      onClick={() => onSelect(m)}
      className="card"
      style={{
        cursor: 'pointer',
        borderLeft: `4px solid ${done ? 'var(--green)' : m.is_required ? 'var(--saffron)' : 'var(--border-dark)'}`,
        outline: isSelected ? '2px solid var(--saffron)' : 'none',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 22 }}>{done ? '✅' : m.is_required ? '⭐' : '📖'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{m.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {LANG_LABELS[m.language]} · {m.duration_mins} min
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
            {m.completion_count}/{m.total_responders}
          </div>
        </div>
        <div style={{ marginTop: 8, height: 4, background: 'var(--border)', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: done ? 'var(--green)' : 'var(--saffron)', borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}
