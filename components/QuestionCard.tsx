'use client';

import { Question, YEAR_COLORS, CLASS_CONFIG } from '@/lib/types';

interface QuestionCardProps {
  question: Question;
  onFindAncestry: (questionText: string) => void;
  onBack: () => void;
}

export default function QuestionCard({
  question,
  onFindAncestry,
  onBack,
}: QuestionCardProps) {
  const yearColor = YEAR_COLORS[question.year] ?? '#555';

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-sm text-[#888] hover:text-white mb-4 transition-colors flex items-center gap-1"
      >
        ← Back to Questions
      </button>

      {/* Question header */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
          style={{ background: yearColor }}
        >
          {question.year}
        </span>
        <span className="text-xl font-bold text-white">
          Question {question.question_number}
        </span>
        {question.has_diagram && (
          <span className="text-xs bg-[#1e1e1e] text-[#888] px-2 py-1 rounded-lg">
            📊 Has diagram
          </span>
        )}
      </div>

      {/* Question text */}
      <div className="bg-[#1a1a2e] border border-[#333] rounded-xl p-4 mb-4">
        <p className="text-[#f0f0f0] text-base leading-relaxed whitespace-pre-wrap">
          {question.question}
        </p>
      </div>

      {/* Diagram notice */}
      {question.has_diagram && (
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 mb-4 text-sm text-[#888]">
          📊 This question contains a diagram. Refer to the original paper for
          the figure.
        </div>
      )}

      {/* Options */}
      {question.options && Object.keys(question.options).length > 0 && (
        <div className="flex flex-col gap-2 mb-6">
          {Object.entries(question.options).map(([num, text]) => {
            const isCorrect = String(num) === String(question.correct_answer);
            return (
              <div
                key={num}
                className="flex items-start gap-3 px-4 py-3 rounded-xl border text-sm transition-colors"
                style={{
                  background: isCorrect ? '#1a4a1a' : '#1e1e1e',
                  borderColor: isCorrect ? '#2ca02c' : '#2a2a2a',
                  color: '#f0f0f0',
                }}
              >
                <span className="text-[#888] shrink-0">({num})</span>
                <span className="flex-1">{text}</span>
                {isCorrect && (
                  <span className="text-green-400 shrink-0">✓</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => onFindAncestry(question.question)}
          className="flex-1 bg-[#ff4b4b] hover:bg-[#ff3333] text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          🔍 Find Concept Ancestry
        </button>
        <button
          onClick={onBack}
          className="px-6 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#888] hover:text-white py-3 rounded-xl transition-colors text-sm"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
