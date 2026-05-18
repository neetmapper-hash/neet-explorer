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
    <div style={{
      width: '224px',
      minHeight: '100vh',
      background: '#0a0a0a',
      borderRight: '1px solid #1e1e1e',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 16px',
      gap: '28px',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ paddingTop: '4px' }}>
        <div style={{ fontSize: '16px', fontWeight: 800, color: '#f9fafb' }}>🧬 NEET Explorer</div>
        <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '4px' }}>5 years · 3 subjects</div>
      </div>

      {/* Navigation */}
      <div>
        <div style={{ fontSize: '10px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 700 }}>
          Navigate
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {([
            ['heatmap',     '🔥 Topic Heatmap'],
            ['ancestry',    '🧬 Find Ancestry'],
            ['concept-map', '🗺 Concept Map'],
          ] as const).map(([page, label]) => {
            const isActive = currentPage === page;
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#4ade80' : '#6b7280',
                  background: isActive ? '#052e16' : 'transparent',
                  border: `1px solid ${isActive ? '#16a34a44' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  fontFamily: 'inherit',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subject */}
      <div>
        <div style={{ fontSize: '10px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 700 }}>
          Subject
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {subjects.map((s) => {
            const isActive = subject === s;
            const emoji = s === 'Physics' ? '⚡' : s === 'Chemistry' ? '⚗️' : '🌿';
            return (
              <button
                key={s}
                onClick={() => onSubjectChange(s)}
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#f9fafb' : '#6b7280',
                  background: isActive ? '#1a1a1a' : 'transparent',
                  border: `1px solid ${isActive ? '#2d2d2d' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  fontFamily: 'inherit',
                }}
              >
                {emoji} {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Year filter — only on heatmap */}
      {currentPage === 'heatmap' && (
        <div>
          <div style={{ fontSize: '10px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 700 }}>
            Year Filter
          </div>
          <button
            onClick={() => onYearsChange(allSelected ? [2025] : [...AVAILABLE_YEARS])}
            style={{ fontSize: '11px', color: '#16a34a', marginBottom: '8px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', padding: 0 }}
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {AVAILABLE_YEARS.map((year) => {
              const selected = selectedYears.includes(year);
              const color = YEAR_COLORS[year];
              return (
                <button
                  key={year}
                  onClick={() => toggleYear(year)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 8px', borderRadius: '8px',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'background 0.12s',
                  }}
                >
                  <div
                    style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: color,
                      opacity: selected ? 1 : 0.2,
                      flexShrink: 0,
                      transition: 'opacity 0.12s',
                    }}
                  />
                  <span style={{
                    fontSize: '13px', fontWeight: 500,
                    color: selected ? '#d1d5db' : '#374151',
                    transition: 'color 0.12s',
                  }}>
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
        <div style={{ marginTop: 'auto' }}>
          <button
            onClick={onBack}
            style={{
              width: '100%', textAlign: 'left', padding: '8px 12px',
              borderRadius: '8px', fontSize: '13px', color: '#6b7280',
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ← Back to Heatmap
          </button>
        </div>
      )}
    </div>
  );
}
