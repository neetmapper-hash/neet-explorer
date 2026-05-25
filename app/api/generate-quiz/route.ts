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

    // ── 2. Select concepts ─────────────────────────────────────────────────────
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

    // ── 3. Class restriction text ──────────────────────────────────────────────
    const classRestriction = getClassRestriction(subject, Number(classLevel));

    // ── 4. Build prompts ───────────────────────────────────────────────────────
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
        + classRestriction + '\n'
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
        + classRestriction + '\n'
        + 'Concepts:\n' + conceptText
        + avoidText + '\n\n'
        + 'Rules:\n'
        + '- ALL 5 questions must be ' + level + ' difficulty appropriate for Class ' + classLevel + '\n'
        + '- Questions must cover the concepts listed above\n'
        + '- Do NOT introduce any concept not in the concepts list above\n'
        + '- Output ONLY valid JSON array, no markdown, no comments\n'
        + '- Double quotes only, no trailing commas\n'
        + '- Never truncate the output\n\n'
        + 'Format:\n' + mcqFormat;

    console.log('Level:', level, '| Mode:', mode, '| Class:', classLevel, '| Subject:', subject);

    // ── 5. Call Groq ───────────────────────────────────────────────────────────
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

    if (isAssertion) {
      questions = questions.map((q: any) => ({
        ...q,
        options: AR_OPTIONS,
        answer: AR_OPTIONS.includes(q.answer) ? q.answer : AR_OPTIONS[0],
      }));
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