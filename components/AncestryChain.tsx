'use client';

import { useState } from 'react';
import { Concept, CLASS_CONFIG } from '@/lib/types';

interface AncestryChainProps {
  chain: Concept[];
  isLoading: boolean;
  error: string | null;
  questionText: string;
  answer?: string;
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

function ExplainPopup({ concept, classNum, chapterNum, onClose }: ExplainPopupProps) {
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const cfg = CLASS_CONFIG[classNum] ?? { emoji: '📖', color: '#888' };

  const fetchExplanation = async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept_title: concept.concept_title,
          description: concept.description,
          key_terms: concept.key_terms,
          class: classNum,
          chapter: chapterNum,
        }),
      });
      const data = await res.json();
      setExplanation(data.explanation ?? 'Could not generate explanation.');
      setFetched(true);
    } catch {
      setExplanation('Failed to load explanation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
  useState(() => { fetchExplanation(); });

  const openInNewTab = () => {
    const content = `
      <html>
        <head>
          <title>${concept.concept_title} — NEET Explorer</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 700px; margin: 60px auto; padding: 0 24px; background: #0f0f0f; color: #f0f0f0; }
            h1 { font-size: 22px; margin-bottom: 8px; }
            .meta { font-size: 12px; color: #666; margin-bottom: 24px; }
            .desc { color: #aaa; font-size: 14px; line-height: 1.7; margin-bottom: 24px; padding: 16px; background: #1a1a1a; border-radius: 8px; }
            .explanation { font-size: 15px; line-height: 1.8; color: #e0e0e0; white-space: pre-wrap; }
            .terms { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 24px; }
            .term { font-size: 11px; padding: 4px 10px; border-radius: 20px; background: #222; color: #666; }
            h2 { font-size: 14px; color: #ff4b4b; text-transform: uppercase; letter-spacing: 0.1em; margin: 24px 0 12px; }
          </style>
        </head>
        <body>
          <h1>${concept.concept_title}</h1>
          <div class="meta">${cfg.emoji} Class ${classNum} → Chapter ${chapterNum}</div>
          <h2>NCERT Description</h2>
          <div class="desc">${concept.description}</div>
          <h2>Explanation</h2>
          <div class="explanation">${explanation || 'Loading...'}</div>
          <div class="terms">${(concept.key_terms ?? []).map(t => `<span class="term">${t}</span>`).join('')}</div>
        </body>
      </html>
    `;
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Popup */}
      <div
        className="w-full max-w-lg rounded-2xl border flex flex-col"
        style={{
          background: '#0f0f0f',
          borderColor: cfg.color + '55',
          maxHeight: '80vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: '#1e1e1e' }}
        >
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: cfg.color }}>
              {cfg.emoji} Class {classNum} → Ch {chapterNum}
            </div>
            <div className="text-white font-semibold text-base">
              {concept.concept_title}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#555] hover:text-white transition-colors ml-4 text-lg flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {/* NCERT description */}
          <div
            className="text-[#777] text-xs leading-relaxed mb-4 p-3 rounded-lg"
            style={{ background: '#1a1a1a' }}
          >
            {concept.description}
          </div>

          {/* Explanation */}
          <div className="text-[10px] font-mono text-[#444] uppercase tracking-widest mb-2">
            Explanation
          </div>

          {loading ? (
            <div className="flex items-center gap-3 py-6">
              <div className="w-5 h-5 border-2 border-[#ff4b4b] border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-[#555] text-sm">Generating explanation...</span>
            </div>
          ) : (
            <div className="text-[#d0d0d0] text-sm leading-relaxed whitespace-pre-wrap">
              {explanation}
            </div>
          )}

          {/* Key terms */}
          {concept.key_terms && concept.key_terms.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {concept.key_terms.map((term) => (
                <span
                  key={term}
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: '#222', color: '#666' }}
                >
                  {term}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t flex-shrink-0"
          style={{ borderColor: '#1e1e1e' }}
        >
          <button
            onClick={openInNewTab}
            className="text-xs text-[#555] hover:text-[#aaa] transition-colors flex items-center gap-1"
          >
            ↗ Open in new tab
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: '#1e1e1e',
              color: '#aaa',
              border: '1px solid #2a2a2a',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AncestryChain({
  chain,
  isLoading,
  error,
  questionText,
  answer,
}: AncestryChainProps) {
  const [explainConcept, setExplainConcept] = useState<{
    concept: Concept;
    classNum: number;
    chapterNum: number;
  } | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-8 h-8 border-2 border-[#ff4b4b] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#888] text-sm">Identifying concept ancestry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#2a1a1a] border border-[#ff4b4b44] rounded-xl p-4 text-[#ff8888] text-sm">
        {error}
      </div>
    );
  }

  if (chain.length === 0) {
    return (
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">🔗</div>
        <div className="text-white font-semibold mb-2">
          Concept links still being generated
        </div>
        <div className="text-[#888] text-sm leading-relaxed">
          Our AI is currently building the concept ancestry graph for all NCERT
          chapters. This feature will be fully available soon.
          <br /><br />
          Check back in a few hours!
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Explain popup */}
      {explainConcept && (
        <ExplainPopup
          concept={explainConcept.concept}
          classNum={explainConcept.classNum}
          chapterNum={explainConcept.chapterNum}
          onClose={() => setExplainConcept(null)}
        />
      )}

      {/* Answer box */}
      {answer && (
        <div className="bg-[#1a1a2e] border border-[#ff4b4b] rounded-xl p-4 mb-6">
          <div className="text-xs font-bold text-[#ff4b4b] mb-2">✅ ANSWER</div>
          <div className="text-[#f0f0f0] text-sm leading-relaxed">{answer}</div>
        </div>
      )}

      {/* Ancestry chain */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">
          🧬 First Principles
          <span className="ml-2 text-[#555] normal-case font-normal">
            This question is built on these concepts
          </span>
        </h3>

        <div className="flex flex-col gap-3">
          {[...chain].sort((a, b) => {
            const getClass = (id: string) => {
              try { return parseInt(id.split('_')[1].replace('c', '')); }
              catch { return 0; }
            };
            return getClass(b.id) - getClass(a.id);
          }).map((concept, idx) => {
            const { classNum, chapterNum } = parseConceptId(concept.id);
            const cfg = CLASS_CONFIG[classNum] ?? { emoji: '📖', color: '#888' };

            return (
              <div key={concept.id}>
                <div
                  className="rounded-xl p-4 border-l-4"
                  style={{ borderColor: cfg.color, background: '#1a1a1a' }}
                >
                  <div className="text-xs font-semibold mb-1" style={{ color: cfg.color }}>
                    {cfg.emoji} Class {classNum} → Ch {chapterNum} ↗
                  </div>
                  <div className="text-white font-medium text-sm mb-1">
                    {concept.concept_title}
                  </div>
                  <div className="text-[#aaa] text-sm leading-relaxed">
                    {concept.description}
                  </div>
                  {concept.key_terms && concept.key_terms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {concept.key_terms.slice(0, 4).map((term) => (
                        <span
                          key={term}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#666]"
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Explain button */}
                  <button
                    onClick={() => setExplainConcept({ concept, classNum, chapterNum })}
                    className="mt-3 text-[10px] font-semibold px-3 py-1 rounded-lg transition-colors"
                    style={{
                      background: '#1e1e2e',
                      color: '#7878ff',
                      border: '1px solid #2a2a4a',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#252540';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#1e1e2e';
                    }}
                  >
                    💡 Explain this concept
                  </button>
                </div>

                {idx < chain.length - 1 && (
                  <div className="text-center text-[#444] text-xs my-1">
                    ↓ builds upon
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Revise in order */}
      <div>
        <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">
          📚 Revise From First Principles
          <span className="ml-2 text-[#555] normal-case font-normal">
            Build your foundation in this order
          </span>
        </h3>
        <div className="flex flex-col gap-1">
          {chain.map((concept, i) => {
            const { classNum, chapterNum } = parseConceptId(concept.id);
            const cfg = CLASS_CONFIG[classNum] ?? { emoji: '📖', color: '#888' };
            return (
              <div
                key={concept.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#1a1a1a] text-sm"
              >
                <span className="text-[#444] w-5 shrink-0">{i + 1}.</span>
                <span style={{ color: cfg.color }}>
                  {cfg.emoji} Class {classNum} → Ch {chapterNum}
                </span>
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
