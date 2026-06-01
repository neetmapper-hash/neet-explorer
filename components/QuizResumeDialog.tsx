'use client';

const LEVEL_LABELS: Record<number, string> = {
  1: '🟢 Easy',
  2: '🟡 Medium',
  3: '🔴 Hard',
  4: '🟣 Advanced',
  5: '⭐ Expert',
  6: '🎯 NEET Level',
};

const LEVEL_NAMES: Record<number, string> = {
  1: 'Easy', 2: 'Medium', 3: 'Hard',
  4: 'Advanced', 5: 'Expert', 6: 'NEET Level',
};

interface Props {
  conceptName: string;
  highestLevel: number;       // 1–6: highest level completed
  onResume: () => void;       // continue from highestLevel + 1
  onStartFresh: () => void;   // start from level 1
  onClose: () => void;
}

export default function QuizResumeDialog({
  conceptName, highestLevel, onResume, onStartFresh, onClose,
}: Props) {
  const isCompleted = highestLevel >= 6;
  const resumeLevel = Math.min(highestLevel + 1, 6);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 100, padding: '0 0 0 0',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111', border: '1px solid #1e1e1e',
          borderRadius: '20px 20px 0 0', padding: '24px 24px 32px',
          width: '100%', maxWidth: '480px',
        }}
      >
        {/* Handle bar */}
        <div style={{ width: '36px', height: '4px', background: '#2d2d2d', borderRadius: '2px', margin: '0 auto 20px' }} />

        {/* Concept label */}
        <p style={{ fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px', fontWeight: 600 }}>
          {conceptName}
        </p>

        {isCompleted ? (
          <>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f9fafb', margin: '0 0 8px' }}>
              🏆 You've mastered this!
            </h2>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 24px', lineHeight: 1.6 }}>
              You completed all 6 levels. Want to practice again from Easy?
            </p>
            <button onClick={onStartFresh} style={primaryBtn('#052e16', '#4ade80', '#16a34a')}>
              🔄 Practice again from Easy
            </button>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f9fafb', margin: '0 0 8px' }}>
              Continue where you left off?
            </h2>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 6px', lineHeight: 1.6 }}>
              You last completed{' '}
              <span style={{ color: '#f9fafb', fontWeight: 600 }}>{LEVEL_LABELS[highestLevel]}</span>.
            </p>

            {/* Progress pills */}
            <div style={{ display: 'flex', gap: '4px', margin: '12px 0 24px', flexWrap: 'wrap' }}>
              {[1,2,3,4,5,6].map(l => (
                <span key={l} style={{
                  fontSize: '10px', padding: '3px 8px', borderRadius: '20px', fontWeight: 600,
                  background: l <= highestLevel ? '#052e16' : '#1a1a1a',
                  color: l <= highestLevel ? '#4ade80' : '#374151',
                  border: `1px solid ${l <= highestLevel ? '#16a34a44' : '#2d2d2d'}`,
                }}>
                  {LEVEL_NAMES[l]}
                </span>
              ))}
            </div>

            <button onClick={onResume} style={{ ...primaryBtn('#052e16', '#4ade80', '#16a34a'), marginBottom: '10px' }}>
              ▶ Resume from {LEVEL_LABELS[resumeLevel]}
            </button>
            <button onClick={onStartFresh} style={secondaryBtn}>
              🔄 Start fresh from Easy
            </button>
          </>
        )}

        <button onClick={onClose} style={{ display: 'block', width: '100%', marginTop: '10px', padding: '10px', background: 'none', border: 'none', color: '#374151', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function primaryBtn(bg: string, color: string, border: string) {
  return {
    display: 'block', width: '100%', padding: '13px',
    borderRadius: '12px', fontSize: '14px', fontWeight: 700,
    cursor: 'pointer', background: bg, color, border: `1px solid ${border}`,
    fontFamily: 'inherit',
  } as React.CSSProperties;
}

const secondaryBtn: React.CSSProperties = {
  display: 'block', width: '100%', padding: '13px',
  borderRadius: '12px', fontSize: '14px', fontWeight: 700,
  cursor: 'pointer', background: '#1a1a1a', color: '#9ca3af',
  border: '1px solid #2d2d2d', fontFamily: 'inherit',
};
