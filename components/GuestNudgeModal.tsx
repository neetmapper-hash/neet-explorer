'use client';

interface Props {
  trigger: 'ancestry' | 'quiz_level' | 'quiz_hard';
  onSignUp: () => void;
  onDismiss: () => void;
}

const CONTENT = {
  ancestry: {
    emoji: '🧬',
    title: "You've used your 2 free traces",
    body: "Sign up free to unlock unlimited Concept Ancestry traces and see the full prerequisite chain for any NEET question.",
    cta: "Sign up — it's free",
    secondary: "Continue browsing",
  },
  quiz_level: {
    emoji: '🎯',
    title: "Save your progress",
    body: "You just passed a level — but your progress will reset when you close this tab. Sign up to save your quiz history and resume from where you left off.",
    cta: "Sign up to save progress",
    secondary: "Continue without saving",
  },
  quiz_hard: {
    emoji: '🔓',
    title: "Unlock Hard → NEET levels",
    body: "You've completed the free levels. Sign up to access Hard, Advanced, Expert, and NEET-level questions — the ones that actually appear in the exam.",
    cta: "Sign up to unlock all levels",
    secondary: "Maybe later",
  },
};

export default function GuestNudgeModal({ trigger, onSignUp, onDismiss }: Props) {
  const c = CONTENT[trigger];

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 200, padding: 0,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111', border: '1px solid #1e1e1e',
          borderRadius: '20px 20px 0 0', padding: '24px 24px 36px',
          width: '100%', maxWidth: '480px',
        }}
      >
        {/* Handle */}
        <div style={{ width: '36px', height: '4px', background: '#2d2d2d', borderRadius: '2px', margin: '0 auto 20px' }} />

        <div style={{ fontSize: '32px', marginBottom: '12px' }}>{c.emoji}</div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f9fafb', margin: '0 0 8px' }}>{c.title}</h2>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 24px', lineHeight: 1.6 }}>{c.body}</p>

        {/* What they unlock */}
        <div style={{ background: '#0f1f0f', border: '1px solid #16a34a22', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Free account includes</div>
          {['Unlimited Concept Ancestry traces', 'All 6 quiz difficulty levels', 'Progress saved across sessions', 'Quiz history and resume'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: '#4ade80', fontSize: '12px' }}>✓</span>
              <span style={{ fontSize: '12px', color: '#d1d5db' }}>{item}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onSignUp}
          style={{ display: 'block', width: '100%', padding: '13px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', background: '#052e16', color: '#4ade80', border: '1px solid #16a34a', fontFamily: 'inherit', marginBottom: '10px' }}
        >
          {c.cta}
        </button>
        <button
          onClick={onDismiss}
          style={{ display: 'block', width: '100%', padding: '10px', borderRadius: '12px', fontSize: '13px', cursor: 'pointer', background: 'transparent', color: '#374151', border: 'none', fontFamily: 'inherit' }}
        >
          {c.secondary}
        </button>
      </div>
    </div>
  );
}
