'use client';

import { Subject, AVAILABLE_YEARS, YEAR_COLORS } from '@/lib/types';

interface SidebarProps {
  currentPage: 'heatmap' | 'ancestry';
  subject: Subject;
  selectedYears: number[];
  onPageChange: (page: 'heatmap' | 'ancestry') => void;
  onSubjectChange: (subject: Subject) => void;
  onYearsChange: (years: number[]) => void;
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function Sidebar({
  currentPage,
  subject,
  selectedYears,
  onPageChange,
  onSubjectChange,
  onYearsChange,
  showBackButton,
  onBack,
}: SidebarProps) {
  const subjects: Subject[] = ['Physics', 'Chemistry', 'Biology'];

  const toggleYear = (year: number) => {
    if (selectedYears.includes(year)) {
      if (selectedYears.length === 1) return; // keep at least one
      onYearsChange(selectedYears.filter((y) => y !== year));
    } else {
      onYearsChange([...selectedYears, year]);
    }
  };

  const allSelected = selectedYears.length === AVAILABLE_YEARS.length;

  return (
    <div className="w-56 min-h-screen bg-[#111] border-r border-[#222] flex flex-col p-4 gap-6 shrink-0">
      {/* Logo */}
      <div className="pt-2">
        <div className="text-lg font-bold text-white">🧬 NEET Explorer</div>
        <div className="text-xs text-[#555] mt-1">5 years · 3 subjects</div>
      </div>

      {/* Navigation */}
      <div>
        <div className="text-xs text-[#555] uppercase tracking-wider mb-2">
          Navigate
        </div>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onPageChange('heatmap')}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              currentPage === 'heatmap'
                ? 'bg-[#ff4b4b22] text-[#ff4b4b] font-medium'
                : 'text-[#888] hover:text-white hover:bg-[#1e1e1e]'
            }`}
          >
            🔥 Topic Heatmap
          </button>
          <button
            onClick={() => onPageChange('ancestry')}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              currentPage === 'ancestry'
                ? 'bg-[#ff4b4b22] text-[#ff4b4b] font-medium'
                : 'text-[#888] hover:text-white hover:bg-[#1e1e1e]'
            }`}
          >
            🧬 Find Ancestry
          </button>
        </div>
      </div>

      {/* Subject */}
      <div>
        <div className="text-xs text-[#555] uppercase tracking-wider mb-2">
          Subject
        </div>
        <div className="flex flex-col gap-1">
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => onSubjectChange(s)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                subject === s
                  ? 'bg-[#1e1e1e] text-white font-medium'
                  : 'text-[#888] hover:text-white hover:bg-[#1a1a1a]'
              }`}
            >
              {s === 'Physics' ? '⚡' : s === 'Chemistry' ? '⚗️' : '🌿'} {s}
            </button>
          ))}
        </div>
      </div>

      {/* Year filter — only on heatmap page */}
      {currentPage === 'heatmap' && (
        <div>
          <div className="text-xs text-[#555] uppercase tracking-wider mb-2">
            Year Filter
          </div>
          <button
            onClick={() =>
              onYearsChange(allSelected ? [2025] : [...AVAILABLE_YEARS])
            }
            className="text-xs text-[#888] hover:text-white mb-2 transition-colors"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          <div className="flex flex-col gap-1">
            {AVAILABLE_YEARS.map((year) => {
              const selected = selectedYears.includes(year);
              const color = YEAR_COLORS[year];
              return (
                <button
                  key={year}
                  onClick={() => toggleYear(year)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#1a1a1a] transition-colors"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full transition-opacity"
                    style={{
                      background: color,
                      opacity: selected ? 1 : 0.25,
                    }}
                  />
                  <span
                    className="text-sm transition-colors"
                    style={{ color: selected ? '#ddd' : '#555' }}
                  >
                    NEET {year}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Back button */}
      {showBackButton && onBack && (
        <div className="mt-auto">
          <button
            onClick={onBack}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#888] hover:text-white hover:bg-[#1e1e1e] transition-colors"
          >
            ← Back to Heatmap
          </button>
        </div>
      )}
    </div>
  );
}
