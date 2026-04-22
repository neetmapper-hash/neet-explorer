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
        className="text-sm text-[#a0a0c0] hover:text-white mb-4 transition-colors flex items-center gap-1 font-medium"
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
          <span className="text-xs bg-[#1e1e30] text-[#a0a0c0] border border-[#2a2a3f] px-2 py-1 rounded-lg">
            📊 Has diagram
          </span>
        )}
      </div>

      {/* Question text */}
      <div className="bg-[#13131f] border border-[#2a2a3f] rounded-xl p-4 mb-4">
        <p className="text-white text-base leading-relaxed whitespace-pre-wrap">
          {question.question}
        </p>
      </div>

      {/* Diagram notice */}
      {question.has_diagram && (
        <div className="bg-[#13131f] border border-[#2a2a3f] rounded-xl px-4 py-3 mb-4 text-sm text-[#a0a0c0]">
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
                  background: isCorrect ? '#0d2e0d' : '#13131f',
                  borderColor: isCorrect ? '#00c853' : '#2a2a3f',
                  color: isCorrect ? '#ffffff' : '#d0d0f0',
                }}
              >
                <span
                  className="shrink-0 font-mono font-bold"
                  style={{ color: isCorrect ? '#00e676' : '#6b6b8a' }}
                >
                  ({num})
                </span>
                <span className="flex-1">{text}</span>
                {isCorrect && (
                  <span className="text-[#00e676] shrink-0 font-bold text-base">✓</span>
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
          className="flex-1 bg-[#00e6b4] hover:bg-[#00ffc8] text-[#0a0a0f] font-bold py-3 rounded-xl transition-colors text-sm"
        >
          🔍 Find Concept Ancestry
        </button>
        <button
          onClick={onBack}
          className="px-6 bg-[#1e1e30] hover:bg-[#2a2a40] text-[#a0a0c0] hover:text-white py-3 rounded-xl transition-colors text-sm border border-[#2a2a3f]"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
