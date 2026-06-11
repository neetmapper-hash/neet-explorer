import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';

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

// ── Difficulty descriptions ────────────────────────────────────────────────────

const DIFFICULTY_DESCRIPTIONS: Record<string, string> = {
  easy:     'straightforward recall — definitions, basic facts, simple identification',
  medium:   'application — apply concepts to simple scenarios, cause and effect',
  hard:     'analytical — multi-step reasoning, compare and contrast, explain why',
  advanced: 'complex — integrate multiple concepts, interpret data, predict outcomes',
  expert:   'tricky — misconceptions, exceptions to rules, subtle distinctions',
  neet:     'NEET exam style — high difficulty, exactly as in past NEET papers',
};

// ── Concept difficulty_level → quiz level mapping ─────────────────────────────
// difficulty_level in JSON: "beginner" | "intermediate" | "advanced"

function selectConceptsByLevel(allConcepts: any[], level: string): any[] {
  const targetDifficulty =
    level === 'easy' || level === 'medium' ? 'beginner'
    : level === 'hard' || level === 'advanced' ? 'intermediate'
    : 'advanced'; // expert, neet

  // Primary: concepts matching the target difficulty
  let pool = allConcepts.filter((c: any) => c.difficulty_level === targetDifficulty);

  // Always include main topics regardless of difficulty
  const mainTopics = allConcepts.filter((c: any) => c.is_main_topic && !pool.some((p: any) => p.id === c.id));

  // If pool is small, pad with adjacent difficulty
  if (pool.length < 4) {
    const fallback = allConcepts.filter((c: any) => c.difficulty_level !== targetDifficulty);
    pool = [...pool, ...fallback];
  }

  return [...mainTopics.slice(0, 2), ...pool].slice(0, 8);
}

// ── Few-shot examples pulled from real NEET questions at runtime ──────────────
// See getFewShot() below — static maps removed, real questions used instead.

// ── Load heatmap questions once at module level ───────────────────────────────
let heatmapData: Record<string, any> | null = null;
function getHeatmapData() {
  if (!heatmapData) {
    try {
      const filePath = path.join(process.cwd(), 'public', 'heatmap_data.json');
      heatmapData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      heatmapData = {};
    }
  }
  return heatmapData!;
}

// ── Pick real NEET questions as few-shot examples ─────────────────────────────
// Finds questions from the same subject + chapter with no diagram.
// Falls back to any question from the subject if chapter has none.
function getFewShot(subject: string, classLevel: number, chapterNumber: number, isAssertion: boolean): string {
  if (isAssertion) {
    // No assertion-reason questions in heatmap — use static fallback
    return getFewShotARFallback(subject);
  }

  const data = getHeatmapData();
  const subjectData = data[subject] ?? {};

  // Try same chapter first
  const chKey = `${classLevel}_${chapterNumber}`;
  const chapterQuestions = (subjectData[chKey]?.questions ?? [])
    .filter((q: any) => !q.has_diagram && q.question && q.options && q.correct_answer);

  // Fall back to any chapter in the subject
  const pool = chapterQuestions.length >= 2
    ? chapterQuestions
    : Object.values(subjectData)
        .flatMap((ch: any) => ch.questions ?? [])
        .filter((q: any) => !q.has_diagram && q.question && q.options && q.correct_answer);

  if (pool.length === 0) return getFewShotARFallback(subject);

  // Pick up to 2 questions, prefer different years
  const shuffle = [...pool].sort(() => Math.random() - 0.5);
  const picked = shuffle.slice(0, 2);

  return picked.map((q: any) => {
    const opts = q.options as Record<string, string>;
    const correctKey = q.correct_answer as string;
    const correctValue = opts[correctKey];
    const optList = Object.entries(opts).map(([k, v]) => `${k}) ${v}`).join('  ');
    return `REAL NEET QUESTION (${q.year}):
Q: ${q.question}
Options: ${optList}
Answer: ${correctKey}) ${correctValue}`;
  }).join('\n\n');
}

// ── Static AR fallback (heatmap has no AR questions) ─────────────────────────
function getFewShotARFallback(subject: string): string {
  const examples: Record<string, string> = {
    Biology: `EXAMPLE Assertion-Reason:
Assertion (A): Mitochondria are called the powerhouse of the cell.
Reason (R): Mitochondria synthesise ATP through cellular respiration.
Answer: Both A and R are true and R is the correct explanation of A
Explanation: ATP is produced in mitochondria — R directly explains A.`,

    Physics: `EXAMPLE Assertion-Reason:
Assertion (A): A body moving in a circle at constant speed has acceleration.
Reason (R): The direction of velocity changes continuously in circular motion.
Answer: Both A and R are true and R is the correct explanation of A
Explanation: Acceleration is rate of change of velocity (vector). Changing direction = changing velocity = acceleration exists.`,

    Chemistry: `EXAMPLE Assertion-Reason:
Assertion (A): Diamond is a poor conductor of electricity.
Reason (R): In diamond, all four valence electrons of carbon are used in covalent bonding, leaving no free electrons.
Answer: Both A and R are true and R is the correct explanation of A
Explanation: No free electrons means no electrical conduction. R correctly explains A.`,
  };
  return examples[subject] ?? examples['Biology'];
}

const AR_OPTIONS = [
  'Both A and R are true and R is the correct explanation of A',
  'Both A and R are true but R is not the correct explanation of A',
  'A is true but R is false',
  'A is false but R is true',
];

// ── Class-level content restrictions ──────────────────────────────────────────
// Prevents Claude from generating questions using concepts beyond the student's class

const CLASS_RESTRICTIONS: Record<string, Record<number, { not_studied: string; studied: string }>> = {
  Physics: {
    8: {
      not_studied: 'coefficients of friction, electric fields, gravitational constant G, vectors, electrostatics, calculus, electromagnetic induction, thermodynamics laws, Ohm\'s law circuits',
      studied: 'basic forces (push/pull), friction as a concept, gravity as weight, simple machines, basic motion (speed/distance/time), sound basics, light reflection',
    },
    9: {
      not_studied: 'electric fields, gravitational constant G, vectors, electrostatics, calculus, electromagnetic induction, thermodynamics laws, capacitors',
      studied: 'laws of motion (F=ma), gravity and weight, work energy power, pressure, sound waves, basic electricity (current/voltage/resistance), atoms and molecules',
    },
    10: {
      not_studied: 'vectors, calculus, electromagnetic induction, thermodynamics laws, capacitors, nuclear physics beyond basic radioactivity',
      studied: 'light reflection and refraction, lenses and mirrors, electricity circuits, magnetic effects of current, sources of energy, basic nuclear concepts',
    },
    11: {
      not_studied: 'quantum mechanics beyond Bohr model, university-level derivations, solid state physics',
      studied: 'vectors, kinematics, laws of motion, work energy power, rotational motion, gravitation, properties of matter, thermodynamics, oscillations, waves, electrostatics, current electricity',
    },
    12: {
      not_studied: 'university-level physics beyond NCERT scope',
      studied: 'all NCERT Class 12 topics: electromagnetic induction, alternating current, electromagnetic waves, optics, dual nature, atoms, nuclei, semiconductors, communication systems',
    },
  },
  Biology: {
    8: {
      not_studied: 'cell organelles in detail, DNA/RNA, meiosis, hormones, enzyme kinetics, genetics, evolution, biotechnology',
      studied: 'basic cell structure, microorganisms, food production, conservation of plants and animals, reproduction basics, basic body systems',
    },
    9: {
      not_studied: 'DNA/RNA structure, meiosis details, genetics and heredity, hormones in detail, enzyme kinetics, evolution, biotechnology',
      studied: 'cell structure and function, tissues, diversity of organisms, basic reproduction (asexual/sexual), basic disease concepts, food and nutrition basics',
    },
    10: {
      not_studied: 'DNA/RNA molecular details, genetic engineering, enzyme kinetics, detailed hormones, biotechnology, ecological pyramids in detail',
      studied: 'life processes (nutrition, respiration, transport, excretion), control and coordination (nervous and hormonal basics), reproduction, heredity and evolution basics, ecosystem basics',
    },
    11: {
      not_studied: 'genetic engineering, recombinant DNA technology, detailed biotechnology, immune system in detail',
      studied: 'living world, classification, plant and animal morphology and anatomy, cell biology, biomolecules, cell cycle, plant physiology, human physiology',
    },
    12: {
      not_studied: 'university-level biology beyond NCERT scope',
      studied: 'all NCERT Class 12 topics: reproduction, genetics, evolution, human health and disease, biotechnology, ecology and environment',
    },
  },
  Chemistry: {
    8: {
      not_studied: 'atomic structure details, chemical bonding, thermodynamics, electrochemistry, organic chemistry, mole concept, equilibrium',
      studied: 'basic materials (metals/non-metals), physical and chemical changes, combustion basics, acids/bases/salts introduction, basic separation techniques',
    },
    9: {
      not_studied: 'quantum numbers, orbitals, chemical bonding details, thermodynamics, electrochemistry, organic chemistry reactions, mole concept calculations',
      studied: 'matter and its states, atoms and molecules, basic atomic structure (Bohr model), chemical reactions basics, physical and chemical changes, solutions and mixtures',
    },
    10: {
      not_studied: 'quantum numbers, orbitals, thermodynamics laws, electrochemistry, organic mechanisms, equilibrium calculations',
      studied: 'chemical reactions and equations, acids bases and salts, metals and non-metals, carbon compounds (basic organic), periodic table basics',
    },
    11: {
      not_studied: 'electrochemistry, coordination compounds, polymers, biomolecules in detail, university chemistry',
      studied: 'mole concept, atomic structure, periodic table, chemical bonding, thermodynamics, equilibrium, redox reactions, hydrogen, s-block elements, basic organic chemistry, hydrocarbons',
    },
    12: {
      not_studied: 'university-level chemistry beyond NCERT scope',
      studied: 'all NCERT Class 12 topics: solid state, solutions, electrochemistry, chemical kinetics, surface chemistry, coordination compounds, haloalkanes, alcohols, aldehydes, amines, biomolecules, polymers',
    },
  },
};

function getClassRestriction(subject: string, classLevel: number): string {
  const subjectRestrictions = CLASS_RESTRICTIONS[subject] ?? CLASS_RESTRICTIONS['Physics'];
  const restriction = subjectRestrictions[classLevel] ?? subjectRestrictions[11];
  return (
    'CRITICAL CLASS RESTRICTION — This is Class ' + classLevel + ' ' + subject + ':\n'
    + '- Do NOT use concepts, formulas, or topics from Class ' + (classLevel + 1) + ' or higher\n'
    + '- Do NOT use: ' + restriction.not_studied + '\n'
    + '- Students at this level know: ' + restriction.studied + '\n'
    + '- Keep questions appropriate for Class ' + classLevel + ' NCERT level only\n'
  );
}

// ── Cache helpers ──────────────────────────────────────────────────────────────

function buildCacheKey(subject: string, chapter: string, classLevel: string, difficulty: string, mode: string) {
  return `quiz:${subject.toLowerCase()}:${chapter.toLowerCase()}:${classLevel}:${difficulty}:${mode}`;
}

async function getCachedSet(cacheKey: string, seenSetIds: string[]) {
  try {
    let query = supabase
      .from('quiz_cache')
      .select('id, questions')
      .eq('cache_key', cacheKey);

    if (seenSetIds.length > 0) {
      query = query.not('id', 'in', `(${seenSetIds.join(',')})`);
    }

    const { data, error } = await query.limit(1).single();
    if (error || !data) return null;
    return { id: data.id as string, questions: data.questions };
  } catch {
    return null;
  }
}

async function saveToCache(cacheKey: string, questions: any[]) {
  try {
    const { data, error } = await supabase
      .from('quiz_cache')
      .insert({ cache_key: cacheKey, questions })
      .select('id')
      .single();

    if (error) { console.error('Cache save error:', error.message); return null; }
    return data?.id as string ?? null;
  } catch (err) {
    console.error('Cache save exception:', err);
    return null;
  }
}

// ── Main handler ───────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const {
      chapter,
      concepts,
      classLevel,
      subject,
      mode,
      difficulty,
      previousQuestions = [],
      seenSetIds = [],
    } = await req.json();

    const isAssertion = mode === 'assertion_reasoning';
    const level = difficulty ?? 'easy';
    const levelDesc = DIFFICULTY_DESCRIPTIONS[level] ?? 'moderate difficulty';
    const allConcepts = concepts ?? [];
    const chapterNumber = allConcepts[0]?.chapter_number ?? 0;

    // ── 1. Check cache ─────────────────────────────────────────────────────────
    const cacheKey = buildCacheKey(subject, chapter, classLevel, level, mode);
    const cached = await getCachedSet(cacheKey, seenSetIds);

    if (cached) {
      console.log('Cache HIT:', cacheKey, '| set:', cached.id);
      return Response.json({
        success: true,
        total: cached.questions.length,
        questions: cached.questions,
        difficulty: level,
        setId: cached.id,
        fromCache: true,
      });
    }

    console.log('Cache MISS:', cacheKey, '| calling Groq...');

    // ── 2. Select concepts by difficulty_level ────────────────────────────────
    const selectedConcepts = selectConceptsByLevel(allConcepts, level);

    // ── 3. Build rich concept context ─────────────────────────────────────────
    const conceptText = selectedConcepts.map((c: any) => {
      let text = `Concept: ${c.concept_name}`;
      if (c.summary) text += `\nSummary: ${c.summary.slice(0, 250)}`;
      if (c.key_terms?.length) text += `\nKey terms: ${c.key_terms.slice(0, 6).join(', ')}`;
      if (c.formula?.length) text += `\nFormulas: ${c.formula.slice(0, 4).join(', ')}`;
      if (c.builds_upon?.length) {
        const prereqs = c.builds_upon.slice(0, 3).map((b: any) => b.concept_name).join(', ');
        text += `\nBuilds upon: ${prereqs}`;
      }
      return text;
    }).join('\n\n');

    const avoidText = previousQuestions.length > 0
      ? '\n\nDo NOT repeat these questions:\n' + previousQuestions.slice(-10).join('\n')
      : '';

    // ── 4. Class restriction text ──────────────────────────────────────────────
    const classRestriction = getClassRestriction(subject, Number(classLevel));

    // ── 5. Few-shot example — real NEET questions from heatmap ────────────────
    const fewShot = getFewShot(subject, Number(classLevel), Number(chapterNumber ?? 0), isAssertion);

    // ── 6. Build prompts ───────────────────────────────────────────────────────
    const arFormat = JSON.stringify([{
      question: 'In the following question, a statement of Assertion (A) is followed by a statement of Reason (R).',
      difficulty: level,
      assertion: 'Write the assertion statement here',
      reason: 'Write the reason statement here',
      options: AR_OPTIONS,
      answer: 'Both A and R are true and R is the correct explanation of A',
      explanation: 'Explain why the answer is correct',
    }], null, 2);

    const mcqFormat = JSON.stringify([{
      question: '...',
      difficulty: level,
      options: ['...', '...', '...', '...'],
      answer: '...',
      explanation: '...',
    }], null, 2);

    const prompt = isAssertion
      ? `Generate EXACTLY 5 Assertion-Reason questions for NEET ${subject}.
Subject: ${subject} | Class: ${classLevel} | Chapter: ${chapter}
Difficulty: ${level.toUpperCase()} — ${levelDesc}

${classRestriction}

CONCEPTS TO USE:
${conceptText}
${avoidText}

STUDY THIS EXAMPLE CAREFULLY — match its cognitive depth exactly:
${fewShot}

RULES:
- Write a factual ASSERTION (A) about the chapter concepts
- Write a REASON (R) that may or may not explain the assertion
- Mix answers — do NOT always use option 1. Distribute all 4 answer types across 5 questions
- OPTIONS must ALWAYS be exactly these 4 in this exact order:
  1. Both A and R are true and R is the correct explanation of A
  2. Both A and R are true but R is not the correct explanation of A
  3. A is true but R is false
  4. A is false but R is true
- The answer field must match one of the 4 options EXACTLY as written
- Explanation must clarify why A and R are each true/false and their relationship
- Output ONLY valid JSON array, no markdown, no comments, double quotes only, no trailing commas

Format:
${arFormat}`

      : `Generate EXACTLY 5 MCQ questions for NEET ${subject}.
Subject: ${subject} | Class: ${classLevel} | Chapter: ${chapter}
Difficulty: ${level.toUpperCase()} — ${levelDesc}

${classRestriction}

CONCEPTS TO USE:
${conceptText}
${avoidText}

STUDY THIS EXAMPLE CAREFULLY — match its cognitive depth and distractor quality exactly:
${fewShot}

RULES:
- ALL 5 questions must match the ${level} difficulty shown in the example above
- Use only concepts listed — do NOT introduce outside concepts
- Distractors must be plausible — common misconceptions, not obviously wrong answers
- The correct answer must be clearly defensible from NCERT
- The "answer" field MUST be copied VERBATIM from one of the 4 options — exact same text, character for character. Do NOT use a letter (A/B/C/D) or index — use the full option text
- Output ONLY valid JSON array, no markdown, no comments, double quotes only, no trailing commas

Format:
${mcqFormat}`;

    console.log('Level:', level, '| Mode:', mode, '| Class:', classLevel, '| Subject:', subject);

    // ── 7. Call Groq — lower temperature on retry for more reliable JSON ───────
    let questions: any[] = [];
    const temperatures = [0.4, 0.3, 0.2]; // start moderate, reduce on retry
    for (let attempt = 0; attempt < 3; attempt++) {
      const raw = await groqCall(prompt, temperatures[attempt]);
      if (!raw) continue;
      try {
        const parsed = safeJSONParse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) { questions = parsed; break; }
      } catch (err) {
        console.error('Parse failed attempt', attempt + 1, String(err).slice(0, 100));
      }
    }

    if (isAssertion) {
      questions = questions.map((q: any) => ({
        ...q,
        options: AR_OPTIONS,
        answer: AR_OPTIONS.includes(q.answer) ? q.answer : AR_OPTIONS[0],
      }));
    } else {
      // Normalize MCQ answers — LLM sometimes returns a letter (A/B/C/D) or
      // truncated text instead of the exact option string. Fix it here.
      questions = questions.map((q: any) => {
        if (!Array.isArray(q.options)) return q;
        // 1. Exact match — already correct
        if (q.options.includes(q.answer)) return q;
        // 2. Case-insensitive match
        const looseMatch = q.options.find((o: string) =>
          o.trim().toLowerCase() === q.answer?.trim().toLowerCase()
        );
        if (looseMatch) return { ...q, answer: looseMatch };
        // 3. Letter index match — "A", "B", "C", "D"
        const letterIndex = ['a', 'b', 'c', 'd'].indexOf(q.answer?.trim().toLowerCase());
        if (letterIndex !== -1 && q.options[letterIndex]) {
          return { ...q, answer: q.options[letterIndex] };
        }
        // 4. Partial match — answer text is contained within an option
        const partialMatch = q.options.find((o: string) =>
          o.toLowerCase().includes(q.answer?.trim().toLowerCase())
        );
        if (partialMatch) return { ...q, answer: partialMatch };
        // Give up — will show as wrong, but at least won't crash
        return q;
      });
    }

    const valid = questions.filter((q: any) => {
      if (isAssertion) {
        return q.assertion && q.reason && Array.isArray(q.options) && q.options.length === 4 && q.answer && q.explanation;
      }
      return q.question && Array.isArray(q.options) && q.options.length === 4 && q.answer && q.explanation;
    });

    const unique = valid.filter((q, i, arr) =>
      i === arr.findIndex((x: any) => isAssertion ? x.assertion === q.assertion : x.question === q.question)
    );

    console.log('valid:', valid.length, 'unique:', unique.length);

    if (unique.length < 3) {
      return Response.json({ success: false, error: 'Could not generate enough questions. Please try again.' });
    }

    // ── 6. Save to cache ───────────────────────────────────────────────────────
    const setId = await saveToCache(cacheKey, unique);
    console.log('Saved to cache:', cacheKey, '| setId:', setId);

    return Response.json({
      success: true,
      total: unique.length,
      questions: unique,
      difficulty: level,
      setId,
      fromCache: false,
    });

  } catch (error: any) {
    console.error('generate-quiz error:', error);
    return Response.json({ success: false, error: error.message });
  }
}