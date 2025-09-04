import React from 'react';

interface QuestionProgress {
  index: number;
  questionId: string;
  answered: boolean;
  marked: boolean;
}

interface MobileTestProgressProps {
  questions: QuestionProgress[];
  currentIndex: number;
  onQuestionSelect: (index: number) => void;
}

export const MobileTestProgress: React.FC<MobileTestProgressProps> = ({
  questions,
  currentIndex,
  onQuestionSelect
}) => {
  const answeredCount = questions.filter(q => q.answered).length;
  const progressPercentage = (answeredCount / questions.length) * 100;

  return (
    <div className="bg-white border-b border-gray-200 p-4 rounded-b-3xl">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Прогресс: {answeredCount} из {questions.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-[#06A478] h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>


      {/* Question grid */}
      <div className="grid grid-cols-10 gap-1 sm:gap-2">
        {questions.map((question, index) => {
          const isCurrent = index === currentIndex;
          const isAnswered = question.answered;
          const isMarked = question.marked;
          
          let bgColor = 'bg-gray-100 text-gray-600';
          let borderColor = 'border-gray-200';
          
          if (isCurrent) {
            bgColor = 'bg-[#06A478] text-white';
            borderColor = 'border-[#06A478]';
          } else if (isAnswered) {
            bgColor = 'bg-green-100 text-green-700';
            borderColor = 'border-green-300';
          } else if (isMarked) {
            bgColor = 'bg-yellow-100 text-yellow-700';
            borderColor = 'border-yellow-300';
          }
          
          return (
            <button
              key={question.questionId}
              onClick={() => onQuestionSelect(index)}
              className={`
                w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-semibold text-xs transition-all duration-200
                border-2 ${borderColor} ${bgColor}
                hover:scale-105 active:scale-95 hover:shadow-lg
                flex items-center justify-center relative touch-manipulation
              `}
            >
              {index + 1}
              {isMarked && !isCurrent && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
