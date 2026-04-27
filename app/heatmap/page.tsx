'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChapterEntry, Question, Subject, AVAILABLE_YEARS } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import { groupChaptersByTopic } from '@/lib/topics';

type ViewMode = 'chapter' | 'topic';

export default function HeatmapPage() {
  const router = useRouter();

  const [heatmapData, setHeatmapData] = useState<Record<string, Record<string, ChapterEntry>>>({});
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<Subject>('Biology');
  const [selectedYears, setSelectedYears] = useState<number[]>([...AVAILABLE_YEARS]);
  const [selectedChapter, setSelectedChapter] = useState<ChapterEntry | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<Question | null>(null);
  const [activeYearFilter, setActiveYearFilter] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('chapter');
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    setSelectedChapter(null);
    setExpandedQuestion(null);
    setExpandedTopics(new Set());
  }, [subject]);

  const subjectData = heatmapData[subject] ?? {};

  const sortedChapters = Object.values(subjectData).sort(
    (a, b) => (b.total_count ?? 0) - (a.total_count ?? 0)
  );

  const maxCount = sortedChapters[0]?.total_count ?? 1;

  const filteredQuestions: Question[] = selectedChapter
    ? (selectedChapter.questions ?? []).filter(
        (q) => (!q.year || selectedYears.includes(q.year)) &&
               (activeYearFilter === null || q.year === activeYearFilter)
      )
    : [];

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

  const toggleTopic = (topic: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  };

  const handleChapterClick = (chapter: ChapterEntry) => {
    setSelectedChapter(chapter);
    setExpandedQuestion(null);
    setActiveYearFilter(null);
  };

  function intensityColor(count: number, max: number) {
    const ratio = max > 0 ? count / max : 0;
    if (ratio === 0) return '#1a1a2e';
    if (ratio < 0.2) return '#16213e';
    if (ratio < 0.4) return '#0f3460';
    if (ratio < 0.6) return '#16a34a22';
    if (ratio < 0.8) return '#16a34a33';
    return '#16a34a44';
  }

  function intensityText(count: number, max: number) {
    const ratio = max > 0 ? count / max : 0;
    if (ratio === 0) return '#4b5563';
    if (ratio < 0.4) return '#4ade80';
    if (ratio < 0.7) return '#86efac';
    return '#4ade80';
  }

  // ── CHAPTER LIST ──────────────────────────────────────────────────────────
  const renderChapterList = () => (
    <>
      {sortedChapters.map((chapter, i) => {
        const isActive = selectedChapter?.chapter_name === chapter.chapter_name;
        const pct = Math.round(((chapter.total_count ?? 0) / maxCount) * 100);
        return (
          <div
            key={`${subject}-${chapter.chapter_name}`}
            onClick={() => handleChapterClick(chapter)}
            className="px-4 py-3 cursor-pointer transition-all relative"
            style={{
              background: isActive ? '#0f2218' : 'transparent',
              borderLeft: isActive ? '3px solid #16a34a' : '3px solid transparent',
              borderBottom: '1px solid #1e1e1e',
            }}
          >
            <div className="flex items-center gap-2 relative z-10">
              <span
                className="text-[10px] font-mono w-5 flex-shrink-0"
                style={{ color: i < 3 ? '#16a34a' : '#374151' }}
              >
                {i + 1}
              </span>
              <span
                className="text-[12px] flex-1 leading-tight"
                style={{ color: isActive ? '#f0fdf4' : '#9ca3af' }}
              >
                {chapter.chapter_name}
              </span>
              <span
                className="text-[11px] font-mono font-bold flex-shrink-0"
                style={{ color: isActive ? '#4ade80' : '#4b5563' }}
              >
                {chapter.total_count}
              </span>
            </div>
            <div className="mt-1.5 h-[2px] rounded relative z-10 ml-7" style={{ background: '#1e1e1e' }}>
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: isActive
                    ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                    : '#2d2d2d',
                }}
              />
            </div>
          </div>
        );
      })}
    </>
  );

  // ── TOPIC LIST ────────────────────────────────────────────────────────────
  const renderTopicList = () => {
    const chaptersWithMeta = sortedChapters.map(ch => ({
      ...ch,
      chapter_name: ch.chapter_name,
      filteredTotal: ch.total_count ?? 0,
    }));

    const topicGroups = groupChaptersByTopic(chaptersWithMeta, subject);
    const maxTopicTotal = Math.max(...topicGroups.map(g => g.total));

    return (
      <>
        {topicGroups.map(({ topic, chapters, total }) => {
          const isExpanded = expandedTopics.has(topic);
          const topicPct = Math.round((total / maxTopicTotal) * 100);
          const hasActiveChapter = chapters.some(
            (ch: any) => selectedChapter?.chapter_name === ch.chapter_name
          );

          return (
            <div key={topic} style={{ borderBottom: '1px solid #1e1e1e' }}>
              <div
                onClick={() => toggleTopic(topic)}
                className="flex items-center gap-2 px-4 py-3 cursor-pointer transition-all"
                style={{
                  background: hasActiveChapter ? '#0f2218' : 'transparent',
                  borderLeft: hasActiveChapter ? '3px solid #16a34a66' : '3px solid transparent',
                }}
              >
                <span className="text-[9px] w-3 flex-shrink-0" style={{ color: '#4b5563' }}>
                  {isExpanded ? '▼' : '▶'}
                </span>
                <span
                  className="text-[12px] font-semibold flex-1 leading-tight"
                  style={{ color: hasActiveChapter ? '#f0fdf4' : '#6b7280' }}
                >
                  {topic}
                </span>
                <span className="text-[9px] font-mono mr-1" style={{ color: '#4b5563' }}>
                  {chapters.length}ch
                </span>
                <span
                  className="text-[11px] font-mono font-bold flex-shrink-0"
                  style={{ color: hasActiveChapter ? '#4ade80' : '#4b5563' }}
                >
                  {total}
                </span>
              </div>
              <div className="mx-4 mb-1">
                <div className="h-[2px] rounded" style={{ background: '#1e1e1e' }}>
                  <div
                    className="h-full rounded"
                    style={{ width: `${topicPct}%`, background: 'linear-gradient(90deg, #16a34a88, #4ade8044)' }}
                  />
                </div>
              </div>
              {isExpanded && (
                <div style={{ background: '#0d0d0d' }}>
                  {chapters
                    .sort((a: any, b: any) => (b.total_count ?? 0) - (a.total_count ?? 0))
                    .map((chapter: any) => {
                      const isActive = selectedChapter?.chapter_name === chapter.chapter_name;
                      return (
                        <div
                          key={chapter.chapter_name}
                          onClick={() => handleChapterClick(chapter)}
                          className="flex items-center gap-2 pl-8 pr-4 py-2.5 cursor-pointer transition-all"
                          style={{
                            background: isActive ? '#0f2218' : 'transparent',
                            borderLeft: isActive ? '3px solid #16a34a' : '3px solid transparent',
                            borderBottom: '1px solid #1a1a1a',
                          }}
                        >
                          <span
                            className="text-[11px] flex-1 leading-tight"
                            style={{ color: isActive ? '#f0fdf4' : '#6b7280' }}
                          >
                            {chapter.chapter_name}
                          </span>
                          <span
                            className="text-[10px] font-mono font-bold flex-shrink-0"
                            style={{ color: isActive ? '#4ade80' : '#4b5563' }}
                          >
                            {chapter.total_count}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#0a0a0a' }}>
      <Sidebar
        currentPage="heatmap"
        subject={subject}
        selectedYears={selectedYears}
        onPageChange={(page) => { if (page === 'ancestry') router.push('/ancestry');
          if (page === 'concept-map') router.push('/concept-map'); }}
        onSubjectChange={(s) => { setSubject(s); }}
        onYearsChange={setSelectedYears}
      />

      <main className="flex-1 flex flex-col overflow-hidden" style={{ height: '100vh' }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #1e1e1e' }}>
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: '#f9fafb' }}>
              📊 {subject} Heatmap
            </h1>
            <p className="text-[10px] mt-0.5 font-mono" style={{ color: '#4b5563' }}>
              {sortedChapters.length} chapters · {selectedYears.length} years selected
            </p>
          </div>
          {selectedChapter && (
            <div className="text-[10px] font-mono" style={{ color: '#4b5563' }}>
              {totalFiltered} questions in view
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">

            {/* ── LEFT PANEL ── */}
            <div
              className="flex-shrink-0 overflow-y-auto flex flex-col"
              style={{ width: '260px', borderRight: '1px solid #1e1e1e' }}
            >
              {/* View toggle */}
              <div className="px-3 py-2 sticky top-0 z-10 flex items-center justify-between"
                style={{ background: '#0a0a0a', borderBottom: '1px solid #1e1e1e' }}>
                <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: '#4b5563' }}>
                  {viewMode === 'chapter' ? 'Ranked by frequency' : 'By topic'}
                </span>
                <div className="flex gap-1 rounded p-0.5" style={{ background: '#141414', border: '1px solid #1e1e1e' }}>
                  <button
                    onClick={() => setViewMode('chapter')}
                    className="px-2 py-0.5 rounded text-[9px] font-mono transition-colors"
                    style={{
                      background: viewMode === 'chapter' ? '#16a34a22' : 'transparent',
                      color: viewMode === 'chapter' ? '#4ade80' : '#4b5563',
                      border: viewMode === 'chapter' ? '1px solid #16a34a44' : '1px solid transparent',
                    }}
                  >
                    Chapter
                  </button>
                  <button
                    onClick={() => setViewMode('topic')}
                    className="px-2 py-0.5 rounded text-[9px] font-mono transition-colors"
                    style={{
                      background: viewMode === 'topic' ? '#16a34a22' : 'transparent',
                      color: viewMode === 'topic' ? '#4ade80' : '#4b5563',
                      border: viewMode === 'topic' ? '1px solid #16a34a44' : '1px solid transparent',
                    }}
                  >
                    Topic
                  </button>
                </div>
              </div>

              {viewMode === 'chapter' ? renderChapterList() : renderTopicList()}
            </div>

            {/* ── RIGHT PANEL ── */}
            <div key={subject} className="flex-1 overflow-y-auto" style={{ background: '#0d0d0d' }}>
              {!selectedChapter ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="text-4xl opacity-20">←</div>
                  <p className="text-sm font-mono" style={{ color: '#4b5563' }}>Select a chapter to explore</p>
                </div>
              ) : (
                <div className="p-6">

                  {/* Chapter header */}
                  <div className="mb-6">
                    <h2 className="text-xl font-bold mb-1" style={{ color: '#f9fafb' }}>
                      {selectedChapter.chapter_name}
                    </h2>
                    <div className="flex items-center gap-4 text-[10px] font-mono" style={{ color: '#4b5563' }}>
                      <span>{selectedChapter.total_count} total questions</span>
                      <span>·</span>
                      <span>{yearCards.length} active years</span>
                      <span>·</span>
                      <span style={{ color: '#16a34a' }}>
                        avg {((selectedChapter.total_count ?? 0) / Math.max(selectedYears.length, 1)).toFixed(1)}/yr
                      </span>
                    </div>
                  </div>

                  {/* Year cards */}
                  {yearCards.length > 0 && (
                    <div className="mb-6">
                      <div className="text-[9px] font-mono uppercase tracking-widest mb-3" style={{ color: '#374151' }}>
                        Year breakdown
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <div
                          onClick={() => setActiveYearFilter(null)}
                          className="flex flex-col items-center px-3 py-2 rounded-lg border cursor-pointer transition-all"
                          style={{
                            background: activeYearFilter === null ? '#16a34a18' : '#141414',
                            borderColor: activeYearFilter === null ? '#16a34a55' : '#1e1e1e',
                            minWidth: '52px',
                          }}
                        >
                          <span className="text-[9px] font-mono mb-1"
                            style={{ color: activeYearFilter === null ? '#4ade80' : '#4b5563' }}>ALL</span>
                          <span className="text-sm font-bold font-mono"
                            style={{ color: activeYearFilter === null ? '#4ade80' : '#6b7280' }}>
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
                                background: isActive ? '#16a34a18' : '#141414',
                                borderColor: isActive ? '#16a34a55' : '#1e1e1e',
                                minWidth: '60px',
                                opacity: activeYearFilter !== null && !isActive ? 0.35 : 1,
                              }}
                            >
                              <span className="text-[9px] font-mono mb-1" style={{ color: '#4b5563' }}>{year}</span>
                              <span className="text-lg font-bold font-mono"
                                style={{ color: isActive ? intensityText(count, maxYr) : '#6b7280' }}>
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
                    <div className="text-[9px] font-mono uppercase tracking-widest mb-3" style={{ color: '#374151' }}>
                      Questions ({filteredQuestions.length})
                    </div>

                    {filteredQuestions.length === 0 ? (
                      <p className="text-sm font-mono" style={{ color: '#4b5563' }}>No questions for selected years.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {filteredQuestions.map((q, qi) => {
                          const isExpanded = expandedQuestion?.question === q.question;
                          return (
                            <div
                              key={`${subject}-${qi}`}
                              className="rounded-xl border transition-all duration-200"
                              style={{
                                background: isExpanded ? '#111827' : '#111',
                                borderColor: isExpanded ? '#16a34a33' : '#1e1e1e',
                              }}
                            >
                              <div
                                className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                                onClick={() => setExpandedQuestion(isExpanded ? null : q)}
                              >
                                {q.year && (
                                  <span className="text-[9px] font-mono flex-shrink-0 mt-0.5 pt-[1px]"
                                    style={{ color: '#16a34a' }}>
                                    {q.year}
                                  </span>
                                )}
                                <span className="text-[13px] flex-1 leading-relaxed" style={{ color: '#d1d5db' }}>
                                  {q.question}
                                </span>
                                <span
                                  className="text-[10px] flex-shrink-0 mt-0.5 transition-transform duration-200"
                                  style={{
                                    color: '#4b5563',
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  }}
                                >
                                  ▾
                                </span>
                              </div>

                              {isExpanded && (
                                <div className="px-4 pb-4" style={{ borderTop: '1px solid #1e1e1e' }}>
                                  {q.options && Object.keys(q.options).length > 0 && (
                                    <div className="flex flex-col gap-2 mt-3">
                                      {Object.entries(q.options).map(([num, text]) => {
                                        const isCorrect = String(num) === String(q.correct_answer);
                                        return (
                                          <div
                                            key={num}
                                            className="flex items-start gap-3 px-3 py-2.5 rounded-lg border text-[12px]"
                                            style={{
                                              background: isCorrect ? '#052e16' : '#141414',
                                              borderColor: isCorrect ? '#16a34a66' : '#1e1e1e',
                                              color: isCorrect ? '#4ade80' : '#9ca3af',
                                            }}
                                          >
                                            <span className="flex-shrink-0 font-mono text-[10px]"
                                              style={{ color: isCorrect ? '#16a34a' : '#374151' }}>
                                              ({num})
                                            </span>
                                            <span className="flex-1 leading-relaxed">{text}</span>
                                            {isCorrect && (
                                              <span className="flex-shrink-0 text-[10px]" style={{ color: '#4ade80' }}>✓</span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  <button
                                    onClick={() => handleFindAncestry(q)}
                                    className="mt-3 w-full py-2.5 rounded-lg text-[12px] font-semibold transition-all"
                                    style={{
                                      background: '#052e16',
                                      color: '#4ade80',
                                      border: '1px solid #16a34a44',
                                    }}
                                    onMouseEnter={(e) => {
                                      (e.target as HTMLElement).style.background = '#14532d';
                                    }}
                                    onMouseLeave={(e) => {
                                      (e.target as HTMLElement).style.background = '#052e16';
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
