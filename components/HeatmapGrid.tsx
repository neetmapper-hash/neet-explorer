'use client';

import { useState } from 'react';
import {
  ChapterEntry,
  Subject,
  AVAILABLE_YEARS,
  CLASS_CONFIG,
} from '@/lib/types';
import { getHeatmapColor, getEffectiveCount, CHAPTER_NAMES } from '@/lib/data';
import { groupChaptersByTopic } from '@/lib/topics';

interface HeatmapGridProps {
  heatmapData: Record<string, ChapterEntry>;
  subject: Subject;
  selectedYears: number[];
  onChapterClick: (chapter: ChapterEntry) => void;
}

type ViewMode = 'chapter' | 'topic';

export default function HeatmapGrid({
  heatmapData,
  subject,
  selectedYears,
  onChapterClick,
}: HeatmapGridProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('chapter');
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  if (!heatmapData || Object.keys(heatmapData).length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#6b6b8a]">
        No heatmap data available for {subject} yet.
      </div>
    );
  }

  const withCounts = Object.entries(heatmapData).map(([key, entry]) => ({
    key,
    entry,
    count: getEffectiveCount(entry, selectedYears),
    chapter_name:
      CHAPTER_NAMES[subject]?.[`${entry.class}_${entry.chapter}`] ||
      entry.chapter_name ||
      `Chapter ${entry.chapter}`,
    filteredTotal: getEffectiveCount(entry, selectedYears),
  }));

  const active = withCounts.filter(({ count }) => count > 0);
  if (active.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#6b6b8a]">
        No questions found for selected years.
      </div>
    );
  }

  const maxCount = Math.max(...active.map(({ count }) => count));

  const sorted = [...selectedYears].sort();
  const yearLabel =
    sorted.length === AVAILABLE_YEARS.length
      ? `${Math.min(...AVAILABLE_YEARS)}–${Math.max(...AVAILABLE_YEARS)}`
      : sorted.length === 1
      ? String(sorted[0])
      : sorted.join(', ');

  const toggleTopic = (topic: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  };

  // ── CHAPTER VIEW ────────────────────────────────────────────────────────
  const renderChapterView = () => {
    const byClass: Record<number, typeof active> = {};
    for (const item of active) {
      const cls = item.entry.class;
      if (!byClass[cls]) byClass[cls] = [];
      byClass[cls].push(item);
    }

    return (
      <>
        {[12, 11, 10, 9].map((cls) => {
          const chapters = byClass[cls];
          if (!chapters || chapters.length === 0) return null;
          const cfg = CLASS_CONFIG[cls];
          return (
            <div key={cls} className="mb-8">
              <div
                className="text-sm font-semibold mb-3 flex items-center gap-2"
                style={{ color: cfg.color }}
              >
                <span>{cfg.emoji}</span>
                <span>Class {cls}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {chapters
                  .sort((a, b) => a.entry.chapter - b.entry.chapter)
                  .map(({ key, entry, count }) => {
                    const bg = getHeatmapColor(count, maxCount);
                    const chName = entry.chapter_name || `Chapter ${entry.chapter}`;
                    const shortName = chName.length > 24 ? chName.slice(0, 24) + '…' : chName;
                    return (
                      <button
                        key={key}
                        onClick={() => onChapterClick(entry)}
                        className="rounded-xl p-3 text-center transition-all hover:scale-105 hover:brightness-125 active:scale-95 border border-white/10"
                        style={{ background: bg }}
                      >
                        <div className="text-3xl font-black text-white drop-shadow">{count}</div>
                        <div className="text-[11px] text-white/90 mt-1 leading-tight font-medium">{shortName}</div>
                        <div className="text-[10px] text-white/60 mt-1">Ch {entry.chapter}</div>
                      </button>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </>
    );
  };

  // ── TOPIC VIEW ──────────────────────────────────────────────────────────
  const renderTopicView = () => {
    const topicGroups = groupChaptersByTopic(active, subject);
    const maxTopicTotal = Math.max(...topicGroups.map(g => g.total));

    return (
      <div className="flex flex-col gap-3">
        {topicGroups.map(({ topic, chapters, total }) => {
          const isExpanded = expandedTopics.has(topic);
          const topicBarWidth = Math.round((total / maxTopicTotal) * 100);

          return (
            <div
              key={topic}
              className="rounded-xl border border-[#2a2a3f] overflow-hidden"
              style={{ background: '#13131f' }}
            >
              {/* Topic header row */}
              <button
                onClick={() => toggleTopic(topic)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a2e] transition-colors"
              >
                <span className="text-[#6b6b8a] text-xs w-4">
                  {isExpanded ? '▼' : '▶'}
                </span>
                <span className="text-sm font-semibold text-white flex-1 text-left">
                  {topic}
                </span>
                <span className="text-xs text-[#6b6b8a]">
                  {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
                </span>
                <span className="text-base font-black text-[#00e6b4] ml-2 font-mono w-8 text-right">
                  {total}
                </span>
              </button>

              {/* Frequency bar */}
              <div className="px-4 pb-2">
                <div className="h-1 rounded-full bg-[#2a2a3f]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${topicBarWidth}%`,
                      background: 'linear-gradient(90deg, #00e6b4, #0080ff)',
                    }}
                  />
                </div>
              </div>

              {/* Expanded chapter cards */}
              {isExpanded && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                    {chapters
                      .sort((a: any, b: any) => b.count - a.count)
                      .map((ch: any) => {
                        const bg = getHeatmapColor(ch.count, maxCount);
                        const shortName =
                          ch.chapter_name.length > 24
                            ? ch.chapter_name.slice(0, 24) + '…'
                            : ch.chapter_name;
                        return (
                          <button
                            key={`${ch.entry.class}_${ch.entry.chapter}`}
                            onClick={() => onChapterClick(ch.entry)}
                            className="rounded-xl p-3 text-center transition-all hover:scale-105 hover:brightness-125 active:scale-95 border border-white/10"
                            style={{ background: bg }}
                          >
                            <div className="text-3xl font-black text-white drop-shadow">{ch.count}</div>
                            <div className="text-[11px] text-white/90 mt-1 leading-tight font-medium">{shortName}</div>
                            <div className="text-[10px] text-white/60 mt-1">
                              Ch {ch.entry.chapter} · Class {ch.entry.class}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">🔥 NEET Topic Heatmap</h1>
            <p className="text-[#a0a0c0] text-sm mt-1">
              {subject} · NEET {yearLabel} · Click a chapter to see questions
            </p>
          </div>

          {/* View toggle */}
          <div className="flex gap-1 bg-[#13131f] border border-[#2a2a3f] rounded-lg p-1">
            <button
              onClick={() => setViewMode('chapter')}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
              style={{
                background: viewMode === 'chapter' ? '#1e1e30' : 'transparent',
                color: viewMode === 'chapter' ? '#fff' : '#6b6b8a',
                border: viewMode === 'chapter' ? '1px solid #2a2a3f' : '1px solid transparent',
              }}
            >
              By Chapter
            </button>
            <button
              onClick={() => setViewMode('topic')}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
              style={{
                background: viewMode === 'topic' ? '#1e1e30' : 'transparent',
                color: viewMode === 'topic' ? '#00e6b4' : '#6b6b8a',
                border: viewMode === 'topic' ? '1px solid #2a2a3f' : '1px solid transparent',
              }}
            >
              By Topic
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'chapter' ? renderChapterView() : renderTopicView()}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-6 text-xs text-[#a0a0c0]">
        <span>Frequency:</span>
        <span className="px-3 py-1 rounded font-semibold" style={{ background: '#1a4a1a', color: '#7fff7f' }}>Low</span>
        <span className="px-3 py-1 rounded font-semibold" style={{ background: '#b35900', color: '#ffd0a0' }}>Medium</span>
        <span className="px-3 py-1 rounded font-semibold" style={{ background: '#cc0000', color: '#ffaaaa' }}>High</span>
        <span className="ml-auto text-[#6b6b8a]">Showing: NEET {yearLabel}</span>
      </div>
    </div>
  );
}
