export interface Concept {
  id: string;
  concept_title: string;
  description: string;
  key_terms: string[];
  builds_upon: string[];
  links_generated?: boolean;
}

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

export type Subject = 'Physics' | 'Chemistry' | 'Biology';

export const AVAILABLE_YEARS = [2021, 2022, 2023, 2024, 2025];

export const YEAR_COLORS: Record<number, string> = {
  2021: '#5c4a8a',
  2022: '#1a5276',
  2023: '#145a32',
  2024: '#784212',
  2025: '#922b21',
};

export const CLASS_CONFIG: Record<number, { emoji: string; color: string }> = {
  12: { emoji: '🎯', color: '#ff4b4b' },
  11: { emoji: '🔗', color: '#ffa500' },
  10: { emoji: '🔗', color: '#1f77b4' },
  9: { emoji: '🌿', color: '#2ca02c' },
};
