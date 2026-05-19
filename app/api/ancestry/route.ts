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
  concept_name: string;   // renamed from concept_title
  summary: string;        // renamed from description
  key_terms: string[];
  builds_upon: { concept_id: string }[];  // now array of objects
  domain: string;
  class: number;
  chapter_number: number;
  chapter_name: string;
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

function buildConceptLookup(data: Concept[]): Record<string, Concept> {
  const lookup: Record<string, Concept> = {};
  for (const concept of data) {
    lookup[concept.id] = concept;
  }
  return lookup;
}

// Chapter index keyed by class_N_chapter_N (e.g. class_11_chapter_4)
function buildChapterIndex(data: Concept[]): Record<string, Concept[]> {
  const index: Record<string, Concept[]> = {};
  for (const concept of data) {
    const key = `class_${concept.class}_chapter_${concept.chapter_number}`;
    if (!index[key]) index[key] = [];
    index[key].push(concept);
  }
  return index;
}

// Real NCERT chapter titles — keyed by subject then class/chapter path
// Separate per subject to avoid duplicate key conflicts
const CHAPTER_TITLES: Record<string, Record<string, string>> = {
  Biology: {
    // Class 8 — biology chapters from integrated science
    'class_8_chapter_1_part1': 'Exploring the Investigative World of Science',
    'class_8_chapter_2_part1': 'The Invisible Living World - Microorganisms Bacteria Virus',
    'class_8_chapter_3_part1': 'Health - Disease Immunity Nutrition',
    'class_8_chapter_12_part1': 'How Nature Works in Harmony - Ecology Food Chain',
    'class_8_chapter_13_part1': 'Earth - Environment Ecosystem Pollution',
    // Class 9 — actual chapter numbers from JSON
    'class_9_chapter_1_part1': 'Exploration Secondary Science',
    'class_9_chapter_2_part1': 'Cell - Building Block of Life - Membrane Organelles Plasma',
    'class_9_chapter_3_part1': 'Tissues in Action - Plant Animal Tissues',
    'class_9_chapter_11_part1': 'Reproduction - Asexual Sexual Organisms',
    'class_9_chapter_12_part1': 'Diversity and Classification - Kingdom Phylum',
    'class_9_chapter_13_part1': 'Earth as a System - Energy Matter Life Ecology',
    // Class 10 — actual chapter numbers from JSON
    'class_10_chapter_5_part1': 'Life Processes - Nutrition Respiration Transport Excretion',
    'class_10_chapter_6_part1': 'Control and Coordination - Nervous System Hormones Reflex',
    'class_10_chapter_7_part1': 'Reproduction - Organisms Sexual Asexual Pollination',
    'class_10_chapter_8_part1': 'Heredity - Genetics Mendel Variation Inheritance',
    'class_10_chapter_13_part1': 'Environment - Ecosystem Pollution Conservation',
    // Class 11 — all 19 chapters
    'class_11_chapter_1_part1': 'The Living World - Biodiversity Taxonomy Classification',
    'class_11_chapter_2_part1': 'Biological Classification - Five Kingdoms Monera Protista Fungi',
    'class_11_chapter_3_part1': 'Plant Kingdom - Algae Bryophytes Pteridophytes Gymnosperms Angiosperms',
    'class_11_chapter_4_part1': 'Animal Kingdom - Porifera Coelenterata Chordata Classification',
    'class_11_chapter_5_part1': 'Morphology of Flowering Plants - Root Stem Leaf Flower Fruit',
    'class_11_chapter_6_part1': 'Anatomy of Flowering Plants - Meristem Vascular Tissue',
    'class_11_chapter_7_part1': 'Structural Organisation in Animals - Tissues Organ System',
    'class_11_chapter_8_part1': 'Cell The Unit of Life - Plasma Membrane Cell Wall Organelles Nucleus Mitochondria',
    'class_11_chapter_9_part1': 'Biomolecules - Proteins Enzymes Carbohydrates Lipids Nucleic Acids',
    'class_11_chapter_10_part1': 'Cell Cycle and Cell Division - Mitosis Meiosis Interphase',
    'class_11_chapter_11_part1': 'Photosynthesis in Higher Plants - Light Reaction Dark Reaction Calvin Cycle',
    'class_11_chapter_12_part1': 'Respiration in Plants - Glycolysis Krebs Cycle ATP Fermentation',
    'class_11_chapter_13_part1': 'Plant Growth and Development - Auxin Gibberellin Cytokinin Dormancy',
    'class_11_chapter_14_part1': 'Breathing and Exchange of Gases - Lungs Alveoli Haemoglobin',
    'class_11_chapter_15_part1': 'Body Fluids and Circulation - Blood Heart Cardiac Cycle Lymph',
    'class_11_chapter_16_part1': 'Excretory Products and Elimination - Kidney Nephron Urine Formation',
    'class_11_chapter_17_part1': 'Locomotion and Movement - Muscles Joints Skeleton Actin Myosin',
    'class_11_chapter_18_part1': 'Neural Control and Coordination - Neuron Synapse Brain Reflex Arc',
    'class_11_chapter_19_part1': 'Chemical Coordination - Endocrine Glands Hormones Insulin Thyroid',
    // Class 12 — actual chapter numbers from JSON
    'class_12_chapter_1_part1': 'Sexual Reproduction in Flowering Plants - Pollination Fertilisation',
    'class_12_chapter_2_part1': 'Human Reproduction - Male Female Reproductive System Gametogenesis',
    'class_12_chapter_3_part1': 'Reproductive Health - STDs Contraception Infertility',
    'class_12_chapter_4_part1': 'Principles of Inheritance and Variation - Mendel Genetics Linkage',
    'class_12_chapter_5_part1': 'Molecular Basis of Inheritance - DNA RNA Replication Transcription Translation',
    'class_12_chapter_6_part1': 'Evolution - Origin of Life Natural Selection Speciation Darwin',
    'class_12_chapter_7_part1': 'Human Health and Disease - Immunity Pathogens Cancer AIDS Drugs',
    'class_12_chapter_8_part1': 'Microbes in Human Welfare - Fermentation Antibiotics Biogas',
    'class_12_chapter_9_part1': 'Biotechnology Principles and Processes - Recombinant DNA Cloning PCR',
    'class_12_chapter_10_part1': 'Biotechnology and Applications - GMO Insulin Gene Therapy',
    'class_12_chapter_11_part1': 'Organisms and Populations - Ecology Population Growth Interaction',
    'class_12_chapter_12_part1': 'Ecosystem - Food Chain Energy Flow Nutrient Cycling',
    'class_12_chapter_13_part1': 'Biodiversity and Conservation - Hotspots Extinction Protected Areas',
  },
    Chemistry: {
    'class_9_chapter_1_part1': 'Matter - Particles States of Matter',
    'class_9_chapter_2_part1': 'Is Matter Around Us Pure - Mixtures Solutions',
    'class_9_chapter_3_part1': 'Atoms and Molecules - Dalton Laws Chemical Combination',
    'class_9_chapter_4_part1': 'Structure of the Atom - Electrons Protons Neutrons',
    'class_10_chapter_1_part1': 'Chemical Reactions and Equations',
    'class_10_chapter_2_part1': 'Acids Bases and Salts - pH Neutralisation',
    'class_10_chapter_3_part1': 'Metals and Non-metals - Reactivity Series',
    'class_10_chapter_4_part1': 'Carbon and its Compounds - Covalent Bonding Organic',
    'class_11_chapter_1_part1': 'Some Basic Concepts of Chemistry - Mole Stoichiometry',
    'class_11_chapter_2_part1': 'Structure of Atom - Orbitals Quantum Numbers Bohr',
    'class_11_chapter_3_part1': 'Classification of Elements and Periodicity',
    'class_11_chapter_4_part1': 'Chemical Bonding and Molecular Structure',
    'class_11_chapter_5_part1': 'Thermodynamics - Enthalpy Entropy Gibbs Energy',
    'class_11_chapter_6_part1': 'Equilibrium - Le Chatelier Kp Kc Ionic',
    'class_11_chapter_1_part2': 'Redox Reactions - Oxidation Reduction',
    'class_11_chapter_2_part2': 'Organic Chemistry Basic Principles and Techniques',
    'class_11_chapter_3_part2': 'Hydrocarbons - Alkanes Alkenes Alkynes Benzene',
    'class_12_chapter_1_part1': 'Solutions - Concentration Colligative Properties',
    'class_12_chapter_2_part1': 'Electrochemistry - Galvanic Electrolytic Cells Nernst',
    'class_12_chapter_3_part1': 'Chemical Kinetics - Rate Laws Activation Energy',
    'class_12_chapter_4_part1': 'd and f Block Elements - Transition Metals',
    'class_12_chapter_5_part1': 'Coordination Compounds - Ligands CFSE Werner',
    'class_12_chapter_1_part2': 'Haloalkanes and Haloarenes',
    'class_12_chapter_2_part2': 'Alcohols Phenols and Ethers',
    'class_12_chapter_3_part2': 'Aldehydes Ketones and Carboxylic Acids',
    'class_12_chapter_4_part2': 'Amines - Classification Properties Reactions',
    'class_12_chapter_5_part2': 'Biomolecules - Carbohydrates Proteins Nucleic Acids',
  },
  Physics: {
    'class_9_chapter_1_part1': 'Motion - Distance Displacement Velocity Acceleration',
    'class_9_chapter_2_part1': 'Force and Laws of Motion - Newton',
    'class_9_chapter_3_part1': 'Gravitation - Weight Mass Free Fall',
    'class_9_chapter_4_part1': 'Work Energy and Power',
    'class_9_chapter_5_part1': 'Sound - Wave Properties Reflection',
    'class_10_chapter_1_part1': 'Light - Reflection and Refraction - Mirrors Lenses',
    'class_10_chapter_2_part1': 'Human Eye and Colourful World - Defects Vision',
    'class_10_chapter_3_part1': 'Electricity - Ohm Law Resistance Circuits',
    'class_10_chapter_4_part1': 'Magnetic Effects of Electric Current',
    'class_10_chapter_5_part1': 'Sources of Energy - Renewable Non-renewable',
    'class_11_chapter_1_part1': 'Physical World - Units and Measurements',
    'class_11_chapter_2_part1': 'Motion in a Straight Line - Kinematics',
    'class_11_chapter_3_part1': 'Motion in a Plane - Vectors Projectile',
    'class_11_chapter_4_part1': 'Laws of Motion - Newton Forces Friction',
    'class_11_chapter_5_part1': 'Work Energy and Power - Conservation',
    'class_11_chapter_6_part1': 'System of Particles and Rotational Motion',
    'class_11_chapter_7_part1': 'Gravitation - Orbital Motion Satellites',
    'class_11_chapter_8_part1': 'Mechanical Properties of Solids - Stress Strain',
    'class_11_chapter_9_part1': 'Mechanical Properties of Fluids - Pressure Bernoulli',
    'class_11_chapter_10_part1': 'Thermal Properties of Matter - Heat Expansion',
    'class_11_chapter_11_part1': 'Thermodynamics - Laws Heat Engine',
    'class_11_chapter_12_part1': 'Kinetic Theory - Gas Laws Molecular Speed',
    'class_11_chapter_13_part1': 'Oscillations - SHM Pendulum Spring',
    'class_11_chapter_14_part1': 'Waves - Transverse Longitudinal Sound Speed',
    'class_12_chapter_1_part1': 'Electric Charges and Fields - Coulomb Gauss',
    'class_12_chapter_2_part1': 'Electrostatic Potential and Capacitance',
    'class_12_chapter_3_part1': 'Current Electricity - Ohm Kirchhoff Wheatstone',
    'class_12_chapter_4_part1': 'Moving Charges and Magnetism - Biot Savart Ampere',
    'class_12_chapter_5_part1': 'Magnetism and Matter - Diamagnetic Paramagnetic',
    'class_12_chapter_6_part1': 'Electromagnetic Induction - Faraday Lenz',
    'class_12_chapter_7_part1': 'Alternating Current - RLC Resonance Transformer',
    'class_12_chapter_8_part1': 'Electromagnetic Waves - Maxwell Spectrum',
    'class_12_chapter_9_part1': 'Ray Optics and Optical Instruments - Lenses Mirrors',
    'class_12_chapter_10_part1': 'Wave Optics - Interference Diffraction Polarisation',
    'class_12_chapter_11_part1': 'Dual Nature of Radiation and Matter - Photoelectric',
    'class_12_chapter_12_part1': 'Atoms - Bohr Model Hydrogen Spectrum',
    'class_12_chapter_13_part1': 'Nuclei - Radioactivity Fission Fusion Binding Energy',
    'class_12_chapter_14_part1': 'Semiconductor Electronics - Diode Transistor Logic Gates',
  },
};

// Chapter name index: chapterKey → real title or fallback
function buildChapterNames(data: Concept[], subject: string): Record<string, string> {
  const subjectTitles = CHAPTER_TITLES[subject] ?? {};
  const names: Record<string, string> = {};
  for (const concept of data) {
    const key = `class_${concept.class}_chapter_${concept.chapter_number}`;
    if (!names[key]) {
      // CHAPTER_TITLES keys may have _part1/_part2 suffix — try both
      const titleKey = subjectTitles[key + '_part1'] ?? subjectTitles[key + '_part2'] ?? subjectTitles[key];
      names[key] = titleKey ?? concept.chapter_name ?? key;
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
  for (const link of concept.builds_upon ?? []) {
    const prereqId = typeof link === 'string' ? link : link.concept_id;
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
  const context = `${concept.concept_name}: ${concept.summary}`;
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
  // Include summary and key_terms so Groq can semantically match
  const conceptList = concepts.map(c => {
    const terms = (c.key_terms ?? []).slice(0, 5).join(', ');
    const summary = (c.summary ?? '').slice(0, 120);
    return `${c.id} | ${c.concept_name} | ${terms} | ${summary}`;
  }).join('\n');

  const prompt = `You are a NEET expert. Which concept does this question DIRECTLY test?

QUESTION: ${question}

CONCEPTS (id | name | key_terms | summary):
${conceptList}

Rules:
- Pick the concept whose key_terms and summary best match the question
- Prefer the most SPECIFIC concept over a general one
- Return ONLY the concept ID exactly as shown, or NONE
- No explanation`;

  const result = await groqCall(prompt, 40, 0);
  if (!result || result.trim() === 'NONE') return null;

  const match = result.match(/([a-z]+_c\d+_ch\d+_[ms]\d+)/);
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
    const conceptList = batch.map(c => {
      const terms = (c.key_terms ?? []).slice(0, 4).join(', ');
      return `${c.id} | ${c.concept_name} | ${terms}`;
    }).join('\n');

    const prompt = `NEET question: ${question}
Which concept ID best matches? Consider key_terms carefully.
${conceptList}
Return ONLY the concept ID or NONE.`;

    const result = await groqCall(prompt, 30, 0);
    if (result && result !== 'NONE') {
      const match = result.match(/([a-z]+_c\d+_ch\d+_[ms]\d+)/);
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
        `${req.nextUrl.origin}/${subject.toLowerCase()}_concepts_new.json`
      );
      if (!conceptRes.ok) {
        return NextResponse.json({ error: 'Concept data not found for subject' }, { status: 404 });
      }
      conceptData = await conceptRes.json();
    } catch {
      return NextResponse.json({ error: 'Failed to load concept data' }, { status: 500 });
    }

    const concepts: Concept[] = Array.isArray(conceptData) ? conceptData : [];
    const lookup = buildConceptLookup(concepts);
    const chapterIndex = buildChapterIndex(concepts);
    const chapterNames = buildChapterNames(concepts, subject);

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

    // Deduplicate — one concept per chapter, keep the one with most builds_upon links
    const chapterMap = new Map<string, Concept>();
    for (const concept of rawChain) {
      const parts = concept.id.split('_');
      const key = parts[1] + '_' + parts[2];
      const existing = chapterMap.get(key);
      const currentLinks = (concept.builds_upon ?? []).length;
      const existingLinks = existing ? (existing.builds_upon ?? []).length : -1;
      if (!existing || currentLinks > existingLinks) {
        chapterMap.set(key, concept);
      }
    }
    const dedupedChain = Array.from(chapterMap.values());

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