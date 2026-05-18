// ─── Concept graph types ──────────────────────────────────────────────────────

export interface BuildsUponLink {
  concept_id: string;
  concept_name: string;
  class: number;
  chapter_number: number;
  chapter_name: string;
  is_main_topic: boolean;
}

export interface Concept {
  id: string;
  concept_name: string;
  summary: string;
  detailed_summary: string;
  key_terms: string[];
  aliases: string[];
  builds_upon: BuildsUponLink[];
  frequently_confused_with: string[];
  is_main_topic: boolean;
  parent_concept_id: string;
  parent_concept_name: string;
  subtopic_ids: string[];
  subtopic_names: string[];
  domain: string;
  difficulty_level: string;
  formula: string[];
  has_diagram: boolean;
  diagram_description: string;
  diagram_type: string;
  diagram_path: string;
  diagram_verified: boolean;
  is_enrichment: boolean;
  class: number;
  chapter_number: number;
  chapter_name: string;
  book: string;
  subject: string;
  source_pdf_version: string;
  last_extracted: string;
  extraction_status: string;
  validation_status: string;
  validation_notes: string;
}

// ─── Question / heatmap types ─────────────────────────────────────────────────

export interface Question {
  year: number;
  question_number: number;
  question: string;
  options: Record<string, string>;
  correct_answer: string;
  has_diagram: boolean;
}

export interface ChapterEntry {
  class: number;
  chapter: number;
  chapter_name: string;
  total_count: number;
  by_year: Record<string, number>;
  questions: Question[];
}

export interface HeatmapData {
  [subject: string]: {
    [chapterKey: string]: ChapterEntry;
  };
}

export interface ConceptData {
  subject: string;
  classes: {
    [classKey: string]: {
      chapters: {
        [chapterKey: string]: {
          chapter_name: string;
          part: number;
          concepts: Concept[];
        };
      };
    };
  };
}

// ─── UI constants ─────────────────────────────────────────────────────────────

export type Subject = 'Physics' | 'Chemistry' | 'Biology';

export const AVAILABLE_YEARS = [2021, 2022, 2023, 2024, 2025];

export const YEAR_COLORS: Record<number, string> = {
  2021: '#5c4a8a',
  2022: '#1a5276',
  2023: '#145a32',
  2024: '#784212',
  2025: '#922b21',
};

// Class 8 added for physics/chem/bio concepts from integrated science books
export const CLASS_CONFIG: Record<number, { emoji: string; color: string }> = {
  8:  { emoji: '🌱', color: '#10b981' },
  9:  { emoji: '🌿', color: '#2ca02c' },
  10: { emoji: '🔗', color: '#1f77b4' },
  11: { emoji: '🔗', color: '#ffa500' },
  12: { emoji: '🎯', color: '#ff4b4b' },
};