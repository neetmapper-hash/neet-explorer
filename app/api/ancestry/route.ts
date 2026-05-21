import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';

const GROQ_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
];

// ── Types ──────────────────────────────────────────────────────────────────────

interface Concept {
  id: string;
  concept_name: string;
  summary: string;
  key_terms: string[];
  builds_upon: { concept_id: string }[];
  domain: string;
  class: number;
  chapter_number: number;
  chapter_name: string;
  parent_concept_name?: string;
  is_main_topic?: boolean;
}

interface ConceptMatch {
  concept_id: string;
  class: number;
  chapter_number: number;
  confidence: 'high' | 'medium' | 'low';
  reason_code: string;
}

// ── Groq call ──────────────────────────────────────────────────────────────────

async function groqCall(
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<string | null> {
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices[0].message.content.trim();
      }
      const errText = await res.text();
      if (res.status === 429) { console.log(`Rate limit on ${model}, trying next...`); continue; }
      console.log(`Groq error on ${model}: ${res.status} ${errText}`);
    } catch (e) {
      console.log(`Groq exception on ${model}:`, e);
    }
  }
  console.log('All Groq models exhausted');
  return null;
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  const clean = raw.replace(/```json|```/g, '').trim();
  const start = clean.indexOf('{');
  const end   = clean.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(clean.slice(start, end + 1)) as T; }
  catch { return null; }
}

// ── Lookup builders ────────────────────────────────────────────────────────────

function buildConceptLookup(data: Concept[]): Record<string, Concept> {
  const lookup: Record<string, Concept> = {};
  for (const c of data) lookup[c.id] = c;
  return lookup;
}

function buildChapterIndex(data: Concept[]): Record<string, Concept[]> {
  const index: Record<string, Concept[]> = {};
  for (const c of data) {
    const key = `class_${c.class}_chapter_${c.chapter_number}`;
    if (!index[key]) index[key] = [];
    index[key].push(c);
  }
  return index;
}

// ── Change 1: Server-side keyword extraction + semantic detection ──────────────

const STOP_WORDS = new Set([
  'the','a','an','is','are','was','of','in','to','and','or','that','which',
  'what','how','why','when','where','this','it','its','be','been','has','have',
  'not','no','for','by','on','at','as','with','from','if','but','so','than',
  'then','each','their','they','does','do','did','will','would','can','could',
  'should','may','might','state','define','find','calculate','give','write',
]);

function extractAndEnrichKeywords(question: string, clientKeywords: string[] = []): string[] {
  const lower = question.toLowerCase();

  // Base keywords from question text
  const base = lower
    .replace(/[?.!(),:;]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  const extra: string[] = [];

  // Semantic detection patterns — server-side
  const movingObjects = /bus|train|boat|swimmer|car|cyclist|scooter|girl|boy|man|woman|person|runner|aircraft|plane|ship/g;
  const objMatches = lower.match(movingObjects);
  if (objMatches && objMatches.length >= 2) {
    extra.push('relative velocity', 'relative motion', 'reference frame', 'observer');
  }

  if (/projectile|thrown|launched|angle.*velocity|range.*horizontal/.test(lower))
    extra.push('projectile', 'projectile motion', 'trajectory');

  if (/collid|collision|impulse|impact|ball.*hit|hit.*ball/.test(lower))
    extra.push('impulse', 'collision', 'momentum conservation');

  if (/circular|centripetal|revolv|rotat|angular|rpm|revolution/.test(lower))
    extra.push('circular motion', 'centripetal', 'angular velocity');

  if (/oscillat|pendulum|spring|shm|simple harmonic|time period of/.test(lower))
    extra.push('simple harmonic motion', 'oscillation', 'time period');

  if (/wave|frequency|wavelength|doppler|interference|diffraction/.test(lower))
    extra.push('wave', 'frequency', 'wavelength');

  if (/lens|mirror|refraction|reflection|focal|image.*distance|object.*distance/.test(lower))
    extra.push('lens', 'mirror', 'refraction', 'focal length');

  if (/electric.*field|charge.*distribution|gauss|coulomb/.test(lower))
    extra.push('electric field', 'coulomb', 'charge');

  if (/magnetic.*field|current.*conductor|solenoid|electromagnet/.test(lower))
    extra.push('magnetic field', 'electromagnetic', 'current');

  if (/photoelectric|photon|work function|threshold frequency/.test(lower))
    extra.push('photoelectric effect', 'photon', 'work function');

  if (/radioactiv|decay|half.?life|nucleus|nuclear/.test(lower))
    extra.push('radioactivity', 'nuclear', 'half life', 'decay');

  if (/semiconductor|diode|transistor|p.?n junction/.test(lower))
    extra.push('semiconductor', 'diode', 'transistor');

  if (/enzyme|substrate|active site|inhibitor/.test(lower))
    extra.push('enzyme', 'substrate', 'active site');

  if (/dna|rna|replication|transcription|translation|codon/.test(lower))
    extra.push('DNA', 'RNA', 'replication', 'genetic code');

  if (/meiosis|mitosis|cell division|chromosome/.test(lower))
    extra.push('meiosis', 'mitosis', 'cell division');

  if (/photosynthesis|chlorophyll|light reaction|calvin/.test(lower))
    extra.push('photosynthesis', 'chlorophyll', 'light reaction');

  // Merge client keywords + server keywords, deduplicate
  return Array.from(new Set([...base, ...extra, ...clientKeywords]));
}

// ── Change 3: Pre-score all concepts by keyword overlap ────────────────────────

function scoreConceptsByKeywords(
  concepts: Concept[],
  keywords: string[]
): Array<{ concept: Concept; score: number }> {
  return concepts
    .map(c => {
      const cText = [
        c.concept_name,
        ...(c.key_terms ?? []),
        (c.summary ?? '').slice(0, 200),
        c.chapter_name ?? '',
        c.domain ?? '',
      ].join(' ').toLowerCase();

      let score = 0;
      for (const kw of keywords) {
        if (kw.length > 2 && cText.includes(kw.toLowerCase())) {
          // Higher weight for key_terms matches
          const inKeyTerms = (c.key_terms ?? []).some(t => t.toLowerCase().includes(kw.toLowerCase()));
          const inName     = c.concept_name.toLowerCase().includes(kw.toLowerCase());
          score += inKeyTerms ? 3 : inName ? 2 : 1;
        }
      }
      // Boost main topics slightly
      if (c.is_main_topic) score += 0.5;
      return { concept: c, score };
    })
    .sort((a, b) => b.score - a.score);
}

// ── Change 4: Prompt 1 — concept identification (concept-first, no chapter step) ──

async function identifyConceptGlobal(
  question: string,
  candidates: Concept[]
): Promise<ConceptMatch | null> {
  const conceptList = candidates.map(c => {
    const terms   = (c.key_terms ?? []).slice(0, 5).join(', ');
    const summary = (c.summary ?? '').slice(0, 100);
    return `${c.id} | ${c.concept_name} | Class ${c.class} Ch ${c.chapter_number} | ${c.chapter_name} | ${terms} | ${summary}`;
  }).join('\n');

  const prompt = `You are a NEET expert. Identify the ONE concept this question DIRECTLY tests.

QUESTION: ${question}

CANDIDATE CONCEPTS (id | name | class/chapter | chapter_name | key_terms | summary):
${conceptList}

Pattern rules:
- Two moving objects (bus, train, boat, scooter, swimmer) → look for "relative velocity"
- Collision or force over short time → look for "impulse" or "momentum"
- Projectile / angle / range / trajectory → look for "projectile motion"
- Circular path / centripetal / rpm → look for "circular motion"
- Spring / oscillation / pendulum / SHM → look for "simple harmonic motion"
- Lens / mirror / image distance → look for optics concepts
- Radioactivity / half-life / nuclear → look for nuclear physics concepts
- DNA / RNA / replication → look for molecular biology concepts

Rules:
1. Pick the MOST SPECIFIC concept — not a broad parent topic
2. If concept appears in multiple classes: basic question → lower class, advanced → higher class
3. Use semantic meaning, not just keyword overlap
4. If no good match → "NONE"

Output STRICT JSON ONLY — no markdown, no explanation:
{
  "concept_id": "<exact id from list or NONE>",
  "class": <number or 0>,
  "chapter_number": <number or 0>,
  "confidence": "high|medium|low",
  "reason_code": "exact_match|specific_match|level_disambiguation|weak_match|none"
}`;

  const raw = await groqCall(prompt, 120, 0);
  const result = parseJson<ConceptMatch>(raw);
  if (!result || result.concept_id === 'NONE') return null;
  return result;
}

// ── Change 5: Prompt 1B — disambiguation (triggers when confidence != "high") ──

async function disambiguateConcept(
  question: string,
  candidates: Concept[]
): Promise<ConceptMatch | null> {
  const conceptList = candidates.slice(0, 5).map(c => {
    const terms   = (c.key_terms ?? []).slice(0, 5).join(', ');
    const summary = (c.summary ?? '').slice(0, 120);
    return `${c.id} | ${c.concept_name} | Class ${c.class} Ch ${c.chapter_number} | ${terms} | ${summary}`;
  }).join('\n');

  const prompt = `You are a NEET expert. Choose the SINGLE BEST concept for this question.

QUESTION: ${question}

TOP CANDIDATES (id | name | class/chapter | key_terms | summary):
${conceptList}

Rules:
1. Select exactly ONE concept
2. Basic definition question → prefer lower class
3. Advanced application → prefer higher class
4. Most specific concept wins over general one
5. If none match → "NONE"

Output STRICT JSON ONLY:
{
  "concept_id": "<exact id or NONE>",
  "class": <number or 0>,
  "chapter_number": <number or 0>,
  "confidence": "high|medium|low",
  "reason_code": "tie_break_specificity|tie_break_level|tie_break_context|none"
}`;

  const raw = await groqCall(prompt, 100, 0);
  const result = parseJson<ConceptMatch>(raw);
  if (!result || result.concept_id === 'NONE') return null;
  return result;
}

// ── Change 6: Prompt 1C — fallback with pre-scoring (not raw batch of 80) ─────

async function identifyConceptFallback(
  question: string,
  allConcepts: Concept[],
  keywords: string[]
): Promise<string | null> {
  // Pre-score and take top 60
  const scored   = scoreConceptsByKeywords(allConcepts, keywords);
  const top60    = scored.slice(0, 60).map(x => x.concept);

  const conceptList = top60.map(c => {
    const terms = (c.key_terms ?? []).slice(0, 4).join(', ');
    return `${c.id} | ${c.concept_name} | Class ${c.class} | ${terms}`;
  }).join('\n');

  const prompt = `NEET question: ${question}

Pick the best matching concept ID. Consider key_terms carefully.

${conceptList}

Return ONLY the concept ID or NONE. No explanation.`;

  const result = await groqCall(prompt, 60, 0);
  if (!result || result.trim() === 'NONE') return null;
  const match = result.match(/([a-z]+_c\d+_ch\d+_[ms]\d+)/);
  return match ? match[1] : null;
}

// ── Ancestry traversal ─────────────────────────────────────────────────────────

function traverseAncestry(
  conceptId: string,
  lookup: Record<string, Concept>,
  visited = new Set<string>(),
  depth = 0,
  maxDepth = 5
): Concept[] {
  if (depth > maxDepth || visited.has(conceptId) || !lookup[conceptId]) return [];
  visited.add(conceptId);
  const concept   = lookup[conceptId];
  const ancestry: Concept[] = [];
  for (const link of concept.builds_upon ?? []) {
    const prereqId = typeof link === 'string' ? link : link.concept_id;
    ancestry.push(...traverseAncestry(prereqId, lookup, visited, depth + 1, maxDepth));
  }
  ancestry.push(concept);
  return ancestry;
}

// ── Change 9: Answer generation with prerequisite context ─────────────────────

async function generateAnswer(
  question: string,
  concept: Concept,
  chain: Concept[],
  options?: Record<string, string>,
  correctAnswer?: string
): Promise<string> {
  const context = `${concept.concept_name} (Class ${concept.class}): ${concept.summary}`;

  // Format prerequisites as human-readable list
  const prereqConcepts = chain
    .filter(c => c.id !== concept.id)
    .slice(0, 4)
    .map(c => `- Class ${c.class} Ch ${c.chapter_number}: ${c.concept_name} — ${(c.summary ?? '').slice(0, 80)}`)
    .join('\n');

  const hasOptions  = options && Object.keys(options).length > 0;
  const hasCorrect  = !!correctAnswer;

  // Detect numerical/calculation questions — need more tokens and step-by-step guidance
  const isNumerical = /\d+\s*(kg|N|m\/s|m\s*s|km|g\s*=|J|W|Pa|Hz|ohm|mol|atm)/i.test(question)
    || /calculate|find the|what is the value|acceleration|velocity|force|energy|power|pressure|resistance|current|voltage/i.test(question);

  let prompt: string;

  if (hasOptions && hasCorrect) {
    prompt = isNumerical
      ? \`You are a NEET expert. Solve this numerical question for a student.
- Start with: "The correct option is (${correctAnswer})..."
- Show the key calculation in ONE line: write the formula, substitute values, get the answer
- Example: "F = ma = 5 × 2 = 10 N"
- Then explain in 1-2 sentences why this matches option (${correctAnswer})
- Keep it under 5 sentences total, no bullet points, no markdown

BACKGROUND: ${context}
QUESTION: ${question}
OPTIONS:
${Object.entries(options!).map(([k, v]) => \`(\${k}) \${v}\`).join('\n')}
THE CORRECT ANSWER IS OPTION (${correctAnswer}): ${options![correctAnswer!] ?? ''}
SOLUTION:\`
      : \`You are a NEET expert. Explain this question to a student.
- Start with: "The correct option is (${correctAnswer})..."
- Explain WHY that option is correct in 2-3 sentences using the background concept
- Briefly say why the other options are wrong
- Max 5 sentences, no bullet points, no markdown

BACKGROUND: ${context}
PREREQUISITES: ${prereqConcepts || 'none'}
QUESTION: ${question}
OPTIONS:
${Object.entries(options!).map(([k, v]) => \`(\${k}) \${v}\`).join('\n')}
THE CORRECT ANSWER IS OPTION (${correctAnswer}): ${options![correctAnswer!] ?? ''}
EXPLANATION:\`;
  } else if (!hasOptions && hasCorrect) {
    prompt = \`You are a NEET expert. Explain this question to a student.
- The answer is: ${correctAnswer}
- Explain WHY this is correct in 2-3 sentences using the background concept
- Max 4 sentences, no bullet points, no markdown

BACKGROUND: ${context}
PREREQUISITES: ${prereqConcepts || 'none'}
QUESTION: ${question}
EXPLANATION:\`;
  } else {
    prompt = \`You are a NEET expert. Answer this question for a student in 3-4 sentences.
- Answer directly and clearly
- Use the background concept to explain
- No bullet points, no markdown, speak as a teacher

BACKGROUND: ${context}
PREREQUISITES: ${prereqConcepts || 'none'}
QUESTION: ${question}
ANSWER:\`;
  }

  // Numerical questions get more tokens to avoid cut-off mid-calculation
  const maxTokens = isNumerical ? 500 : 300;
  return await groqCall(prompt, maxTokens, 0.3) ?? '';
}

// ── Change 10: Study guidance (always runs, not optional) ─────────────────────

async function generateStudyPath(
  concept: Concept,
  chain: Concept[]
): Promise<string> {
  const prereqs = chain
    .filter(c => c.id !== concept.id)
    .map(c => `- Class ${c.class} Ch ${c.chapter_number}: ${c.concept_name}`)
    .join('\n');

  if (!prereqs) return '';

  const prompt = `You are a NEET learning coach. Give a student a clear study path.

TARGET CONCEPT: ${concept.concept_name} (Class ${concept.class}, Ch ${concept.chapter_number})

PREREQUISITE CONCEPTS (study these first):
${prereqs}

Rules:
- Start from the most foundational concept and build up
- Tell the student what to study in what order
- 3-4 sentences maximum
- No bullet points, no markdown, speak directly to the student`;

  return await groqCall(prompt, 150, 0.3) ?? '';
}

// ── POST handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    console.log('GROQ_API_KEY set:', !!GROQ_API_KEY, 'length:', GROQ_API_KEY.length);

    // Change 2: subject always from client — no Prompt 0
    const {
      question,
      subject: providedSubject,
      options,
      correctAnswer,
      keywords: clientKeywords = [],
    } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 });
    }

    const subject = providedSubject ?? 'Biology';
    console.log('Subject:', subject, '| Source: provided');

    // Change 1: server-side keyword enrichment
    const keywords = extractAndEnrichKeywords(question, clientKeywords);
    console.log('Keywords:', keywords.slice(0, 8).join(', '));

    // Load concept data
    let conceptData: any;
    try {
      const conceptRes = await fetch(
        `${req.nextUrl.origin}/${subject.toLowerCase()}_concepts_new.json`
      );
      if (!conceptRes.ok) {
        return NextResponse.json({ error: `Concept data not found for ${subject}` }, { status: 404 });
      }
      conceptData = await conceptRes.json();
    } catch {
      return NextResponse.json({ error: 'Failed to load concept data' }, { status: 500 });
    }

    const concepts: Concept[] = Array.isArray(conceptData) ? conceptData : [];
    const lookup              = buildConceptLookup(concepts);
    console.log('Total concepts:', concepts.length);

    // Change 3: Pre-score all concepts, send top 30 to Prompt 1
    const scored     = scoreConceptsByKeywords(concepts, keywords);
    const top30      = scored.slice(0, 30).map(x => x.concept);
    const top5scored = scored.slice(0, 5).map(x => x.concept);

    // Change 4: Prompt 1 — identify concept directly (no chapter step)
    let match = await identifyConceptGlobal(question, top30);
    console.log('Prompt 1 result:', match?.concept_id, '| confidence:', match?.confidence);

    // Change 5: Prompt 1B — disambiguate if confidence != "high"
    if (match && match.confidence !== 'high') {
      console.log('Confidence not high — running Prompt 1B disambiguation');
      const disambig = await disambiguateConcept(question, top5scored);
      if (disambig && disambig.concept_id !== 'NONE') {
        match = disambig;
        console.log('Prompt 1B result:', match.concept_id, '| confidence:', match.confidence);
      }
    }

    // Change 6: Prompt 1C fallback — pre-scored top 60
    let conceptId: string | null = match?.concept_id ?? null;
    if (!conceptId || !lookup[conceptId]) {
      console.log('Running Prompt 1C fallback');
      conceptId = await identifyConceptFallback(question, concepts, keywords);
      console.log('Prompt 1C result:', conceptId);
    }

    // Change 13: wrong subject warning
    if (!conceptId || !lookup[conceptId]) {
      const otherSubjects = ['Biology', 'Chemistry', 'Physics'].filter(s => s !== subject).join(' or ');
      return NextResponse.json({
        chain: [],
        answer: '',
        studyPath: '',
        error: `No concept found in ${subject}. This question may belong to ${otherSubjects} — try switching subjects.`,
      });
    }

    const foundConcept = lookup[conceptId];
    console.log('Concept found:', conceptId, '|', foundConcept.concept_name);

    // Traverse builds_upon graph
    const rawChain = traverseAncestry(conceptId, lookup);

    // Dedup: keep most-connected concept per chapter
    const chapterMap = new Map<string, Concept>();
    for (const c of rawChain) {
      const key      = `${c.class}_${c.chapter_number}`;
      const existing = chapterMap.get(key);
      const curLinks = (c.builds_upon ?? []).length;
      const exLinks  = existing ? (existing.builds_upon ?? []).length : -1;
      if (!existing || curLinks > exLinks) chapterMap.set(key, c);
    }

    // Sort descending by class (Class 12 → 8)
    const chain = Array.from(chapterMap.values())
      .sort((a, b) => b.class !== a.class ? b.class - a.class : b.chapter_number - a.chapter_number);

    console.log('Chain length:', chain.length);

    // Change 9: answer with prerequisite context
    const answer = await generateAnswer(question, foundConcept, chain, options, correctAnswer);

    // Change 10: study path always generated
    const studyPath = await generateStudyPath(foundConcept, chain);

    return NextResponse.json({ chain, conceptId, answer, studyPath });

  } catch (err) {
    console.error('Ancestry API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}