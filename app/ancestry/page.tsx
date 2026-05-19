'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Subject, Concept } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import AncestryChain from '@/components/AncestryChain';

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

// Extract meaningful keywords from question text
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the','a','an','is','are','was','of','in','to','and','or','that',
    'which','what','how','why','when','where','this','it','its','be',
    'been','has','have','not','no','for','by','on','at','as','with',
    'from','if','but','so','than','then','each','their','they','does',
    'do','did','will','would','can','could','should','may','might',
    'state','define','find','calculate','what','which','give','write',
  ]);

  const lower = text.toLowerCase();
  const base = lower
    .replace(/[?.!(),:;]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 12);

  const extra: string[] = [];

  // Detect relative motion: two moving objects mentioned
  const movingObjects = /bus|train|boat|swimmer|car|cyclist|scooter|girl|boy|man|woman|person|runner|walker|aircraft|plane|ship/g;
  const objectMatches = lower.match(movingObjects);
  if (objectMatches && objectMatches.length >= 2) {
    extra.push('relative velocity', 'relative motion', 'reference frame', 'observer');
  }

  // Detect projectile motion
  if (/projectile|thrown|launched|angle|range|horizontal|vertical/.test(lower)) {
    extra.push('projectile', 'projectile motion', 'trajectory');
  }

  // Detect collision / impulse
  if (/collide|collision|impulse|impact|crash|ball.*hit|hit.*ball/.test(lower)) {
    extra.push('impulse', 'collision', 'momentum conservation');
  }

  // Detect circular motion
  if (/circular|centripetal|revolve|rotate|angular|rpm|revolution/.test(lower)) {
    extra.push('circular motion', 'centripetal', 'angular velocity');
  }

  // Detect SHM / oscillation
  if (/oscillat|pendulum|spring|shm|simple harmonic|time period|frequency/.test(lower)) {
    extra.push('simple harmonic motion', 'oscillation', 'time period');
  }

  // Detect wave / sound
  if (/wave|frequency|wavelength|sound|doppler|interference|diffraction/.test(lower)) {
    extra.push('wave', 'frequency', 'wavelength');
  }

  // Detect optics
  if (/lens|mirror|refraction|reflection|focal|image|object distance/.test(lower)) {
    extra.push('lens', 'mirror', 'refraction', 'focal length');
  }

  return [...new Set([...base, ...extra])];
}

export default function AncestryPage() {
  const router = useRouter();

  const [subject, setSubject] = useState<Subject>('Physics');
  const [question, setQuestion] = useState('')
  const [questionOptions, setQuestionOptions] = useState<Record<string, string>>({})
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [chain, setChain] = useState<Concept[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [answer, setAnswer] = useState<string>('')

  useEffect(() => {
    const q = sessionStorage.getItem('ancestry_question');
    const s = sessionStorage.getItem('ancestry_subject');
    const opts = sessionStorage.getItem('ancestry_options');
    const correct = sessionStorage.getItem('ancestry_correct');
    if (q) { setQuestion(q); sessionStorage.removeItem('ancestry_question'); }
    if (s && ['Physics', 'Chemistry', 'Biology'].includes(s)) {
      setSubject(s as Subject); sessionStorage.removeItem('ancestry_subject');
    }
    if (opts) { setQuestionOptions(JSON.parse(opts)); sessionStorage.removeItem('ancestry_options'); }
    if (correct) { setCorrectAnswer(correct); sessionStorage.removeItem('ancestry_correct'); }
  }, []);

  const handleSearch = async (q?: string) => {
    const queryText = q ?? question;
    if (!queryText.trim()) return;
    setQuestion(queryText);
    setIsLoading(true);
    setError(null);
    setChain([]);
    setHasSearched(true);
    try {
      const keywords = extractKeywords(queryText);
      const res = await fetch('/api/ancestry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryText, subject, options: questionOptions, correctAnswer, keywords }),
      });
      const data = await res.json();
      setChain(data.chain ?? []);
      setAnswer(data.answer ?? '');
      if (!res.ok) throw new Error('Failed to fetch ancestry');
    } catch {
      setError('Could not identify concept. Try rephrasing your question.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (question && !hasSearched) handleSearch(question);
  }, [question]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      <Sidebar
        currentPage="ancestry"
        subject={subject}
        selectedYears={[2021, 2022, 2023, 2024, 2025]}
        onPageChange={(page) => {
          if (page === 'heatmap') router.push('/heatmap');
          if (page === 'concept-map') router.push('/concept-map');
        }}
        onSubjectChange={(s) => {
          setSubject(s);
          setChain([]);
          setHasSearched(false);
          setError(null);
          setQuestionOptions({});
          setCorrectAnswer('');
        }}
        onYearsChange={() => {}}
      />

      <main style={{ flex: 1, padding: '32px', overflowY: 'auto', maxWidth: '760px' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#f9fafb', margin: 0 }}>
            🧬 NEET Concept Ancestry
          </h1>
          <p style={{ color: '#4b5563', fontSize: '13px', marginTop: '6px' }}>
            Trace any NEET question back to its foundation
          </p>
        </div>

        {/* Sample questions */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 700 }}>
            Try a sample
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {SAMPLES[subject].map((sample, i) => (
              <button
                key={i}
                onClick={() => { setQuestionOptions({}); setCorrectAnswer(''); handleSearch(sample); }}
                style={{
                  textAlign: 'left', fontSize: '12px',
                  padding: '10px 12px', borderRadius: '10px',
                  background: '#111', border: '1px solid #1e1e1e',
                  color: '#9ca3af', cursor: 'pointer',
                  transition: 'all 0.12s', fontFamily: 'inherit',
                  lineHeight: 1.4,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = '#161616';
                  (e.currentTarget as HTMLElement).style.borderColor = '#2d2d2d';
                  (e.currentTarget as HTMLElement).style.color = '#d1d5db';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = '#111';
                  (e.currentTarget as HTMLElement).style.borderColor = '#1e1e1e';
                  (e.currentTarget as HTMLElement).style.color = '#9ca3af';
                }}
              >
                {sample.length > 55 ? sample.slice(0, 55) + '…' : sample}
              </button>
            ))}
          </div>
        </div>

        {/* Search box */}
        <div style={{ marginBottom: '28px' }}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`Enter your NEET ${subject} question here...`}
            rows={3}
            style={{
              width: '100%', background: '#111', border: '1px solid #1e1e1e',
              borderRadius: '12px', padding: '12px 16px',
              color: '#f9fafb', fontSize: '14px',
              resize: 'none', outline: 'none',
              fontFamily: 'inherit', lineHeight: 1.5,
              boxSizing: 'border-box',
              transition: 'border-color 0.12s',
            }}
            onFocus={e => (e.target.style.borderColor = '#16a34a44')}
            onBlur={e => (e.target.style.borderColor = '#1e1e1e')}
          />

          {/* Options if available */}
          {Object.keys(questionOptions).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', marginBottom: '8px' }}>
              {Object.entries(questionOptions).map(([num, text]) => {
                const isCorrect = String(num) === String(correctAnswer);
                return (
                  <div
                    key={num}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px',
                      padding: '12px 16px', borderRadius: '10px', fontSize: '13px',
                      background: isCorrect ? '#052e16' : '#111',
                      border: `1px solid ${isCorrect ? '#16a34a66' : '#1e1e1e'}`,
                      color: isCorrect ? '#4ade80' : '#9ca3af',
                    }}
                  >
                    <span style={{ color: isCorrect ? '#16a34a' : '#374151', flexShrink: 0 }}>({num})</span>
                    <span style={{ flex: 1 }}>{text}</span>
                    {isCorrect && <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span>}
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={() => handleSearch()}
            disabled={isLoading || !question.trim()}
            style={{
              marginTop: '8px', width: '100%',
              padding: '12px', borderRadius: '12px',
              fontSize: '13px', fontWeight: 700,
              background: isLoading || !question.trim() ? '#1a1a1a' : '#052e16',
              color: isLoading || !question.trim() ? '#374151' : '#4ade80',
              border: `1px solid ${isLoading || !question.trim() ? '#1e1e1e' : '#16a34a44'}`,
              cursor: isLoading || !question.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.12s', fontFamily: 'inherit',
            }}
          >
            {isLoading ? 'Searching…' : '🔍 Find Concept Ancestry'}
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
          />
        )}
      </main>
    </div>
  );
}
