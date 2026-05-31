'use client';

import { useState } from 'react';
import { Subject, AVAILABLE_YEARS, YEAR_COLORS } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  currentPage: 'heatmap' | 'ancestry' | 'concept-map' | 'quiz';
  subject: Subject;
  selectedYears: number[];
  onPageChange: (page: 'heatmap' | 'ancestry' | 'concept-map' | 'quiz') => void;
  onSubjectChange: (subject: Subject) => void;
  onYearsChange: (years: number[]) => void;
  showBackButton?: boolean;
  onBack?: () => void;
}

const NAV_ITEMS = [
  { page: 'heatmap',     emoji: '🔥', label: 'Heatmap' },
  { page: 'ancestry',    emoji: '🧬', label: 'Ancestry' },
  { page: 'concept-map', emoji: '🗺',  label: 'Map' },
  { page: 'quiz',        emoji: '📚', label: 'Quiz' },
] as const;

export default function Sidebar({
  currentPage, subject, selectedYears, onPageChange,
  onSubjectChange, onYearsChange, showBackButton, onBack,
}: SidebarProps) {
  const subjects: Subject[] = ['Biology', 'Physics', 'Chemistry'];
  const supabase = createClient();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

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
    <>
      {/* ── Desktop Sidebar ── */}
      <div className="desktop-sidebar" style={{
        width: '224px', height: '100vh', background: '#0a0a0a',
        borderRight: '1px solid #1e1e1e', display: 'flex',
        flexDirection: 'column', padding: '20px 16px', gap: '28px', flexShrink: 0,
        position: 'sticky', top: 0, overflowY: 'auto',
      }}>
        <div style={{ paddingTop: '4px' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#f9fafb' }}>🌱 Bija Vidya</div>
          <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '4px' }}>Learn from the root</div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 700 }}>
            Navigate
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {NAV_ITEMS.map(({ page, emoji, label }) => {
              const isActive = currentPage === page;
              return (
                <button key={page} onClick={() => onPageChange(page)} style={{
                  textAlign: 'left', padding: '8px 12px', borderRadius: '8px',
                  fontSize: '13px', fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#4ade80' : '#6b7280',
                  background: isActive ? '#052e16' : 'transparent',
                  border: `1px solid ${isActive ? '#16a34a44' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'inherit',
                }}>
                  {emoji} {label === 'Heatmap' ? 'Topic Heatmap' : label === 'Ancestry' ? 'Find Ancestry' : label === 'Map' ? 'Concept Map' : 'Concepts & Quiz'}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 700 }}>
            Subject
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {subjects.map((s) => {
              const isActive = subject === s;
              const emoji = s === 'Physics' ? '⚡' : s === 'Chemistry' ? '⚗️' : '🌿';
              return (
                <button key={s} onClick={() => onSubjectChange(s)} style={{
                  textAlign: 'left', padding: '8px 12px', borderRadius: '8px',
                  fontSize: '13px', fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#f9fafb' : '#6b7280',
                  background: isActive ? '#1a1a1a' : 'transparent',
                  border: `1px solid ${isActive ? '#2d2d2d' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'inherit',
                }}>
                  {emoji} {s}
                </button>
              );
            })}
          </div>
        </div>

        {currentPage === 'heatmap' && (
          <div>
            <div style={{ fontSize: '10px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 700 }}>
              Year Filter
            </div>
            <button onClick={() => onYearsChange(allSelected ? [2025] : [...AVAILABLE_YEARS])}
              style={{ fontSize: '11px', color: '#16a34a', marginBottom: '8px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', padding: 0 }}>
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {AVAILABLE_YEARS.map((year) => {
                const selected = selectedYears.includes(year);
                const color = YEAR_COLORS[year];
                return (
                  <button key={year} onClick={() => toggleYear(year)} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 8px', borderRadius: '8px',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.12s',
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, opacity: selected ? 1 : 0.2, flexShrink: 0, transition: 'opacity 0.12s' }} />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: selected ? '#d1d5db' : '#374151', transition: 'color 0.12s' }}>
                      NEET {year}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {showBackButton && onBack && (
            <button onClick={onBack} style={{
              width: '100%', textAlign: 'left', padding: '8px 12px',
              borderRadius: '8px', fontSize: '13px', color: '#6b7280',
              background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              ← Back to Heatmap
            </button>
          )}
          <button onClick={handleLogout} style={{
            width: '100%', textAlign: 'left', padding: '8px 12px',
            borderRadius: '8px', fontSize: '13px', color: '#ef4444',
            background: 'transparent', border: '1px solid #2d1b1b',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
          }}>
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* ── Mobile Top Bar ── */}
      <div className="mobile-topbar" style={{
        display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: '#0a0a0a', borderBottom: '1px solid #1e1e1e',
        padding: '12px 16px', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#f9fafb' }}>🌱 Bija Vidya</div>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{
          background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer',
          fontSize: '22px', lineHeight: 1, padding: '4px',
        }}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* ── Mobile Dropdown Menu ── */}
      {menuOpen && (
        <div className="mobile-menu" style={{
          display: 'none', position: 'fixed', top: '52px', left: 0, right: 0, zIndex: 99,
          background: '#0f0f0f', borderBottom: '1px solid #1e1e1e',
          padding: '16px', flexDirection: 'column', gap: '16px',
        }}>
          {/* Subject selector */}
          <div>
            <div style={{ fontSize: '10px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 700 }}>Subject</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {subjects.map((s) => {
                const isActive = subject === s;
                const emoji = s === 'Physics' ? '⚡' : s === 'Chemistry' ? '⚗️' : '🌿';
                return (
                  <button key={s} onClick={() => { onSubjectChange(s); setMenuOpen(false); }} style={{
                    flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px',
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? '#f9fafb' : '#6b7280',
                    background: isActive ? '#1a1a1a' : 'transparent',
                    border: `1px solid ${isActive ? '#2d2d2d' : '#1e1e1e'}`,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    {emoji} {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Year filter for heatmap */}
          {currentPage === 'heatmap' && (
            <div>
              <div style={{ fontSize: '10px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 700 }}>Year Filter</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {AVAILABLE_YEARS.map((year) => {
                  const selected = selectedYears.includes(year);
                  const color = YEAR_COLORS[year];
                  return (
                    <button key={year} onClick={() => toggleYear(year)} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', borderRadius: '20px',
                      background: selected ? '#1a1a1a' : 'transparent',
                      border: `1px solid ${selected ? '#2d2d2d' : '#1e1e1e'}`,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, opacity: selected ? 1 : 0.3 }} />
                      <span style={{ fontSize: '12px', color: selected ? '#d1d5db' : '#374151' }}>{year}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button onClick={handleLogout} style={{
            padding: '10px', borderRadius: '8px', fontSize: '13px', color: '#ef4444',
            background: 'transparent', border: '1px solid #2d1b1b',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            🚪 Sign Out
          </button>
        </div>
      )}

      {/* ── Mobile Bottom Nav ── */}
      <div className="mobile-bottomnav" style={{
        display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: '#0a0a0a', borderTop: '1px solid #1e1e1e',
        padding: '8px 0', justifyContent: 'space-around', alignItems: 'center',
      }}>
        {NAV_ITEMS.map(({ page, emoji, label }) => {
          const isActive = currentPage === page;
          return (
            <button key={page} onClick={() => { onPageChange(page); setMenuOpen(false); }} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 16px',
              color: isActive ? '#4ade80' : '#4b5563',
            }}>
              <span style={{ fontSize: '20px' }}>{emoji}</span>
              <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 400, fontFamily: 'inherit' }}>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Responsive Styles ── */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-topbar { display: flex !important; }
          .mobile-bottomnav { display: flex !important; }
          .mobile-menu { display: flex !important; }
        }
      `}</style>
    </>
  );
}
