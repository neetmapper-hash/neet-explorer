'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Subject } from '@/lib/types';
import Sidebar from '@/components/Sidebar';

interface Concept {
  id: string; concept_name: string; summary: string; key_terms: string[];
  builds_upon: { concept_id: string; concept_name: string; class: number; chapter_number: number }[];
  is_main_topic: boolean; parent_concept_name: string; domain: string;
  difficulty_level: string; class: number; chapter_number: number;
  chapter_name: string; subject: string; formula: string[];
}

interface QuizQuestion {
  question: string; difficulty: string; assertion?: string; reason?: string;
  options: string[]; answer: string; explanation: string;
}

interface ChapterGroup {
  class: number; chapter_number: number; chapter_name: string; concepts: Concept[];
}

interface LevelResult { level: string; score: number; total: number; passed: boolean; }

const LEVELS = ['easy', 'medium', 'hard', 'advanced', 'expert', 'neet'];

const LEVEL_LABELS: Record<string, string> = {
  easy: '🟢 Easy', medium: '🟡 Medium', hard: '🔴 Hard',
  advanced: '🟣 Advanced', expert: '⭐ Expert', neet: '🎯 NEET Level',
};

const LEVEL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  easy:     { bg: '#052e16', border: '#16a34a', text: '#4ade80' },
  medium:   { bg: '#1c1a00', border: '#ca8a04', text: '#fbbf24' },
  hard:     { bg: '#1f0a0a', border: '#dc2626', text: '#f87171' },
  advanced: { bg: '#1a0f2e', border: '#7c3aed', text: '#c4b5fd' },
  expert:   { bg: '#0c1a2e', border: '#2563eb', text: '#93c5fd' },
  neet:     { bg: '#1a0a1a', border: '#db2777', text: '#f9a8d4' },
};

const CLASS_COLOR: Record<number, string> = { 8: '#10b981', 9: '#16a34a', 10: '#f59e0b', 11: '#a78bfa', 12: '#f87171' };
const CLASS_EMOJI: Record<number, string> = { 8: '🌱', 9: '🌿', 10: '🔗', 11: '🔗', 12: '🎯' };

function groupByChapter(concepts: Concept[]): ChapterGroup[] {
  const map = new Map<string, ChapterGroup>();
  for (const c of concepts) {
    const key = `${c.class}_${c.chapter_number}`;
    if (!map.has(key)) map.set(key, { class: c.class, chapter_number: c.chapter_number, chapter_name: c.chapter_name, concepts: [] });
    map.get(key)!.concepts.push(c);
  }
  return Array.from(map.values()).sort((a, b) => a.class !== b.class ? a.class - b.class : a.chapter_number - b.chapter_number);
}

export default function QuizPage() {
  const router = useRouter();
  const [subject, setSubject] = useState<Subject>('Biology');
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedClasses, setExpandedClasses] = useState<Set<number>>(new Set([]));
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [quizMode, setQuizMode] = useState<'mcq' | 'assertion' | null>(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [levelResults, setLevelResults] = useState<LevelResult[]>([]);
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);

  useEffect(() => {
    setLoading(true);
    setSelectedConcept(null);
    resetQuiz();
    const file = subject === 'Biology' ? 'biology_concepts_new.json'
      : subject === 'Physics' ? 'physics_concepts_new.json' : 'chemistry_concepts_new.json';
    fetch(`/${file}`).then(r => r.json())
      .then((data: Concept[]) => { setConcepts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [subject]);

  function resetQuiz() {
    setQuizMode(null); setCurrentLevel(0); setQuestions([]); setAnswers({});
    setLevelResults([]); setPreviousQuestions([]); setShowSummary(false);
    setLevelComplete(false); setQuizError(null);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return concepts;
    const q = search.toLowerCase();
    return concepts.filter(c => c.concept_name.toLowerCase().includes(q) || c.chapter_name.toLowerCase().includes(q));
  }, [concepts, search]);

  const byClass = useMemo(() => {
    const chapters = groupByChapter(filtered);
    const map = new Map<number, ChapterGroup[]>();
    for (const ch of chapters) {
      if (!map.has(ch.class)) map.set(ch.class, []);
      map.get(ch.class)!.push(ch);
    }
    return map;
  }, [filtered]);

  const toggleClass = (cls: number) => {
    setExpandedClasses(prev => { const next = new Set(prev); next.has(cls) ? next.delete(cls) : next.add(cls); return next; });
  };

  async function generateLevel(levelIndex: number, mode: 'mcq' | 'assertion') {
    if (!selectedConcept) return;
    setLoadingQuiz(true); setQuizError(null); setQuestions([]); setAnswers({}); setLevelComplete(false);
    const level = LEVELS[levelIndex];
    const chapterConcepts = concepts.filter(c => c.class === selectedConcept.class && c.chapter_number === selectedConcept.chapter_number);
    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject, classLevel: selectedConcept.class, chapter: selectedConcept.chapter_name,
          concepts: chapterConcepts, mode: mode === 'assertion' ? 'assertion_reasoning' : 'mcq',
          difficulty: level, previousQuestions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions);
        setPreviousQuestions(prev => [...prev, ...data.questions.map((q: QuizQuestion) => q.question)]);
      } else { setQuizError(data.error ?? 'Failed to generate questions'); }
    } catch { setQuizError('Network error — please try again'); }
    finally { setLoadingQuiz(false); }
  }

  function startQuiz(mode: 'mcq' | 'assertion') { resetQuiz(); setQuizMode(mode); generateLevel(0, mode); }

  function selectAnswer(qIdx: number, option: string) {
    if (answers[qIdx]) return;
    const newAnswers = { ...answers, [qIdx]: option };
    setAnswers(newAnswers);
    if (Object.keys(newAnswers).length === questions.length) setLevelComplete(true);
  }

  const levelScore = useMemo(() => questions.filter((q, i) => answers[i] === q.answer).length, [questions, answers]);
  const levelPassed = levelScore >= 3;

  function nextLevel() {
    setLevelResults(prev => [...prev, { level: LEVELS[currentLevel], score: levelScore, total: questions.length, passed: levelPassed }]);
    if (currentLevel >= LEVELS.length - 1) { setShowSummary(true); }
    else { const next = currentLevel + 1; setCurrentLevel(next); generateLevel(next, quizMode!); }
  }

  function retryLevel() { generateLevel(currentLevel, quizMode!); }

  const totalScore = levelResults.reduce((s, r) => s + r.score, 0);
  const totalPossible = levelResults.reduce((s, r) => s + r.total, 0);
  const lc = LEVEL_COLORS[LEVELS[currentLevel]] ?? LEVEL_COLORS.easy;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      <Sidebar currentPage="quiz" subject={subject} selectedYears={[2021,2022,2023,2024,2025]}
        onPageChange={page => {
          if (page === 'heatmap') router.push('/heatmap');
          if (page === 'ancestry') router.push('/ancestry');
          if (page === 'concept-map') router.push('/concept-map');
        }}
        onSubjectChange={s => { setSubject(s); setSearch(''); }}
        onYearsChange={() => {}} />

      {/* Concept browser */}
      <div style={{ width: '290px', minHeight: '100vh', background: '#0d0d0d', borderRight: '1px solid #1e1e1e', overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '16px 14px 10px', borderBottom: '1px solid #1e1e1e' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f9fafb', marginBottom: '8px' }}>📚 Concepts</div>
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '7px 12px', color: '#f9fafb', fontSize: '12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
        {loading ? <div style={{ padding: '20px', color: '#4b5563', fontSize: '12px' }}>Loading...</div> : (
          <div style={{ padding: '6px 0' }}>
            {Array.from(byClass.entries()).sort((a, b) => a[0] - b[0]).map(([cls, chs]) => (
              <div key={cls}>
                <button onClick={() => toggleClass(Number(cls))} style={{ width: '100%', textAlign: 'left', padding: '7px 14px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
                  <span style={{ fontSize: '11px', color: CLASS_COLOR[cls] ?? '#6b7280' }}>{CLASS_EMOJI[cls]} Class {cls}</span>
                  <span style={{ fontSize: '9px', color: '#374151', marginLeft: 'auto' }}>{expandedClasses.has(Number(cls)) ? '▲' : '▼'}</span>
                </button>
                {expandedClasses.has(Number(cls)) && chs.map(ch => (
                  <div key={`${ch.class}_${ch.chapter_number}`}>
                    <div style={{ padding: '4px 14px 2px 24px', fontSize: '10px', color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Ch {ch.chapter_number} · {ch.chapter_name.slice(0, 26)}
                    </div>
                    {ch.concepts.filter(c => c.is_main_topic && !c.parent_concept_name).map(c => (
                      <button key={c.id} onClick={() => { setSelectedConcept(c); resetQuiz(); }}
                        style={{ width: '100%', textAlign: 'left', padding: '5px 14px 5px 26px', background: selectedConcept?.id === c.id ? '#0f1f0f' : 'transparent', border: 'none', borderLeft: selectedConcept?.id === c.id ? '2px solid #16a34a' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s' }}>
                        <span style={{ fontSize: '11px', color: selectedConcept?.id === c.id ? '#4ade80' : '#6b7280' }}>{c.concept_name}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main panel */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
        {!selectedConcept ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '32px' }}>📚</div>
            <div style={{ fontSize: '13px', color: '#374151' }}>Select a concept to start the adaptive quiz</div>
          </div>
        ) : showSummary ? (
          <div style={{ maxWidth: '580px' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#f9fafb', marginBottom: '6px' }}>🎯 Quiz Complete!</div>
            <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '20px' }}>{selectedConcept.concept_name} · {selectedConcept.chapter_name}</div>
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '14px', padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 800, color: totalScore >= totalPossible * 0.6 ? '#4ade80' : '#f87171' }}>{totalScore}/{totalPossible}</div>
              <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '4px' }}>{Math.round(totalScore / Math.max(totalPossible, 1) * 100)}% overall score</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {levelResults.map((r, i) => {
                const c = LEVEL_COLORS[r.level] ?? LEVEL_COLORS.easy;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: c.bg, border: `1px solid ${c.border}44`, borderRadius: '10px', padding: '10px 16px' }}>
                    <span style={{ fontSize: '13px', color: c.text }}>{LEVEL_LABELS[r.level]}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: r.passed ? '#4ade80' : '#f87171' }}>{r.score}/{r.total}</span>
                      <span style={{ fontSize: '11px', color: r.passed ? '#16a34a' : '#ef4444' }}>{r.passed ? '✓ Passed' : '✗ Failed'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={resetQuiz} style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: '#052e16', color: '#4ade80', border: '1px solid #16a34a44', fontFamily: 'inherit' }}>
              🔄 Start Again
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: '660px' }}>
            {/* Concept info + start buttons */}
            {!quizMode && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '20px', background: '#0f1f0f', color: CLASS_COLOR[selectedConcept.class] ?? '#6b7280', border: `1px solid ${CLASS_COLOR[selectedConcept.class] ?? '#1e1e1e'}44` }}>
                    Class {selectedConcept.class} → Ch {selectedConcept.chapter_number}
                  </span>
                </div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#f9fafb', margin: '0 0 6px' }}>{selectedConcept.concept_name}</h1>
                <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '12px' }}>{selectedConcept.chapter_name}</div>
                <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '14px', marginBottom: '18px' }}>
                  <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: 1.6, margin: 0 }}>{selectedConcept.summary}</p>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: '#374151', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Adaptive difficulty — 6 levels × 5 questions · Score ≥ 3/5 to advance
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {LEVELS.map(l => (
                      <span key={l} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: LEVEL_COLORS[l].bg, color: LEVEL_COLORS[l].text, border: `1px solid ${LEVEL_COLORS[l].border}44` }}>
                        {LEVEL_LABELS[l]}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => startQuiz('mcq')} style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: '#052e16', color: '#4ade80', border: '1px solid #16a34a44', fontFamily: 'inherit' }}>
                    📝 Start MCQ Quiz
                  </button>
                  <button onClick={() => startQuiz('assertion')} style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: '#1e1b4b', color: '#a78bfa', border: '1px solid #7c3aed44', fontFamily: 'inherit' }}>
                    🧠 Assertion &amp; Reasoning
                  </button>
                </div>
              </div>
            )}

            {/* Active quiz */}
            {quizMode && (
              <div>
                {/* Progress bar */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
                  {LEVELS.map((l, i) => {
                    const r = levelResults.find(x => x.level === l);
                    const isCur = i === currentLevel && questions.length > 0;
                    return <div key={l} style={{ flex: 1, height: '4px', borderRadius: '4px', background: r ? (r.passed ? '#16a34a' : '#ef4444') : isCur ? LEVEL_COLORS[l].border : '#1e1e1e', transition: 'background 0.3s' }} />;
                  })}
                </div>

                {/* Level badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: lc.bg, border: `1px solid ${lc.border}` }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: lc.text }}>{LEVEL_LABELS[LEVELS[currentLevel]]}</span>
                    <span style={{ fontSize: '11px', color: lc.text, opacity: 0.7 }}>Level {currentLevel + 1}/{LEVELS.length}</span>
                  </div>
                  {levelComplete && (
                    <div style={{ fontSize: '13px', fontWeight: 700, color: levelPassed ? '#4ade80' : '#f87171' }}>
                      {levelScore}/{questions.length} — {levelPassed ? '✓ Passed' : '✗ Need 3+'}
                    </div>
                  )}
                </div>

                {/* Loading */}
                {loadingQuiz && (
                  <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                    <div style={{ fontSize: '13px', color: '#4b5563' }}>Generating {LEVEL_LABELS[LEVELS[currentLevel]]} questions...</div>
                    <div style={{ fontSize: '11px', color: '#374151', marginTop: '4px' }}>Takes ~10 seconds</div>
                  </div>
                )}

                {/* Error */}
                {quizError && (
                  <div style={{ background: '#1f0a0a', border: '1px solid #7f1d1d', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', fontSize: '13px', color: '#f87171' }}>
                    ❌ {quizError}
                    <button onClick={() => generateLevel(currentLevel, quizMode!)} style={{ marginLeft: '12px', fontSize: '12px', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>Try again</button>
                  </div>
                )}

                {/* Questions */}
                {!loadingQuiz && questions.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {questions.map((q, idx) => {
                      const sel = answers[idx];
                      return (
                        <div key={idx} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#374151', background: '#1a1a1a', padding: '2px 7px', borderRadius: '20px', flexShrink: 0, marginTop: '2px' }}>Q{idx + 1}</span>
                            <p style={{ fontSize: '13px', color: '#f9fafb', margin: 0, lineHeight: 1.5 }}>{q.question}</p>
                          </div>
                          {q.assertion && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                              <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#93c5fd' }}><strong>Assertion:</strong> {q.assertion}</div>
                              <div style={{ background: '#1a0f2e', border: '1px solid #4c1d95', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#c4b5fd' }}><strong>Reason:</strong> {q.reason}</div>
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {q.options.map((opt, oi) => {
                              const isCorrect = opt === q.answer, isSelected = opt === sel;
                              let bg = '#1a1a1a', border = '#2d2d2d', color = '#9ca3af';
                              if (sel) {
                                if (isCorrect) { bg = '#052e16'; border = '#16a34a'; color = '#4ade80'; }
                                else if (isSelected) { bg = '#1f0a0a'; border = '#7f1d1d'; color = '#f87171'; }
                                else { bg = '#111'; border = '#1e1e1e'; color = '#4b5563'; }
                              }
                              return <button key={oi} disabled={!!sel} onClick={() => selectAnswer(idx, opt)} style={{ textAlign: 'left', padding: '9px 13px', borderRadius: '8px', border: `1px solid ${border}`, background: bg, color, fontSize: '12px', cursor: sel ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'all 0.1s' }}>{opt}</button>;
                            })}
                          </div>
                          {sel && (
                            <div style={{ marginTop: '10px', background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#93c5fd', lineHeight: 1.6 }}>
                              <strong>Explanation:</strong> {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Level complete action */}
                    {levelComplete && (
                      <div style={{ background: levelPassed ? '#052e16' : '#1f0a0a', border: `1px solid ${levelPassed ? '#16a34a' : '#7f1d1d'}`, borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: levelPassed ? '#4ade80' : '#f87171', marginBottom: '2px' }}>
                            {levelPassed ? '✓ Level Passed!' : '✗ Need 3+ to advance'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#4b5563' }}>Score: {levelScore}/{questions.length}</div>
                        </div>
                        {levelPassed ? (
                          <button onClick={nextLevel} style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: '#052e16', color: '#4ade80', border: '1px solid #16a34a', fontFamily: 'inherit' }}>
                            {currentLevel >= LEVELS.length - 1 ? '🎯 See Results' : 'Next: ' + LEVEL_LABELS[LEVELS[currentLevel + 1]] + ' →'}
                          </button>
                        ) : (
                          <button onClick={retryLevel} style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: '#1f0a0a', color: '#f87171', border: '1px solid #7f1d1d', fontFamily: 'inherit' }}>
                            🔄 Retry {LEVEL_LABELS[LEVELS[currentLevel]]}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
// cache bust Sun May 24 05:04:47 PM IST 2026
