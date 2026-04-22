'use client';

import {
  ChapterEntry,
  Subject,
  AVAILABLE_YEARS,
  CLASS_CONFIG,
} from '@/lib/types';
import { getHeatmapColor, getEffectiveCount, CHAPTER_NAMES } from '@/lib/data';

interface HeatmapGridProps {
  heatmapData: Record<string, ChapterEntry>;
  subject: Subject;
  selectedYears: number[];
  onChapterClick: (chapter: ChapterEntry) => void;
}

export default function HeatmapGrid({
  heatmapData,
  subject,
  selectedYears,
  onChapterClick,
}: HeatmapGridProps) {
  if (!heatmapData || Object.keys(heatmapData).length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#555]">
        No heatmap data available for {subject} yet.
      </div>
    );
  }

  // Compute effective counts for selected years
  const withCounts = Object.entries(heatmapData).map(([key, entry]) => ({
    key,
    entry,
    count: getEffectiveCount(entry, selectedYears),
  }));

  const active = withCounts.filter(({ count }) => count > 0);
  if (active.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#555]">
        No questions found for selected years.
      </div>
    );
  }

  const maxCount = Math.max(...active.map(({ count }) => count));

  // Group by class
  const byClass: Record<number, typeof active> = {};
  for (const item of active) {
    const cls = item.entry.class;
    if (!byClass[cls]) byClass[cls] = [];
    byClass[cls].push(item);
  }

  // Year range label
  const sorted = [...selectedYears].sort();
  const yearLabel =
    sorted.length === AVAILABLE_YEARS.length
      ? `${Math.min(...AVAILABLE_YEARS)}–${Math.max(...AVAILABLE_YEARS)}`
      : sorted.length === 1
      ? String(sorted[0])
      : sorted.join(', ');

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">🔥 NEET Topic Heatmap</h1>
        <p className="text-[#888] text-sm mt-1">
          {subject} · NEET {yearLabel} · Click a chapter to see questions
        </p>
      </div>

      {/* Grid by class */}
      {[12, 11, 10, 9].map((cls) => {
        const chapters = byClass[cls];
        if (!chapters || chapters.length === 0) return null;
        const cfg = CLASS_CONFIG[cls];

        return (
          <div key={cls} className="mb-8">
            {/* Class header */}
            <div
              className="text-sm font-semibold mb-3 flex items-center gap-2"
              style={{ color: cfg.color }}
            >
              <span>{cfg.emoji}</span>
              <span>Class {cls}</span>
            </div>

            {/* Chapter cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {chapters
                .sort((a, b) => a.entry.chapter - b.entry.chapter)
                .map(({ key, entry, count }) => {
                  const bg = getHeatmapColor(count, maxCount);
                  const chName =
                    CHAPTER_NAMES[subject]?.[`${cls}_${entry.chapter}`] ||
                    entry.chapter_name ||
                    `Chapter ${entry.chapter}`;
                  const shortName =
                    chName.length > 24 ? chName.slice(0, 24) + '…' : chName;

                  return (
                    <button
                      key={key}
                      onClick={() => onChapterClick(entry)}
                      className="rounded-xl p-3 text-center transition-all hover:scale-105 hover:brightness-125 active:scale-95"
                      style={{ background: bg }}
                    >
                      <div className="text-3xl font-black text-white">
                        {count}
                      </div>
                      <div className="text-[11px] text-[#ddd] mt-1 leading-tight">
                        {shortName}
                      </div>
                      <div className="text-[10px] text-[#aaa] mt-1">
                        Ch {entry.chapter}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-[#666]">
        <span>Frequency:</span>
        <span className="px-3 py-1 rounded" style={{ background: '#1a4a1a' }}>
          Low
        </span>
        <span className="px-3 py-1 rounded" style={{ background: '#b35900' }}>
          Medium
        </span>
        <span className="px-3 py-1 rounded" style={{ background: '#cc0000' }}>
          High
        </span>
        <span className="ml-auto text-[#444]">Showing: NEET {yearLabel}</span>
      </div>
    </div>
  );
}
