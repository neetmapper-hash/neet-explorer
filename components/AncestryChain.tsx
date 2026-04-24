'use client';

import { useState, useEffect } from 'react';
import { Concept, CLASS_CONFIG } from '@/lib/types';

interface AncestryChainProps {
  chain: Concept[];
  isLoading: boolean;
  error: string | null;
  questionText: string;
  answer?: string;
}

interface MCQQuestion {
  question: string;
  options: Record<string, string>;
  correct_answer: string;
  source: 'neet' | 'generated';
  year?: number;
}

interface ExplainPopupProps {
  concept: Concept;
  classNum: number;
  chapterNum: number;
  onClose: () => void;
}

function parseConceptId(id: string): { classNum: number; chapterNum: number } {
  try {
    const parts = id.split('_');
    const classNum = parseInt(parts[1].replace('c', ''));
    const chapterNum = parseInt(parts[2].replace('ch', ''));
    return { classNum, chapterNum };
  } catch {
    return { classNum: 0, chapterNum: 0 };
  }
}

// ── TEST MODE ──────────────────────────────────────────────────────────────────
function TestMode({
  concept,
  classNum,
  chapterNum,
  onBack,
}: {
  concept: Concept;
  classNum: number;
  chapterNum: number;
  onBack: () => void;
}) {
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [batch, setBatch] = useState(0);

  const fetchQuestions = async (batchNum: number) => {
    setLoading(true);
    try {
      const res = await fetch('/api/test-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept_title: concept.concept_title,
          description: concept.description,
          key_terms: concept.key_terms,
          class: classNum,
          chapter: chapterNum,
          batch: batchNum,
        }),
      });
      const data = await res.json();
      setQuestions(data.questions ?? []);
      setCurrentIdx(0);
      setSelected(null);
      setAnswered(false);
      setDone(false);
      if (batchNum > 0) setScore(0);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuestions(0); }, []);

  const currentQ = questions[currentIdx];
  const isCorrect = selected === currentQ?.correct_answer;

  const handleSelect = (optKey: string) => {
    if (answered) return;
    setSelected(optKey);
    setAnswered(true);
    if (optKey === currentQ.correct_answer) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setDone(true);
    }
  };

  const handleMore = () => {
    const nextBatch = batch + 1;
    setBatch(nextBatch);
    fetchQuestions(nextBatch);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-5 h-5 border-2 border-[#ff4b4b] border-t-transparent rounded-full animate-spin" />
        <span className="text-[#555] text-sm">Generating questions...</span>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-[#555] text-sm mb-3">Could not generate questions.</div>
        <button onClick={onBack} className="text-xs text-[#7878ff]">← Back to explanation</button>
      </div>
    );
  }

  // Score screen
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-4">
        <div className="text-4xl">
          {score === questions.length ? '🎉' : score >= questions.length / 2 ? '👍' : '📖'}
        </div>
        <div className="text-white font-semibold text-lg">{score} / {questions.length} correct</div>
        <div className="text-[#888] text-sm text-center">
          {score === questions.length
            ? 'Perfect! You nailed this concept.'
            : score >= questions.length / 2
            ? 'Good effort! Review the ones you missed.'
            : 'Keep studying — revisit the explanation and try again.'}
        </div>
        <div className="flex gap-3 mt-2">
          <button
            onClick={handleMore}
            className="px-4 py-2 rounded-lg text-xs font-semibold"
            style={{ background: '#ff4b4b22', color: '#ff6b6b', border: '1px solid #ff4b4b33' }}
          >
            More questions →
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg text-xs font-semibold"
            style={{ background: '#1e1e1e', color: '#aaa', border: '1px solid #2a2a2a' }}
          >
            ← Back to explanation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Progress header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={onBack} className="text-[10px] text-[#555] hover:text-[#aaa] transition-colors">
          ← Back to explanation
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-[#444]">{currentIdx + 1} / {questions.length}</span>
          <span className="text-[10px] font-mono text-[#4ade80]">{score} correct</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#1e1e1e] rounded-full mb-4">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${(currentIdx / questions.length) * 100}%`,
            background: 'linear-gradient(90deg, #ff4b4b, #ff8c00)',
          }}
        />
      </div>

      {/* NEET badge */}
      {currentQ.source === 'neet' && currentQ.year && (
        <div className="text-[9px] font-mono text-[#ff4b4b66] mb-2">NEET {currentQ.year}</div>
      )}

      {/* Question text */}
      <div className="text-[#e0e0e0] text-sm leading-relaxed mb-4">{currentQ.question}</div>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {Object.entries(currentQ.options).map(([key, text]) => {
          const isSelected = selected === key;
          const isCorrectOpt = key === currentQ.correct_answer;

          let bg = '#141414';
          let borderColor = '#1e1e1e';
          let color = '#888';

          if (answered) {
            if (isCorrectOpt) { bg = '#0f2e0f'; borderColor = '#2ca02c55'; color = '#86efac'; }
            else if (isSelected) { bg = '#2e0f0f'; borderColor = '#cc333355'; color = '#ff8888'; }
          } else if (isSelected) {
            bg = '#1e1e2e'; borderColor = '#7878ff55'; color = '#c0c0ff';
          }

          return (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={answered}
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-all text-[11px]"
              style={{ background: bg, borderColor, color }}
            >
              <span className="font-mono text-[10px] flex-shrink-0 mt-0.5 opacity-60">({key})</span>
              <span className="flex-1 leading-relaxed">{text}</span>
              {answered && isCorrectOpt && <span className="flex-shrink-0 text-green-400 text-[11px]">✓</span>}
              {answered && isSelected && !isCorrectOpt && <span className="flex-shrink-0 text-red-400 text-[11px]">✗</span>}
            </button>
          );
        })}
      </div>

      {/* Feedback + Next */}
      {answered && (
        <div className="mt-4">
          {!isCorrect && (
            <div className="text-[11px] text-[#86efac] mb-3 p-2 rounded-lg" style={{ background: '#0f2e0f' }}>
              ✓ Correct: ({currentQ.correct_answer}) {currentQ.options[currentQ.correct_answer]}
            </div>
          )}
          {isCorrect && (
            <div className="text-[11px] text-[#86efac] mb-3">🎯 Correct!</div>
          )}
          <button
            onClick={handleNext}
            className="w-full py-2 rounded-lg text-xs font-semibold"
            style={{ background: '#ff4b4b22', color: '#ff6b6b', border: '1px solid #ff4b4b33' }}
          >
            {currentIdx < questions.length - 1 ? 'Next question →' : 'See results'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── EXPLAIN POPUP ──────────────────────────────────────────────────────────────
function ExplainPopup({ concept, classNum, chapterNum, onClose }: ExplainPopupProps) {
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [mode, setMode] = useState<'explain' | 'test'>('explain');

  const cfg = CLASS_CONFIG[classNum] ?? { emoji: '📖', color: '#888' };

  useEffect(() => {
    if (fetched) return;
    setLoading(true);
    fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concept_title: concept.concept_title,
        description: concept.description,
        key_terms: concept.key_terms,
        class: classNum,
        chapter: chapterNum,
      }),
    })
      .then(r => r.json())
      .then(data => { setExplanation(data.explanation ?? 'Could not generate explanation.'); setFetched(true); })
      .catch(() => setExplanation('Failed to load explanation.'))
      .finally(() => setLoading(false));
  }, []);

  const openInNewTab = () => {
    const content = `<html><head><title>${concept.concept_title} — NEET Explorer</title>
      <style>body{font-family:system-ui;max-width:700px;margin:60px auto;padding:0 24px;background:#0f0f0f;color:#f0f0f0}
      h1{font-size:22px;margin-bottom:8px}.meta{font-size:12px;color:#666;margin-bottom:24px}
      .desc{color:#aaa;font-size:14px;line-height:1.7;margin-bottom:24px;padding:16px;background:#1a1a1a;border-radius:8px}
      .explanation{font-size:15px;line-height:1.8;color:#e0e0e0;white-space:pre-wrap}
      h2{font-size:14px;color:#ff4b4b;text-transform:uppercase;letter-spacing:.1em;margin:24px 0 12px}
      .terms{display:flex;gap:8px;flex-wrap:wrap;margin-top:24px}
      .term{font-size:11px;padding:4px 10px;border-radius:20px;background:#222;color:#666}</style>
      </head><body>
      <h1>${concept.concept_title}</h1>
      <div class="meta">${cfg.emoji} Class ${classNum} → Chapter ${chapterNum}</div>
      <h2>NCERT Description</h2><div class="desc">${concept.description}</div>
      <h2>Explanation</h2><div class="explanation">${explanation || 'Loading...'}</div>
      <div class="terms">${(concept.key_terms ?? []).map(t => `<span class="term">${t}</span>`).join('')}</div>
      </body></html>`;
    const blob = new Blob([content], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border flex flex-col"
        style={{ background: '#0f0f0f', borderColor: cfg.color + '55', maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: '#1e1e1e' }}>
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: cfg.color }}>
              {cfg.emoji} Class {classNum} → Ch {chapterNum}
            </div>
            <div className="text-white font-semibold text-base">{concept.concept_title}</div>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors ml-4 text-lg flex-shrink-0">✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {mode === 'explain' ? (
            <>
              <div className="text-[#777] text-xs leading-relaxed mb-4 p-3 rounded-lg" style={{ background: '#1a1a1a' }}>
                {concept.description}
              </div>
              <div className="text-[10px] font-mono text-[#444] uppercase tracking-widest mb-2">Explanation</div>
              {loading ? (
                <div className="flex items-center gap-3 py-6">
                  <div className="w-5 h-5 border-2 border-[#ff4b4b] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <span className="text-[#555] text-sm">Generating explanation...</span>
                </div>
              ) : (
                <div className="text-[#d0d0d0] text-sm leading-relaxed whitespace-pre-wrap">{explanation}</div>
              )}
              {concept.key_terms && concept.key_terms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {concept.key_terms.map(term => (
                    <span key={term} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#222', color: '#666' }}>{term}</span>
                  ))}
                </div>
              )}
              <button
                onClick={() => setMode('test')}
                className="mt-5 w-full py-2.5 rounded-lg text-[11px] font-semibold"
                style={{ background: '#1e1e2e', color: '#7878ff', border: '1px solid #2a2a4a' }}
              >
                🧪 Test me on this concept
              </button>
            </>
          ) : (
            <TestMode
              concept={concept}
              classNum={classNum}
              chapterNum={chapterNum}
              onBack={() => setMode('explain')}
            />
          )}
        </div>

        {/* Footer — explain mode only */}
        {mode === 'explain' && (
          <div className="flex items-center justify-between px-5 py-3 border-t flex-shrink-0" style={{ borderColor: '#1e1e1e' }}>
            <button onClick={openInNewTab} className="text-xs text-[#555] hover:text-[#aaa] transition-colors">↗ Open in new tab</button>
            <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#1e1e1e', color: '#aaa', border: '1px solid #2a2a2a' }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function AncestryChain({ chain, isLoading, error, questionText, answer }: AncestryChainProps) {
  const [explainConcept, setExplainConcept] = useState<{ concept: Concept; classNum: number; chapterNum: number } | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-8 h-8 border-2 border-[#ff4b4b] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#888] text-sm">Identifying concept ancestry...</p>
      </div>
    );
  }

  if (error) {
    return <div className="bg-[#2a1a1a] border border-[#ff4b4b44] rounded-xl p-4 text-[#ff8888] text-sm">{error}</div>;
  }

  if (chain.length === 0) {
    return (
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">🔗</div>
        <div className="text-white font-semibold mb-2">Concept links still being generated</div>
        <div className="text-[#888] text-sm leading-relaxed">
          Our AI is currently building the concept ancestry graph for all NCERT chapters. This feature will be fully available soon.<br /><br />Check back in a few hours!
        </div>
      </div>
    );
  }

  return (
    <div>
      {explainConcept && (
        <ExplainPopup
          concept={explainConcept.concept}
          classNum={explainConcept.classNum}
          chapterNum={explainConcept.chapterNum}
          onClose={() => setExplainConcept(null)}
        />
      )}

      {answer && (
        <div className="bg-[#1a1a2e] border border-[#ff4b4b] rounded-xl p-4 mb-6">
          <div className="text-xs font-bold text-[#ff4b4b] mb-2">✅ ANSWER</div>
          <div className="text-[#f0f0f0] text-sm leading-relaxed">{answer}</div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">
          🧬 First Principles
          <span className="ml-2 text-[#555] normal-case font-normal">This question is built on these concepts</span>
        </h3>
        <div className="flex flex-col gap-3">
          {[...chain].sort((a, b) => {
            const getClass = (id: string) => { try { return parseInt(id.split('_')[1].replace('c', '')); } catch { return 0; } };
            return getClass(b.id) - getClass(a.id);
          }).map((concept, idx) => {
            const { classNum, chapterNum } = parseConceptId(concept.id);
            const cfg = CLASS_CONFIG[classNum] ?? { emoji: '📖', color: '#888' };
            return (
              <div key={concept.id}>
                <div className="rounded-xl p-4 border-l-4" style={{ borderColor: cfg.color, background: '#1a1a1a' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: cfg.color }}>{cfg.emoji} Class {classNum} → Ch {chapterNum} ↗</div>
                  <div className="text-white font-medium text-sm mb-1">{concept.concept_title}</div>
                  <div className="text-[#aaa] text-sm leading-relaxed">{concept.description}</div>
                  {concept.key_terms && concept.key_terms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {concept.key_terms.slice(0, 4).map(term => (
                        <span key={term} className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#666]">{term}</span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setExplainConcept({ concept, classNum, chapterNum })}
                    className="mt-3 text-[10px] font-semibold px-3 py-1 rounded-lg transition-colors"
                    style={{ background: '#1e1e2e', color: '#7878ff', border: '1px solid #2a2a4a' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#252540'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#1e1e2e'; }}
                  >
                    💡 Explain this concept
                  </button>
                </div>
                {idx < chain.length - 1 && <div className="text-center text-[#444] text-xs my-1">↓ builds upon</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">
          📚 Revise From First Principles
          <span className="ml-2 text-[#555] normal-case font-normal">Build your foundation in this order</span>
        </h3>
        <div className="flex flex-col gap-1">
          {chain.map((concept, i) => {
            const { classNum, chapterNum } = parseConceptId(concept.id);
            const cfg = CLASS_CONFIG[classNum] ?? { emoji: '📖', color: '#888' };
            return (
              <div key={concept.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#1a1a1a] text-sm">
                <span className="text-[#444] w-5 shrink-0">{i + 1}.</span>
                <span style={{ color: cfg.color }}>{cfg.emoji} Class {classNum} → Ch {chapterNum}</span>
                <span className="text-[#888]">—</span>
                <span className="text-[#ccc]">{concept.concept_title}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
