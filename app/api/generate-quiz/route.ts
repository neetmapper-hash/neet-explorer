import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

function extractJSONArray(text: string) {
  const start = text.indexOf('[');
  const end   = text.lastIndexOf(']');
  if (start === -1 || end === -1) return null;
  return text.slice(start, end + 1);
}

function safeJSONParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    let fixed = raw
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    const extracted = extractJSONArray(fixed);
    if (!extracted) throw new Error('Could not extract JSON array');
    return JSON.parse(extracted);
  }
}

export async function POST(req: Request) {
  try {
    const { chapter, concepts, classLevel, subject, mode } = await req.json();

    const limitedConcepts = (concepts ?? []).slice(0, 8);

    const conceptText = limitedConcepts
      .map((c: any) => `Concept: ${c.concept_name}\nSummary: ${(c.summary || '').slice(0, 300)}`)
      .join('\n\n');

    const difficultyPlan = `Question 1: Easy\nQuestion 2: Easy\nQuestion 3: Medium\nQuestion 4: Hard\nQuestion 5: Advanced`;

    const isAssertion = mode === 'assertion_reasoning';

    const prompt = isAssertion
      ? `Generate EXACTLY 5 assertion reasoning questions.
Subject: ${subject}
Class: ${classLevel}
Chapter: ${chapter}
Concepts:
${conceptText}
Difficulty progression:
${difficultyPlan}
Rules:
- valid JSON only
- output ONLY JSON array
- no markdown, no comments, no trailing commas
- double quotes only, escape quotes properly
- never truncate output
Format:
[
  {
    "question": "...",
    "difficulty": "easy",
    "assertion": "...",
    "reason": "...",
    "options": ["...", "...", "...", "..."],
    "answer": "...",
    "explanation": "..."
  }
]`
      : `Generate EXACTLY 5 MCQs.
Subject: ${subject}
Class: ${classLevel}
Chapter: ${chapter}
Concepts:
${conceptText}
Difficulty progression:
${difficultyPlan}
Rules:
- valid JSON only
- output ONLY JSON array
- no markdown, no comments, no trailing commas
- double quotes only, escape quotes properly
- never truncate output
Format:
[
  {
    "question": "...",
    "difficulty": "easy",
    "options": ["...", "...", "...", "..."],
    "answer": "...",
    "explanation": "..."
  }
]`;

    const allQuestions: any[] = [];

    for (let batch = 0; batch < 6; batch++) {
      let parsed = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Batch ${batch + 1} attempt ${attempt}`);

          const response = await Promise.race([
            client.chat.completions.create({
              model: isAssertion ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.4,
              max_tokens: 1800,
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Groq timeout')), 60000)
            ),
          ]);

          const text = (response as any).choices?.[0]?.message?.content || '';
          parsed = safeJSONParse(text);
          if (Array.isArray(parsed)) {
            console.log(`Batch ${batch + 1} success`);
            break;
          }
        } catch (err) {
          console.error(`Batch ${batch + 1} Attempt ${attempt} failed`, err);
        }
      }

      if (!parsed) {
        console.error(`Batch ${batch + 1} failed completely`);
        continue;
      }
      allQuestions.push(...parsed);
    }

    const validQuestions = allQuestions.filter(
      (q: any) =>
        q.question &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.answer &&
        q.explanation
    );

    const uniqueQuestions = validQuestions.filter(
      (question, index, self) =>
        index === self.findIndex((q: any) => q.question === question.question)
    );

    if (uniqueQuestions.length < 5) {
      return Response.json({ success: false, error: 'Too few valid questions generated' });
    }

    return Response.json({ success: true, total: uniqueQuestions.length, questions: uniqueQuestions });

  } catch (error: any) {
    console.error(error);
    return Response.json({ success: false, error: error.message });
  }
}
