'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChapterEntry, Question, Subject, AVAILABLE_YEARS } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import HeatmapGrid from '@/components/HeatmapGrid';
import ChapterView from '@/components/ChapterView';
import QuestionCard from '@/components/QuestionCard';

type View = 'grid' | 'chapter' | 'question';

export default function HeatmapPage() {
  const router = useRouter();

  const [heatmapData, setHeatmapData] = useState<
    Record<string, Record<string, ChapterEntry>>
  >({});
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<Subject>('Physics');
  const [selectedYears, setSelectedYears] = useState<number[]>([
    ...AVAILABLE_YEARS,
  ]);
  const [view, setView] = useState<View>('grid');
  const [selectedChapter, setSelectedChapter] = useState<ChapterEntry | null>(
    null
  );
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null
  );

  // Load heatmap data
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/heatmap_data.json');
        const data = await res.json();
        setHeatmapData(data);
      } catch {
        console.error('Failed to load heatmap data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleChapterClick = (chapter: ChapterEntry) => {
    setSelectedChapter(chapter);
    setView('chapter');
    window.scrollTo(0, 0);
  };

  const handleQuestionClick = (question: Question) => {
    setSelectedQuestion(question);
    setView('question');
    window.scrollTo(0, 0);
  };

  const handleFindAncestry = (questionText: string) => {
    sessionStorage.setItem('ancestry_question', questionText);
    sessionStorage.setItem('ancestry_subject', subject);
    if (selectedQuestion) {
      sessionStorage.setItem('ancestry_options', JSON.stringify(selectedQuestion.options));
      sessionStorage.setItem('ancestry_correct', selectedQuestion.correct_answer);
    }
    router.push('/ancestry');
  };

  const handleBack = () => {
    if (view === 'question') {
      setView('chapter');
      setSelectedQuestion(null);
    } else {
      setView('grid');
      setSelectedChapter(null);
    }
    window.scrollTo(0, 0);
  };

  const subjectData = heatmapData[subject] ?? {};

  return (
    <div className="flex min-h-screen bg-[#0f0f0f]">
      <Sidebar
        currentPage="heatmap"
        subject={subject}
        selectedYears={selectedYears}
        onPageChange={(page) => {
          if (page === 'ancestry') router.push('/ancestry');
        }}
        onSubjectChange={(s) => {
          setSubject(s);
          setView('grid');
          setSelectedChapter(null);
          setSelectedQuestion(null);
        }}
        onYearsChange={setSelectedYears}
        showBackButton={view !== 'grid'}
        onBack={handleBack}
      />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-[#ff4b4b] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === 'question' && selectedQuestion ? (
          <QuestionCard
            question={selectedQuestion}
            onFindAncestry={handleFindAncestry}
            onBack={handleBack}
          />
        ) : view === 'chapter' && selectedChapter ? (
          <ChapterView
            chapter={selectedChapter}
            subject={subject}
            selectedYears={selectedYears}
            onQuestionClick={handleQuestionClick}
            onBack={handleBack}
          />
        ) : (
          <HeatmapGrid
            heatmapData={subjectData}
            subject={subject}
            selectedYears={selectedYears}
            onChapterClick={handleChapterClick}
          />
        )}
      </main>
    </div>
  );
}
