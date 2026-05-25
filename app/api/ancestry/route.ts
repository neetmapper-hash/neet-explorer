import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

// ── Cache helpers ──────────────────────────────────────────────────────────────

// For heatmap PYQs: cache by exact question text (fixed NEET questions)
// For user-typed:   cache by conceptId (same concept = same ancestry + answer)
function buildCacheKey(
  question: string,
  subject: string,
  conceptId: string | null,
  isFromHeatmap: boolean
): string {
  if (isFromHeatmap) {
    // Normalize: lowercase, trim, collapse spaces
    const normalized = question.toLowerCase().trim().replace(/\s+/g, ' ');
    return `ancestry:heatmap:${subject.toLowerCase()}:${normalized}`;
  }
  return `ancestry:concept:${subject.toLowerCase()}:${conceptId}`;
}

async function getFromCache(cacheKey: string) {
  try {
    const { data, error } = await supabase
      .from('ancestry_cache')
      .select('chain, concept_id, answer, study_path')
      .eq('cache_key', cacheKey)
      .single();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

async function saveToCache(
  cacheKey: string,
  question: string,
  subject: string,
  conceptId: string,
  chain: Concept[],
  answer: string,
  studyPath: string
) {
  try {
    await supabase.from('ancestry_cache').upsert(
      {
        cache_key: cacheKey,
        question,
        subject: subject.toLowerCase(),
        concept_id: conceptId,
        chain,
        answer,
        study_path: studyPath,
      },
      { onConflict: 'cache_key' } // update if same key exists
    );
  } catch (err) {
    console.error('Cache save error:', err);
  }
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

  const base = lower
    .replace(/[?.!(),:;]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  const extra: string[] = [];

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

  return Array.from(new Set([...base, ...extra, ...clientKeywords]));
}

// ── Pre-score concepts by keyword overlap ──────────────────────────────────────

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
          const inKeyTerms = (c.key_terms ?? []).some(t => t.toLowerCase().includes(kw.toLowerCase()));
          const inName     = c.concept_name.toLowerCase().includes(kw.toLowerCase());
          score += inKeyTerms ? 3 : inName ? 2 : 1;
        }
      }
      if (c.is_main_topic) score += 0.5;
      return { concept: c, score };
    })
    .sort((a, b) => b.score - a.score);
}

// ── Prompt 1 — concept identification ─────────────────────────────────────────

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

// ── Prompt 1B — disambiguation ─────────────────────────────────────────────────

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

// ── Prompt 1C — fallback ───────────────────────────────────────────────────────

async function identifyConceptFallback(
  question: string,
  allConcepts: Concept[],
  keywords: string[]
): Promise<string | null> {
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
  maxDepth = 4
): Concept[] {
  if (depth > maxDepth || visited.has(conceptId) || !lookup[conceptId]) return [];
  visited.add(conceptId);
  const concept = lookup[conceptId];
  const ancestry: Concept[] = [];

  for (const link of concept.builds_upon ?? []) {
    const prereqId = typeof link === 'string' ? link : link.concept_id;
    if (!prereqId || !lookup[prereqId]) continue;

    const prereq = lookup[prereqId];

    if (prereq.class === concept.class && prereq.chapter_number === concept.chapter_number) {
      continue;
    }

    ancestry.push(...traverseAncestry(prereqId, lookup, visited, depth + 1, maxDepth));
  }
  ancestry.push(concept);
  return ancestry;
}

// ── Answer generation ──────────────────────────────────────────────────────────

async function generateAnswer(
  question: string,
  concept: Concept,
  chain: Concept[],
  options?: Record<string, string>,
  correctAnswer?: string
): Promise<string> {
  const context = concept.concept_name + ' (Class ' + concept.class + '): ' + concept.summary;

  const prereqConcepts = chain
    .filter(c => c.id !== concept.id)
    .slice(0, 4)
    .map(c => '- Class ' + c.class + ' Ch ' + c.chapter_number + ': ' + c.concept_name + ' — ' + (c.summary ?? '').slice(0, 80))
    .join('\n');

  const hasOptions = options && Object.keys(options).length > 0;
  const hasCorrect = !!correctAnswer;

  const isNumerical = /\d+\s*(kg|N|m\/s|ms|km|J|W|Pa|Hz|ohm|mol|atm)/i.test(question)
    || /calculate|find the|what is the value|acceleration of|velocity of|force on|energy|power|pressure|resistance|current|voltage/i.test(question);

  const maxTokens = isNumerical ? 500 : 300;

  const numericalGroqCall = async (p: string, tokens: number) => {
    for (const model of ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it']) {
      try {
        const res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, max_tokens: tokens, temperature: 0.1,
            messages: [{ role: 'user', content: p }] }),
        });
        if (res.ok) {
          const data = await res.json();
          return data.choices[0].message.content.trim();
        }
        if (res.status !== 429) break;
      } catch {}
    }
    return null;
  };

  let prompt = '';

  if (hasOptions && hasCorrect) {
    const optionLines = Object.entries(options!).map(([k, v]) => '(' + k + ') ' + v).join('\n');
    const correctText = options![correctAnswer!] ?? '';

    if (isNumerical) {
      prompt = 'You are a NEET expert. Solve this numerical question for a student.\n'
        + '- Start with: "The correct option is (' + correctAnswer + ')..."\n'
        + '- Show the key calculation in ONE line: formula → substitute values → answer\n'
        + '- Example format: "F = ma = 5 × 2 = 10 N"\n'
        + '- Then explain in 1-2 sentences why this is option (' + correctAnswer + ')\n'
        + '- Max 4 sentences total, no bullet points, no markdown\n'
        + '\nBACKGROUND: ' + context
        + '\nQUESTION: ' + question
        + '\nOPTIONS:\n' + optionLines
        + '\nTHE CORRECT ANSWER IS OPTION (' + correctAnswer + '): ' + correctText
        + '\nSOLUTION:';
    } else {
      prompt = 'You are a NEET expert. Explain this question to a student.\n'
        + '- Start with: "The correct option is (' + correctAnswer + ')..."\n'
        + '- Explain WHY that option is correct in 2-3 sentences using the background concept\n'
        + '- Briefly say why the other options are wrong\n'
        + '- Max 5 sentences, no bullet points, no markdown\n'
        + '\nBACKGROUND: ' + context
        + '\nPREREQUISITES: ' + (prereqConcepts || 'none')
        + '\nQUESTION: ' + question
        + '\nOPTIONS:\n' + optionLines
        + '\nTHE CORRECT ANSWER IS OPTION (' + correctAnswer + '): ' + correctText
        + '\nEXPLANATION:';
    }
  } else if (!hasOptions && hasCorrect) {
    prompt = 'You are a NEET expert. Explain this question to a student.\n'
      + '- The answer is: ' + correctAnswer + '\n'
      + '- Explain WHY this is correct in 2-3 sentences using the background concept\n'
      + '- Max 4 sentences, no bullet points, no markdown\n'
      + '\nBACKGROUND: ' + context
      + '\nPREREQUISITES: ' + (prereqConcepts || 'none')
      + '\nQUESTION: ' + question
      + '\nEXPLANATION:';
  } else {
    prompt = 'You are a NEET expert. Answer this question for a student in 3-4 sentences.\n'
      + '- Answer directly and clearly\n'
      + '- Use the background concept to explain\n'
      + '- No bullet points, no markdown, speak as a teacher\n'
      + '\nBACKGROUND: ' + context
      + '\nPREREQUISITES: ' + (prereqConcepts || 'none')
      + '\nQUESTION: ' + question
      + '\nANSWER:';
  }

  if (isNumerical) {
    return await numericalGroqCall(prompt, maxTokens) ?? '';
  }
  return await groqCall(prompt, maxTokens, 0.3) ?? '';
}

// ── Study path ─────────────────────────────────────────────────────────────────

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

    const {
      question,
      subject: providedSubject,
      options,
      correctAnswer,
      keywords: clientKeywords = [],
      fromHeatmap = false,   // <-- client sends this flag when question comes from heatmap
    } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 });
    }

    const subject = providedSubject ?? 'Biology';
    console.log('Subject:', subject, '| fromHeatmap:', fromHeatmap);

    // ── 1. Check cache for heatmap questions (exact question match) ────────────
    if (fromHeatmap) {
      const heatmapKey = buildCacheKey(question, subject, null, true);
      const cached = await getFromCache(heatmapKey);
      if (cached) {
        console.log('Cache HIT (heatmap):', heatmapKey);
        return NextResponse.json({
          chain: cached.chain,
          conceptId: cached.concept_id,
          answer: cached.answer,
          studyPath: cached.study_path,
          fromCache: true,
        });
      }
      console.log('Cache MISS (heatmap):', heatmapKey);
    }

    // ── 2. Keyword extraction ──────────────────────────────────────────────────
    const keywords = extractAndEnrichKeywords(question, clientKeywords);
    console.log('Keywords:', keywords.slice(0, 8).join(', '));

    // ── 3. Load concept data ───────────────────────────────────────────────────
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

    // ── 4. Score + identify concept ────────────────────────────────────────────
    const scored     = scoreConceptsByKeywords(concepts, keywords);
    const top30      = scored.slice(0, 30).map(x => x.concept);
    const top5scored = scored.slice(0, 5).map(x => x.concept);

    let match = await identifyConceptGlobal(question, top30);
    console.log('Prompt 1 result:', match?.concept_id, '| confidence:', match?.confidence);

    if (match && match.confidence !== 'high') {
      console.log('Confidence not high — running Prompt 1B disambiguation');
      const disambig = await disambiguateConcept(question, top5scored);
      if (disambig && disambig.concept_id !== 'NONE') {
        match = disambig;
        console.log('Prompt 1B result:', match.concept_id, '| confidence:', match.confidence);
      }
    }

    let conceptId: string | null = match?.concept_id ?? null;
    if (!conceptId || !lookup[conceptId]) {
      console.log('Running Prompt 1C fallback');
      conceptId = await identifyConceptFallback(question, concepts, keywords);
      console.log('Prompt 1C result:', conceptId);
    }

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

    // ── 5. Check cache for user-typed questions (concept-level cache) ──────────
    if (!fromHeatmap) {
      const conceptKey = buildCacheKey(question, subject, conceptId, false);
      const cached = await getFromCache(conceptKey);
      if (cached) {
        console.log('Cache HIT (concept):', conceptKey);
        return NextResponse.json({
          chain: cached.chain,
          conceptId: cached.concept_id,
          answer: cached.answer,
          studyPath: cached.study_path,
          fromCache: true,
        });
      }
      console.log('Cache MISS (concept):', conceptKey);
    }

    // ── 6. Traverse ancestry graph ─────────────────────────────────────────────
    const rawChain = traverseAncestry(conceptId, lookup);

    const chapterMap = new Map<string, Concept>();
    for (const c of rawChain) {
      const key      = `${c.class}_${c.chapter_number}`;
      const existing = chapterMap.get(key);
      const curLinks = (c.builds_upon ?? []).length;
      const exLinks  = existing ? (existing.builds_upon ?? []).length : -1;
      if (!existing || curLinks > exLinks) chapterMap.set(key, c);
    }

    const chain = Array.from(chapterMap.values())
      .sort((a, b) => b.class !== a.class ? b.class - a.class : b.chapter_number - a.chapter_number);

    console.log('Chain length:', chain.length);

    // ── 7. Generate answer + study path ───────────────────────────────────────
    const answer    = await generateAnswer(question, foundConcept, chain, options, correctAnswer);
    const studyPath = await generateStudyPath(foundConcept, chain);

    // ── 8. Save to cache ───────────────────────────────────────────────────────
    const cacheKey = buildCacheKey(question, subject, conceptId, fromHeatmap);
    await saveToCache(cacheKey, question, subject, conceptId, chain, answer, studyPath);
    console.log('Saved to cache:', cacheKey);

    return NextResponse.json({ chain, conceptId, answer, studyPath, fromCache: false });

  } catch (err) {
    console.error('Ancestry API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}