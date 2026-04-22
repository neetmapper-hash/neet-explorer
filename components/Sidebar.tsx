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
  const subjects: Subject[] = ['Biology', 'Physics', 'Chemistry'];

  const toggleYear = (year: number) => {
    if (selectedYears.includes(year)) {
      if (selectedYears.length === 1) return;
      onYearsChange(selectedYears.filter((y) => y !== year));
    } else {
      onYearsChange([...selectedYears, year]);
    }
  };

  const allSelected = selectedYears.length === AVAILABLE_YEARS.length;

  return (
    <div className="w-56 min-h-screen bg-[#0d0d14] border-r border-[#2a2a3f] flex flex-col p-4 gap-6 shrink-0">
      {/* Logo */}
      <div className="pt-2">
        <div className="text-lg font-bold text-white">🧬 NEET Explorer</div>
        <div className="text-xs text-[#6b6b8a] mt-1">5 years · 3 subjects</div>
      </div>

      {/* Navigation */}
      <div>
        <div className="text-xs text-[#6b6b8a] uppercase tracking-wider mb-2">
          Navigate
        </div>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onPageChange('heatmap')}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              currentPage === 'heatmap'
                ? 'bg-[#00e6b420] text-[#00e6b4] font-semibold'
                : 'text-[#a0a0c0] hover:text-white hover:bg-[#1e1e30]'
            }`}
          >
            🔥 Topic Heatmap
          </button>
          <button
            onClick={() => onPageChange('ancestry')}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              currentPage === 'ancestry'
                ? 'bg-[#00e6b420] text-[#00e6b4] font-semibold'
                : 'text-[#a0a0c0] hover:text-white hover:bg-[#1e1e30]'
            }`}
          >
            🧬 Find Ancestry
          </button>
        </div>
      </div>

      {/* Subject */}
      <div>
        <div className="text-xs text-[#6b6b8a] uppercase tracking-wider mb-2">
          Subject
        </div>
        <div className="flex flex-col gap-1">
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => onSubjectChange(s)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                subject === s
                  ? 'bg-[#1e1e30] text-white font-semibold border border-[#3a3a5a]'
                  : 'text-[#a0a0c0] hover:text-white hover:bg-[#1a1a28]'
              }`}
            >
              {s === 'Physics' ? '⚡' : s === 'Chemistry' ? '⚗️' : '🌿'} {s}
            </button>
          ))}
        </div>
      </div>

      {/* Year filter */}
      {currentPage === 'heatmap' && (
        <div>
          <div className="text-xs text-[#6b6b8a] uppercase tracking-wider mb-2">
            Year Filter
          </div>
          <button
            onClick={() =>
              onYearsChange(allSelected ? [2025] : [...AVAILABLE_YEARS])
            }
            className="text-xs text-[#00e6b4] hover:text-white mb-2 transition-colors font-semibold"
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
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#1a1a28] transition-colors"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full transition-opacity"
                    style={{
                      background: color,
                      opacity: selected ? 1 : 0.3,
                    }}
                  />
                  <span
                    className="text-sm transition-colors font-medium"
                    style={{ color: selected ? '#e0e0ff' : '#6b6b8a' }}
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
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#a0a0c0] hover:text-white hover:bg-[#1e1e30] transition-colors"
          >
            ← Back to Heatmap
          </button>
        </div>
      )}
    </div>
  );
}
