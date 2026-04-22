'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChapterEntry, Question, Subject, AVAILABLE_YEARS } from '@/lib/types';
import Sidebar from '@/components/Sidebar';

export default function HeatmapPage() {
  const router = useRouter();

  const [heatmapData, setHeatmapData] = useState<Record<string, Record<string, ChapterEntry>>>({});
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<Subject>('Biology');
  const [selectedYears, setSelectedYears] = useState<number[]>([...AVAILABLE_YEARS]);
  const [selectedChapter, setSelectedChapter] = useState<ChapterEntry | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<Question | null>(null);
  const [activeYearFilter, setActiveYearFilter] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/heatmap_data.json');
        const data = await res.json();
        setHeatmapData(data);
      } catch {
        console.error('Failed to load heatmap data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Auto-select first chapter when subject changes
  useEffect(() => {
    setSelectedChapter(null);
    setExpandedQuestion(null);
  }, [subject]);

  const subjectData = heatmapData[subject] ?? {};

  // Sort chapters by total count descending
  const sortedChapters = Object.values(subjectData).sort(
    (a, b) => (b.total_count ?? 0) - (a.total_count ?? 0)
  );

  const maxCount = sortedChapters[0]?.total_count ?? 1;

  // Questions for selected chapter filtered by selected years
  const filteredQuestions: Question[] = selectedChapter
    ? (selectedChapter.questions ?? []).filter(
        (q) => (!q.year || selectedYears.includes(q.year)) &&
               (activeYearFilter === null || q.year === activeYearFilter)
      )
    : [];

  // Year cards: only years that have questions
  const yearCards = selectedChapter
    ? selectedYears
        .map((yr) => ({
          year: yr,
          count: (selectedChapter.by_year ?? {})[yr] ?? 0,
        }))
        .filter((yc) => yc.count > 0)
    : [];

  const handleFindAncestry = (q: Question) => {
    sessionStorage.setItem('ancestry_question', q.question);
    sessionStorage.setItem('ancestry_subject', subject);
    if (q.options) sessionStorage.setItem('ancestry_options', JSON.stringify(q.options));
    if (q.correct_answer) sessionStorage.setItem('ancestry_correct', q.correct_answer);
    router.push('/ancestry');
  };

  const totalFiltered = selectedYears.reduce(
    (s, yr) => s + ((selectedChapter?.by_year ?? {})[yr] ?? 0),
    0
  );

  function intensityColor(count: number, max: number) {
    const ratio = max > 0 ? count / max : 0;
    if (ratio === 0) return '#1a1a1a';
    if (ratio < 0.2) return '#1a3a1a';
    if (ratio < 0.4) return '#1f5a1a';
    if (ratio < 0.6) return '#2d7a1a';
    if (ratio < 0.8) return '#ff4b4b22';
    return '#ff4b4b44';
  }

  function intensityText(count: number, max: number) {
    const ratio = max > 0 ? count / max : 0;
    if (ratio === 0) return '#333';
    if (ratio < 0.4) return '#4ade80';
    if (ratio < 0.7) return '#86efac';
    return '#ff6b6b';
  }

  return (
    <div className="flex min-h-screen bg-[#080808]">
      <Sidebar
        currentPage="heatmap"
        subject={subject}
        selectedYears={selectedYears}
        onPageChange={(page) => { if (page === 'ancestry') router.push('/ancestry'); }}
        onSubjectChange={(s) => { setSubject(s); }}
        onYearsChange={setSelectedYears}
      />

      <main className="flex-1 flex flex-col overflow-hidden" style={{ height: '100vh' }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a] flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              📊 {subject} Heatmap
            </h1>
            <p className="text-[10px] text-[#444] mt-0.5 font-mono">
              {sortedChapters.length} chapters · {selectedYears.length} years selected
            </p>
          </div>
          {selectedChapter && (
            <div className="text-[10px] font-mono text-[#555]">
              {totalFiltered} questions in view
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="w-6 h-6 border-2 border-[#ff4b4b] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">

            {/* ── LEFT PANEL: Chapter List ── */}
            <div
              className="flex-shrink-0 overflow-y-auto border-r border-[#1a1a1a]"
              style={{ width: '260px' }}
            >
              <div className="px-3 py-2 border-b border-[#111] sticky top-0 bg-[#0d0d0d] z-10">
                <span className="text-[9px] font-mono text-[#333] uppercase tracking-widest">
                  Ranked by frequency
                </span>
              </div>
              {sortedChapters.map((chapter, i) => {
                const isActive = selectedChapter?.chapter_name === chapter.chapter_name;
                const pct = Math.round(((chapter.total_count ?? 0) / maxCount) * 100);
                return (
                  <div
                    key={`${subject}-${chapter.chapter_name}`}
                    onClick={() => {
                      setSelectedChapter(chapter);
                      setExpandedQuestion(null);
                    }}
                    className="px-4 py-3 cursor-pointer border-b border-[#0f0f0f] transition-all relative"
                    style={{
                      background: isActive ? '#1a1a1a' : 'transparent',
                      borderLeft: isActive ? '2px solid #ff4b4b' : '2px solid transparent',
                    }}
                  >
                    {/* Fill bar background */}
                    <div
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        background: isActive
                          ? `linear-gradient(90deg, #ff4b4b15 0%, transparent ${pct}%)`
                          : `linear-gradient(90deg, #ffffff05 0%, transparent ${pct}%)`,
                      }}
                    />
                    <div className="flex items-center gap-2 relative z-10">
                      <span
                        className="text-[10px] font-mono w-5 flex-shrink-0"
                        style={{ color: i < 3 ? '#ff4b4b88' : '#2a2a2a' }}
                      >
                        {i + 1}
                      </span>
                      <span
                        className="text-[11px] flex-1 leading-tight"
                        style={{ color: isActive ? '#f0f0f0' : '#777' }}
                      >
                        {chapter.chapter_name}
                      </span>
                      <span
                        className="text-[10px] font-mono font-bold flex-shrink-0"
                        style={{ color: isActive ? '#ff4b4b' : '#333' }}
                      >
                        {chapter.total_count}
                      </span>
                    </div>
                    {/* Mini bar */}
                    <div className="mt-1.5 h-[2px] bg-[#1a1a1a] rounded relative z-10 ml-7">
                      <div
                        className="h-full rounded transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: isActive
                            ? 'linear-gradient(90deg, #ff4b4b, #ff8c00)'
                            : '#2a2a2a',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── RIGHT PANEL ── */}
            <div key={subject} className="flex-1 overflow-y-auto bg-[#0d0d0d]">
              {!selectedChapter ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="text-4xl opacity-20">←</div>
                  <p className="text-[#333] text-sm font-mono">Select a chapter to explore</p>
                </div>
              ) : (
                <div className="p-6">

                  {/* Chapter header */}
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-white mb-1">
                      {selectedChapter.chapter_name}
                    </h2>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-[#444]">
                      <span>{selectedChapter.total_count} total questions</span>
                      <span>·</span>
                      <span>{yearCards.length} active years</span>
                      <span>·</span>
                      <span className="text-[#ff4b4b88]">
                        avg {((selectedChapter.total_count ?? 0) / Math.max(selectedYears.length, 1)).toFixed(1)}/yr
                      </span>
                    </div>
                  </div>

                  {/* Year cards — only non-zero */}
                  {yearCards.length > 0 && (
                    <div className="mb-6">
                      <div className="text-[9px] font-mono text-[#333] uppercase tracking-widest mb-3">
                        Year breakdown
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {/* Select All pill */}
                        <div
                          onClick={() => setActiveYearFilter(null)}
                          className="flex flex-col items-center px-3 py-2 rounded-lg border cursor-pointer transition-all"
                          style={{
                            background: activeYearFilter === null ? '#ff4b4b22' : '#141414',
                            borderColor: activeYearFilter === null ? '#ff4b4b55' : '#1e1e1e',
                            minWidth: '52px',
                          }}
                        >
                          <span className="text-[9px] font-mono mb-1" style={{ color: activeYearFilter === null ? '#ff6b6b' : '#333' }}>ALL</span>
                          <span className="text-sm font-bold font-mono" style={{ color: activeYearFilter === null ? '#ff4b4b' : '#444' }}>
                            {yearCards.reduce((s, y) => s + y.count, 0)}
                          </span>
                        </div>
                        {yearCards.map(({ year, count }) => {
                          const isActive = activeYearFilter === year;
                          const maxYr = Math.max(...yearCards.map(y => y.count));
                          return (
                            <div
                              key={year}
                              onClick={() => setActiveYearFilter(isActive ? null : year)}
                              className="flex flex-col items-center px-4 py-3 rounded-lg border cursor-pointer transition-all"
                              style={{
                                background: isActive ? intensityColor(count, maxYr) : '#111',
                                borderColor: isActive ? '#ff4b4b55' : '#1e1e1e',
                                minWidth: '60px',
                                opacity: activeYearFilter !== null && !isActive ? 0.4 : 1,
                              }}
                            >
                              <span className="text-[9px] font-mono text-[#555] mb-1">{year}</span>
                              <span
                                className="text-lg font-bold font-mono"
                                style={{ color: isActive ? intensityText(count, maxYr) : '#444' }}
                              >
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Questions list */}
                  <div>
                    <div className="text-[9px] font-mono text-[#333] uppercase tracking-widest mb-3">
                      Questions ({filteredQuestions.length})
                    </div>

                    {filteredQuestions.length === 0 ? (
                      <p className="text-[#333] text-sm font-mono">No questions for selected years.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {filteredQuestions.map((q, qi) => {
                          const isExpanded = expandedQuestion?.question === q.question;
                          return (
                            <div
                              key={`${subject}-${qi}`}
                              className="rounded-xl border transition-all duration-200"
                              style={{
                                background: isExpanded ? '#161616' : '#111',
                                borderColor: isExpanded ? '#ff4b4b33' : '#1a1a1a',
                              }}
                            >
                              {/* Question row */}
                              <div
                                className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                                onClick={() =>
                                  setExpandedQuestion(isExpanded ? null : q)
                                }
                              >
                                {q.year && (
                                  <span className="text-[9px] font-mono text-[#ff4b4b66] flex-shrink-0 mt-0.5 pt-[1px]">
                                    {q.year}
                                  </span>
                                )}
                                <span className="text-[12px] text-[#888] flex-1 leading-relaxed">
                                  {q.question}
                                </span>
                                <span
                                  className="text-[10px] flex-shrink-0 mt-0.5 transition-transform duration-200"
                                  style={{
                                    color: '#333',
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  }}
                                >
                                  ▾
                                </span>
                              </div>

                              {/* Expanded: options + ancestry */}
                              {isExpanded && (
                                <div className="px-4 pb-4 border-t border-[#1e1e1e]">
                                  {/* Options */}
                                  {q.options && Object.keys(q.options).length > 0 && (
                                    <div className="flex flex-col gap-2 mt-3">
                                      {Object.entries(q.options).map(([num, text]) => {
                                        const isCorrect =
                                          String(num) === String(q.correct_answer);
                                        return (
                                          <div
                                            key={num}
                                            className="flex items-start gap-3 px-3 py-2.5 rounded-lg border text-[11px]"
                                            style={{
                                              background: isCorrect ? '#0f2e0f' : '#141414',
                                              borderColor: isCorrect ? '#2ca02c55' : '#1e1e1e',
                                              color: isCorrect ? '#86efac' : '#666',
                                            }}
                                          >
                                            <span className="text-[#444] flex-shrink-0 font-mono text-[10px]">
                                              ({num})
                                            </span>
                                            <span className="flex-1 leading-relaxed">{text}</span>
                                            {isCorrect && (
                                              <span className="text-green-400 flex-shrink-0 text-[10px]">
                                                ✓
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Find Ancestry button */}
                                  <button
                                    onClick={() => handleFindAncestry(q)}
                                    className="mt-3 w-full py-2.5 rounded-lg text-[11px] font-semibold transition-colors"
                                    style={{
                                      background: '#ff4b4b18',
                                      color: '#ff6b6b',
                                      border: '1px solid #ff4b4b33',
                                    }}
                                    onMouseEnter={(e) => {
                                      (e.target as HTMLElement).style.background = '#ff4b4b30';
                                    }}
                                    onMouseLeave={(e) => {
                                      (e.target as HTMLElement).style.background = '#ff4b4b18';
                                    }}
                                  >
                                    🧬 Find Concept Ancestry
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
