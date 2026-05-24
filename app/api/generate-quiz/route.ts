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

const AR_OPTIONS = [
  'Both A and R are true and R is the correct explanation of A',
  'Both A and R are true but R is not the correct explanation of A',
  'A is true but R is false',
  'A is false but R is true',
];

export async function POST(req: Request) {
  try {
    const { chapter, concepts, classLevel, subject, mode, difficulty, previousQuestions = [] } = await req.json();
    const isAssertion = mode === 'assertion_reasoning';
    const level = difficulty ?? 'easy';
    const levelDesc = DIFFICULTY_DESCRIPTIONS[level] ?? 'moderate difficulty';
    const allConcepts = concepts ?? [];

    const LEVELS = ['easy','medium','hard','advanced','expert','neet'];
    const levelIndex = LEVELS.indexOf(level);
    let selectedConcepts: any[];

    if (allConcepts.length <= 8) {
      selectedConcepts = allConcepts;
    } else {
      const step = Math.max(1, Math.floor(allConcepts.length / 6));
      const startIdx = Math.min(levelIndex * step, allConcepts.length - 8);
      selectedConcepts = allConcepts.slice(startIdx, startIdx + 8);
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

    const arFormat = '[\n'
      + '  {\n'
      + '    "question": "In the following question, a statement of Assertion (A) is followed by a statement of Reason (R).",\n'
      + '    "difficulty": "' + level + '",\n'
      + '    "assertion": "Write the assertion statement about ' + chapter + ' here",\n'
      + '    "reason": "Write the reason statement here",\n'
      + '    "options": [\n'
      + '      "Both A and R are true and R is the correct explanation of A",\n'
      + '      "Both A and R are true but R is not the correct explanation of A",\n'
      + '      "A is true but R is false",\n'
      + '      "A is false but R is true"\n'
      + '    ],\n'
      + '    "answer": "Both A and R are true and R is the correct explanation of A",\n'
      + '    "explanation": "Explain why the answer is correct"\n'
      + '  }\n'
      + ']';

    const mcqFormat = '[\n'
      + '  {\n'
      + '    "question": "...",\n'
      + '    "difficulty": "' + level + '",\n'
      + '    "options": ["...", "...", "...", "..."],\n'
      + '    "answer": "...",\n'
      + '    "explanation": "..."\n'
      + '  }\n'
      + ']';

    const prompt = isAssertion
      ? 'Generate EXACTLY 5 Assertion-Reason questions for NEET.\n'
        + 'Subject: ' + subject + '\n'
        + 'Class: ' + classLevel + '\n'
        + 'Chapter: ' + chapter + '\n'
        + 'Difficulty: ' + level.toUpperCase() + ' - ' + levelDesc + '\n\n'
        + 'Concepts:\n' + conceptText
        + avoidText + '\n\n'
        + 'CRITICAL RULES for Assertion-Reason:\n'
        + '- Write a factual ASSERTION (A) about the concept\n'
        + '- Write a REASON (R) that may or may not explain the assertion\n'
        + '- The OPTIONS must ALWAYS be exactly these 4 in this exact order:\n'
        + '  1. Both A and R are true and R is the correct explanation of A\n'
        + '  2. Both A and R are true but R is not the correct explanation of A\n'
        + '  3. A is true but R is false\n'
        + '  4. A is false but R is true\n'
        + '- The answer must be one of these 4 options EXACTLY as written above\n'
        + '- Mix the answers across questions (do not always use option 1)\n'
        + '- Output ONLY valid JSON array, no markdown\n\n'
        + 'Format:\n' + arFormat
      : 'Generate EXACTLY 5 MCQ questions for NEET.\n'
        + 'Subject: ' + subject + '\n'
        + 'Class: ' + classLevel + '\n'
        + 'Chapter: ' + chapter + '\n'
        + 'Difficulty: ' + level.toUpperCase() + ' - ' + levelDesc + '\n\n'
        + 'Concepts:\n' + conceptText
        + avoidText + '\n\n'
        + 'Rules:\n'
        + '- ALL 5 questions must be ' + level + ' difficulty\n'
        + '- Questions must cover the concepts listed above\n'
        + '- Output ONLY valid JSON array, no markdown, no comments\n'
        + '- Double quotes only, no trailing commas\n'
        + '- Never truncate the output\n\n'
        + 'Format:\n' + mcqFormat;

    console.log('Level:', level, '| Mode:', mode);

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

    // For assertion-reasoning, enforce the standard 4 options
    if (isAssertion) {
      questions = questions.map((q: any) => ({
        ...q,
        options: AR_OPTIONS,
        answer: AR_OPTIONS.includes(q.answer) ? q.answer : AR_OPTIONS[0],
      }));
    }

    const valid = questions.filter((q: any) => {
      if (isAssertion) {
        // For AR questions, assertion is required; question field may be generic
        return q.assertion && q.reason && Array.isArray(q.options) && q.options.length === 4 && q.answer && q.explanation;
      }
      return q.question && Array.isArray(q.options) && q.options.length === 4 && q.answer && q.explanation;
    });
    const unique = valid.filter((q, i, arr) =>
      i === arr.findIndex((x: any) => isAssertion ? x.assertion === q.assertion : x.question === q.question)
    );

    console.log("valid:", valid.length, "unique:", unique.length, "raw questions:", JSON.stringify(questions.slice(0,1)));
    if (unique.length < 3) {
      return Response.json({ success: false, error: 'Could not generate enough questions. Please try again.' });
    }

    return Response.json({ success: true, total: unique.length, questions: unique, difficulty: level });

  } catch (error: any) {
    console.error('generate-quiz error:', error);
    return Response.json({ success: false, error: error.message });
  }
}
