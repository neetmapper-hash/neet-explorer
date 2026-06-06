'use client';

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the','a','an','is','are','was','of','in','to','and','or','that',
    'which','what','how','why','when','where','this','it','its','be',
    'been','has','have','not','no','for','by','on','at','as','with',
    'from','if','but','so','than','then','each','their','they','does',
    'do','did','will','would','can','could','should','may','might',
    'state','define','find','calculate','give','write',
  ]);
  return text.toLowerCase().replace(/[?.!(),:;]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w)).slice(0, 12);
}

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Subject, Concept } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import AncestryChain from '@/components/AncestryChain';
import GuestNudgeModal from '@/components/GuestNudgeModal';
import {
  isGuestSession,
  getGuestAncestryCount,
  incrementGuestAncestryCount,
  hasReachedAncestryLimit,
  GUEST_ANCESTRY_LIMIT,
} from '@/lib/guestSession';

const SAMPLES: Record<Subject, string[]> = {
  Physics: [
    'What is the SI unit of electric charge?',
    "State Newton's second law of motion.",
    'What happens to resistance when temperature increases?',
    'Define work done by a force.',
  ],
  Chemistry: [
    'What is the hybridisation of carbon in benzene?',
    'Which law states that gases combine in simple ratios by volume?',
    'What is the role of catalyst in a chemical reaction?',
    'Which type of bond is present in NaCl?',
  ],
  Biology: [
    'What is Plasma Membrane?',
    'What is Nomenclature?',
    'What is Autotrophic Nutrition?',
    'What is the significance of meiosis in reproduction?',
  ],
};

export default function AncestryPage() {
  const router = useRouter();

  const [subject, setSubject] = useState<Subject>('Physics');
  const [question, setQuestion] = useState('');
  const [questionOptions, setQuestionOptions] = useState<Record<string, string>>({});
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [chain, setChain] = useState<Concept[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [answer, setAnswer] = useState<string>('');
  const [studyPath, setStudyPath] = useState<string>('');
  const [fromCache, setFromCache] = useState(false);
  const [fromHeatmap, setFromHeatmap] = useState(false);

  // ── Guest state ──────────────────────────────────────────────────────────
  const [isGuest, setIsGuest] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [guestLimitReached, setGuestLimitReached] = useState(false);
  const [guestTracesLeft, setGuestTracesLeft] = useState(GUEST_ANCESTRY_LIMIT);

  useEffect(() => {
    const guest = isGuestSession();
    setIsGuest(guest);
    if (guest) {
      const count = getGuestAncestryCount();
      setGuestTracesLeft(Math.max(0, GUEST_ANCESTRY_LIMIT - count));
      setGuestLimitReached(count >= GUEST_ANCESTRY_LIMIT);
    }
  }, []);

  useEffect(() => {
    const q = sessionStorage.getItem('ancestry_question');
    const s = sessionStorage.getItem('ancestry_subject');
    const opts = sessionStorage.getItem('ancestry_options');
    const correct = sessionStorage.getItem('ancestry_correct');
    if (q) { setQuestion(q); setFromHeatmap(true); sessionStorage.removeItem('ancestry_question'); }
    if (s && ['Physics', 'Chemistry', 'Biology'].includes(s)) { setSubject(s as Subject); sessionStorage.removeItem('ancestry_subject'); }
    if (opts) { setQuestionOptions(JSON.parse(opts)); sessionStorage.removeItem('ancestry_options'); }
    if (correct) { setCorrectAnswer(correct); sessionStorage.removeItem('ancestry_correct'); }
  }, []);

  const handleSearch = async (q?: string, isHeatmap?: boolean) => {
    const queryText = q ?? question;
    if (!queryText.trim()) return;

    // ── Guest limit check ────────────────────────────────────────────────
    if (isGuest && hasReachedAncestryLimit()) {
      setGuestLimitReached(true);
      setShowNudge(true);
      return;
    }

    setQuestion(queryText);
    setIsLoading(true);
    setError(null);
    setChain([]);
    setStudyPath('');
    setFromCache(false);
    setHasSearched(true);
    const isFromHeatmap = isHeatmap ?? fromHeatmap;

    try {
      const res = await fetch('/api/ancestry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: queryText, subject,
          options: questionOptions, correctAnswer,
          keywords: extractKeywords(queryText),
          fromHeatmap: isFromHeatmap,
        }),
      });
      const data = await res.json();
      setChain(data.chain ?? []);
      setAnswer(data.answer ?? '');
      setStudyPath(data.studyPath ?? '');
      setFromCache(data.fromCache ?? false);
      if (data.error && !data.chain?.length) setError(data.error);
      if (!res.ok) throw new Error('Failed to fetch ancestry');

      // ── Increment guest count after successful trace ──────────────────
      if (isGuest) {
        const newCount = incrementGuestAncestryCount();
        const left = Math.max(0, GUEST_ANCESTRY_LIMIT - newCount);
        setGuestTracesLeft(left);
        if (left === 0) setGuestLimitReached(true);
      }
    } catch {
      setError('Could not identify concept. Try rephrasing your question.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (question && !hasSearched && fromHeatmap) handleSearch(question, true);
  }, [question, fromHeatmap]);

  const handleGuestSignUp = () => {
    router.push('/register');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      <style>{`
        @media (max-width: 768px) {
          .ancestry-main { padding-top: 68px !important; padding-bottom: 80px !important; padding-left: 16px !important; padding-right: 16px !important; }
        }
      `}</style>

      {showNudge && (
        <GuestNudgeModal
          trigger="ancestry"
          onSignUp={handleGuestSignUp}
          onDismiss={() => setShowNudge(false)}
        />
      )}

      <Sidebar currentPage="ancestry" subject={subject} selectedYears={[2024, 2025]}
        onPageChange={(page) => {
          if (page === 'heatmap') router.push('/heatmap');
          if (page === 'quiz') router.push('/quiz');
        }}
        onSubjectChange={(s) => {
          setSubject(s as Subject);
          setChain([]); setHasSearched(false); setError(null);
          setQuestionOptions({}); setCorrectAnswer('');
          setFromHeatmap(false); setFromCache(false);
        }}
        onYearsChange={() => {}}
      />

      <main style={{ flex: 1, padding: '32px', overflowY: 'auto', maxWidth: '760px' }} className="ancestry-main">

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#f9fafb', margin: 0 }}>
              🧬 NEET Concept Ancestry
            </h1>
            {fromCache && !isLoading && hasSearched && (
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: '#0c1a0c', color: '#4ade80', border: '1px solid #16a34a44' }}>
                ⚡ cached
              </span>
            )}
          </div>
          <p style={{ color: '#4b5563', fontSize: '13px', marginTop: 0 }}>
            Trace any NEET question back to its foundation
          </p>

          {/* Guest banner */}
          {isGuest && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1c1a00', border: '1px solid #ca8a0444', borderRadius: '10px', padding: '10px 14px', marginTop: '12px' }}>
              <span style={{ fontSize: '12px', color: '#fbbf24' }}>
                {guestLimitReached
                  ? '⚠️ You\'ve used all your free traces'
                  : `👀 Guest mode · ${guestTracesLeft} free trace${guestTracesLeft === 1 ? '' : 's'} left`}
              </span>
              <button onClick={() => router.push('/register')}
                style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', background: '#052e16', border: '1px solid #16a34a44', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Sign up free
              </button>
            </div>
          )}
        </div>

        {/* Sample questions */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 700 }}>Try a sample</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {SAMPLES[subject].map((sample, i) => (
              <button key={i} onClick={() => { setQuestionOptions({}); setCorrectAnswer(''); setFromHeatmap(false); handleSearch(sample, false); }}
                style={{ textAlign: 'left', fontSize: '12px', padding: '10px 12px', borderRadius: '10px', background: '#111', border: '1px solid #1e1e1e', color: '#9ca3af', cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'inherit', lineHeight: 1.4 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#161616'; (e.currentTarget as HTMLElement).style.color = '#d1d5db'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#111'; (e.currentTarget as HTMLElement).style.color = '#9ca3af'; }}>
                {sample.length > 55 ? sample.slice(0, 55) + '…' : sample}
              </button>
            ))}
          </div>
        </div>

        {/* Search box */}
        <div style={{ marginBottom: '28px' }}>
          <textarea value={question} onChange={(e) => { setQuestion(e.target.value); setFromHeatmap(false); }}
            placeholder={`Enter your NEET ${subject} question here...`} rows={3}
            style={{ width: '100%', background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '12px 16px', color: '#f9fafb', fontSize: '14px', resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }}
            onFocus={e => (e.target.style.borderColor = '#16a34a44')}
            onBlur={e => (e.target.style.borderColor = '#1e1e1e')}
          />

          {Object.keys(questionOptions).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', marginBottom: '8px' }}>
              {Object.entries(questionOptions).map(([num, text]) => {
                const isCorrect = String(num) === String(correctAnswer);
                return (
                  <div key={num} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', background: isCorrect ? '#052e16' : '#111', border: `1px solid ${isCorrect ? '#16a34a66' : '#1e1e1e'}`, color: isCorrect ? '#4ade80' : '#9ca3af' }}>
                    <span style={{ color: isCorrect ? '#16a34a' : '#374151', flexShrink: 0 }}>({num})</span>
                    <span style={{ flex: 1 }}>{text}</span>
                    {isCorrect && <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span>}
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={() => handleSearch()} disabled={isLoading || !question.trim() || guestLimitReached}
            style={{ marginTop: '8px', width: '100%', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, background: (isLoading || !question.trim() || guestLimitReached) ? '#1a1a1a' : '#052e16', color: (isLoading || !question.trim() || guestLimitReached) ? '#374151' : '#4ade80', border: `1px solid ${(isLoading || !question.trim() || guestLimitReached) ? '#1e1e1e' : '#16a34a44'}`, cursor: (isLoading || !question.trim() || guestLimitReached) ? 'not-allowed' : 'pointer', transition: 'all 0.12s', fontFamily: 'inherit' }}>
            {guestLimitReached ? '🔒 Sign up to trace more concepts' : isLoading ? 'Searching…' : '🔍 Find Concept Ancestry'}
          </button>
        </div>

        {/* Results */}
        {hasSearched && (
          <AncestryChain
            chain={chain}
            isLoading={isLoading}
            error={error}
            questionText={question}
            answer={answer}
            studyPath={studyPath}
            isGuest={isGuest}
            onGuestNudge={() => setShowNudge(true)}
          />
        )}
      </main>
    </div>
  );
}
