import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  X,
  Send,
  ChevronLeft,
  ChevronRight,
  Timer,
  Award,
  Clock,
  BookOpen,
  Target,
  Loader2,
  Menu,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useMobileTest } from '../../hooks/useMobileTest';
import { MobileSequenceQuestion } from './MobileSequenceQuestion';

interface MobileTestTakingViewProps {
  testId: string;
  eventId: string;
  attemptId: string;
  onComplete: (score: number) => void;
  onCancel: () => void;
  onTestLoaded?: (title: string) => void;
}

interface Test {
  id: string;
  title: string;
  description?: string;
  type: string;
  passing_score: number;
  time_limit: number;
}

interface Question {
  id: string;
  question: string;
  question_type: string;
  points: number;
  order: number;
  answers?: Answer[];
  correct_order?: string[];
}

interface Answer {
  id: string;
  text: string;
  is_correct: boolean;
  order: number;
}

interface UserAnswer {
  questionId: string;
  answerId?: string;
  textAnswer?: string;
  marked: boolean;
  userOrder?: (string | number)[];
}

// Utility function for time formatting
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Question type labels
const getQuestionTypeLabel = (type: string): string => {
  const labels = {
    single_choice: 'Один вариант',
    multiple_choice: 'Несколько вариантов',
    sequence: 'Последовательность',
    text: 'Текстовый ответ',
  };
  return labels[type as keyof typeof labels] || type;
};

export const MobileTestTakingView: React.FC<MobileTestTakingViewProps> = ({
  testId,
  eventId,
  attemptId,
  onComplete,
  onCancel,
  onTestLoaded,
}) => {
  const { userProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showQuestionMenu, setShowQuestionMenu] = useState(false);
  const congratsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    test,
    questions,
    userAnswers,
    timeRemaining,
    loading,
    error,
    hasExistingProgress,
    attempt,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    updateAnswer,
    markQuestion,
    submitTest,
    getQuestionProgress,
    getCurrentAnswer,
    formatTime,
    loadTestData,
    saveCurrentPosition
  } = useMobileTest(testId, eventId, attemptId);

  // Show restore modal when there's existing progress
  useEffect(() => {
    if (hasExistingProgress) {
      setShowRestoreModal(true);
    }
  }, [hasExistingProgress]);

  // Notify parent when test is loaded
  useEffect(() => {
    if (test?.title) {
      onTestLoaded?.(test.title);
    }
  }, [test?.title, onTestLoaded]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemaining === 0) {
      handleSubmit();
    }
  }, [timeRemaining]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion?.id ? getCurrentAnswer(currentQuestion.id) : undefined;
  
  // Отладка для sequence вопросов
  if (currentQuestion?.question_type === 'sequence') {
    console.log('MobileTestTakingView - Sequence question debug:', {
      questionIndex: currentQuestionIndex,
      questionId: currentQuestion.id,
      currentAnswer,
      answersCount: currentQuestion.answers?.length || 0
    });
  }

  const handleSubmit = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      const result = await submitTest();
      
      setShowCongrats(true);
      congratsTimeoutRef.current = setTimeout(() => {
        onComplete(result.score);
      }, 3000);

    } catch (err) {
      console.error('Error submitting test:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const newIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(newIndex);
      saveCurrentPosition(newIndex);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      const newIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(newIndex);
      saveCurrentPosition(newIndex);
    }
  };

  const handleQuestionSelect = (index: number) => {
    setCurrentQuestionIndex(index);
    setShowQuestionMenu(false);
    saveCurrentPosition(index);
  };

  const restoreProgress = () => {
    setShowRestoreModal(false);
    // Use saved position from database, or find last answered question
    const savedPosition = attempt?.current_question_index ?? 0;
    const progress = getQuestionProgress();
    const lastAnswered = progress.reduce((max, item, index) => {
      return item.answered ? index : max;
    }, -1);
    
    console.log('Restore progress:', {
      savedPosition,
      lastAnswered,
      attempt: attempt,
      progress: progress,
      attemptId: attemptId
    });
    
    // Use saved position if it's valid, otherwise use last answered + 1
    let targetPosition = 0;
    
    if (savedPosition !== undefined && savedPosition !== null && savedPosition >= 0) {
      // Use saved position if it exists
      targetPosition = savedPosition;
    } else if (lastAnswered >= 0) {
      // Use last answered + 1 if no saved position
      targetPosition = lastAnswered + 1;
    } else {
      // Start from beginning if no progress
      targetPosition = 0;
    }
    
    console.log('Target position:', targetPosition);
    setCurrentQuestionIndex(Math.min(targetPosition, questions.length - 1));
    
    // Force reload attempt data to get fresh current_question_index
    loadTestData();
  };

  const startFresh = () => {
    setCurrentQuestionIndex(0);
    setShowRestoreModal(false);
    // Clear answers by reloading
    loadTestData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Загрузка теста...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ошибка</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadTestData}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (showRestoreModal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full">
          <div className="text-center">
            <RotateCcw className="w-12 h-12 text-[#06A478] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Продолжить тест?</h2>
            <p className="text-gray-600 mb-6">
              У вас есть незавершенная попытка. Хотите продолжить или начать заново?
            </p>
            <div className="space-y-3">
              <button
                onClick={restoreProgress}
                className="w-full bg-[#06A478] text-white py-3 rounded-lg font-medium hover:bg-[#047857]"
              >
                Продолжить
              </button>
              <button
                onClick={startFresh}
                className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-300"
              >
                Начать заново
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showCongrats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Award className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Тест завершен!</h2>
          <p className="text-gray-600">Результаты обрабатываются...</p>
        </div>
      </div>
    );
  }

  if (!test || !currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-8 h-8 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Тест не найден</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40 rounded-b-3xl">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onCancel}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-semibold text-gray-900 text-sm truncate max-w-[200px]">
                  {test.title}
                </h1>
                <p className="text-xs text-gray-500">
                  {getQuestionProgress().filter(q => q.answered).length} из {questions.length}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {timeRemaining !== null && (
                <div className="flex items-center space-x-1 bg-red-50 text-red-700 px-2 py-1 rounded-lg">
                  <Timer className="w-4 h-4" />
                  <span className="text-sm font-medium">{formatTime(timeRemaining)}</span>
                </div>
              )}
              <button
                onClick={() => setShowQuestionMenu(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Question Menu Modal */}
      {showQuestionMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white rounded-t-3xl w-full max-h-[70vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Вопросы</h3>
                <button
                  onClick={() => setShowQuestionMenu(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <div className="grid grid-cols-10 gap-1 sm:gap-2">
                {questions.map((question, index) => {
                  const progress = getQuestionProgress();
                  const questionProgress = progress[index];
                  const isAnswered = questionProgress?.answered;
                  const isCurrent = index === currentQuestionIndex;
                  
                  return (
                    <button
                      key={question.id}
                      onClick={() => handleQuestionSelect(index)}
                      className={`
                        w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-medium text-xs transition-all duration-300
                        ${isCurrent 
                          ? 'bg-[#06A478] text-white shadow-md' 
                          : isAnswered 
                            ? 'bg-green-100 text-green-700 border-2 border-green-300 hover:shadow-md' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-md'
                        }
                        hover:scale-105 active:scale-95 touch-manipulation
                        flex items-center justify-center relative
                      `}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="pb-24">
        <div className="px-0">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mx-0">
            {/* Question header */}
            <div className="py-6 px-4 border-b border-gray-100">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-6 h-6 bg-[#06A478] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">{currentQuestionIndex + 1}</span>
                </div>
                <span className="text-xs font-medium text-gray-500">
                  {getQuestionTypeLabel(currentQuestion.question_type)}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">{currentQuestion.points} балл{currentQuestion.points !== 1 ? 'ов' : ''}</span>
              </div>
              <h2 className="font-semibold text-gray-900 text-lg leading-[1.2]">
                {currentQuestion.question}
              </h2>
            </div>

            {/* Answer options */}
            <div className="py-6 px-4">
              {/* Single Choice */}
              {currentQuestion.question_type === 'single_choice' && (
                <div className="space-y-3">
                  {currentQuestion.answers?.map((answer) => (
                    <label
                      key={answer.id}
                      className={`flex items-start space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        currentAnswer?.answerId === answer.id
                          ? 'border-[#06A478] bg-[#06A478]/15 shadow-md'
                          : 'border-gray-200 hover:border-[#06A478]/50 hover:bg-gray-50/80 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        checked={currentAnswer?.answerId === answer.id}
                        onChange={() => updateAnswer(currentQuestion.id, answer.id)}
                        className="mt-1 w-4 h-4 text-[#06A478] border-gray-300 focus:ring-[#06A478]"
                      />
                      <span className="text-gray-900 text-sm leading-[1.2] flex-1">
                        {answer.text}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Multiple Choice */}
              {currentQuestion.question_type === 'multiple_choice' && (
                <div className="space-y-3">
                  {currentQuestion.answers?.map((answer) => (
                    <label
                      key={answer.id}
                      className={`flex items-start space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        currentAnswer?.answerId === answer.id
                          ? 'border-[#06A478] bg-[#06A478]/15 shadow-md'
                          : 'border-gray-200 hover:border-[#06A478]/50 hover:bg-gray-50/80 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={currentAnswer?.answerId === answer.id}
                        onChange={() => updateAnswer(currentQuestion.id, answer.id)}
                        className="mt-1 w-4 h-4 text-[#06A478] border-gray-300 rounded focus:ring-[#06A478]"
                      />
                      <span className="text-gray-900 text-sm leading-[1.2] flex-1">
                        {answer.text}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Text Answer */}
              {currentQuestion.question_type === 'text' && (
                <div>
                  <textarea
                    value={currentAnswer?.textAnswer || ''}
                    onChange={(e) => updateAnswer(currentQuestion.id, undefined, e.target.value)}
                    placeholder="Введите ваш ответ..."
                    className="w-full p-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#06A478] focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>
              )}

              {/* Sequence - улучшенная версия для мобильных */}
              {currentQuestion.question_type === 'sequence' && (
                <MobileSequenceQuestion
                  questionId={currentQuestion.id}
                  answers={currentQuestion.answers || []}
                  userOrder={currentAnswer?.userOrder}
                  onOrderChange={(questionId, newOrder) => {
                    console.log('MobileTestTakingView - Sequence order change:', { questionId, newOrder, currentAnswer });
                    updateAnswer(questionId, undefined, undefined, newOrder);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-pb">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Назад</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => markQuestion(currentQuestion.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentAnswer?.marked
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Отметить
            </button>
          </div>

          {currentQuestionIndex === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">Завершить</span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              <span className="text-sm font-medium">Далее</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
