import { supabase } from '@/lib/supabase';

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function groqCall(prompt: string): Promise<string | null> {
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 800,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { concept_name, subject, class: classLevel, summary, key_terms, formula } = await req.json();

    if (!concept_name || !subject) {
      return Response.json({ success: false, error: 'Missing required fields' });
    }

    // ── 1. Check cache ─────────────────────────────────────────────────────
    const cacheKey = `explain:${subject.toLowerCase()}:${concept_name.toLowerCase()}`;
    const { data: cached } = await supabase
      .from('concept_explanations')
      .select('explanation')
      .eq('cache_key', cacheKey)
      .single();

    if (cached?.explanation) {
      return Response.json({ success: true, explanation: cached.explanation, fromCache: true });
    }

    // ── 2. Build prompt ────────────────────────────────────────────────────
    const keyTermsText = key_terms?.length ? `Key terms: ${key_terms.slice(0, 8).join(', ')}` : '';
    const formulaText = formula?.length ? `Formulas: ${formula.slice(0, 4).join(' | ')}` : '';

    const prompt = `You are a friendly, clear NEET tutor explaining a concept to a Class ${classLevel} student.

Concept: ${concept_name}
Subject: ${subject}
${summary ? `Summary: ${summary}` : ''}
${keyTermsText}
${formulaText}

Write a short tutor-style explanation with these 4 sections. Use simple language appropriate for Class ${classLevel}. Be concise — each section 1-3 sentences max.

**Definition:** What is it in simple words?
**Real-world example:** One relatable everyday example.
**Common misconception:** One thing students often get wrong about this.
**Memory tip:** One trick or mnemonic to remember this.

Do not use markdown headers with #. Just use the bold labels as shown above.`;

    const raw = await groqCall(prompt);
    if (!raw) {
      return Response.json({ success: false, error: 'Could not generate explanation' });
    }

    // ── 3. Cache result ────────────────────────────────────────────────────
    await supabase
      .from('concept_explanations')
      .insert({ cache_key: cacheKey, concept_name, subject, explanation: raw })
      .select('id')
      .single();

    return Response.json({ success: true, explanation: raw, fromCache: false });

  } catch (error: any) {
    console.error('explain-concept error:', error);
    return Response.json({ success: false, error: error.message });
  }
}
