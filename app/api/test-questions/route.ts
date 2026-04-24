import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
];

async function groqCall(prompt: string, maxTokens: number): Promise<string | null> {
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0.7,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices[0].message.content.trim();
      }
      if (res.status === 429) { continue; }
    } catch { continue; }
  }
  return null;
}

// Pull real NEET questions related to this concept from heatmap_data.json
function findNEETQuestions(
  conceptTitle: string,
  keyTerms: string[],
  chapterNum: number,
  classNum: number
): any[] {
  try {
    const filePath = join(process.cwd(), 'public', 'heatmap_data.json');
    const heatmapData = JSON.parse(readFileSync(filePath, 'utf-8'));

    const allQuestions: any[] = [];

    for (const subjectData of Object.values(heatmapData) as any[]) {
      for (const chapterData of Object.values(subjectData) as any[]) {
        const questions = chapterData.questions ?? [];
        for (const q of questions) {
          if (!q.question || !q.options || !q.correct_answer) continue;
          const qLower = q.question.toLowerCase();
          // Match if question contains key terms or concept title words
          const titleWords = conceptTitle.toLowerCase().split(' ').filter(w => w.length > 4);
          const terms = [...keyTerms.map(t => t.toLowerCase()), ...titleWords];
          const matches = terms.filter(t => qLower.includes(t));
          if (matches.length >= 1) {
            allQuestions.push({ ...q, source: 'neet' });
          }
        }
      }
    }

    // Shuffle and return up to 2
    return allQuestions.sort(() => Math.random() - 0.5).slice(0, 2);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { concept_title, description, key_terms, class: classNum, chapter, batch } = await req.json();

    if (!concept_title) {
      return NextResponse.json({ error: 'concept_title required' }, { status: 400 });
    }

    // Pull real NEET questions
    const neetQuestions = findNEETQuestions(concept_title, key_terms ?? [], chapter, classNum);
    const neetCount = neetQuestions.length;
    const generateCount = Math.max(3 - neetCount, 1) + (batch ?? 0);

    // Generate new NEET-style questions
    const prompt = `You are a NEET exam question setter. Generate ${generateCount} MCQ questions about this concept.

CONCEPT: ${concept_title}
DESCRIPTION: ${description}
KEY TERMS: ${(key_terms ?? []).join(', ')}
CLASS: ${classNum}

Rules:
- Questions must be NEET style (4 options, one correct)
- Each question should test understanding, not just memorization
- Options should be plausible but clearly only one correct
- Do NOT repeat questions across batches (this is batch ${batch ?? 0})
- Return ONLY valid JSON array, no markdown, no explanation

Format:
[
  {
    "question": "Question text here?",
    "options": {"1": "Option A", "2": "Option B", "3": "Option C", "4": "Option D"},
    "correct_answer": "1"
  }
]`;

    const raw = await groqCall(prompt, 800);
    let generatedQuestions: any[] = [];

    if (raw) {
      try {
        const clean = raw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) {
          generatedQuestions = parsed.map(q => ({ ...q, source: 'generated' }));
        }
      } catch {
        // Try extracting JSON array
        const match = raw.match(/\[[\s\S]*\]/);
        if (match) {
          try {
            generatedQuestions = JSON.parse(match[0]).map((q: any) => ({ ...q, source: 'generated' }));
          } catch { /* ignore */ }
        }
      }
    }

    // Mix: real NEET first, then generated, limit to 3
    const allQuestions = [...neetQuestions, ...generatedQuestions].slice(0, 3);

    // Shuffle options order for freshness
    const finalQuestions = allQuestions.map(q => ({
      question: q.question,
      options: q.options,
      correct_answer: String(q.correct_answer),
      source: q.source,
      year: q.year,
    }));

    return NextResponse.json({ questions: finalQuestions });
  } catch (err) {
    console.error('Test questions API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
