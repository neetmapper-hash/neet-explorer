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
  easy:     'straightforward recall — definitions, basic facts, simple identification',
  medium:   'application — apply concepts to simple scenarios, cause and effect',
  hard:     'analytical — multi-step reasoning, compare and contrast, explain why',
  advanced: 'complex — integrate multiple concepts, interpret data, predict outcomes',
  expert:   'tricky — misconceptions, exceptions to rules, subtle distinctions',
  neet:     'NEET exam style — high difficulty, exactly as in past NEET papers',
};

export async function POST(req: Request) {
  try {
    const { chapter, concepts, classLevel, subject, mode, difficulty, previousQuestions = [] } = await req.json();
    const isAssertion = mode === 'assertion_reasoning';
    const level = difficulty ?? 'easy';
    const levelDesc = DIFFICULTY_DESCRIPTIONS[level] ?? 'moderate difficulty';
    const allConcepts = concepts ?? [];

    // Rotate concept window based on difficulty level
    // Each level covers a different slice of chapter concepts
    const LEVELS = ['easy','medium','hard','advanced','expert','neet'];
    const levelIndex = LEVELS.indexOf(level);
    let selectedConcepts: any[];

    if (allConcepts.length <= 8) {
      selectedConcepts = allConcepts;
    } else {
      const step = Math.max(1, Math.floor(allConcepts.length / 6));
      const startIdx = Math.min(levelIndex * step, allConcepts.length - 8);
      selectedConcepts = allConcepts.slice(startIdx, startIdx + 8);
      // Always include main topics
      const mainTopics = allConcepts
        .filter((c: any) => c.is_main_topic)
        .slice(0, 3)
        .filter((c: any) => !selectedConcepts.some((s: any) => s.concept_name === c.concept_name));
      selectedConcepts = [...mainTopics, ...selectedConcepts].slice(0, 8);
    }

    const conceptText = selectedConcepts
      .map((c: any) => 'Concept: ' + c.concept_name + '\nSummary: ' + (c.summary || '').slice(0, 200))
      .join('\n\n');

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
      + 'Difficulty level: ' + level.toUpperCase() + ' - ' + levelDesc + '\n\n'
      + 'Concepts to focus on:\n' + conceptText
      + avoidText + '\n\n'
      + 'Rules:\n'
      + '- ALL 5 questions must be ' + level + ' difficulty\n'
      + '- Questions must cover the concepts listed above — do not repeat topics\n'
      + '- Output ONLY a valid JSON array - no markdown, no comments\n'
      + '- Double quotes only, no trailing commas\n'
      + '- Never truncate the output\n\n'
      + 'Format:\n' + format;

    console.log('Level:', level, '| Concepts:', selectedConcepts.map((c: any) => c.concept_name).join(', '));

    let questions: any[] = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      const raw = await groqCall(prompt, 0.4 + (attempt * 0.1));
      if (!raw) continue;
      try {
        const parsed = safeJSONParse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) { questions = parsed; break; }
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
