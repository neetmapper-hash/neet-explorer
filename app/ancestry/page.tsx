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
    'Which enzyme joins DNA fragments in recombinant DNA technology?',
    'What is the role of ribosome in protein synthesis?',
    'How does transpiration help in ascent of sap?',
    'What is the significance of meiosis in reproduction?',
  ],
};

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

  // Pick up question passed from heatmap page
  useEffect(() => {
    const q = sessionStorage.getItem('ancestry_question');
    const s = sessionStorage.getItem('ancestry_subject');
    const opts = sessionStorage.getItem('ancestry_options');
    const correct = sessionStorage.getItem('ancestry_correct');
    if (q) {
      setQuestion(q);
      sessionStorage.removeItem('ancestry_question');
    }
    if (s && ['Physics', 'Chemistry', 'Biology'].includes(s)) {
      setSubject(s as Subject);
      sessionStorage.removeItem('ancestry_subject');
    }
    if (opts) {
      setQuestionOptions(JSON.parse(opts));
      sessionStorage.removeItem('ancestry_options');
    }
    if (correct) {
      setCorrectAnswer(correct);
      sessionStorage.removeItem('ancestry_correct');
    }
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
      const res = await fetch('/api/ancestry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryText, subject }),
      });
      const data = await res.json();
      setChain(data.chain ?? [])
      setAnswer(data.answer ?? '')

      if (!res.ok) {
        throw new Error('Failed to fetch ancestry');
      }
    } catch (err) {
      setError('Could not identify concept. Try rephrasing your question.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-search if question came from heatmap
  useEffect(() => {
    if (question && !hasSearched) {
      handleSearch(question);
    }
  }, [question]);

  return (
    <div className="flex min-h-screen bg-[#0f0f0f]">
      <Sidebar
        currentPage="ancestry"
        subject={subject}
        selectedYears={[2021, 2022, 2023, 2024, 2025]}
        onPageChange={(page) => {
          if (page === 'heatmap') router.push('/heatmap');
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

      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            🧬 NEET Concept Ancestry
          </h1>
          <p className="text-[#888] text-sm mt-1">
            Trace any NEET question back to its foundation
          </p>
        </div>

        {/* Sample questions */}
        <div className="mb-4">
          <div className="text-xs text-[#555] uppercase tracking-wider mb-2">
            Try a sample
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SAMPLES[subject].map((sample, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuestionOptions({});
                  setCorrectAnswer('');
                  handleSearch(sample);
                }}
                className="text-left text-xs px-3 py-2 rounded-lg bg-[#1a1a1a] text-[#888] hover:text-white hover:bg-[#222] transition-colors"
              >
                {sample.length > 55 ? sample.slice(0, 55) + '…' : sample}
              </button>
            ))}
          </div>
        </div>

        {/* Search box */}
        <div className="mb-6">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`Enter your NEET ${subject} question here...`}
            rows={3}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-[#f0f0f0] text-sm placeholder-[#444] resize-none focus:outline-none focus:border-[#ff4b4b] transition-colors"
          />

          {/* Options if available */}
          {Object.keys(questionOptions).length > 0 && (
            <div className="flex flex-col gap-2 mt-3 mb-2">
              {Object.entries(questionOptions).map(([num, text]) => {
                const isCorrect = String(num) === String(correctAnswer)
                return (
                  <div
                    key={num}
                    className="flex items-start gap-3 px-4 py-3 rounded-xl border text-sm"
                    style={{
                      background: isCorrect ? '#1a4a1a' : '#1e1e1e',
                      borderColor: isCorrect ? '#2ca02c' : '#2a2a2a',
                      color: '#f0f0f0',
                    }}
                  >
                    <span className="text-[#888] shrink-0">({num})</span>
                    <span className="flex-1">{text}</span>
                    {isCorrect && <span className="text-green-400 shrink-0">✓</span>}
                  </div>
                )
              })}
            </div>
          )}

          <button
            onClick={() => handleSearch()}
            disabled={isLoading || !question.trim()}
            className="mt-2 w-full bg-[#ff4b4b] hover:bg-[#ff3333] disabled:bg-[#333] disabled:text-[#666] text-white font-semibold py-3 rounded-xl transition-colors text-sm"
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
