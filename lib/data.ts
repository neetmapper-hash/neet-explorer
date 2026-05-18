import { HeatmapData, ConceptData } from './types';

export async function getHeatmapData(): Promise<HeatmapData> {
  return {};
}

export async function getConceptData(
  subject: string
): Promise<ConceptData | null> {
  return null;
}

export function getHeatmapColor(count: number, maxCount: number): string {
  if (count === 0) return '#1e1e1e';
  const intensity = count / maxCount;
  if (intensity <= 0.33) return '#1a4a1a';
  if (intensity <= 0.66) return '#b35900';
  return '#cc0000';
}

export function getEffectiveCount(
  chapterEntry: { total_count: number; by_year: Record<string, number> },
  selectedYears: number[]
): number {
  if (selectedYears.length === 5) return chapterEntry.total_count;
  return selectedYears.reduce(
    (sum, yr) => sum + (chapterEntry.by_year[String(yr)] || 0),
    0
  );
}

// Chapter names keyed by `${class}_${chapter_number}`.
// Physics uses the actual NCERT chapter numbers from the pipeline manifest.
// Class 8-10 use only physics chapters from integrated science books.
export const CHAPTER_NAMES: Record<string, Record<string, string>> = {
  Physics: {
    // Class 8 — integrated science, physics chapters only
    '8_4':  'Electricity: Magnetic and Heating Effects',
    '8_5':  'Exploring Forces',
    '8_6':  'Pressure, Winds, Storms, and Cyclones',
    '8_10': 'Light: Mirrors and Lenses',
    '8_11': 'Keeping Time with the Skies',
    // Class 9 — physics chapters only
    '9_4':  'Describing Motion Around Us',
    '9_6':  'How Forces Affect Motion',
    '9_7':  'Work, Energy, and Simple Machines',
    '9_10': 'Sound Waves: Characteristics and Applications',
    // Class 10 — physics chapters only
    '10_9':  'Light - Reflection and Refraction',
    '10_10': 'The Human Eye and the Colourful World',
    '10_11': 'Electricity',
    '10_12': 'Magnetic Effects of Electric Current',
    // Class 11
    '11_1':  'Units and Measurements',
    '11_2':  'Motion in a Straight Line',
    '11_3':  'Motion in a Plane',
    '11_4':  'Laws of Motion',
    '11_5':  'Work, Energy, and Power',
    '11_6':  'System of Particles and Rotational Motion',
    '11_7':  'Gravitation',
    '11_8':  'Mechanical Properties of Solids',
    '11_9':  'Mechanical Properties of Fluids',
    '11_10': 'Thermal Properties of Matter',
    '11_11': 'Thermodynamics',
    '11_12': 'Kinetic Theory',
    '11_13': 'Oscillations',
    '11_14': 'Waves',
    // Class 12
    '12_1':  'Electric Charges and Fields',
    '12_2':  'Electrostatic Potential and Capacitance',
    '12_3':  'Current Electricity',
    '12_4':  'Moving Charges and Magnetism',
    '12_5':  'Magnetism and Matter',
    '12_6':  'Electromagnetic Induction',
    '12_7':  'Alternating Current',
    '12_8':  'Electromagnetic Waves',
    '12_9':  'Ray Optics and Optical Instruments',
    '12_10': 'Wave Optics',
    '12_11': 'Dual Nature of Radiation and Matter',
    '12_12': 'Atoms',
    '12_13': 'Nuclei',
    '12_14': 'Semiconductor Electronics: Materials, Devices and Simple Circuits',
  },
  Chemistry: {
    // Class 8 — chemistry chapters only
    '8_7':  'Particulate Nature of Matter',
    '8_8':  'Nature of Matter: Elements, Compounds, and Mixtures',
    '8_9':  'The Amazing World of Solutes, Solvents, and Solutions',
    // Class 9 — chemistry chapters only
    '9_5':  'Exploring Mixtures and their Separation',
    '9_8':  'Journey Inside the Atom',
    '9_9':  'Atomic Foundations of Matter',
    // Class 10 — chemistry chapters only
    '10_1': 'Chemical Reactions and Equations',
    '10_2': 'Acids, Bases and Salts',
    '10_3': 'Metals and Non-metals',
    '10_4': 'Carbon and its Compounds',
    // Class 11
    '11_1': 'Some Basic Concepts of Chemistry',
    '11_2': 'Structure of Atom',
    '11_3': 'Classification of Elements and Periodicity in Properties',
    '11_4': 'Chemical Bonding and Molecular Structure',
    '11_5': 'Thermodynamics',
    '11_6': 'Equilibrium',
    '11_7': 'Redox Reactions',
    '11_8': 'Organic Chemistry: Some Basic Principles and Techniques',
    '11_9': 'Hydrocarbons',
    // Class 12
    '12_1':  'Solutions',
    '12_2':  'Electrochemistry',
    '12_3':  'Chemical Kinetics',
    '12_4':  'The d- and f-Block Elements',
    '12_5':  'Coordination Compounds',
    '12_6':  'Haloalkanes and Haloarenes',
    '12_7':  'Alcohols, Phenols and Ethers',
    '12_8':  'Aldehydes, Ketones and Carboxylic Acids',
    '12_9':  'Amines',
    '12_10': 'Biomolecules',
  },
  Biology: {
    // Class 9 — biology chapters only
    '9_2':  'Cell: The Building Block of Life',
    '9_3':  'Tissues in Action',
    '9_11': 'Reproduction: How Life Continues',
    '9_12': 'Patterns in Life: Diversity and Classification',
    '9_13': 'Earth as a System: Energy, Matter, and Life',
    // Class 10 — biology chapters only
    '10_5': 'Life Processes',
    '10_6': 'Control and Coordination',
    '10_7': 'How do Organisms Reproduce?',
    '10_8': 'Heredity',
    '10_13': 'Our Environment',
    // Class 11
    '11_1':  'The Living World',
    '11_2':  'Biological Classification',
    '11_3':  'Plant Kingdom',
    '11_4':  'Animal Kingdom',
    '11_5':  'Morphology of Flowering Plants',
    '11_6':  'Anatomy of Flowering Plants',
    '11_7':  'Structural Organisation in Animals',
    '11_8':  'Cell - The Unit of Life',
    '11_9':  'Biomolecules',
    '11_10': 'Cell Cycle and Cell Division',
    '11_11': 'Transport in Plants',
    '11_12': 'Mineral Nutrition',
    '11_13': 'Photosynthesis in Higher Plants',
    '11_14': 'Respiration in Plants',
    '11_15': 'Plant Growth and Development',
    '11_16': 'Digestion and Absorption',
    '11_17': 'Breathing and Exchange of Gases',
    '11_18': 'Body Fluids and Circulation',
    '11_19': 'Excretory Products and their Elimination',
    '11_20': 'Locomotion and Movement',
    '11_21': 'Neural Control and Coordination',
    '11_22': 'Chemical Coordination and Integration',
    // Class 12
    '12_1':  'Reproduction in Organisms',
    '12_2':  'Sexual Reproduction in Flowering Plants',
    '12_3':  'Human Reproduction',
    '12_4':  'Reproductive Health',
    '12_5':  'Principles of Inheritance and Variation',
    '12_6':  'Molecular Basis of Inheritance',
    '12_7':  'Evolution',
    '12_8':  'Human Health and Disease',
    '12_9':  'Microbes in Human Welfare',
    '12_10': 'Biotechnology - Principles and Processes',
    '12_11': 'Biotechnology and its Applications',
    '12_12': 'Organisms and Populations',
    '12_13': 'Ecosystem',
    '12_14': 'Biodiversity and Conservation',
    '12_15': 'Environmental Issues',
  },
};