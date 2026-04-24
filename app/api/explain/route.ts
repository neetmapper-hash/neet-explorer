import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { concept_title, description, key_terms, class: classNum, chapter } = await req.json();

    if (!concept_title) {
      return NextResponse.json({ error: 'concept_title is required' }, { status: 400 });
    }

    const prompt = `You are a NEET Biology/Chemistry/Physics teacher explaining a concept to a Class ${classNum} student.

Concept: ${concept_title}
Chapter: ${chapter}
NCERT Description: ${description}
Key Terms: ${(key_terms ?? []).join(', ')}

Write a clear, student-friendly explanation following these rules:
- Start directly with the explanation, no preamble
- Use a simple real-life analogy if it helps
- Keep it under 120 words
- Use plain language a Class ${classNum} student would understand
- End with one sentence on why this matters for NEET
- No bullet points, no headers, just flowing prose`;

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 200,
        temperature: 0.4,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Groq error:', err);
      return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500 });
    }

    const data = await res.json();
    const explanation = data.choices?.[0]?.message?.content?.trim() ?? '';

    return NextResponse.json({ explanation });
  } catch (err) {
    console.error('Explain API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
