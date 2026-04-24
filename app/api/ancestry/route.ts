import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? ''
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Fallback models — each has separate TPM quota
const GROQ_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
];

interface Concept {
  id: string;
  concept_title: string;
  description: string;
  key_terms: string[];
  builds_upon: string[];
}

// ── GROQ CALL WITH MODEL FALLBACK ─────────────────────────────────────────────
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
      if (res.status === 429) {
        console.log(`Rate limit on ${model}, trying next model...`);
        continue;
      }
      console.log(`Groq error on ${model}: ${res.status} ${errText}`);
    } catch (e) {
      console.log(`Groq exception on ${model}:`, e);
    }
  }
  console.log('All Groq models exhausted');
  return null;
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

// Chapter index: chapterKey → concepts in that chapter
function buildChapterIndex(data: any): Record<string, Concept[]> {
  const index: Record<string, Concept[]> = {};
  for (const [classKey, classData] of Object.entries(data.classes) as any[]) {
    for (const [chapterKey, chapterData] of Object.entries((classData as any).chapters) as any[]) {
      const key = `${classKey}_${chapterKey}`;
      index[key] = (chapterData as any).concepts ?? [];
    }
  }
  return index;
}

// Real NCERT chapter titles keyed by class/chapter path
const CHAPTER_TITLES: Record<string, string> = {
  // ── BIOLOGY Class 9 ──────────────────────────────────────────────────────
  'class_9_chapter_5_part1': 'Cell - The Unit of Life',
  'class_9_chapter_6_part1': 'Tissues in Living Organisms',
  'class_9_chapter_12_part1': 'Food Security and Agriculture',

  // ── BIOLOGY Class 10 ─────────────────────────────────────────────────────
  'class_10_chapter_5_part1': 'Life Processes - Nutrition Respiration Transport',
  'class_10_chapter_6_part1': 'Control and Coordination - Nervous Hormonal',
  'class_10_chapter_7_part1': 'Reproduction in Organisms',
  'class_10_chapter_8_part1': 'Heredity Evolution Genetics Variation',
  'class_10_chapter_13_part1': 'Environment and Ecosystem',

  // ── BIOLOGY Class 11 ─────────────────────────────────────────────────────
  'class_11_chapter_1_part1': 'The Living World - Biodiversity Taxonomy',
  'class_11_chapter_2_part1': 'Biological Classification - Kingdoms',
  'class_11_chapter_3_part1': 'Plant Kingdom - Algae Bryophytes Pteridophytes',
  'class_11_chapter_4_part1': 'Animal Kingdom - Classification Levels',
  'class_11_chapter_5_part1': 'Morphology of Flowering Plants',
  'class_11_chapter_6_part1': 'Anatomy of Plants - Tissues',
  'class_11_chapter_7_part1': 'Structural Organisation in Animals - Tissues Organs',
  'class_11_chapter_8_part1': 'Cell - The Unit of Life - Organelles Membrane',
  'class_11_chapter_9_part1': 'Biomolecules - Proteins Enzymes Carbohydrates Lipids',
  'class_11_chapter_10_part1': 'Cell Cycle and Cell Division - Mitosis Meiosis',
  'class_11_chapter_11_part1': 'Photosynthesis in Higher Plants',
  'class_11_chapter_12_part1': 'Respiration in Plants - ATP Energy',
  'class_11_chapter_13_part1': 'Plant Growth and Development - Hormones',
  'class_11_chapter_14_part1': 'Digestion and Absorption',
  'class_11_chapter_15_part1': 'Body Fluids and Circulation - Blood Heart',
  'class_11_chapter_16_part1': 'Excretory Products and Elimination - Kidney Nephron',
  'class_11_chapter_17_part1': 'Locomotion and Movement - Muscles Joints',
  'class_11_chapter_18_part1': 'Neural Control and Coordination - Nervous System Brain',
  'class_11_chapter_19_part1': 'Chemical Coordination - Endocrine Hormones Insulin',

  // ── BIOLOGY Class 12 ─────────────────────────────────────────────────────
  'class_12_chapter_2_part1': 'Sexual Reproduction in Flowering Plants',
  'class_12_chapter_3_part1': 'Human Reproduction - Male Female Reproductive System',
  'class_12_chapter_4_part1': 'Molecular Basis of Inheritance - DNA RNA Replication',
  'class_12_chapter_5_part1': 'Principles of Inheritance - Genetics Mendel',
  'class_12_chapter_6_part1': 'Evolution - Origin of Life Natural Selection',
  'class_12_chapter_7_part1': 'Human Health and Disease - Immunity Innate Acquired Pathogens Cancer AIDS',
  'class_12_chapter_8_part1': 'Microbes in Human Welfare - Biotechnology Applications',
  'class_12_chapter_9_part1': 'Biotechnology Principles and Processes - Recombinant DNA',
  'class_12_chapter_10_part1': 'Biotechnology and its Applications',
  'class_12_chapter_11_part1': 'Organisms and Populations - Ecology',
  'class_12_chapter_12_part1': 'Ecosystem - Food Chain Energy Flow',
  'class_12_chapter_13_part1': 'Biodiversity and Conservation',

  // ── CHEMISTRY Class 9 ────────────────────────────────────────────────────
  'class_9_chapter_1_part1': 'Matter - Particles States of Matter',
  'class_9_chapter_2_part1': 'Is Matter Around Us Pure - Mixtures Solutions',
  'class_9_chapter_3_part1': 'Atoms and Molecules - Dalton Laws Chemical Combination',
  'class_9_chapter_4_part1': 'Structure of the Atom - Electrons Protons Neutrons',

  // ── CHEMISTRY Class 10 ───────────────────────────────────────────────────
  'class_10_chapter_1_part1': 'Chemical Reactions and Equations',
  'class_10_chapter_2_part1': 'Acids Bases and Salts - pH Neutralisation',
  'class_10_chapter_3_part1': 'Metals and Non-metals - Reactivity Series',
  'class_10_chapter_4_part1': 'Carbon and its Compounds - Covalent Bonding Organic',

  // ── CHEMISTRY Class 11 Part 1 ────────────────────────────────────────────
  'class_11_chapter_1_part1': 'Some Basic Concepts of Chemistry - Mole Stoichiometry',
  'class_11_chapter_2_part1': 'Structure of Atom - Orbitals Quantum Numbers',
  'class_11_chapter_3_part1': 'Classification of Elements and Periodicity',
  'class_11_chapter_4_part1': 'Chemical Bonding and Molecular Structure',
  'class_11_chapter_5_part1': 'Thermodynamics - Enthalpy Entropy Gibbs Energy',
  'class_11_chapter_6_part1': 'Equilibrium - Le Chatelier Kp Kc Ionic',

  // ── CHEMISTRY Class 11 Part 2 ────────────────────────────────────────────
  'class_11_chapter_1_part2': 'Redox Reactions - Oxidation Reduction',
  'class_11_chapter_2_part2': 'Organic Chemistry Basic Principles and Techniques',
  'class_11_chapter_3_part2': 'Hydrocarbons - Alkanes Alkenes Alkynes Benzene',

  // ── CHEMISTRY Class 12 Part 1 ────────────────────────────────────────────
  'class_12_chapter_1_part1': 'Solutions - Concentration Colligative Properties',
  'class_12_chapter_2_part1': 'Electrochemistry - Galvanic Electrolytic Cells Nernst',
  'class_12_chapter_3_part1': 'Chemical Kinetics - Rate Laws Activation Energy',
  'class_12_chapter_4_part1': 'd and f Block Elements - Transition Metals',
  'class_12_chapter_5_part1': 'Coordination Compounds - Ligands CFSE Werner',

  // ── CHEMISTRY Class 12 Part 2 ────────────────────────────────────────────
  'class_12_chapter_1_part2': 'Haloalkanes and Haloarenes',
  'class_12_chapter_2_part2': 'Alcohols Phenols and Ethers',
  'class_12_chapter_3_part2': 'Aldehydes Ketones and Carboxylic Acids',
  'class_12_chapter_4_part2': 'Amines - Classification Properties Reactions',
  'class_12_chapter_5_part2': 'Biomolecules - Carbohydrates Proteins Nucleic Acids',
};

// Chapter name index: chapterKey → real title or fallback
function buildChapterNames(data: any): Record<string, string> {
  const names: Record<string, string> = {};
  for (const [classKey, classData] of Object.entries(data.classes) as any[]) {
    for (const [chapterKey, chapterData] of Object.entries((classData as any).chapters) as any[]) {
      const key = `${classKey}_${chapterKey}`;
      // Use real NCERT title if available, otherwise fallback to stored name
      names[key] = CHAPTER_TITLES[key] ?? (chapterData as any).chapter_name ?? chapterKey;
    }
  }
  return names;
}

function traverseAncestry(
  conceptId: string,
  lookup: Record<string, Concept>,
  visited = new Set<string>(),
  depth = 0,
  maxDepth = 4
): Concept[] {
  if (depth > maxDepth) return [];
  if (visited.has(conceptId) || !lookup[conceptId]) return [];
  visited.add(conceptId);
  const concept = lookup[conceptId];
  const ancestry: Concept[] = [];
  for (const prereqId of concept.builds_upon ?? []) {
    ancestry.push(...traverseAncestry(prereqId, lookup, visited, depth + 1, maxDepth));
  }
  ancestry.push(concept);
  return ancestry;
}

async function generateAnswer(
  question: string,
  concept: Concept,
  options?: Record<string, string>,
  correctAnswer?: string
): Promise<string> {
  const context = `${concept.concept_title}: ${concept.description}`;
  const hasOptions = options && Object.keys(options).length > 0 && correctAnswer;

  const prompt = hasOptions
    ? `You are a NEET expert. Explain this question to a student.
- Start with: "The correct option is (${correctAnswer})..."
- Explain WHY that option is correct in 2-3 sentences using the background concept
- Say briefly why the other options are wrong
- Max 5 sentences total, no bullet points, no markdown

BACKGROUND: ${context}
QUESTION: ${question}
OPTIONS:
${Object.entries(options!).map(([k, v]) => `(${k}) ${v}`).join('\n')}
THE CORRECT ANSWER IS OPTION (${correctAnswer}): ${options![correctAnswer!] ?? ''}
EXPLANATION:`
    : `You are a NEET expert. Answer this question for a student in 3-4 sentences.
- Answer directly and clearly, no mention of options
- Use the background concept to explain
- No bullet points, no markdown, speak as a teacher

BACKGROUND: ${context}
QUESTION: ${question}
ANSWER:`;

  return await groqCall(prompt, 300, 0.3) ?? '';
}

async function detectSubjectFromQuestion(question: string): Promise<string> {
  const prompt = `You are a NEET exam expert. Which subject does this question belong to?
Question: ${question}
Reply with exactly one word — Biology, Chemistry, or Physics. Nothing else.`;

  const result = await groqCall(prompt, 5, 0);
  if (!result) return 'Biology';
  if (['Biology', 'Chemistry', 'Physics'].includes(result)) return result;
  if (result.toLowerCase().includes('bio')) return 'Biology';
  if (result.toLowerCase().includes('chem')) return 'Chemistry';
  if (result.toLowerCase().includes('phys')) return 'Physics';
  return 'Biology';
}

// ── STEP 1: Identify chapter (~50 tokens) ─────────────────────────────────────
async function identifyChapter(
  question: string,
  chapterNames: Record<string, string>
): Promise<string | null> {
  const chapterList = Object.entries(chapterNames)
    .map(([key, name]) => `${key}: ${name}`)
    .join('\n');

  const prompt = `You are a NEET expert. Which chapter does this question belong to?

QUESTION: ${question}

CHAPTERS:
${chapterList}

Return ONLY the chapter key exactly as shown (e.g. class_12_chapter_1_part1).
If no match return: NONE
No explanation.`;

  const result = await groqCall(prompt, 40, 0);
  if (!result || result.trim() === 'NONE') return null;

  // Find exact match in chapter keys
  const keys = Object.keys(chapterNames);
  const exact = keys.find(k => result.includes(k));
  return exact ?? null;
}

// ── STEP 2: Identify concept within chapter (~200 tokens) ──────────────────────
async function identifyConceptInChapter(
  question: string,
  concepts: Concept[]
): Promise<string | null> {
  const conceptList = concepts.map(c => `${c.id}|${c.concept_title}`).join('\n');

  const prompt = `You are a NEET expert. Which concept does this question test?

QUESTION: ${question}

CONCEPTS:
${conceptList}

Return ONLY the concept ID (e.g. bio_c12_ch1_c3) or NONE.
No explanation.`;

  const result = await groqCall(prompt, 30, 0);
  if (!result || result.trim() === 'NONE') return null;

  // Extract concept ID pattern
  const match = result.match(/([a-z]+_c\d+_ch\d+_c\d+)/);
  return match ? match[1] : null;
}

// ── FALLBACK: Search all concepts in batches of 80 ────────────────────────────
async function identifyConceptFallback(
  question: string,
  lookup: Record<string, Concept>
): Promise<string | null> {
  const allConcepts = Object.values(lookup);
  const BATCH = 80;

  for (let i = 0; i < allConcepts.length; i += BATCH) {
    const batch = allConcepts.slice(i, i + BATCH);
    const conceptList = batch.map(c => `${c.id}|${c.concept_title}`).join('\n');

    const prompt = `NEET question: ${question}
Which concept ID best matches?
${conceptList}
Return ONLY the ID or NONE.`;

    const result = await groqCall(prompt, 30, 0);
    if (result && result !== 'NONE') {
      const match = result.match(/([a-z]+_c\d+_ch\d+_c\d+)/);
      const conceptId = match ? match[1] : result.trim();
      if (lookup[conceptId]) return conceptId;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    console.log('GROQ_API_KEY set:', !!GROQ_API_KEY, 'length:', GROQ_API_KEY.length);

    const { question, subject: providedSubject, options, correctAnswer } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 });
    }

    // Auto-detect subject if not provided
    const subject = providedSubject ?? await detectSubjectFromQuestion(question);
    console.log('Subject:', subject, '| Source:', providedSubject ? 'provided' : 'auto-detected');

    // Load concept data
    let conceptData: any;
    try {
      const conceptRes = await fetch(
        `${req.nextUrl.origin}/${subject.toLowerCase()}_concepts.json`
      );
      if (!conceptRes.ok) {
        return NextResponse.json({ error: 'Concept data not found for subject' }, { status: 404 });
      }
      conceptData = await conceptRes.json();
    } catch {
      return NextResponse.json({ error: 'Failed to load concept data' }, { status: 500 });
    }

    const lookup = buildConceptLookup(conceptData);
    const chapterIndex = buildChapterIndex(conceptData);
    const chapterNames = buildChapterNames(conceptData);

    console.log('Total concepts:', Object.keys(lookup).length);
    console.log('Total chapters:', Object.keys(chapterIndex).length);

    // ── STEP 1: Identify chapter ───────────────────────────────────────────
    const chapterKey = await identifyChapter(question, chapterNames);
    console.log('Identified chapter:', chapterKey);

    let conceptId: string | null = null;

    if (chapterKey && chapterIndex[chapterKey]) {
      // ── STEP 2: Identify concept within chapter ────────────────────────
      const chapterConcepts = chapterIndex[chapterKey];
      console.log(`Searching ${chapterConcepts.length} concepts in ${chapterKey}`);
      conceptId = await identifyConceptInChapter(question, chapterConcepts);
      console.log('Identified concept:', conceptId);
    }

    // Fallback if chapter detection missed
    if (!conceptId) {
      console.log('Chapter detection failed — running fallback search');
      conceptId = await identifyConceptFallback(question, lookup);
    }

    if (!conceptId || !lookup[conceptId]) {
      return NextResponse.json({ chain: [] });
    }

    // Traverse ancestry
    const rawChain = traverseAncestry(conceptId, lookup);

    // Deduplicate — one concept per chapter
    const seenChapters = new Set<string>();
    const dedupedChain = rawChain.filter(concept => {
      const parts = concept.id.split('_');
      const key = parts[1] + '_' + parts[2];
      if (seenChapters.has(key)) return false;
      seenChapters.add(key);
      return true;
    });

    // Sort Class 12 → 9
    const getClass = (id: string) => {
      try { return parseInt(id.split('_')[1].replace('c', '')); }
      catch { return 0; }
    };
    const chain = [...dedupedChain].sort((a, b) => getClass(b.id) - getClass(a.id));

    console.log('Concept found:', conceptId);
    console.log('Chain length:', chain.length);

    const answer = await generateAnswer(question, lookup[conceptId], options, correctAnswer);

    return NextResponse.json({ chain, conceptId, answer });

  } catch (err) {
    console.error('Ancestry API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}