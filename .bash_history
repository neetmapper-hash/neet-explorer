rm -rf .git
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/neetmapper-hash/neet-explorer.git
git push -u origin main --force
rm -rf .git
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/neetmapper-hash/neet-explorer.git
git push -u origin main --force
cd ~/
python3 << 'EOF'
with open('app/api/ancestry/route.ts', 'r') as f:
    content = f.read()

old = """const rawChain = traverseAncestry(conceptId, lookup)

// Sort by class number descending: 12 → 11 → 10 → 9
// Extract class number from concept ID e.g. bio_c12_ch5_c1 → 12
const getClass = (id: string) => {
  try { return parseInt(id.split('_')[1].replace('c', '')) } 
  catch { return 0 }
}
const chain = rawChain.sort((a, b) => getClass(b.id) - getClass(a.id))"""

new = """const rawChain = traverseAncestry(conceptId, lookup)

// Deduplicate — keep only one concept per chapter
const seenChapters = new Set<string>()
const dedupedChain = rawChain.filter(concept => {
  const parts = concept.id.split('_')
  const key = parts[1] + '_' + parts[2]
  if (seenChapters.has(key)) return false
  seenChapters.add(key)
  return true
})

// Sort by class number descending: 12 → 11 → 10 → 9
const getClass = (id: string) => {
  try { return parseInt(id.split('_')[1].replace('c', '')) }
  catch { return 0 }
}
const chain = dedupedChain.sort((a, b) => getClass(b.id) - getClass(a.id))"""

if old in content:
    content = content.replace(old, new)
    with open('app/api/ancestry/route.ts', 'w') as f:
        f.write(content)
    print("Fixed!")
else:
    print("Pattern not found - paste current block")
EOF

git add .
git commit -m "deduplicate and sort ancestry chain"
git push origin main
python3 << 'EOF'
with open('app/api/ancestry/route.ts', 'r') as f:
    content = f.read()

old = "const chain = dedupedChain.sort((a, b) => getClass(b.id) - getClass(a.id))"
new = "const chain = [...dedupedChain].sort((a, b) => getClass(b.id) - getClass(a.id))"

if old in content:
    content = content.replace(old, new)
    with open('app/api/ancestry/route.ts', 'w') as f:
        f.write(content)
    print("Fixed!")
else:
    print("Not found - checking current sort line:")
    for line in content.split('\n'):
        if 'sort' in line and 'chain' in line.lower():
            print(repr(line))
EOF

python3 << 'EOF'
with open('app/api/ancestry/route.ts', 'r') as f:
    content = f.read()

old = "const chain = dedupedChain.sort((a, b) => getClass(b.id) - getClass(a.id))"
new = "const chain = [...dedupedChain].sort((a, b) => getClass(b.id) - getClass(a.id))"

if old in content:
    content = content.replace(old, new)
    with open('app/api/ancestry/route.ts', 'w') as f:
        f.write(content)
    print("Fixed!")
else:
    print("Not found - checking current sort line:")
    for line in content.split('\n'):
        if 'sort' in line and 'chain' in line.lower():
            print(repr(line))
EOF

git add .
git commit -m "fix ancestry sort order"
git push origin main
python3 << 'EOF'
with open('components/AncestryChain.tsx', 'r') as f:
    content = f.read()

old = "{[...chain].reverse().map((concept, idx) => {"
new = """{[...chain].sort((a, b) => {
  const getClass = (id: string) => {
    try { return parseInt(id.split('_')[1].replace('c', '')) }
    catch { return 0 }
  }
  return getClass(b.id) - getClass(a.id)
}).map((concept, idx) => {"""

if old in content:
    content = content.replace(old, new)
    with open('components/AncestryChain.tsx', 'w') as f:
        f.write(content)
    print("Fixed!")
else:
    print("Pattern not found")
EOF

git add .
git commit -m "fix ancestry display order"
git push origin main
python3 << 'EOF'
with open('components/Sidebar.tsx', 'r') as f:
    content = f.read()

old = "const subjects: Subject[] = ['Physics', 'Chemistry', 'Biology']"
new = "const subjects: Subject[] = ['Biology', 'Physics', 'Chemistry']"

if old in content:
    content = content.replace(old, new)
    with open('components/Sidebar.tsx', 'w') as f:
        f.write(content)
    print("Fixed!")
else:
    print("Pattern not found")
EOF

python3 << 'EOF'
with open('app/ancestry/page.tsx', 'r') as f:
    content = f.read()

old = "const [question, setQuestion] = useState('')"
new = """const [question, setQuestion] = useState('')
  const [questionOptions, setQuestionOptions] = useState<Record<string, string>>({})
  const [correctAnswer, setCorrectAnswer] = useState('')"""

content = content.replace(old, new)

old = """    const q = sessionStorage.getItem('ancestry_question')
    const s = sessionStorage.getItem('ancestry_subject')
    if (q) {
      setQuestion(q)
      sessionStorage.removeItem('ancestry_question')
    }
    if (s && ['Physics', 'Chemistry', 'Biology'].includes(s)) {
      setSubject(s as Subject)
      sessionStorage.removeItem('ancestry_subject')
    }"""

new = """    const q = sessionStorage.getItem('ancestry_question')
    const s = sessionStorage.getItem('ancestry_subject')
    const opts = sessionStorage.getItem('ancestry_options')
    const ans = sessionStorage.getItem('ancestry_correct')
    if (q) {
      setQuestion(q)
      sessionStorage.removeItem('ancestry_question')
    }
    if (s && ['Physics', 'Chemistry', 'Biology'].includes(s)) {
      setSubject(s as Subject)
      sessionStorage.removeItem('ancestry_subject')
    }
    if (opts) {
      setQuestionOptions(JSON.parse(opts))
      sessionStorage.removeItem('ancestry_options')
    }
    if (ans) {
      setCorrectAnswer(ans)
      sessionStorage.removeItem('ancestry_correct')
    }"""

content = content.replace(old, new)

with open('app/ancestry/page.tsx', 'w') as f:
    f.write(content)
print("Done")
EOF

python3 << 'EOF'
with open('app/ancestry/page.tsx', 'r') as f:
    content = f.read()

old = """        {/* Results */}
        {hasSearched && ("""

new = """        {/* Options if available */}
        {Object.keys(questionOptions).length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
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

        {/* Results */}
        {hasSearched && ("""

if old in content:
    content = content.replace(old, new)
    with open('app/ancestry/page.tsx', 'w') as f:
        f.write(content)
    print("Fixed!")
else:
    print("Pattern not found")
EOF

python3 << 'EOF'
with open('app/heatmap/page.tsx', 'r') as f:
    content = f.read()

old = """  const handleFindAncestry = (questionText: string) => {
    sessionStorage.setItem('ancestry_question', questionText)
    sessionStorage.setItem('ancestry_subject', subject)
    router.push('/ancestry')
  }"""

new = """  const handleFindAncestry = (questionText: string) => {
    sessionStorage.setItem('ancestry_question', questionText)
    sessionStorage.setItem('ancestry_subject', subject)
    if (selectedQuestion) {
      sessionStorage.setItem('ancestry_options', JSON.stringify(selectedQuestion.options))
      sessionStorage.setItem('ancestry_correct', selectedQuestion.correct_answer)
    }
    router.push('/ancestry')
  }"""

if old in content:
    content = content.replace(old, new)
    with open('app/heatmap/page.tsx', 'w') as f:
        f.write(content)
    print("Fixed!")
else:
    print("Pattern not found")
EOF

grep -n "handleFindAncestry" app/heatmap/page.tsx
sed -n '58,67p' app/heatmap/page.tsx
python3 << 'EOF'
with open('app/heatmap/page.tsx', 'r') as f:
    content = f.read()

old = """  const handleFindAncestry = (questionText: string) => {
    sessionStorage.setItem('ancestry_question', questionText);
    sessionStorage.setItem('ancestry_subject', subject);
    router.push('/ancestry');
  };"""

new = """  const handleFindAncestry = (questionText: string) => {
    sessionStorage.setItem('ancestry_question', questionText);
    sessionStorage.setItem('ancestry_subject', subject);
    if (selectedQuestion) {
      sessionStorage.setItem('ancestry_options', JSON.stringify(selectedQuestion.options));
      sessionStorage.setItem('ancestry_correct', selectedQuestion.correct_answer);
    }
    router.push('/ancestry');
  };"""

if old in content:
    content = content.replace(old, new)
    with open('app/heatmap/page.tsx', 'w') as f:
        f.write(content)
    print("Fixed!")
else:
    print("Pattern not found")
EOF

git add .
git commit -m "show question options on ancestry page"
git push origin main
cd ~/
cat > app/ancestry/page.tsx << 'EOF'
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
    
    console.log('Searching for:', queryText, 'subject:', subject);

    try {
      const res = await fetch('/api/ancestry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryText, subject }),
      });
      console.log('API response status:', res.status);
      const data = await res.json();
      console.log('API response data:', data);
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
EOF

cd ~/
cat > app/ancestry/page.tsx << 'EOF'
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
    
    console.log('Searching for:', queryText, 'subject:', subject);

    try {
      const res = await fetch('/api/ancestry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryText, subject }),
      });
      console.log('API response status:', res.status);
      const data = await res.json();
      console.log('API response data:', data);
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
EOF

cd ~/
sed -i "s/    if (s && \['Physics', 'Chemistry', 'Biology'\].includes(s)) {/    const opts = sessionStorage.getItem('ancestry_options');\n    const correct = sessionStorage.getItem('ancestry_correct');\n    if (s \&\& ['Physics', 'Chemistry', 'Biology'].includes(s)) {/" app/ancestry/page.tsx
sed -i "s/      sessionStorage.removeItem('ancestry_subject');/      sessionStorage.removeItem('ancestry_subject');\n    }\n    if (opts) {\n      setQuestionOptions(JSON.parse(opts));\n      sessionStorage.removeItem('ancestry_options');\n    }\n    if (correct) {\n      setCorrectAnswer(correct);\n      sessionStorage.removeItem('ancestry_correct');\n    }/" app/ancestry/page.tsx
sed -i "s|          <button\n            onClick={() => handleSearch()}|          {Object.keys(questionOptions).length > 0 \&\& (\n            <div className=\"flex flex-col gap-2 mt-3 mb-2\">\n              {Object.entries(questionOptions).map(([num, text]) => {\n                const isCorrect = String(num) === String(correctAnswer)\n                return (\n                  <div key={num} className=\"flex items-start gap-3 px-4 py-3 rounded-xl border text-sm\" style={{ background: isCorrect ? '#1a4a1a' : '#1e1e1e', borderColor: isCorrect ? '#2ca02c' : '#2a2a2a', color: '#f0f0f0' }}>\n                    <span className=\"text-[#888] shrink-0\">({num})</span>\n                    <span className=\"flex-1\">{text}</span>\n                    {isCorrect \&\& <span className=\"text-green-400 shrink-0\">✓</span>}\n                  </div>\n                )\n              })}\n            </div>\n          )}\n\n          <button\n            onClick={() => handleSearch()}|" app/ancestry/page.tsx
python3 << 'EOF'
with open('app/ancestry/page.tsx', 'r') as f:
    content = f.read()

old = '''          <button
            onClick={() => handleSearch()}
            disabled={isLoading || !question.trim()}
            className="mt-2 w-full bg-[#ff4b4b] hover:bg-[#ff3333] disabled:bg-[#333] disabled:text-[#666] text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {isLoading ? 'Searching…' : '🔍 Find Concept Ancestry'}
          </button>'''

new = '''          {Object.keys(questionOptions).length > 0 && (
            <div className="flex flex-col gap-2 mt-3 mb-2">
              {Object.entries(questionOptions).map(([num, text]) => {
                const isCorrect = String(num) === String(correctAnswer)
                return (
                  <div key={num} className="flex items-start gap-3 px-4 py-3 rounded-xl border text-sm" style={{ background: isCorrect ? '#1a4a1a' : '#1e1e1e', borderColor: isCorrect ? '#2ca02c' : '#2a2a2a', color: '#f0f0f0' }}>
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
          </button>'''

content = content.replace(old, new)
with open('app/ancestry/page.tsx', 'w') as f:
    f.write(content)
print("Done")
EOF

cat -n app/ancestry/page.tsx
python3 << 'EOF'
with open('app/ancestry/page.tsx', 'r') as f:
    content = f.read()

# Fix the broken useEffect
old = '''  // Pick up question passed from heatmap page
  useEffect(() => {
    const q = sessionStorage.getItem('ancestry_question');
    const s = sessionStorage.getItem('ancestry_subject');
    const opts = sessionStorage.getItem('ancestry_options');
    const correct = sessionStorage.getItem('ancestry_correct');
    if (q) {
      setQuestion(q);
      sessionStorage.removeItem('ancestry_question');
    }
    const opts = sessionStorage.getItem('ancestry_options');
    const correct = sessionStorage.getItem('ancestry_correct');
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
    }
    if (opts) {
      setQuestionOptions(JSON.parse(opts));
      sessionStorage.removeItem('ancestry_options');
    }
    if (correct) {
      setCorrectAnswer(correct);
      sessionStorage.removeItem('ancestry_correct');
    }
  }, []);'''

new = '''  // Pick up question passed from heatmap page
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
  }, []);'''

content = content.replace(old, new)

# Remove the duplicate options block (the second one, inline style version)
old2 = '''
            {Object.keys(questionOptions).length > 0 && (
              <div className="flex flex-col gap-2 mt-3 mb-2">
                {Object.entries(questionOptions).map(([num, text]) => {
                  const isCorrect = String(num) === String(correctAnswer)
                  return (
                    <div key={num} className="flex items-start gap-3 px-4 py-3 rounded-xl border text-sm" style={{ background: isCorrect ? '#1a4a1a' : '#1e1e1e', borderColor: isCorrect ? '#2ca02c' : '#2a2a2a', color: '#f0f0f0' }}>
                      <span className="text-[#888] shrink-0">({num})</span>
                      <span className="flex-1">{text}</span>
                      {isCorrect && <span className="text-green-400 shrink-0">✓</span>}
                    </div>
                  )
                })}
              </div>
            )}'''

content = content.replace(old2, '')

with open('app/ancestry/page.tsx', 'w') as f:
    f.write(content)
print("Done")
EOF

cat -n app/ancestry/page.tsx | sed -n '40,80p'
grep -n "questionOptions\|Find Concept Ancestry\|\/\/ Options" app/ancestry/page.tsx
python3 << 'EOF'
with open('app/ancestry/page.tsx', 'r') as f:
    content = f.read()

old = '''
            {Object.keys(questionOptions).length > 0 && (
              <div className="flex flex-col gap-2 mt-3 mb-2">
                {Object.entries(questionOptions).map(([num, text]) => {
                  const isCorrect = String(num) === String(correctAnswer)
                  return (
                    <div key={num} className="flex items-start gap-3 px-4 py-3 rounded-xl border text-sm" style={{ background: isCorrect ? '#1a4a1a' : '#1e1e1e', borderColor: isCorrect ? '#2ca02c' : '#2a2a2a', color: '#f0f0f0' }}>
                      <span className="text-[#888] shrink-0">({num})</span>
                      <span className="flex-1">{text}</span>
                      {isCorrect && <span className="text-green-400 shrink-0">✓</span>}
                    </div>
                  )
                })}
              </div>
            )}'''

content = content.replace(old, '', 1)  # replace only first occurrence

with open('app/ancestry/page.tsx', 'w') as f:
    f.write(content)
print("Done")
EOF

grep -n "questionOptions\|Find Concept Ancestry" app/ancestry/page.tsx
cat app/ancestry/page.tsx
cat > app/ancestry/page.tsx << 'EOF'
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
EOF

grep -n "questionOptions\|Find Concept Ancestry" app/ancestry/page.tsx
git add .
git commit -m "fix: show question options with correct answer on ancestry page"
git push origin main
cat -n ~/app/heatmap/page.tsx | head -20
git add .
git commit -m "feat: split dashboard heatmap UI"
git push origin main
# Check how data is keyed in the JSON
cat ~/public/heatmap_data.json | python3 -c "
import json,sys
d = json.load(sys.stdin)
print('Top level keys:', list(d.keys())[:10])
for subject in d:
    chapters = list(d[subject].keys())[:3]
    print(f'{subject}: {chapters}')
"
# Check if Gravitation appears in multiple subjects
cat ~/public/heatmap_data.json | python3 -c "
import json,sys
d = json.load(sys.stdin)
for subject in d:
    for chapter in d[subject]:
        if 'ravit' in chapter:
            print(f'{subject} -> {chapter}: {d[subject][chapter].get(\"total_count\")}')
"
cat ~/public/heatmap_data.json | python3 -c "
import json,sys
d = json.load(sys.stdin)
for subject in d:
    for key in d[subject]:
        chapter = d[subject][key]
        name = chapter.get('chapter_name','')
        if 'ravit' in name.lower():
            print(f'{subject} -> {key} -> {name}: total={chapter.get(\"total_count\")}')
"
cat ~/public/heatmap_data.json | python3 -c "
import json,sys
d = json.load(sys.stdin)
all_keys = {}
for subject in d:
    for key in d[subject]:
        all_keys.setdefault(key, []).append(subject)
dupes = {k:v for k,v in all_keys.items() if len(v)>1}
print('Shared keys across subjects:', dupes)
"
cat ~/public/heatmap_data.json | python3 -c "
import json,sys
d = json.load(sys.stdin)
for subject in d:
    if '11_8' in d[subject]:
        ch = d[subject]['11_8']
        print(f'{subject} -> 11_8 -> {ch.get(\"chapter_name\")} total={ch.get(\"total_count\")}')
"
grep -n "useEffect\|setSelectedChapter\|subject" ~/app/heatmap/page.tsx | head -20
python3 << 'EOF'
with open('app/heatmap/page.tsx', 'r') as f:
    content = f.read()

# Fix 1: default subject to Biology
content = content.replace(
    "const [subject, setSubject] = useState<Subject>('Physics')",
    "const [subject, setSubject] = useState<Subject>('Biology')"
)

# Fix 2: namespace chapter keys in left panel with subject
content = content.replace(
    'key={chapter.chapter_name}',
    'key={`${subject}-${chapter.chapter_name}`}'
)

# Fix 3: force right panel to remount on subject change
content = content.replace(
    '<div className="flex-1 overflow-y-auto bg-[#0d0d0d]">',
    '<div key={subject} className="flex-1 overflow-y-auto bg-[#0d0d0d]">'
)

# Fix 4: namespace question keys
content = content.replace(
    'key={qi}',
    'key={`${subject}-${qi}`}'
)

with open('app/heatmap/page.tsx', 'w') as f:
    f.write(content)
print('Done')
EOF

grep -n "useState.*Subject\|key={\`\${subject}" ~/app/heatmap/page.tsx
git add .
git commit -m "fix: Biology as default subject, namespace keys to prevent cross-subject bleeding"
git push origin main
cat ~/app/heatmap/page.tsx
python3 << 'EOF'
with open('app/heatmap/page.tsx', 'r') as f:
    content = f.read()

# Fix 1: add activeYearFilter state after expandedQuestion state
content = content.replace(
    '  const [expandedQuestion, setExpandedQuestion] = useState<Question | null>(null);',
    '  const [expandedQuestion, setExpandedQuestion] = useState<Question | null>(null);\n  const [activeYearFilter, setActiveYearFilter] = useState<number | null>(null);'
)

# Fix 2: reset activeYearFilter when chapter changes
content = content.replace(
    '      setSelectedChapter(null);\n    setExpandedQuestion(null);',
    '      setSelectedChapter(null);\n    setExpandedQuestion(null);\n    setActiveYearFilter(null);'
)

# Fix 3: filter questions by activeYearFilter too
content = content.replace(
    '  const filteredQuestions: Question[] = selectedChapter\n    ? (selectedChapter.questions ?? []).filter(\n        (q) => !q.year || selectedYears.includes(q.year)\n      )\n    : [];',
    '  const filteredQuestions: Question[] = selectedChapter\n    ? (selectedChapter.questions ?? []).filter(\n        (q) => (!q.year || selectedYears.includes(q.year)) &&\n               (activeYearFilter === null || q.year === activeYearFilter)\n      )\n    : [];'
)

# Fix 4: replace year cards div with clickable version + Select All
old_year_cards = '''                      <div className="flex flex-wrap gap-2">
                        {yearCards.map(({ year, count }) => (
                          <div
                            key={year}
                            className="flex flex-col items-center px-4 py-3 rounded-lg border"
                            style={{
                              background: intensityColor(count, Math.max(...yearCards.map(y => y.count))),
                              borderColor: \'#1e1e1e\',
                              minWidth: \'60px\',
                            }}
                          >
                            <span className="text-[9px] font-mono text-[#555] mb-1">{year}</span>
                            <span
                              className="text-lg font-bold font-mono"
                              style={{ color: intensityText(count, Math.max(...yearCards.map(y => y.count))) }}
                            >
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>'''

new_year_cards = '''                      <div className="flex flex-wrap gap-2">
                        {/* Select All pill */}
                        <div
                          onClick={() => setActiveYearFilter(null)}
                          className="flex flex-col items-center px-3 py-2 rounded-lg border cursor-pointer transition-all"
                          style={{
                            background: activeYearFilter === null ? \'#ff4b4b22\' : \'#141414\',
                            borderColor: activeYearFilter === null ? \'#ff4b4b55\' : \'#1e1e1e\',
                            minWidth: \'52px\',
                          }}
                        >
                          <span className="text-[9px] font-mono mb-1" style={{ color: activeYearFilter === null ? \'#ff6b6b\' : \'#333\' }}>ALL</span>
                          <span className="text-sm font-bold font-mono" style={{ color: activeYearFilter === null ? \'#ff4b4b\' : \'#444\' }}>
                            {yearCards.reduce((s, y) => s + y.count, 0)}
                          </span>
                        </div>
                        {yearCards.map(({ year, count }) => {
                          const isActive = activeYearFilter === year;
                          const maxYr = Math.max(...yearCards.map(y => y.count));
                          return (
                            <div
                              key={year}
                              onClick={() => setActiveYearFilter(isActive ? null : year)}
                              className="flex flex-col items-center px-4 py-3 rounded-lg border cursor-pointer transition-all"
                              style={{
                                background: isActive ? intensityColor(count, maxYr) : \'#111\',
                                borderColor: isActive ? \'#ff4b4b55\' : \'#1e1e1e\',
                                minWidth: \'60px\',
                                opacity: activeYearFilter !== null && !isActive ? 0.4 : 1,
                              }}
                            >
                              <span className="text-[9px] font-mono text-[#555] mb-1">{year}</span>
                              <span
                                className="text-lg font-bold font-mono"
                                style={{ color: isActive ? intensityText(count, maxYr) : \'#444\' }}
                              >
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>'''

content = content.replace(old_year_cards, new_year_cards)

with open('app/heatmap/page.tsx', 'w') as f:
    f.write(content)
print('Done')
EOF

grep -n "activeYearFilter" ~/app/heatmap/page.tsx
git add .
git commit -m "feat: clickable year filter cards with Select All on heatmap"
git push origin main
# Check what a question with a drawing looks like in the data
cat ~/public/heatmap_data.json | python3 -c "
import json,sys
d = json.load(sys.stdin)
for subject in d:
    for key in d[subject]:
        qs = d[subject][key].get('questions', [])
        for q in qs:
            text = q.get('question','')
            if 'figure' in text.lower() or 'diagram' in text.lower() or 'shown' in text.lower():
                print(subject, '-', text[:120])
                print()
                break
" 2>/dev/null | head -60
find . -type f -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" | grep -v node_modules | grep -v .next | sort
cat app/globals.css
grep -r "bg-\|text-\|border-" components/ app/heatmap/page.tsx | grep -v "node_modules" | head -50
cat >> app/globals.css << 'EOF'

/* ── NEET Explorer: High Contrast Theme Override ── */

/* Backgrounds */
.bg-\[\#111\], .bg-\[\#1a1a1a\], .bg-\[\#1e1e1e\], .bg-\[\#222\] {
  background-color: #13131f !important;
}
.bg-\[\#1a1a2e\] {
  background-color: #0f1a2e !important;
}

/* Dim text → bright */
.text-\[\#555\], .text-\[\#444\], .text-\[\#666\] {
  color: #7a7a9a !important;
}
.text-\[\#888\] {
  color: #a0a0c0 !important;
}
.text-\[\#aaa\], .text-\[\#ccc\], .text-\[\#ddd\] {
  color: #d0d0f0 !important;
}

/* Borders */
.border-\[\#222\], .border-\[\#333\] {
  border-color: #2a2a3f !important;
}

/* Hover states */
.hover\:bg-\[\#1a1a1a\]:hover, .hover\:bg-\[\#1e1e1e\]:hover, .hover\:bg-\[\#222\]:hover {
  background-color: #1e1e30 !important;
}

/* Active/selected — red accent → teal */
.bg-\[\#ff4b4b22\] { background-color: rgba(0, 230, 180, 0.12) !important; }
.text-\[\#ff4b4b\]  { color: #00E6B4 !important; }

/* Body base */
body {
  background-color: #0a0a0f !important;
  color: #eeeeff !important;
}
EOF

cat >> app/globals.css << 'EOF'

/* ── NEET Explorer: High Contrast Theme Override ── */

/* Backgrounds */
.bg-\[\#111\], .bg-\[\#1a1a1a\], .bg-\[\#1e1e1e\], .bg-\[\#222\] {
  background-color: #13131f !important;
}
.bg-\[\#1a1a2e\] {
  background-color: #0f1a2e !important;
}

/* Dim text → bright */
.text-\[\#555\], .text-\[\#444\], .text-\[\#666\] {
  color: #7a7a9a !important;
}
.text-\[\#888\] {
  color: #a0a0c0 !important;
}
.text-\[\#aaa\], .text-\[\#ccc\], .text-\[\#ddd\] {
  color: #d0d0f0 !important;
}

/* Borders */
.border-\[\#222\], .border-\[\#333\] {
  border-color: #2a2a3f !important;
}

/* Hover states */
.hover\:bg-\[\#1a1a1a\]:hover, .hover\:bg-\[\#1e1e1e\]:hover, .hover\:bg-\[\#222\]:hover {
  background-color: #1e1e30 !important;
}

/* Active/selected — red accent → teal */
.bg-\[\#ff4b4b22\] { background-color: rgba(0, 230, 180, 0.12) !important; }
.text-\[\#ff4b4b\]  { color: #00E6B4 !important; }

/* Body base */
body {
  background-color: #0a0a0f !important;
  color: #eeeeff !important;
}
EOF

git add app/globals.css
git commit -m "fix: improve contrast and readability"
git push
git add components/
git commit -m "fix: high contrast readable UI theme"
git push
git add app/api/ancestry/route.ts app/ancestry/page.tsx
git commit -m "fix: pass correct answer to Groq so explanation matches actual answer"
git push
git add lib/topics.ts components/HeatmapGrid.tsx
git commit -m "feat: add topic grouping toggle to heatmap"
git push
grep -r "HeatmapGrid" app/ components/ --include="*.tsx" --include="*.ts"
ls lib/
data.ts  topics.ts  types.ts
npm run build 2>&1 | head -50
npm run dev 2>&1 | head -30
node -e "require('./lib/topics.ts')" 2>&1
head -20 components/HeatmapGrid.tsx
head -5 lib/topics.ts
sed -i "s/export type Subject = 'Biology' | 'Physics' | 'Chemistry';/import type { Subject } from '@\/lib\/types';/" lib/topics.ts
head -5 lib/topics.ts
git add lib/topics.ts components/HeatmapGrid.tsx
git commit -m "feat: add topic grouping toggle to heatmap"
git push
grep -n "HeatmapGrid" app/heatmap/page.tsx
git add app/heatmap/page.tsx lib/topics.ts
git commit -m "feat: add topic grouping toggle to heatmap"
git push
python3 -c "
import json
with open('public/heatmap_data.json') as f:
    data = json.load(f)
for subject in ['Biology', 'Physics', 'Chemistry']:
    print(f'\n=== {subject} ===')
    for ch in data.get(subject, {}).values():
        print(ch.get('chapter_name', ''))
"
git add lib/topics.ts
git commit -m "fix: correct chapter names in topic groupings"
git push
mkdir -p app/api/explain
git add components/AncestryChain.tsx app/api/explain/route.ts
git commit -m "feat: add explain concept popup to ancestry chain"
git push
git add components/AncestryChain.tsx app/api/explain/route.ts
git commit -m "feat: add explain concept popup to ancestry chain"
git push
git add app/api/ancestry/route.ts
git commit -m "feat: auto-detect subject from question using LLM"
git push
npm i -g vercel
vercel logs --follow
git add app/api/ancestry/route.ts
git commit -m "fix: two-step concept identification + model fallback to fix rate limits"
git push
git add app/api/ancestry/route.ts
git commit -m "fix: answer without options gives direct explanation not fake options"
git push
git config --global credential.helper store
python3 -c "
import json
with open('public/biology_concepts.json') as f:
    data = json.load(f)

all_concepts = []
for cls in data['classes'].values():
    for ch in cls['chapters'].values():
        for c in ch['concepts']:
            all_concepts.append(c)

matches = [c for c in all_concepts if 
    'immun' in c['concept_title'].lower() or 
    'immun' in c['description'].lower()]
for m in matches:
    print(f'{m[\"id\"]}: {m[\"concept_title\"]}')
"
python3 -c "
import json
with open('public/biology_concepts.json') as f:
    data = json.load(f)

for cls_key, cls_val in data['classes'].items():
    for ch_key, ch_val in cls_val['chapters'].items():
        if 'c12' in cls_key or '12' in cls_key:
            print(f'{cls_key}/{ch_key}: {ch_val.get(\"chapter_name\", \"NO NAME\")}')
" | head -20
python3 -c "
import json
with open('public/biology_concepts.json') as f:
    data = json.load(f)
for cls_key, cls_val in data['classes'].items():
    for ch_key, ch_val in cls_val['chapters'].items():
        concepts = ch_val.get('concepts', [])
        if concepts:
            print(f'{cls_key}/{ch_key}: {concepts[0][\"concept_title\"]}')
" | sort
python3 -c "
import json
with open('public/physics_concepts.json') as f:
    data = json.load(f)
for cls_key, cls_val in data['classes'].items():
    for ch_key, ch_val in cls_val['chapters'].items():
        concepts = ch_val.get('concepts', [])
        if concepts:
            print(f'{cls_key}/{ch_key}: {concepts[0][\"concept_title\"]}')
" | sort
python3 -c "
import json
with open('public/chemistry_concepts.json') as f:
    data = json.load(f)
for cls_key, cls_val in data['classes'].items():
    for ch_key, ch_val in cls_val['chapters'].items():
        concepts = ch_val.get('concepts', [])
        if concepts:
            print(f'{cls_key}/{ch_key}: {concepts[0][\"concept_title\"]}')
" | sort
git add app/api/ancestry/route.ts
git commit -m "fix: add real NCERT chapter titles for accurate concept routing"
git push
git add app/api/ancestry/route.ts
git commit -m "fix: add real NCERT chapter titles for accurate concept routing"
git push
git add app/api/ancestry/route.ts
git commit -m "fix: add real NCERT chapter titles for accurate concept rokuting"
git push
npm run build 2>&1 | tail -30
git add app/api/ancestry/route.ts
git commit -m "fix: add real NCERT chapter titles for accurate concept rokuting"
git push
python3 -c "
import json
with open('public/biology_concepts.json') as f:
    data = json.load(f)

ch = data['classes']['class_10']['chapters']['chapter_5_part1']['concepts']
print(f'Total concepts: {len(ch)}')
for c in ch:
    print(f'  {c[\"id\"]}: {c[\"concept_title\"]}')
"python3 -c "
import json
with open('public/biology_concepts.json') as f:
    data = json.load(f)

ch = data['classes']['class_10']['chapters']['chapter_5_part1']['concepts']
print(f'Total concepts: {len(ch)}')
for c in ch:
    print(f'  {c[\"id\"]}: {c[\"concept_title\"]}')
"
python3 -c "
import json
with open('public/biology_concepts.json') as f:
    data = json.load(f)

all_concepts = []
for cls in data['classes'].values():
    for ch in cls['chapters'].values():
        for c in ch['concepts']:
            all_concepts.append(c)

# Print 3 concepts from each class with good descriptions
from collections import defaultdict
by_class = defaultdict(list)
for c in all_concepts:
    cls_num = c['id'].split('_')[1]
    by_class[cls_num].append(c)

for cls_num in ['c9', 'c10', 'c11', 'c12']:
    print(f'\n=== Class {cls_num} ===')
    for c in by_class[cls_num][:5]:
        print(f'  Concept: {c[\"concept_title\"]}')
        print(f'  Ask: What is {c[\"concept_title\"]}? or Explain {c[\"concept_title\"]}')
        print()
"
python3 -c "
import json
with open('public/biology_concepts.json') as f:
    data = json.load(f)

all_concepts = []
for cls in data['classes'].values():
    for ch in cls['chapters'].values():
        for c in ch['concepts']:
            all_concepts.append(c)

# Print 3 concepts from each class with good descriptions
from collections import defaultdict
by_class = defaultdict(list)
for c in all_concepts:
    cls_num = c['id'].split('_')[1]
    by_class[cls_num].append(c)

for cls_num in ['c9', 'c10', 'c11', 'c12']:
    print(f'\n=== Class {cls_num} ===')
    for c in by_class[cls_num][:5]:
        print(f'  Concept: {c[\"concept_title\"]}')
        print(f'  Ask: What is {c[\"concept_title\"]}? or Explain {c[\"concept_title\"]}')
        print()
"Concept: Criteria for Life
What is Nomenclature?
git add app/ancestry/page.tsx
git commit -m "fix: add real NCERT chapter titles for accurate concept rokuting"
git push
python3 -c "
import json
with open('public/heatmap_data.json') as f:
    data = json.load(f)

# Show sample question structure
bio = data.get('Biology', {})
first_chapter = list(bio.values())[0]
questions = first_chapter.get('questions', [])[:2]
print(json.dumps(questions, indent=2))
"
mkdir -p app/api/test-questions
cp test_questions_route.ts app/api/test-questions/route.ts
git add components/AncestryChain.tsx app/api/test-questions/route.ts
git commit -m "feat: add test me on this concept with MCQ questions"
git push
head -5 app/api/test-questions/route.ts
sed -i "s/import { readFileSync } from 'fs';//" app/api/test-questions/route.ts
sed -i "s/import { join } from 'path';//" app/api/test-questions/route.ts
sed -i "s/function findNEETQuestions(/async function findNEETQuestions(/" app/api/test-questions/route.ts
sed -i "s/classNum: number\n): any\[\] {/classNum: number,\n  origin: string\n): Promise<any[]> {/" app/api/test-questions/route.ts
sed -i "s|const filePath = join(process.cwd(), 'public', 'heatmap_data.json');\n    const heatmapData = JSON.parse(readFileSync(filePath, 'utf-8'));|const res = await fetch(\`\${origin}/heatmap_data.json\`);\n    const heatmapData = await res.json();|" app/api/test-questions/route.ts
sed -i "s/const neetQuestions = findNEETQuestions(concept_title, key_terms ?? \[\], chapter, classNum);/const neetQuestions = await findNEETQuestions(concept_title, key_terms ?? [], chapter, classNum, req.nextUrl.origin);/" app/api/test-questions/route.ts
head -10 app/api/test-questions/route.ts
grep -n "findNEETQuestions\|readFileSync\|fetch.*heatmap" app/api/test-questions/route.ts
sed -i "s|const filePath = join(process.cwd(), 'public', 'heatmap_data.json');||" app/api/test-questions/route.ts
sed -i "s|const heatmapData = JSON.parse(readFileSync(filePath, 'utf-8'));|const res = await fetch(\`\${origin}/heatmap_data.json\`);\n    const heatmapData = await res.json();|" app/api/test-questions/route.ts
sed -i "s|classNum: number\n): any\[\] {|classNum: number,\n  origin: string\n): Promise<any[]> {|" app/api/test-questions/route.ts
sed -n '38,55p' app/api/test-questions/route.ts
python3 -c "
content = open('app/api/test-questions/route.ts').read()
content = content.replace(
    '  classNum: number\n): any[] {',
    '  classNum: number,\n  origin: string\n): Promise<any[]> {'
)
open('app/api/test-questions/route.ts', 'w').write(content)
print('Done')
"
sed -n '38,48p' app/api/test-questions/route.ts
git add app/api/test-questions/route.ts
git commit -m "fix: replace readFileSync with fetch for heatmap data in test-questions"
git push
grep -n "fs\|readFileSync\|join" app/api/test-questions/route.ts
grep -rn "readFileSync\|from 'fs'" app/ components/
grep -n "readFileSync\|from 'fs'\|from 'path'" components/AncestryChain.tsx
git add components/AncestryChain.tsx
git commit -m "fix: remove fs imports from AncestryChain client component"
git push
# Check file size — should be much larger than old file
ls -lh public/chemistry_concepts.json
# Quick structure check
python3 -c "
import json
with open('public/chemistry_concepts.json') as f:
    d = json.load(f)
print('Classes:', list(d['classes'].keys()))
total = sum(len(ch['concepts']) for cls in d['classes'].values() for ch in cls['chapters'].values())
print('Total concepts:', total)
"
git add public/chemistry_concepts.json
git commit -m "Update chemistry concepts with NCERT pipeline data"
git push origin main
git add public/heatmap_data.json
git commit -m "Update chemistry concepts with NCERT pipeline data"
git push origin main
