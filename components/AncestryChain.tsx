'use client';

import { Concept, CLASS_CONFIG } from '@/lib/types';

interface AncestryChainProps {
  chain: Concept[];
  isLoading: boolean;
  error: string | null;
  questionText: string;
  answer?: string;
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

export default function AncestryChain({
  chain,
  isLoading,
  error,
  questionText,
  answer,
}: AncestryChainProps) {
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
          <br />
          <br />
          Check back in a few hours!
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Answer box */}
      {answer && (
        <div className="bg-[#1a1a2e] border border-[#ff4b4b] rounded-xl p-4 mb-6">
          <div className="text-xs font-bold text-[#ff4b4b] mb-2">✅ ANSWER</div>
          <div className="text-[#f0f0f0] text-sm leading-relaxed">{answer}</div>
        </div>
      )}
      {/* Ancestry chain — reversed so foundation first */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">
          🧬 First Principles
          <span className="ml-2 text-[#555] normal-case font-normal">
            This question is built on these concepts
          </span>
        </h3>

        <div className="flex flex-col gap-3">
          {[...chain].reverse().map((concept, idx) => {
            const { classNum, chapterNum } = parseConceptId(concept.id);
            const cfg = CLASS_CONFIG[classNum] ?? {
              emoji: '📖',
              color: '#888',
            };

            return (
              <div key={concept.id}>
                <div
                  className="rounded-xl p-4 border-l-4"
                  style={{
                    borderColor: cfg.color,
                    background: '#1a1a1a',
                  }}
                >
                  <div
                    className="text-xs font-semibold mb-1"
                    style={{ color: cfg.color }}
                  >
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
            const cfg = CLASS_CONFIG[classNum] ?? {
              emoji: '📖',
              color: '#888',
            };
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
