import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  X,
  Send,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Timer,
  Award,
  Clock,
  BookOpen,
  Target,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TestTakingViewProps {
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

// Sortable item component for sequence questions
const SortableSequenceItem: React.FC<{
  id: string;
  text?: string;
  index: number;
}> = ({ id, text, index }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    animateLayoutChanges: () => false,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        zIndex: isDragging ? 50 : 'auto',
      }}
      className={`
        group relative bg-white rounded-xl border-2 shadow-sm
        transition-all duration-200 ease-[cubic-bezier(.4,1.2,.4,1)]
        text-sm
        ${isDragging 
          ? 'border-[#19A980] shadow-lg'
          : 'border-gray-200 hover:border-[#19A980]/60 hover:shadow-md'
        }
      `}
    >
      <div className="flex items-center p-2 sm:p-3 gap-2">
        <div
          className="flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing touch-none min-w-[2.25rem]"
          {...attributes}
          {...listeners}
        >
          <div className="w-7 h-7 bg-[#19A980]/10 text-[#19A980] rounded-lg flex items-center justify-center font-semibold text-xs mb-1">
            {index + 1}
          </div>
        </div>
        <span className="text-gray-900 flex-1 break-words whitespace-pre-line">
          {text || '—'}
        </span>
      </div>
    </div>
  );
};

export const TestTakingView: React.FC<TestTakingViewProps> = ({
  testId,
  eventId,
  attemptId,
  onComplete,
  onCancel,
  onTestLoaded,
}) => {
  const { userProfile } = useAuth();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [hasExistingProgress, setHasExistingProgress] = useState(false);
  const [lastAnsweredQuestion, setLastAnsweredQuestion] = useState(0);
  const congratsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Touch sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    })
  );

  // Load test data
  const loadTestData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!userProfile?.id) {
        throw new Error('Пользователь не авторизован');
      }

      // Load test information
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError || !testData) throw testError || new Error('Тест не найден');

      setTest(testData);
      if (onTestLoaded && testData?.title) onTestLoaded(testData.title);

      if (testData && testData.time_limit > 0) {
        setTimeRemaining(testData.time_limit * 60);
      }

      // Verify attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from('user_test_attempts')
        .select('*')
        .eq('id', attemptId)
        .eq('user_id', userProfile.id)
        .eq('test_id', testId)
        .eq('event_id', eventId)
        .single();

      if (attemptError || !attemptData) {
        throw new Error('Попытка прохождения теста не найдена или недоступна');
      }

      // Проверяем, не завершён ли уже тест
      if (attemptData.status === 'completed') {
        throw new Error('Тест уже завершён. Повторное прохождение не допускается.');
      }

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('test_questions')
        .select(`
          *,
          answers:test_answers(*)
        `)
        .eq('test_id', testId)
        .order('order');

      if (questionsError || !questionsData) throw questionsError || new Error('Вопросы не найдены');

      // Format questions with answers
      const questionsWithAnswers = (questionsData || []).map((q: any) => ({
        ...q,
        answers: q.answers?.sort((a: any, b: any) => a.order - b.order) || [],
        correct_order: q.correct_order,
      }));

      // Load sequence answers
      for (const q of questionsWithAnswers) {
        if (q.question_type === 'sequence') {
          const { data: seqAnswers, error: seqError } = await supabase
            .from('test_sequence_answers')
            .select('*')
            .eq('question_id', q.id)
            .order('answer_order');

          if (!seqError && seqAnswers) {
            q.answers = seqAnswers.map((a: any) => ({
              ...a,
              text: a.answer_text,
              order: a.answer_order,
            }));
          }
        }
      }

      setQuestions(questionsWithAnswers);

      // Initialize user answers
      let initialUserAnswers: UserAnswer[] = questionsWithAnswers.map((q: any) => {
        if (q.question_type === 'sequence') {
          const shuffled = (q.answers || [])
            .map((a: any) => String(a.id))
            .sort(() => Math.random() - 0.5);
          return {
            questionId: q.id,
            marked: false,
            userOrder: shuffled,
            textAnswer: '',
            answerId: '',
          };
        }
        return {
          questionId: q.id,
          marked: false,
          textAnswer: '',
          answerId: '',
        };
      });

      setUserAnswers(initialUserAnswers);

      // Load existing answers
      const { data: existingAnswers, error: answersError } = await supabase
        .from('user_test_answers')
        .select('*')
        .eq('attempt_id', attemptId);

      if (!answersError && existingAnswers && existingAnswers.length > 0) {
        // Определяем последний отвеченный вопрос
        let lastAnswered = 0;
        initialUserAnswers = [...initialUserAnswers];
        
        for (const answer of existingAnswers || []) {
          const questionIndex = questionsWithAnswers.findIndex((q: any) => q.id === answer.question_id);
          if (questionIndex >= 0) {
            lastAnswered = Math.max(lastAnswered, questionIndex);
            
            if (answer.text_answer) {
              initialUserAnswers[questionIndex] = {
                ...initialUserAnswers[questionIndex],
                textAnswer: answer.text_answer,
              };
            } else if (answer.answer_id) {
              const question = questionsWithAnswers[questionIndex];
              if (question.question_type === 'single_choice') {
                initialUserAnswers[questionIndex] = {
                  ...initialUserAnswers[questionIndex],
                  answerId: answer.answer_id,
                };
              } else if (question.question_type === 'multiple_choice') {
                const currentAnswerId = initialUserAnswers[questionIndex].answerId;
                const answerIds = currentAnswerId ? currentAnswerId.split(',') : [];
                if (!answerIds.includes(answer.answer_id)) {
                  answerIds.push(answer.answer_id);
                }
                initialUserAnswers[questionIndex] = {
                  ...initialUserAnswers[questionIndex],
                  answerId: answerIds.join(','),
                };
              } else if (question.question_type === 'sequence') {
                initialUserAnswers[questionIndex] = {
                  ...initialUserAnswers[questionIndex],
                  userOrder: (answer.user_order || []).map((id: any) => String(id)),
                };
              }
            }
          }
        }
        
        setUserAnswers(initialUserAnswers);
        setHasExistingProgress(true);
        setLastAnsweredQuestion(lastAnswered);
        
        // Показываем модальное окно восстановления
        setShowRestoreModal(true);
      } else {
        setUserAnswers(initialUserAnswers);
      }
    } catch (err) {
      console.error('Ошибка загрузки теста:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке теста');
    } finally {
      setLoading(false);
    }
  }, [testId, eventId, attemptId, userProfile?.id, onTestLoaded]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || loading) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, loading]);

  // Load test data on mount
  useEffect(() => {
    loadTestData();
  }, [loadTestData]);

  // Handle restore choice
  const handleRestoreChoice = (restore: boolean) => {
    setShowRestoreModal(false);
    
    if (restore) {
      // Восстанавливаем прогресс - переходим к последнему отвеченному вопросу
      setCurrentQuestionIndex(lastAnsweredQuestion);
    } else {
      // Начинаем сначала - очищаем все ответы
      const resetAnswers = questions.map((q: any) => {
        if (q.question_type === 'sequence') {
          const shuffled = (q.answers || [])
            .map((a: any) => String(a.id))
            .sort(() => Math.random() - 0.5);
          return {
            questionId: q.id,
            marked: false,
            userOrder: shuffled,
            textAnswer: '',
            answerId: '',
          };
        }
        return {
          questionId: q.id,
          marked: false,
          textAnswer: '',
          answerId: '',
        };
      });
      setUserAnswers(resetAnswers);
      setCurrentQuestionIndex(0);
      
      // Очищаем сохраненные ответы в базе данных
      supabase
        .from('user_test_answers')
        .delete()
        .eq('attempt_id', attemptId)
        .then(() => {
          console.log('Сохраненные ответы очищены');
        })
        .catch((error) => {
          console.error('Ошибка при очистке ответов:', error);
        });
    }
  };

  // Save user answer
  const saveUserAnswer = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    const answer = userAnswers.find((a) => a.questionId === currentQuestion.id);
    if (!answer) return;

    try {
      await supabase
        .from('user_test_answers')
        .delete()
        .eq('attempt_id', attemptId)
        .eq('question_id', currentQuestion.id);

      if (currentQuestion.question_type === 'text') {
        if (answer.textAnswer && answer.textAnswer.trim()) {
          await supabase.from('user_test_answers').insert({
            attempt_id: attemptId,
            question_id: currentQuestion.id,
            text_answer: answer.textAnswer.trim(),
          });
        }
      } else if (currentQuestion.question_type === 'single_choice') {
        if (answer.answerId) {
          await supabase.from('user_test_answers').insert({
            attempt_id: attemptId,
            question_id: currentQuestion.id,
            answer_id: answer.answerId,
          });
        }
      } else if (currentQuestion.question_type === 'multiple_choice') {
        if (answer.answerId) {
          const answerIds = answer.answerId.split(',');
          const insertData = answerIds.map((answerId) => ({
            attempt_id: attemptId,
            question_id: currentQuestion.id,
            answer_id: answerId,
          }));

          await supabase.from('user_test_answers').insert(insertData);
        }
      } else if (currentQuestion.question_type === 'sequence') {
        if (answer.userOrder && answer.userOrder.length > 0) {
          await supabase.from('user_test_answers').insert({
            attempt_id: attemptId,
            question_id: currentQuestion.id,
            user_order: answer.userOrder,
          });
        }
      }
    } catch (error) {
      console.error('Ошибка сохранения ответа:', error);
    }
  };

  // Submit test
  const handleSubmitTest = async () => {
    await saveUserAnswer();
    setSubmitting(true);

    try {
      if (!attemptId) {
        throw new Error('Ошибка: ID попытки не найден');
      }

      const { data: userTestAnswers, error: answersError } = await supabase
        .from('user_test_answers')
        .select('*')
        .eq('attempt_id', attemptId);

      if (answersError) throw answersError;

      let totalPoints = 0;
      let maxScore = 0;

      for (const question of questions) {
        maxScore += question.points;

        const questionAnswers = userTestAnswers?.filter((a) => a.question_id === question.id) || [];

        if (question.question_type === 'single_choice') {
          const userAnswer = questionAnswers[0];
          if (userAnswer) {
            const correctAnswer = question.answers?.find((a) => a.id === userAnswer.answer_id && a.is_correct);
            if (correctAnswer) {
              totalPoints += question.points;
            }
          }
        } else if (question.question_type === 'multiple_choice' && questionAnswers.length > 0) {
          const correctAnswers = question.answers?.filter((a) => a.is_correct) || [];
          const userAnswerIds = questionAnswers.map((a) => a.answer_id);

          const allCorrectSelected = correctAnswers.every((ca) => userAnswerIds.includes(ca.id));
          const noIncorrectSelected = userAnswerIds.every(
            (id) => question.answers?.find((a) => a.id === id)?.is_correct
          );

          if (allCorrectSelected && noIncorrectSelected && correctAnswers.length > 0) {
            totalPoints += question.points;
          }
        } else if (question.question_type === 'sequence') {
          const userAnswer = questionAnswers[0];
          if (userAnswer && userAnswer.user_order) {
            const { data: seqAnswers } = await supabase
              .from('test_sequence_answers')
              .select('id')
              .eq('question_id', question.id)
              .order('answer_order');

            const correctOrder = seqAnswers.map((a) => a.id);
            const isCorrect = JSON.stringify(userAnswer.user_order) === JSON.stringify(correctOrder);
            if (isCorrect) {
              totalPoints += question.points;
            }
          }
        }
      }

      const scorePercentage = maxScore > 0 ? Math.round((totalPoints / maxScore) * 100) : 0;

      const { error: updateError } = await supabase
        .from('user_test_attempts')
        .update({
          end_time: new Date().toISOString(),
          score: scorePercentage,
          status: 'completed',
        })
        .eq('id', attemptId);

      if (updateError) throw updateError;

      setShowCongrats(true);
      congratsTimeoutRef.current = setTimeout(() => {
        setShowCongrats(false);
        onComplete(scorePercentage);
      }, 3000);
    } catch (error) {
      console.error('Ошибка отправки теста:', error);
      setError('Произошла ошибка при отправке теста');
    } finally {
      setSubmitting(false);
    }
  };

  // Navigation handlers
  const handlePrevious = () => {
    saveUserAnswer();
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    saveUserAnswer();
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      handleSubmitTest();
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (congratsTimeoutRef.current) clearTimeout(congratsTimeoutRef.current);
    };
  }, []);

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = userAnswers.find((a) => a.questionId === currentQuestion?.id);
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  // Проверка заполненности ответа
  let isAnswerFilled = false;
  if (currentQuestion) {
    if (currentQuestion.question_type === 'single_choice') {
      isAnswerFilled = !!currentAnswer?.answerId;
    } else if (currentQuestion.question_type === 'multiple_choice') {
      isAnswerFilled = !!currentAnswer?.answerId && currentAnswer.answerId.split(',').filter(Boolean).length > 0;
    } else if (currentQuestion.question_type === 'sequence') {
      isAnswerFilled = Array.isArray(currentAnswer?.userOrder) && currentAnswer.userOrder.length === (currentQuestion.answers?.length || 0);
    } else if (currentQuestion.question_type === 'text') {
      isAnswerFilled = !!currentAnswer?.textAnswer && currentAnswer.textAnswer.trim().length > 0;
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm mx-auto">
          <div className="w-16 h-16 bg-[#19A980]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-[#19A980] animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Загрузка теста</h2>
          <p className="text-gray-600">Подготавливаем вопросы для вас...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md mx-auto">
          <div className="flex items-start space-x-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800 mb-1">Ошибка загрузки</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-xl transition-colors"
          >
            Вернуться назад
          </button>
        </div>
      </div>
    );
  }

  // Congratulations modal
  if (showCongrats) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-md w-full border border-blue-200 animate-in fade-in-0 zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-[#19A980]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="text-[#19A980]" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Поздравляем!</h2>
          <p className="text-gray-600 mb-4">Вы успешно завершили тест</p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-[#19A980] rounded-full animate-pulse"></div>
            <span>Обработка результатов...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!test || questions.length === 0) return null;

  return (
    <>
      {/* Restore Progress Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-md w-full border border-gray-200 animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-[#06A478]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="text-[#06A478]" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Восстановить прогресс?</h2>
            <p className="text-gray-600 mb-6">
              Обнаружен сохраненный прогресс прохождения теста. 
              Вы ответили на {lastAnsweredQuestion + 1} из {questions.length} вопросов.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleRestoreChoice(true)}
                className="w-full bg-gradient-to-r from-[#06A478] to-[#148A6B] hover:from-[#148A6B] hover:to-[#06A478] text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Продолжить с вопроса {lastAnsweredQuestion + 1}
              </button>
              <button
                onClick={() => handleRestoreChoice(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-6 rounded-2xl transition-all duration-300"
              >
                Начать сначала
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#06A478] to-[#148A6B] shadow-lg rounded-b-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="font-bold text-white text-lg mb-1">{test.title}</h1>
              {test.passing_score > 0 && (
                <div className="flex items-center space-x-2 text-xs text-white/90 mb-3">
                  <Target size={14} className="text-white/80" />
                  <span>Проходной балл: {test.passing_score}%</span>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Прогресс</span>
                  <span className="text-xs font-bold text-white">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2 backdrop-blur-sm">
                  <div
                    className="bg-gradient-to-r from-white to-white/90 h-2 rounded-full transition-all duration-700 ease-out shadow-sm"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
            {timeRemaining !== null && timeRemaining > 0 && (
              <div
                className={`
                  flex items-center space-x-2 px-4 py-3 rounded-2xl font-mono text-sm bg-white/10 backdrop-blur-sm border border-white/20
                  ${timeRemaining <= 300
                    ? 'bg-red-500/20 text-red-100 border-red-300/30'
                    : 'text-white'
                  }
                `}
              >
                <Clock size={16} />
                <span>{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pb-32 font-mabry pb-safe-bottom">
        <div className="max-w-7xl mx-auto px-2">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mt-6">
            <div className="p-0">
              {/* Question header */}
              <div className="flex items-start justify-between p-6 pb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-[#06A478] to-[#148A6B] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs">{currentQuestionIndex + 1}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-500">Вопрос {currentQuestionIndex + 1} из {questions.length}</span>
                  </div>
                  <h2 className="font-bold text-gray-900 text-lg leading-relaxed">
                    {currentQuestion.question}
                  </h2>
                </div>
              </div>

              {/* Answer options */}
              <div className="space-y-3 px-6 pb-6">
                {/* Single Choice */}
                {currentQuestion.question_type === 'single_choice' && (
                  <div className="space-y-3">
                    {currentQuestion.answers?.map((answer) => (
                      <label
                        key={answer.id}
                        className={
                          [
                            "group flex items-start space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 text-sm hover:shadow-md",
                            currentAnswer?.answerId === answer.id
                              ? "border-[#06A478] bg-[#06A478]/15"
                              : "border-gray-200 hover:border-[#06A478]/50 hover:bg-gray-50/80 bg-white"
                          ].join(' ')
                        }
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <div
                            className={
                              [
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                                currentAnswer?.answerId === answer.id
                                  ? "border-[#06A478] bg-[#06A478]"
                                  : "border-gray-300 group-hover:border-[#06A478]/50"
                              ].join(' ')
                            }
                          >
                            {currentAnswer?.answerId === answer.id && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <span className="text-gray-900 leading-relaxed">{answer.text}</span>
                        </div>
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value={answer.id}
                          checked={currentAnswer?.answerId === answer.id}
                          onChange={(e) => {
                            const newAnswers = [...userAnswers];
                            const answerIndex = newAnswers.findIndex((a) => a.questionId === currentQuestion.id);
                            if (answerIndex >= 0) {
                              newAnswers[answerIndex] = {
                                ...newAnswers[answerIndex],
                                answerId: e.target.value,
                              };
                            }
                            setUserAnswers(newAnswers);
                          }}
                          className="sr-only"
                        />
                      </label>
                    ))}
                  </div>
                )}

                {/* Multiple Choice */}
                {currentQuestion.question_type === 'multiple_choice' && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 mb-4 flex items-center space-x-2">
                      <CheckCircle size={16} />
                      <span>Выберите все подходящие варианты:</span>
                    </p>
                    {currentQuestion.answers?.map((answer) => (
                      <label
                        key={answer.id}
                        className={
                          [
                            "group flex items-start space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 text-sm hover:shadow-md",
                            currentAnswer?.answerId?.split(',').includes(answer.id)
                              ? "border-[#06A478] bg-[#06A478]/15"
                              : "border-gray-200 hover:border-[#06A478]/50 hover:bg-gray-50/80 bg-white"
                          ].join(' ')
                        }
                      >
                        <div className="flex-shrink-0 mt-1">
                          <div
                            className={
                              [
                                "w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-300",
                                currentAnswer?.answerId?.split(',').includes(answer.id)
                                  ? "border-[#06A478] bg-[#06A478]"
                                  : "border-gray-300 group-hover:border-[#06A478]/50"
                              ].join(' ')
                            }
                          >
                            {currentAnswer?.answerId?.split(',').includes(answer.id) && (
                              <CheckCircle className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <span className="text-gray-900 leading-relaxed">{answer.text}</span>
                        </div>
                        <input
                          type="checkbox"
                          value={answer.id}
                          checked={currentAnswer?.answerId?.split(',').includes(answer.id) || false}
                          onChange={(e) => {
                            const newAnswers = [...userAnswers];
                            const answerIndex = newAnswers.findIndex((a) => a.questionId === currentQuestion.id);
                            if (answerIndex >= 0) {
                              const currentAnswerIds = newAnswers[answerIndex].answerId
                                ? newAnswers[answerIndex].answerId!.split(',')
                                : [];
                              if (e.target.checked) {
                                if (!currentAnswerIds.includes(answer.id)) {
                                  currentAnswerIds.push(answer.id);
                                }
                              } else {
                                const idx = currentAnswerIds.indexOf(answer.id);
                                if (idx > -1) currentAnswerIds.splice(idx, 1);
                              }
                              newAnswers[answerIndex] = {
                                ...newAnswers[answerIndex],
                                answerId: currentAnswerIds.join(','),
                              };
                            }
                            setUserAnswers(newAnswers);
                          }}
                          className="sr-only"
                        />
                      </label>
                    ))}
                  </div>
                )}

                {/* Sequence */}
                {currentQuestion.question_type === 'sequence' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 flex items-center space-x-2">
                      <GripVertical size={16} />
                      <span>Перетащите элементы для установки правильной последовательности:</span>
                    </p>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={({ active, over }) => {
                        if (!over || active.id === over.id) return;
                        const oldIndex = currentAnswer?.userOrder?.findIndex((id) => String(id) === String(active.id)) ?? -1;
                        const newIndex = currentAnswer?.userOrder?.findIndex((id) => String(id) === String(over.id)) ?? -1;
                        if (oldIndex >= 0 && newIndex >= 0) {
                          const newOrder = arrayMove(currentAnswer?.userOrder || [], oldIndex, newIndex);
                          setUserAnswers((prev) =>
                            prev.map((a) =>
                              a.questionId === currentQuestion.id ? { ...a, userOrder: newOrder } : a
                            )
                          );
                        }
                      }}
                    >
                      <SortableContext items={currentAnswer?.userOrder || []} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                          {currentAnswer?.userOrder?.map((answerId, idx) => {
                            const answer = currentQuestion.answers?.find((a) => String(a.id) === String(answerId));
                            return (
                              <SortableSequenceItem
                                key={answerId}
                                id={String(answerId)}
                                text={answer?.text}
                                index={idx}
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}

                {/* Text Answer */}
                {currentQuestion.question_type === 'text' && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Введите ваш развернутый ответ:
                    </label>
                    <textarea
                      value={currentAnswer?.textAnswer || ''}
                      onChange={(e) => {
                        const newAnswers = [...userAnswers];
                        const answerIndex = newAnswers.findIndex((a) => a.questionId === currentQuestion.id);
                        if (answerIndex >= 0) {
                          newAnswers[answerIndex] = {
                            ...newAnswers[answerIndex],
                            textAnswer: e.target.value,
                          };
                        }
                        setUserAnswers(newAnswers);
                      }}
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#19A980] focus:border-[#19A980] transition-all duration-200 resize-none bg-white"
                      rows={6}
                      placeholder="Введите развернутый ответ..."
                    />
                    <div className="text-xs text-gray-500">
                      {currentAnswer?.textAnswer?.length || 0} символов
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="border-t border-gray-100 p-6 hidden sm:block">
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevious}
                  disabled={submitting || currentQuestionIndex === 0}
                  className="flex items-center space-x-2 px-6 py-3 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                >
                  <ChevronLeft size={18} />
                  <span>Назад</span>
                </button>

                <button
                  onClick={handleNext}
                  disabled={submitting || !isAnswerFilled}
                  className="flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#06A478] to-[#148A6B] hover:from-[#148A6B] hover:to-[#06A478] text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Отправка...</span>
                    </>
                  ) : (
                    <>
                      <span>{currentQuestionIndex === questions.length - 1 ? 'Завершить тест' : 'Далее'}</span>
                      {currentQuestionIndex === questions.length - 1 ? <Send size={18} /> : <ChevronRight size={18} />}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile floating navigation - updated */}
        <div className="fixed bottom-4 left-2 right-2 z-50 sm:hidden pb-safe-bottom">
          <div
            className="
              flex items-center justify-between gap-2 px-4 py-3 rounded-2xl shadow-xl
              bg-white/95 backdrop-blur-xl
            "
          >
            {/* Назад */}
            <button
              onClick={handlePrevious}
              disabled={submitting || currentQuestionIndex === 0}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
              <span>Назад</span>
            </button>

            {/* Текущий номер вопроса */}
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 font-medium">
                {currentQuestionIndex + 1} из {questions.length}
              </span>
              <div className="w-12 h-1 bg-gray-200 rounded-full mt-1">
                <div 
                  className="h-1 bg-gradient-to-r from-[#06A478] to-[#148A6B] rounded-full transition-all duration-500"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Далее / Завершить */}
            <button
              onClick={handleNext}
              disabled={submitting || !isAnswerFilled}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#06A478] to-[#148A6B] hover:from-[#148A6B] hover:to-[#06A478] text-white shadow-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Отправка...</span>
                </>
              ) : (
                <>
                  <span>{currentQuestionIndex === questions.length - 1 ? 'Завершить' : 'Далее'}</span>
                  {currentQuestionIndex === questions.length - 1 ? <Send size={18} /> : <ChevronRight size={18} />}
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </>
  );
};