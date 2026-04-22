'use client';

import {
  ChapterEntry,
  Question,
  Subject,
  AVAILABLE_YEARS,
  YEAR_COLORS,
  CLASS_CONFIG,
} from '@/lib/types';

interface ChapterViewProps {
  chapter: ChapterEntry;
  subject: Subject;
  selectedYears: number[];
  onQuestionClick: (question: Question) => void;
  onBack: () => void;
}

export default function ChapterView({
  chapter,
  subject,
  selectedYears,
  onQuestionClick,
  onBack,
}: ChapterViewProps) {
  const cfg = CLASS_CONFIG[chapter.class] ?? { emoji: '📖', color: '#888' };

  // Filter questions by selected years
  const filtered = chapter.questions.filter((q) =>
    selectedYears.includes(q.year)
  );

  // Sort by year then question number
  const sorted = [...filtered].sort(
    (a, b) => a.year - b.year || a.question_number - b.question_number
  );

  return (
    <div>
      {/* Chapter header */}
      <div
        className="rounded-xl p-4 mb-6 border-l-4"
        style={{
          borderColor: cfg.color,
          background: '#1a1a1a',
        }}
      >
        <div
          className="text-xs font-semibold mb-1"
          style={{ color: cfg.color }}
        >
          {cfg.emoji} Class {chapter.class} → Chapter {chapter.chapter}
        </div>
        <div className="text-xl font-bold text-white">
          {chapter.chapter_name}
        </div>
        <div className="text-sm text-[#888] mt-1">
          {filtered.length} question{filtered.length !== 1 ? 's' : ''} from
          selected years
        </div>

        {/* Year breakdown pills */}
        <div className="flex flex-wrap gap-2 mt-3">
          {AVAILABLE_YEARS.map((yr) => {
            const count = chapter.by_year[String(yr)] ?? 0;
            if (count === 0) return null;
            const selected = selectedYears.includes(yr);
            return (
              <span
                key={yr}
                className="text-xs px-2.5 py-1 rounded-full text-white transition-opacity"
                style={{
                  background: YEAR_COLORS[yr],
                  opacity: selected ? 1 : 0.3,
                }}
              >
                {yr}: {count}Q
              </span>
            );
          })}
        </div>
      </div>

      {/* Back button */}
      <button
        onClick={onBack}
        className="text-sm text-[#888] hover:text-white mb-4 transition-colors flex items-center gap-1"
      >
        ← Back to Heatmap
      </button>

      {/* Questions list */}
      {sorted.length === 0 ? (
        <div className="text-[#555] text-center py-12">
          No questions for selected years.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((q) => {
            const preview =
              q.question.length > 120
                ? q.question.slice(0, 120) + '…'
                : q.question;
            const yearColor = YEAR_COLORS[q.year] ?? '#555';

            return (
              <div
                key={`${q.year}_${q.question_number}`}
                className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl px-4 py-3 hover:bg-[#222] transition-colors cursor-pointer group"
                onClick={() => onQuestionClick(q)}
              >
                {/* Year badge */}
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                  style={{ background: yearColor }}
                >
                  {q.year}
                </span>

                {/* Question number */}
                <span className="text-[#555] text-xs shrink-0">
                  Q{q.question_number}
                  {q.has_diagram ? ' 📊' : ''}
                </span>

                {/* Preview */}
                <span className="text-[#ccc] text-sm flex-1 text-left leading-snug">
                  {preview}
                </span>

                {/* Arrow */}
                <span className="text-[#444] group-hover:text-[#888] transition-colors shrink-0">
                  →
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
