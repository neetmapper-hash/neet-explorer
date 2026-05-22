'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Subject } from '@/lib/types';
import Sidebar from '@/components/Sidebar';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Concept {
  id: string;
  concept_name: string;
  summary: string;
  key_terms: string[];
  builds_upon: { concept_id: string; concept_name: string; class: number; chapter_number: number }[];
  is_main_topic: boolean;
  parent_concept_name: string;
  domain: string;
  difficulty_level: string;
  class: number;
  chapter_number: number;
  chapter_name: string;
  subject: string;
  formula: string[];
}

interface QuizQuestion {
  question: string;
  difficulty: string;
  assertion?: string;
  reason?: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface ChapterGroup {
  class: number;
  chapter_number: number;
  chapter_name: string;
  concepts: Concept[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function groupByChapter(concepts: Concept[]): ChapterGroup[] {
  const map = new Map<string, ChapterGroup>();
  for (const c of concepts) {
    const key = `${c.class}_${c.chapter_number}`;
    if (!map.has(key)) {
      map.set(key, {
        class: c.class,
        chapter_number: c.chapter_number,
        chapter_name: c.chapter_name,
        concepts: [],
      });
    }
    map.get(key)!.concepts.push(c);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.class !== b.class ? a.class - b.class : a.chapter_number - b.chapter_number
  );
}

const CLASS_EMOJI: Record<number, string> = { 8: '🌱', 9: '🌿', 10: '🔗', 11: '🔗', 12: '🎯' };
const CLASS_COLOR: Record<number, string> = {
  8: '#10b981', 9: '#16a34a', 10: '#f59e0b', 11: '#a78bfa', 12: '#f87171',
};
const DIFF_COLOR: Record<string, string> = {
  easy: '#16a34a', medium: '#f59e0b', hard: '#ef4444', advanced: '#a855f7',
};

// ── Main page ──────────────────────────────────────────────────────────────────

export default function QuizPage() {
  const router = useRouter();

  const [subject, setSubject]               = useState<Subject>('Biology');
  const [concepts, setConcepts]             = useState<Concept[]>([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState('');
  const [expandedClasses, setExpandedClasses] = useState<Set<number>>(new Set([11, 12]));
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [quizQuestions, setQuizQuestions]   = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [loadingQuiz, setLoadingQuiz]       = useState(false);
  const [quizMode, setQuizMode]             = useState<'mcq' | 'assertion' | null>(null);
  const [quizError, setQuizError]           = useState<string | null>(null);

  // Load concepts JSON when subject changes
  useEffect(() => {
    setLoading(true);
    setSelectedConcept(null);
    setQuizQuestions([]);
    setQuizMode(null);

    const file = subject === 'Biology'
      ? 'biology_concepts_new.json'
      : subject === 'Physics'
      ? 'physics_concepts_new.json'
      : 'chemistry_concepts_new.json';

    fetch(`/${file}`)
      .then(r => r.json())
      .then((data: Concept[]) => {
        setConcepts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [subject]);

  // Filter concepts by search
  const filtered = useMemo(() => {
    if (!search.trim()) return concepts;
    const q = search.toLowerCase();
    return concepts.filter(
      c =>
        c.concept_name.toLowerCase().includes(q) ||
        c.chapter_name.toLowerCase().includes(q)
    );
  }, [concepts, search]);

  // Group by chapter
  const chapters = useMemo(() => groupByChapter(filtered), [filtered]);

  // Group chapters by class
  const byClass = useMemo(() => {
    const map = new Map<number, ChapterGroup[]>();
    for (const ch of chapters) {
      if (!map.has(ch.class)) map.set(ch.class, []);
      map.get(ch.class)!.push(ch);
    }
    return map;
  }, [chapters]);

  // Toggle class expansion
  const toggleClass = (cls: number) => {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      next.has(cls) ? next.delete(cls) : next.add(cls);
      return next;
    });
  };

  // Generate quiz
  const generateQuiz = async (mode: 'mcq' | 'assertion', concept: Concept) => {
    if (loadingQuiz) return;
    setLoadingQuiz(true);
    setQuizError(null);
    setQuizQuestions([]);
    setSelectedAnswers({});
    setQuizMode(mode);

    // Get all concepts from same chapter
    const chapterConcepts = concepts.filter(
      c => c.class === concept.class && c.chapter_number === concept.chapter_number
    );

    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          classLevel: concept.class,
          chapter: concept.chapter_name,
          concepts: chapterConcepts,
          mode: mode === 'assertion' ? 'assertion_reasoning' : 'mcq',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setQuizQuestions(data.questions);
      } else {
        setQuizError(data.error ?? 'Failed to generate questions');
        setQuizMode(null);
      }
    } catch {
      setQuizError('Network error — please try again');
      setQuizMode(null);
    } finally {
      setLoadingQuiz(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      <Sidebar
        currentPage="ancestry"
        subject={subject}
        selectedYears={[2021, 2022, 2023, 2024, 2025]}
        onPageChange={page => {
          if (page === 'heatmap') router.push('/heatmap');
          if (page === 'ancestry') router.push('/ancestry');
          if (page === 'concept-map') router.push('/concept-map');
        }}
        onSubjectChange={s => { setSubject(s); setSearch(''); }}
        onYearsChange={() => {}}
      />

      {/* ── Left panel: concept browser ── */}
      <div style={{
        width: '320px', minHeight: '100vh', background: '#0d0d0d',
        borderRight: '1px solid #1e1e1e', overflowY: 'auto', flexShrink: 0,
      }}>
        {/* Header */}
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #1e1e1e' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f9fafb', marginBottom: '10px' }}>
            📚 Concepts
          </div>
          <input
            type="text"
            placeholder="Search concepts or chapters..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', background: '#111', border: '1px solid #1e1e1e',
              borderRadius: '8px', padding: '8px 12px', color: '#f9fafb',
              fontSize: '12px', outline: 'none', fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Tree */}
        {loading ? (
          <div style={{ padding: '20px', color: '#4b5563', fontSize: '13px' }}>Loading...</div>
        ) : (
          <div style={{ padding: '8px 0' }}>
            {Array.from(byClass.entries()).sort((a, b) => a[0] - b[0]).map(([cls, chs]) => (
              <div key={cls}>
                {/* Class header */}
                <button
                  onClick={() => toggleClass(cls)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '8px 16px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: '12px', color: CLASS_COLOR[cls] ?? '#6b7280' }}>
                    {CLASS_EMOJI[cls] ?? '•'} Class {cls}
                  </span>
                  <span style={{ fontSize: '10px', color: '#374151', marginLeft: 'auto' }}>
                    {expandedClasses.has(cls) ? '▲' : '▼'}
                  </span>
                </button>

                {/* Chapters */}
                {expandedClasses.has(cls) && chs.map(ch => (
                  <div key={`${ch.class}_${ch.chapter_number}`}>
                    {/* Chapter label */}
                    <div style={{
                      padding: '6px 16px 4px 28px',
                      fontSize: '11px', color: '#4b5563', fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      Ch {ch.chapter_number} · {ch.chapter_name.slice(0, 30)}
                    </div>

                    {/* Main topic concepts only */}
                    {ch.concepts
                      .filter(c => c.is_main_topic && !c.parent_concept_name)
                      .map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedConcept(c);
                            setQuizQuestions([]);
                            setQuizMode(null);
                            setSelectedAnswers({});
                          }}
                          style={{
                            width: '100%', textAlign: 'left', padding: '6px 16px 6px 32px',
                            background: selectedConcept?.id === c.id ? '#0f1f0f' : 'transparent',
                            border: 'none', borderLeft: selectedConcept?.id === c.id
                              ? '2px solid #16a34a' : '2px solid transparent',
                            cursor: 'pointer', fontFamily: 'inherit',
                            transition: 'all 0.1s',
                          }}
                        >
                          <span style={{
                            fontSize: '12px',
                            color: selectedConcept?.id === c.id ? '#4ade80' : '#9ca3af',
                          }}>
                            {c.concept_name}
                          </span>
                        </button>
                      ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Right panel: concept detail + quiz ── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        {!selectedConcept ? (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexDirection: 'column', gap: '12px',
          }}>
            <div style={{ fontSize: '32px' }}>📚</div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              Select a concept from the sidebar to begin
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: '760px' }}>

            {/* Concept header */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px',
              }}>
                <span style={{
                  fontSize: '11px', fontWeight: 600, padding: '3px 8px',
                  borderRadius: '20px', background: '#0f1f0f',
                  color: CLASS_COLOR[selectedConcept.class] ?? '#6b7280',
                  border: `1px solid ${CLASS_COLOR[selectedConcept.class] ?? '#1e1e1e'}44`,
                }}>
                  Class {selectedConcept.class} → Ch {selectedConcept.chapter_number}
                </span>
                <span style={{
                  fontSize: '11px', color: '#4b5563',
                  padding: '3px 8px', borderRadius: '20px',
                  background: '#111', border: '1px solid #1e1e1e',
                }}>
                  {selectedConcept.domain}
                </span>
              </div>

              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f9fafb', margin: '0 0 6px' }}>
                {selectedConcept.concept_name}
              </h1>

              <div style={{ fontSize: '12px', color: '#4b5563' }}>
                {selectedConcept.chapter_name}
              </div>
            </div>

            {/* Summary */}
            <div style={{
              background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px',
              padding: '16px', marginBottom: '20px',
            }}>
              <div style={{ fontSize: '11px', color: '#374151', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Summary
              </div>
              <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: 1.6, margin: 0 }}>
                {selectedConcept.summary}
              </p>
            </div>

            {/* Key terms */}
            {selectedConcept.key_terms?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                {selectedConcept.key_terms.slice(0, 8).map((t, i) => (
                  <span key={i} style={{
                    fontSize: '11px', padding: '3px 10px', borderRadius: '20px',
                    background: '#1a1a1a', border: '1px solid #2d2d2d', color: '#9ca3af',
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Formula */}
            {selectedConcept.formula?.length > 0 && (
              <div style={{
                background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: '12px',
                padding: '12px 16px', marginBottom: '20px',
              }}>
                <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Formula
                </div>
                {selectedConcept.formula.map((f, i) => (
                  <div key={i} style={{ fontSize: '13px', color: '#93c5fd', fontFamily: 'monospace' }}>
                    {f}
                  </div>
                ))}
              </div>
            )}

            {/* Prerequisites */}
            {selectedConcept.builds_upon?.length > 0 && (
              <div style={{
                background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px',
                padding: '14px 16px', marginBottom: '20px',
              }}>
                <div style={{ fontSize: '11px', color: '#374151', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Prerequisites
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedConcept.builds_upon.map((b, i) => (
                    <span key={i} style={{
                      fontSize: '11px', padding: '4px 10px', borderRadius: '8px',
                      background: '#1a1a1a', border: '1px solid #2d2d2d', color: '#9ca3af',
                    }}>
                      Class {b.class} Ch {b.chapter_number}: {b.concept_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Generate buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <button
                onClick={() => generateQuiz('mcq', selectedConcept)}
                disabled={loadingQuiz}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px',
                  fontWeight: 700, cursor: loadingQuiz ? 'not-allowed' : 'pointer',
                  background: loadingQuiz ? '#1a1a1a' : '#052e16',
                  color: loadingQuiz ? '#374151' : '#4ade80',
                  border: `1px solid ${loadingQuiz ? '#1e1e1e' : '#16a34a44'}`,
                  fontFamily: 'inherit', transition: 'all 0.12s',
                }}
              >
                {loadingQuiz && quizMode === 'mcq' ? '⏳ Generating...' : '📝 Mock Test (MCQ)'}
              </button>

              <button
                onClick={() => generateQuiz('assertion', selectedConcept)}
                disabled={loadingQuiz}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px',
                  fontWeight: 700, cursor: loadingQuiz ? 'not-allowed' : 'pointer',
                  background: loadingQuiz ? '#1a1a1a' : '#1e1b4b',
                  color: loadingQuiz ? '#374151' : '#a78bfa',
                  border: `1px solid ${loadingQuiz ? '#1e1e1e' : '#7c3aed44'}`,
                  fontFamily: 'inherit', transition: 'all 0.12s',
                }}
              >
                {loadingQuiz && quizMode === 'assertion' ? '⏳ Generating...' : '🧠 Assertion & Reasoning'}
              </button>
            </div>

            {/* Loading state */}
            {loadingQuiz && (
              <div style={{
                background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px',
                padding: '24px', textAlign: 'center', marginBottom: '24px',
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                <div style={{ fontSize: '13px', color: '#4b5563' }}>
                  Generating {quizMode === 'assertion' ? 'assertion & reasoning' : 'MCQ'} questions...
                </div>
                <div style={{ fontSize: '11px', color: '#374151', marginTop: '4px' }}>
                  This takes ~30-60 seconds
                </div>
              </div>
            )}

            {/* Error */}
            {quizError && (
              <div style={{
                background: '#1f0a0a', border: '1px solid #7f1d1d', borderRadius: '12px',
                padding: '14px 16px', marginBottom: '24px',
                fontSize: '13px', color: '#f87171',
              }}>
                ❌ {quizError}
              </div>
            )}

            {/* Quiz questions */}
            {quizQuestions.length > 0 && (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '16px',
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f9fafb' }}>
                    {quizMode === 'assertion' ? '🧠 Assertion & Reasoning Test' : '📝 Mock Test'}
                    <span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 400, marginLeft: '8px' }}>
                      {quizQuestions.length} questions
                    </span>
                  </div>
                  <button
                    onClick={() => { setQuizQuestions([]); setQuizMode(null); setSelectedAnswers({}); }}
                    style={{
                      fontSize: '11px', color: '#6b7280', background: 'transparent',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    ✕ Close
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {quizQuestions.map((q, idx) => {
                    const selected = selectedAnswers[idx];
                    return (
                      <div key={idx} style={{
                        background: '#111', border: '1px solid #1e1e1e',
                        borderRadius: '12px', padding: '18px',
                      }}>
                        {/* Question header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                          <span style={{
                            fontSize: '11px', fontWeight: 700, color: '#374151',
                            background: '#1a1a1a', padding: '2px 8px', borderRadius: '20px',
                            flexShrink: 0, marginTop: '2px',
                          }}>
                            Q{idx + 1}
                          </span>
                          <span style={{
                            fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                            background: '#1a1a1a', flexShrink: 0, marginTop: '2px',
                            color: DIFF_COLOR[q.difficulty] ?? '#6b7280',
                          }}>
                            {q.difficulty}
                          </span>
                          <p style={{ fontSize: '13px', color: '#f9fafb', margin: 0, lineHeight: 1.5 }}>
                            {q.question}
                          </p>
                        </div>

                        {/* Assertion / Reason blocks */}
                        {q.assertion && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                            <div style={{
                              background: '#0a1628', border: '1px solid #1e3a5f',
                              borderRadius: '8px', padding: '10px 12px',
                              fontSize: '12px', color: '#93c5fd',
                            }}>
                              <strong>Assertion:</strong> {q.assertion}
                            </div>
                            <div style={{
                              background: '#1a0f2e', border: '1px solid #4c1d95',
                              borderRadius: '8px', padding: '10px 12px',
                              fontSize: '12px', color: '#c4b5fd',
                            }}>
                              <strong>Reason:</strong> {q.reason}
                            </div>
                          </div>
                        )}

                        {/* Options */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {q.options.map((opt, oi) => {
                            const isCorrect  = opt === q.answer;
                            const isSelected = opt === selected;
                            let bg = '#1a1a1a';
                            let border = '#2d2d2d';
                            let color = '#9ca3af';
                            if (selected) {
                              if (isCorrect)  { bg = '#052e16'; border = '#16a34a'; color = '#4ade80'; }
                              else if (isSelected) { bg = '#1f0a0a'; border = '#7f1d1d'; color = '#f87171'; }
                              else { bg = '#111'; border = '#1e1e1e'; color = '#4b5563'; }
                            }
                            return (
                              <button
                                key={oi}
                                disabled={!!selected}
                                onClick={() => setSelectedAnswers(prev => ({ ...prev, [idx]: opt }))}
                                style={{
                                  textAlign: 'left', padding: '10px 14px',
                                  borderRadius: '8px', border: `1px solid ${border}`,
                                  background: bg, color, fontSize: '13px',
                                  cursor: selected ? 'default' : 'pointer',
                                  fontFamily: 'inherit', transition: 'all 0.1s',
                                }}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation */}
                        {selected && (
                          <div style={{
                            marginTop: '12px', background: '#0a1628',
                            border: '1px solid #1e3a5f', borderRadius: '8px',
                            padding: '12px 14px', fontSize: '12px', color: '#93c5fd', lineHeight: 1.6,
                          }}>
                            <strong>Explanation:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* More questions */}
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => generateQuiz(quizMode!, selectedConcept)}
                    disabled={loadingQuiz}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px',
                      fontWeight: 700, cursor: loadingQuiz ? 'not-allowed' : 'pointer',
                      background: '#052e16', color: '#4ade80',
                      border: '1px solid #16a34a44', fontFamily: 'inherit',
                    }}
                  >
                    {loadingQuiz ? '⏳ Generating...' : '🔄 More Questions'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
