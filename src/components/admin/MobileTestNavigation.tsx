import React from 'react';
import { ChevronLeft, ChevronRight, Send, Loader2, Flag } from 'lucide-react';

interface MobileTestNavigationProps {
  currentIndex: number;
  totalQuestions: number;
  isLastQuestion: boolean;
  isFirstQuestion: boolean;
  isMarked: boolean;
  isSubmitting: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onMarkQuestion: () => void;
}

export const MobileTestNavigation: React.FC<MobileTestNavigationProps> = ({
  currentIndex,
  totalQuestions,
  isLastQuestion,
  isFirstQuestion,
  isMarked,
  isSubmitting,
  onPrevious,
  onNext,
  onSubmit,
  onMarkQuestion
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-pb">
      <div className="flex items-center justify-between">
        {/* Previous button */}
        <button
          onClick={onPrevious}
          disabled={isFirstQuestion}
          className="flex items-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 text-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed hover:text-gray-900 text-sm sm:text-base font-semibold transition-all duration-200 touch-manipulation min-h-[44px]"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Назад</span>
        </button>

        {/* Mark question button */}
        <button
          onClick={onMarkQuestion}
          className={`flex items-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all duration-200 touch-manipulation min-h-[44px] ${
            isMarked
              ? 'bg-yellow-100 text-yellow-700 shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-lg'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>{isMarked ? 'Отмечено' : 'Отметить'}</span>
        </button>

        {/* Next/Submit button */}
        {isLastQuestion ? (
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex items-center space-x-2 bg-[#06A478] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold shadow-md hover:shadow-lg hover:bg-[#059669] disabled:opacity-50 transition-all duration-200 touch-manipulation min-h-[44px]"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">Завершить</span>
          </button>
        ) : (
          <button
            onClick={onNext}
            className="flex items-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 text-gray-600 hover:text-gray-900 text-sm sm:text-base font-semibold transition-all duration-200 touch-manipulation min-h-[44px]"
          >
            <span className="text-sm font-medium">Далее</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
