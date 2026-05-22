const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function extractJSONArray(text: string) {
  const start = text.indexOf('[');
  const end   = text.lastIndexOf(']');
  if (start === -1 || end === -1) return null;
  return text.slice(start, end + 1);
}

function safeJSONParse(raw: string) {
  try { return JSON.parse(raw); }
  catch {
    let fixed = raw
      .replace(/```json/g, '').replace(/```/g, '')
      .replace(/[""]/g, '"').replace(/['']/g, "'")
      .replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    const extracted = extractJSONArray(fixed);
    if (!extracted) throw new Error('Could not extract JSON array');
    return JSON.parse(extracted);
  }
}

async function groqCall(prompt: string, temperature: number): Promise<string | null> {
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: 2000,
      }),
    });
    if (!res.ok) {
      console.error('Groq error:', res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error('Groq fetch error:', err);
    return null;
  }
}

const DIFFICULTY_DESCRIPTIONS: Record<string, string> = {
  easy:     'straightforward recall questions — definitions, basic facts, simple identification',
  medium:   'application questions — apply concepts to simple scenarios, fill-in-the-blank type',
  hard:     'analytical questions — multi-step reasoning, compare/contrast, why/how questions',
  advanced: 'complex questions — integrate multiple concepts, interpret data, predict outcomes',
  expert:   'tricky questions — common misconceptions, exceptions to rules, subtle distinctions',
  neet:     'NEET exam style — exactly as they appear in past NEET papers, high difficulty',
};

export async function POST(req: Request) {
  try {
    const { chapter, concepts, classLevel, subject, mode, difficulty, previousQuestions = [] } = await req.json();

    const isAssertion = mode === 'assertion_reasoning';
    const level = difficulty ?? 'easy';
    const levelDesc = DIFFICULTY_DESCRIPTIONS[level] ?? 'moderate difficulty';

    const limitedConcepts = (concepts ?? []).slice(0, 8);
    const conceptText = limitedConcepts
      .map((c: any) => 'Concept: ' + c.concept_name + '\nSummary: ' + (c.summary || '').slice(0, 200))
      .join('\n\n');

    // Tell Groq which questions to avoid (from previous levels)
    const avoidText = previousQuestions.length > 0
      ? '\n\nDo NOT repeat these questions:\n' + previousQuestions.slice(-10).join('\n')
      : '';

    const format = isAssertion
      ? '[\n  {\n    "question": "...",\n    "difficulty": "' + level + '",\n    "assertion": "...",\n    "reason": "...",\n    "options": ["...", "...", "...", "..."],\n    "answer": "...",\n    "explanation": "..."\n  }\n]'
      : '[\n  {\n    "question": "...",\n    "difficulty": "' + level + '",\n    "options": ["...", "...", "...", "..."],\n    "answer": "...",\n    "explanation": "..."\n  }\n]';

    const prompt = 'Generate EXACTLY 5 ' + (isAssertion ? 'assertion reasoning' : 'MCQ') + ' questions for NEET.\n'
      + 'Subject: ' + subject + '\n'
      + 'Class: ' + classLevel + '\n'
      + 'Chapter: ' + chapter + '\n'
      + 'Difficulty level: ' + level.toUpperCase() + ' — ' + levelDesc + '\n\n'
      + 'Concepts:\n' + conceptText
      + avoidText + '\n\n'
      + 'Rules:\n'
      + '- ALL 5 questions must be ' + level + ' difficulty\n'
      + '- Output ONLY a valid JSON array — no markdown, no comments\n'
      + '- Double quotes only, no trailing commas\n'
      + '- Each question must test a DIFFERENT concept or aspect\n'
      + '- Never truncate the output\n\n'
      + 'Format:\n' + format;

    console.log('Generating 5', level, isAssertion ? 'assertion' : 'MCQ', 'questions for:', chapter);

    let questions: any[] = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log('Attempt', attempt);
      const raw = await groqCall(prompt, 0.4 + (attempt * 0.1));
      if (!raw) continue;
      try {
        const parsed = safeJSONParse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          questions = parsed;
          console.log('Success — got', parsed.length, 'questions');
          break;
        }
      } catch (err) {
        console.error('Parse failed attempt', attempt, String(err).slice(0, 100));
      }
    }

    const valid = questions.filter((q: any) =>
      q.question && Array.isArray(q.options) && q.options.length === 4 && q.answer && q.explanation
    );

    const unique = valid.filter((q, i, arr) =>
      i === arr.findIndex((x: any) => x.question === q.question)
    );

    if (unique.length < 3) {
      return Response.json({ success: false, error: 'Could not generate enough questions. Please try again.' });
    }

    return Response.json({ success: true, total: unique.length, questions: unique, difficulty: level });

  } catch (error: any) {
    console.error('generate-quiz error:', error);
    return Response.json({ success: false, error: error.message });
  }
}