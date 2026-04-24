import type { Subject } from '@/lib/types';

export interface TopicGroup {
  topic: string;
  chapters: string[];
}

export const TOPIC_GROUPS: Record<Subject, TopicGroup[]> = {
  Biology: [
    {
      topic: 'Diversity of Life',
      chapters: [
        'The Living World',
        'Biological Classification',
        'Plant Kingdom',
        'Animal Kingdom',
        'Diversity in Living Organisms',
      ],
    },
    {
      topic: 'Plant Morphology & Anatomy',
      chapters: [
        'Morphology of Flowering Plants',
        'Anatomy of Flowering Plants',
      ],
    },
    {
      topic: 'Plant Physiology',
      chapters: [
        'Transport in Plants',
        'Mineral Nutrition',
        'Photosynthesis in Higher Plants',
        'Respiration in Plants',
        'Life Processes',
      ],
    },
    {
      topic: 'Cell Biology',
      chapters: [
        'Cell - The Unit of Life',
        'Biomolecules',
        'Cell Cycle and Cell Division',
        'Fundamental Unit of Life',
        'Tissues',
      ],
    },
    {
      topic: 'Structural Organisation',
      chapters: [
        'Structural Organisation in Animals',
      ],
    },
    {
      topic: 'Human Physiology',
      chapters: [
        'Digestion and Absorption',
        'Breathing and Exchange of Gases',
        'Body Fluids and Circulation',
        'Excretory Products and Elimination',
        'Locomotion and Movement',
        'Neural Control and Coordination',
        'Chemical Coordination and Integration',
        'Control and Coordination',
      ],
    },
    {
      topic: 'Reproduction',
      chapters: [
        'Sexual Reproduction in Flowering Plants',
        'Human Reproduction',
        'Reproductive Health',
        'Reproduction in Organisms',
        'How do Organisms Reproduce',
      ],
    },
    {
      topic: 'Genetics & Evolution',
      chapters: [
        'Principles of Inheritance and Variation',
        'Molecular Basis of Inheritance',
        'Evolution',
        'Heredity and Evolution',
      ],
    },
    {
      topic: 'Ecology',
      chapters: [
        'Organisms and Populations',
        'Ecosystem',
        'Biodiversity and Conservation',
        'Our Environment',
      ],
    },
    {
      topic: 'Applied Biology',
      chapters: [
        'Microbes in Human Welfare',
        'Biotechnology - Principles and Processes',
        'Biotechnology and its Applications',
        'Human Health and Disease',
        'Strategies for Enhancement in Food Production',
      ],
    },
  ],

  Chemistry: [
    {
      topic: 'Basic Concepts',
      chapters: [
        'Some Basic Concepts of Chemistry',
        'Thermodynamics',
        'Equilibrium',
        'Atoms and Molecules',
        'Is Matter Around Us Pure',
        'Chemical Reactions and Equations',
      ],
    },
    {
      topic: 'Atomic Structure & Periodicity',
      chapters: [
        'Structure of Atom',
        'Structure of the Atom',
        'Classification of Elements and Periodicity',
      ],
    },
    {
      topic: 'Chemical Bonding',
      chapters: [
        'Chemical Bonding and Molecular Structure',
      ],
    },
    {
      topic: 'Electrochemistry & Kinetics',
      chapters: [
        'Electrochemistry',
        'Chemical Kinetics',
      ],
    },
    {
      topic: 'Solutions',
      chapters: [
        'Solutions',
        'Acids, Bases and Salts',
      ],
    },
    {
      topic: 'Redox Reactions',
      chapters: [
        'Redox Reactions',
        'Metals and Non-metals',
      ],
    },
    {
      topic: 'Block Elements',
      chapters: [
        'd and f Block Elements',
        'Coordination Compounds',
      ],
    },
    {
      topic: 'Organic Chemistry Basics',
      chapters: [
        'Organic Chemistry - Basic Principles',
        'Hydrocarbons',
        'Carbon and its Compounds',
      ],
    },
    {
      topic: 'Oxygen & Nitrogen Compounds',
      chapters: [
        'Alcohols, Phenols and Ethers',
        'Aldehydes, Ketones and Carboxylic Acids',
        'Amines',
      ],
    },
    {
      topic: 'Biomolecules & Everyday Chemistry',
      chapters: [
        'Biomolecules',
        'Polymers',
        'Chemistry in Everyday Life',
      ],
    },
  ],

  Physics: [
    {
      topic: 'Mechanics',
      chapters: [
        'Physical World',
        'Units and Measurements',
        'Motion in a Straight Line',
        'Motion in a Plane',
        'Laws of Motion',
        'Work, Energy and Power',
        'Work and Energy',
        'System of Particles and Rotational Motion',
        'Gravitation',
      ],
    },
    {
      topic: 'Properties of Matter',
      chapters: [
        'Mechanical Properties of Solids',
        'Mechanical Properties of Fluids',
        'Thermal Properties of Matter',
      ],
    },
    {
      topic: 'Thermodynamics',
      chapters: [
        'Thermodynamics',
        'Kinetic Theory',
      ],
    },
    {
      topic: 'Oscillations & Waves',
      chapters: [
        'Oscillations',
        'Waves',
      ],
    },
    {
      topic: 'Electrostatics',
      chapters: [
        'Electric Charges and Fields',
        'Electrostatic Potential and Capacitance',
      ],
    },
    {
      topic: 'Current Electricity',
      chapters: [
        'Current Electricity',
      ],
    },
    {
      topic: 'Magnetism',
      chapters: [
        'Moving Charges and Magnetism',
        'Magnetism and Matter',
      ],
    },
    {
      topic: 'Electromagnetic Induction & AC',
      chapters: [
        'Electromagnetic Induction',
        'Alternating Current',
        'Electromagnetic Waves',
      ],
    },
    {
      topic: 'Optics',
      chapters: [
        'Ray Optics and Optical Instruments',
        'Wave Optics',
        'Light - Reflection and Refraction',
        'Human Eye and Colourful World',
      ],
    },
    {
      topic: 'Modern Physics',
      chapters: [
        'Dual Nature of Radiation and Matter',
        'Atoms',
        'Nuclei',
      ],
    },
    {
      topic: 'Semiconductor & Communication',
      chapters: [
        'Semiconductor Electronics',
        'Communication Systems',
      ],
    },
  ],
};

export function groupChaptersByTopic<T extends { chapter_name: string }>(
  chapters: T[],
  subject: Subject
): { topic: string; chapters: T[]; total: number }[] {
  const groups = TOPIC_GROUPS[subject];
  const result: { topic: string; chapters: T[]; total: number }[] = [];
  const assigned = new Set<string>();

  for (const group of groups) {
    const matched = chapters.filter(ch =>
      group.chapters.some(name =>
        name.toLowerCase() === ch.chapter_name.toLowerCase()
      )
    );
    if (matched.length > 0) {
      matched.forEach(ch => assigned.add(ch.chapter_name));
      result.push({
        topic: group.topic,
        chapters: matched,
        total: matched.reduce((sum: number, ch: any) =>
          sum + (ch.filteredTotal ?? ch.total_count ?? ch.total ?? 0), 0
        ),
      });
    }
  }

  const unmatched = chapters.filter(ch => !assigned.has(ch.chapter_name));
  if (unmatched.length > 0) {
    result.push({
      topic: 'Uncategorised',
      chapters: unmatched,
      total: unmatched.reduce((sum: number, ch: any) =>
        sum + (ch.filteredTotal ?? ch.total_count ?? ch.total ?? 0), 0
      ),
    });
  }

  return result;
}