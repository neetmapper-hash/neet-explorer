import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? ''
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface Concept {
  id: string;
  concept_title: string;
  description: string;
  key_terms: string[];
  builds_upon: string[];
}

function buildConceptLookup(data: any): Record<string, Concept> {
  const lookup: Record<string, Concept> = {};
  for (const classData of Object.values(data.classes) as any[]) {
    for (const chapterData of Object.values(classData.chapters) as any[]) {
      for (const concept of chapterData.concepts) {
        lookup[concept.id] = concept;
      }
    }
  }
  return lookup;
}

function traverseAncestry(
  conceptId: string,
  lookup: Record<string, Concept>,
  visited = new Set<string>(),
  depth = 0,
  maxDepth = 4
): Concept[] {
  if (depth > maxDepth) return []
  if (visited.has(conceptId) || !lookup[conceptId]) return [];
  visited.add(conceptId);
  const concept = lookup[conceptId];
  const ancestry: Concept[] = [];
  for (const prereqId of concept.builds_upon ?? []) {
    ancestry.push(...traverseAncestry(prereqId, lookup, visited, depth + 1, maxDepth))
  }
  ancestry.push(concept);
  return ancestry;
}
async function generateAnswer(
  question: string,
  concept: Concept
): Promise<string> {
  const context = `${concept.concept_title}: ${concept.description}`
  const prompt = `You are a NEET expert. Answer this question directly as a teacher.
- Start with: The correct option is (X)...
- Explain WHY it is correct in 2-3 sentences
- Say why other options are wrong in 1 sentence
- Max 5 sentences total, no bullet points
- No markdown formatting
- Speak directly as a teacher

BACKGROUND: ${context}

QUESTION: ${question}

ANSWER:`

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 300,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (res.ok) {
      const data = await res.json()
      return data.choices[0].message.content.trim()
    }
  } catch {}
  return ''
}
async function identifyConcept(
  question: string,
  conceptList: string[],
  lookup: Record<string, Concept>
): Promise<string | null> {
  const chunkSize = 200;
  const chunks = [];
  for (let i = 0; i < conceptList.length; i += chunkSize) {
    chunks.push(conceptList.slice(i, i + chunkSize));
  }

  for (const chunk of chunks) {
    const prompt = `You are a NEET expert. Given this NEET question, identify which concept it tests.

QUESTION:
${question}

CONCEPTS LIST:
${chunk.join('\n')}

Return ONLY the concept ID that best matches. Example: bio_c12_ch10_c3
If no match found return: NONE
No explanation.`;

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          max_tokens: 50,
          temperature: 0,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const result = data.choices[0].message.content.trim();
        console.log('Groq returned concept ID:', result);
        console.log('Exists in lookup:', !!lookup[result]);
        if (result !== 'NONE' && lookup[result]) {
          return result;
        }
      } else {
        console.log('Groq API error:', res.status, await res.text());
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    console.log(
      'GROQ_API_KEY set:',
      !!GROQ_API_KEY,
      'length:',
      GROQ_API_KEY.length
    );
    const { question, subject } = await req.json();

    if (!question || !subject) {
      return NextResponse.json(
        { error: 'question and subject are required' },
        { status: 400 }
      );
    }

    // Load concept data
    let conceptData: any;
    try {
      const conceptRes = await fetch(
        `${req.nextUrl.origin}/${subject.toLowerCase()}_concepts.json`
      );
      if (!conceptRes.ok) {
        return NextResponse.json(
          { error: 'Concept data not found for subject' },
          { status: 404 }
        );
      }
      conceptData = await conceptRes.json();
    } catch {
      return NextResponse.json(
        { error: 'Failed to load concept data' },
        { status: 500 }
      );
    }

    const lookup = buildConceptLookup(conceptData);
    console.log('Total concepts in lookup:', Object.keys(lookup).length);
    console.log('Sample concept IDs:', Object.keys(lookup).slice(0, 3));
    // Build concept list for prompt
    const conceptList = Object.values(lookup).map(
      (c) => `${c.id} | ${c.concept_title}`
    );

    // Identify concept
    const conceptId = await identifyConcept(question, conceptList, lookup);

    if (!conceptId) {
      return NextResponse.json({ chain: [] });
    }

    // Traverse ancestry
    const rawChain = traverseAncestry(conceptId, lookup)

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
const chain = dedupedChain.sort((a, b) => getClass(b.id) - getClass(a.id))
    console.log('Subject:', subject);
    console.log('Concept found:', conceptId);
    console.log('Chain length:', chain.length);
    console.log('Chain:', JSON.stringify(chain.map((c) => c.id)));
    const answer = conceptId 
  ? await generateAnswer(question, lookup[conceptId])
  : ''

return NextResponse.json({ chain, conceptId, answer })
  } catch (err) {
    console.error('Ancestry API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
