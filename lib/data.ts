import { HeatmapData, ConceptData } from './types';

// These will be imported once you add the JSON files to the data/ folder
// For now we use dynamic imports with error handling

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

export const CHAPTER_NAMES: Record<string, Record<string, string>> = {
  Physics: {
    '12_1': 'Electric Charges and Fields',
    '12_2': 'Electrostatic Potential and Capacitance',
    '12_3': 'Current Electricity',
    '12_4': 'Moving Charges and Magnetism',
    '12_5': 'Magnetism and Matter',
    '12_6': 'Electromagnetic Induction',
    '12_7': 'Alternating Current',
    '12_8': 'Electromagnetic Waves',
    '12_9': 'Ray Optics and Optical Instruments',
    '12_10': 'Wave Optics',
    '12_11': 'Dual Nature of Radiation and Matter',
    '12_12': 'Atoms',
    '12_13': 'Nuclei',
    '12_14': 'Semiconductor Electronics',
    '11_1': 'Physical World',
    '11_2': 'Units and Measurements',
    '11_3': 'Motion in a Straight Line',
    '11_4': 'Motion in a Plane',
    '11_5': 'Laws of Motion',
    '11_6': 'Work, Energy and Power',
    '11_7': 'System of Particles and Rotational Motion',
    '11_8': 'Gravitation',
    '11_9': 'Mechanical Properties of Solids',
    '11_10': 'Mechanical Properties of Fluids',
    '11_11': 'Thermal Properties of Matter',
    '11_12': 'Thermodynamics',
    '11_13': 'Kinetic Theory',
    '11_14': 'Oscillations',
    '11_15': 'Waves',
    '10_1': 'Light - Reflection and Refraction',
    '10_2': 'Human Eye and Colourful World',
    '10_3': 'Electricity',
    '9_1': 'Motion',
    '9_2': 'Force and Laws of Motion',
    '9_3': 'Gravitation',
    '9_4': 'Work and Energy',
  },
  Chemistry: {
    '12_1': 'Solutions',
    '12_2': 'Electrochemistry',
    '12_3': 'Chemical Kinetics',
    '12_4': 'd and f Block Elements',
    '12_5': 'Coordination Compounds',
    '12_9': 'Aldehydes, Ketones and Carboxylic Acids',
    '12_10': 'Amines',
    '12_11': 'Biomolecules',
    '12_12': 'Polymers',
    '12_13': 'Chemistry in Everyday Life',
    '11_1': 'Some Basic Concepts of Chemistry',
    '11_2': 'Structure of Atom',
    '11_3': 'Classification of Elements and Periodicity',
    '11_4': 'Chemical Bonding and Molecular Structure',
    '11_5': 'Thermodynamics',
    '11_6': 'Equilibrium',
    '11_7': 'Redox Reactions',
    '11_8': 'Organic Chemistry - Basic Principles',
    '11_9': 'Hydrocarbons',
    '10_1': 'Chemical Reactions and Equations',
    '10_2': 'Acids, Bases and Salts',
    '10_3': 'Metals and Non-metals',
    '10_4': 'Carbon and its Compounds',
    '10_5': 'Periodic Classification of Elements',
    '9_1': 'Is Matter Around Us Pure',
    '9_2': 'Atoms and Molecules',
    '9_3': 'Structure of the Atom',
    '9_4': 'Chemical Reactions',
  },
  Biology: {
    '12_1': 'Reproduction in Organisms',
    '12_2': 'Sexual Reproduction in Flowering Plants',
    '12_3': 'Human Reproduction',
    '12_4': 'Principles of Inheritance and Variation',
    '12_5': 'Molecular Basis of Inheritance',
    '12_6': 'Evolution',
    '12_7': 'Human Health and Disease',
    '12_8': 'Microbes in Human Welfare',
    '12_9': 'Biotechnology - Principles and Processes',
    '12_10': 'Biotechnology and its Applications',
    '12_11': 'Organisms and Populations',
    '12_12': 'Ecosystem',
    '12_13': 'Biodiversity and Conservation',
    '11_1': 'The Living World',
    '11_2': 'Biological Classification',
    '11_3': 'Plant Kingdom',
    '11_4': 'Animal Kingdom',
    '11_5': 'Morphology of Flowering Plants',
    '11_6': 'Anatomy of Flowering Plants',
    '11_7': 'Structural Organisation in Animals',
    '11_8': 'Cell - The Unit of Life',
    '11_9': 'Biomolecules',
    '11_10': 'Cell Cycle and Cell Division',
    '11_11': 'Transport in Plants',
    '11_12': 'Respiration in Plants',
    '11_13': 'Photosynthesis in Higher Plants',
    '11_14': 'Mineral Nutrition',
    '11_15': 'Body Fluids and Circulation',
    '11_16': 'Excretory Products and Elimination',
    '11_17': 'Locomotion and Movement',
    '11_18': 'Neural Control and Coordination',
    '11_19': 'Chemical Coordination and Integration',
    '10_5': 'Life Processes',
    '10_6': 'Control and Coordination',
    '10_7': 'How do Organisms Reproduce',
    '10_8': 'Heredity and Evolution',
    '10_13': 'Our Environment',
    '9_5': 'Fundamental Unit of Life',
    '9_6': 'Tissues',
    '9_7': 'Diversity in Living Organisms',
    '9_12': 'Improvement in Food Resources',
  },
};
