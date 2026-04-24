// lib/topics.ts

import type { Subject } from '@/lib/types';

export interface TopicGroup {
  topic: string;
  chapters: string[]; // must match chapter_name values in your heatmap data
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
        'Plant Growth and Development',
      ],
    },
    {
      topic: 'Cell Biology',
      chapters: [
        'Cell - The Unit of Life',
        'Biomolecules',
        'Cell Cycle and Cell Division',
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
        'Excretory Products and their Elimination',
        'Locomotion and Movement',
        'Neural Control and Coordination',
        'Chemical Coordination and Integration',
      ],
    },
    {
      topic: 'Reproduction',
      chapters: [
        'Sexual Reproduction in Flowering Plants',
        'Human Reproduction',
        'Reproductive Health',
      ],
    },
    {
      topic: 'Genetics & Evolution',
      chapters: [
        'Principles of Inheritance and Variation',
        'Molecular Basis of Inheritance',
        'Evolution',
      ],
    },
    {
      topic: 'Ecology',
      chapters: [
        'Organisms and Populations',
        'Ecosystem',
        'Biodiversity and Conservation',
      ],
    },
    {
      topic: 'Applied Biology',
      chapters: [
        'Microbes in Human Welfare',
        'Biotechnology: Principles and Processes',
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
        'States of Matter',
        'Thermodynamics',
        'Equilibrium',
      ],
    },
    {
      topic: 'Atomic Structure & Periodicity',
      chapters: [
        'Structure of Atom',
        'Classification of Elements and Periodicity in Properties',
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
      ],
    },
    {
      topic: 'Redox Reactions',
      chapters: [
        'Redox Reactions',
      ],
    },
    {
      topic: 'Block Elements',
      chapters: [
        'Hydrogen',
        's-Block Elements',
        'p-Block Elements',
        'The p-Block Elements',
        'd and f Block Elements',
        'Coordination Compounds',
      ],
    },
    {
      topic: 'Organic Chemistry Basics',
      chapters: [
        'Organic Chemistry - Some Basic Principles and Techniques',
        'Hydrocarbons',
        'Haloalkanes and Haloarenes',
        'Environmental Chemistry',
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
      ],
    },
    {
      topic: 'Optics',
      chapters: [
        'Ray Optics and Optical Instruments',
        'Wave Optics',
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
        'Semiconductor Electronics: Materials, Devices and Simple Circuits',
        'Communication Systems',
      ],
    },
  ],
};

// Helper: given a chapter name and subject, return its topic
export function getTopicForChapter(
  chapterName: string,
  subject: Subject
): string | null {
  const groups = TOPIC_GROUPS[subject];
  for (const group of groups) {
    if (group.chapters.some(c =>
      c.toLowerCase() === chapterName.toLowerCase() ||
      chapterName.toLowerCase().includes(c.toLowerCase()) ||
      c.toLowerCase().includes(chapterName.toLowerCase())
    )) {
      return group.topic;
    }
  }
  return null;
}

// Helper: group a list of chapter entries by topic
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
        name.toLowerCase() === ch.chapter_name.toLowerCase() ||
        ch.chapter_name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(ch.chapter_name.toLowerCase())
      )
    );
    if (matched.length > 0) {
      matched.forEach(ch => assigned.add(ch.chapter_name));
      result.push({
        topic: group.topic,
        chapters: matched,
        total: matched.reduce((sum: number, ch: any) =>
          sum + (ch.filteredTotal ?? ch.total ?? 0), 0
        ),
      });
    }
  }

  // Any chapters not matched to a topic go into Uncategorised
  const unmatched = chapters.filter(ch => !assigned.has(ch.chapter_name));
  if (unmatched.length > 0) {
    result.push({
      topic: 'Uncategorised',
      chapters: unmatched,
      total: unmatched.reduce((sum: number, ch: any) =>
        sum + (ch.filteredTotal ?? ch.total ?? 0), 0
      ),
    });
  }

  return result;
}
