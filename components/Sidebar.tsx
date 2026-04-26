'use client';

import { Subject, AVAILABLE_YEARS, YEAR_COLORS } from '@/lib/types';

interface SidebarProps {
  currentPage: 'heatmap' | 'ancestry' | 'concept-map';
  subject: Subject;
  selectedYears: number[];
  onPageChange: (page: 'heatmap' | 'ancestry' | 'concept-map') => void;
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
    <div className="w-56 min-h-screen bg-white border-r border-slate-200 flex flex-col p-4 gap-6 shrink-0 shadow-sm">
      {/* Logo */}
      <div className="pt-2">
        <div className="text-lg font-bold text-slate-800">🧬 NEET Explorer</div>
        <div className="text-xs text-slate-400 mt-1">5 years · 3 subjects</div>
      </div>

      {/* Navigation */}
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">
          Navigate
        </div>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onPageChange('heatmap')}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              currentPage === 'heatmap'
                ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            🔥 Topic Heatmap
          </button>
          <button
            onClick={() => onPageChange('ancestry')}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              currentPage === 'ancestry'
                ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            🧬 Find Ancestry
          </button>
          <button
            onClick={() => onPageChange('concept-map')}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              currentPage === 'concept-map'
                ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            🗺 Concept Map
          </button>
        </div>
      </div>

      {/* Subject */}
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">
          Subject
        </div>
        <div className="flex flex-col gap-1">
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => onSubjectChange(s)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                subject === s
                  ? 'bg-slate-100 text-slate-800 font-semibold border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {s === 'Physics' ? '⚡' : s === 'Chemistry' ? '⚗️' : '🌿'} {s}
            </button>
          ))}
        </div>
      </div>

      {/* Year filter — only on heatmap */}
      {currentPage === 'heatmap' && (
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">
            Year Filter
          </div>
          <button
            onClick={() =>
              onYearsChange(allSelected ? [2025] : [...AVAILABLE_YEARS])
            }
            className="text-xs text-emerald-600 hover:text-emerald-800 mb-2 transition-colors font-semibold"
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
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full transition-opacity"
                    style={{
                      background: color,
                      opacity: selected ? 1 : 0.25,
                    }}
                  />
                  <span
                    className="text-sm transition-colors font-medium"
                    style={{ color: selected ? '#1e293b' : '#94a3b8' }}
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
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
          >
            ← Back to Heatmap
          </button>
        </div>
      )}
    </div>
  );
}
