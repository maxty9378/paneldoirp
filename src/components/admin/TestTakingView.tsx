import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Clock, AlertTriangle, CheckCircle, Save, Flag, X, LifeBuoy, Send, FileText, GripVertical, Maximize, Minimize } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  TouchSensor, 
  KeyboardSensor,
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  useSortable, 
  verticalListSortingStrategy,
  sortableKeyboardCoordinates 
} from '@dnd-kit/sortable';
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

// Утилиты для работы с мобильными устройствами
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth <= 768;
};

const requestFullscreen = async () => {
  const element = document.documentElement;
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
    } else if ((element as any).webkitRequestFullscreen) { // Safari
      await (element as any).webkitRequestFullscreen();
    } else if ((element as any).msRequestFullscreen) { // IE/Edge
      await (element as any).msRequestFullscreen();
    }
  } catch (err) {
    console.log('Fullscreen request failed:', err);
  }
};

const exitFullscreen = async () => {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      await (document as any).msExitFullscreen();
    }
  } catch (err) {
    console.log('Exit fullscreen failed:', err);
  }
};

export function TestTakingView({ testId, eventId, attemptId, onComplete, onCancel, onTestLoaded }: TestTakingViewProps) {
  const { userProfile } = useAuth();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [questionTimers, setQuestionTimers] = useState<{[key: string]: number}>({});
  const [submitting, setSubmitting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isTimerUnlimited, setIsTimerUnlimited] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const congratsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Улучшенная конфигурация сенсоров для мобильных устройств
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 8,
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Инициализация и обработка полноэкранного режима
  useEffect(() => {
    const mobile = isMobile();
    setIsMobileDevice(mobile);

    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!document.fullscreenElement ||
        !!(document as any).webkitFullscreenElement ||
        !!(document as any).msFullscreenElement
      );
    };

    // Добавляем обработчики событий для всех браузеров
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Автоматически включаем полноэкранный режим на мобильных устройствах
    if (mobile && !document.fullscreenElement) {
      const timer = setTimeout(() => {
        requestFullscreen();
      }, 1000); // Задержка для лучшего UX
      
      return () => clearTimeout(timer);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Обработка выхода из полноэкранного режима
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  // Загрузка данных теста
  useEffect(() => {
    const loadTestData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!userProfile?.id) {
          throw new Error("Пользователь не авторизован");
        }

        // Загрузка информации о тесте
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

        // Проверка попытки
        const { data: attemptData, error: attemptError } = await supabase
          .from('user_test_attempts')
          .select('*')
          .eq('id', attemptId)
          .eq('user_id', userProfile.id)
          .eq('test_id', testId)
          .eq('event_id', eventId)
          .single();

        if (attemptError || !attemptData) {
          throw new Error("Попытка прохождения теста не найдена или недоступна");
        }

        // Загрузка вопросов
        const { data: questionsData, error: questionsError } = await supabase
          .from('test_questions')
          .select('*, answers:test_answers(*)')
          .eq('test_id', testId)
          .order('order');

        if (questionsError || !questionsData) throw questionsError || new Error('Вопросы не найдены');

        // Формирование вопросов с ответами
        const questionsWithAnswers = (questionsData || []).map((q: any) => ({
          ...q,
          answers: q.answers?.sort((a: any, b: any) => a.order - b.order) || [],
          correct_order: q.correct_order
        }));

        // Загрузка ответов для вопросов типа sequence
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
                order: a.answer_order
              }));
            }
          }
        }
        setQuestions(questionsWithAnswers);

        // Инициализация ответов пользователя
        let initialUserAnswers: any[] = questionsWithAnswers.map((q: any) => {
          if (q.question_type === 'sequence') {
            const shuffled = (q.answers || []).map((a: any) => String(a.id)).sort(() => Math.random() - 0.5);
            return {
              questionId: q.id,
              marked: false,
              userOrder: shuffled as (string | number)[],
              textAnswer: '',
              answerId: ''
            };
          }
          return {
            questionId: q.id,
            marked: false,
            textAnswer: '',
            answerId: ''
          };
        });

        setUserAnswers(initialUserAnswers);

        // Загрузка существующих ответов
        const { data: existingAnswers, error: answersError } = await supabase
          .from('user_test_answers')
          .select('*')
          .eq('attempt_id', attemptId);

        if (!answersError && existingAnswers && existingAnswers.length > 0) {
          initialUserAnswers = [...initialUserAnswers];
          for (const answer of existingAnswers || []) {
            const questionIndex = questionsWithAnswers.findIndex((q: any) => q.id === answer.question_id);
            if (questionIndex >= 0) {
              if (answer.text_answer) {
                initialUserAnswers[questionIndex] = {
                  ...initialUserAnswers[questionIndex],
                  textAnswer: answer.text_answer
                };
              } else if (answer.answer_id) {
                const question = questionsWithAnswers[questionIndex];
                if (question.question_type === 'single_choice') {
                  initialUserAnswers[questionIndex] = {
                    ...initialUserAnswers[questionIndex],
                    answerId: answer.answer_id
                  };
                } else if (question.question_type === 'multiple_choice') {
                  const currentAnswerId = initialUserAnswers[questionIndex].answerId;
                  const answerIds = currentAnswerId ? currentAnswerId.split(',') : [];
                  if (!answerIds.includes(answer.answer_id)) {
                    answerIds.push(answer.answer_id);
                  }
                  initialUserAnswers[questionIndex] = {
                    ...initialUserAnswers[questionIndex],
                    answerId: answerIds.join(',')
                  };
                } else if (question.question_type === 'sequence') {
                  initialUserAnswers[questionIndex] = {
                    ...initialUserAnswers[questionIndex],
                    userOrder: (answer.user_order || []).map((id: any) => String(id))
                  };
                }
              }
            }
          }
          setUserAnswers(initialUserAnswers);
        }

        setQuestionStartTime(Date.now());
      } catch (err) {
        console.error('Ошибка загрузки теста:', err);
        setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке теста');
      } finally {
        setLoading(false);
      }
    };

    loadTestData();
  }, [testId, eventId, attemptId, userProfile?.id]);

  // Таймер теста
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || loading || showInstructions || isTimerUnlimited) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, loading, showInstructions, isTimerUnlimited]);

  // Сохранение ответа пользователя
  const saveUserAnswer = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    const answer = userAnswers.find(a => a.questionId === currentQuestion.id);

    if (!answer) return;

    try {
      await supabase
        .from('user_test_answers')
        .delete()
        .eq('attempt_id', attemptId)
        .eq('question_id', currentQuestion.id);

      if (currentQuestion.question_type === 'text') {
        if (answer.textAnswer && answer.textAnswer.trim()) {
          await supabase
            .from('user_test_answers')
            .insert({
              attempt_id: attemptId,
              question_id: currentQuestion.id,
              text_answer: answer.textAnswer.trim()
            });
        }
      } else if (currentQuestion.question_type === 'single_choice') {
        if (answer.answerId) {
          await supabase
            .from('user_test_answers')
            .insert({
              attempt_id: attemptId,
              question_id: currentQuestion.id,
              answer_id: answer.answerId
            });
        }
      } else if (currentQuestion.question_type === 'multiple_choice') {
        if (answer.answerId) {
          const answerIds = answer.answerId.split(',');
          const insertData = answerIds.map(answerId => ({
            attempt_id: attemptId,
            question_id: currentQuestion.id,
            answer_id: answerId
          }));
          
          await supabase
            .from('user_test_answers')
            .insert(insertData);
        }
      } else if (currentQuestion.question_type === 'sequence') {
        if (answer.userOrder && answer.userOrder.length > 0) {
          await supabase
            .from('user_test_answers')
            .insert({
              attempt_id: attemptId,
              question_id: currentQuestion.id,
              user_order: answer.userOrder
            });
        }
      }
    } catch (error) {
      console.error('Ошибка сохранения ответа:', error);
    }
  };

  // Завершение теста
  const handleSubmitTest = async () => {    
    await saveUserAnswer();
    setSubmitting(true);

    try {
      if (!attemptId) {
        throw new Error("Ошибка: ID попытки не найден");
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
        
        const questionAnswers = userTestAnswers?.filter(a => a.question_id === question.id) || [];
        
        if (question.question_type === 'single_choice') {
          const userAnswer = questionAnswers[0];
          if (userAnswer) {
            const correctAnswer = question.answers?.find(a => a.id === userAnswer.answer_id && a.is_correct);
            if (correctAnswer) {
              totalPoints += question.points;
            }
          }
        } else if (question.question_type === 'multiple_choice' && questionAnswers.length > 0) {
          const correctAnswers = question.answers?.filter(a => a.is_correct) || [];
          const userAnswerIds = questionAnswers.map(a => a.answer_id);
          
          const allCorrectSelected = correctAnswers.every(ca => userAnswerIds.includes(ca.id));
          const noIncorrectSelected = userAnswerIds.every(id => 
            question.answers?.find(a => a.id === id)?.is_correct
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
            const correctOrder = seqAnswers?.map(a => a.id);
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
          status: 'completed'
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

  // Очистка таймеров
  useEffect(() => {
    return () => {
      if (congratsTimeoutRef.current) clearTimeout(congratsTimeoutRef.current);
    };
  }, []);

  // Обработка кнопки полноэкранного режима
  const handleFullscreenToggle = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      requestFullscreen();
    }
  };

  // Форматирование времени
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins.toString() + ':' + secs.toString().padStart(2, '0');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Загрузка теста...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
            <h3 className="text-lg font-semibold text-red-900">Ошибка</h3>
          </div>
          <p className="text-red-800 mb-4">{error}</p>
          <button
            onClick={onCancel}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
          >
            Вернуться назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      "min-h-screen bg-gray-50 font-sans transition-all duration-300",
      isFullscreen ? "p-2" : "p-4",
      isMobileDevice && "touch-pan-y"
    )}>
      {/* Модальное окно поздравления */}
      {showCongrats && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md w-full border border-emerald-200 animate-fade-in">
            <CheckCircle className="mx-auto text-emerald-500 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Поздравляем!</h2>
            <p className="text-base text-gray-600 mb-2">Вы успешно завершили тест.</p>
            <p className="text-sm text-gray-500">Перенаправление через несколько секунд...</p>
          </div>
        </div>
      )}

      {/* Верхняя панель с таймером и кнопкой полноэкранного режима */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          {timeRemaining !== null && timeRemaining > 0 && (
            <div className="flex items-center bg-white rounded-lg px-4 py-2 shadow-sm border">
              <Clock className="h-5 w-5 text-emerald-600 mr-2" />
              <span className={clsx(
                "font-mono text-lg font-semibold",
                timeRemaining <= 300 ? "text-red-600" : "text-emerald-600"
              )}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>
        
        {isMobileDevice && (
          <button
            onClick={handleFullscreenToggle}
            className="bg-white p-2 rounded-lg shadow-sm border hover:bg-gray-50 transition-colors"
            aria-label={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5 text-gray-600" />
            ) : (
              <Maximize className="h-5 w-5 text-gray-600" />
            )}
          </button>
        )}
      </div>

      {/* Основное содержимое */}
      {test && questions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-4xl mx-auto">
          <div className="p-4 sm:p-8">
            {/* Прогресс-бар */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Вопрос {currentQuestionIndex + 1} из {questions.length}
                </h2>
                <div className="text-sm text-gray-500">
                  {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Вопрос */}
            <div className="mb-8">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-relaxed mb-4">
                {questions[currentQuestionIndex].question}
              </h3>
              <div className="text-sm text-gray-500">
                Баллов: {questions[currentQuestionIndex].points}
              </div>
            </div>

            {/* Варианты ответов */}
            <div className="mb-8">
              {/* Одиночный выбор */}
              {questions[currentQuestionIndex].question_type === 'single_choice' && (
                <div className="space-y-3">
                  {questions[currentQuestionIndex].answers?.map((answer) => (
                    <label
                      key={answer.id}
                      className={clsx(
                        'flex items-center space-x-4 p-4 border rounded-xl cursor-pointer transition-all duration-200',
                        userAnswers.find(a => a.questionId === questions[currentQuestionIndex].id)?.answerId === answer.id
                          ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                          : 'bg-gray-50 border-gray-200 hover:bg-emerald-50/50 hover:border-emerald-200'
                      )}
                    >
                      <input
                        type="radio"
                        name={`question-${questions[currentQuestionIndex].id}`}
                        value={answer.id}
                        checked={userAnswers.find(a => a.questionId === questions[currentQuestionIndex].id)?.answerId === answer.id}
                        onChange={(e) => {
                          const newAnswers = [...userAnswers];
                          const answerIndex = newAnswers.findIndex(a => a.questionId === questions[currentQuestionIndex].id);
                          if (answerIndex >= 0) {
                            newAnswers[answerIndex] = {
                              ...newAnswers[answerIndex],
                              answerId: e.target.value
                            };
                          }
                          setUserAnswers(newAnswers);
                        }}
                        className="sr-only"
                      />
                      <span className="w-6 h-6 min-w-[1.5rem] rounded-full border-2 border-emerald-500 bg-white flex items-center justify-center">
                        <span className={clsx(
                          "w-3 h-3 rounded-full transition-all duration-200",
                          userAnswers.find(a => a.questionId === questions[currentQuestionIndex].id)?.answerId === answer.id
                            ? "bg-emerald-500"
                            : "bg-transparent"
                        )}></span>
                      </span>
                      <span className="text-gray-800 text-base flex-1">{answer.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Множественный выбор */}
              {questions[currentQuestionIndex].question_type === 'multiple_choice' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">Выберите все правильные ответы:</p>
                  {questions[currentQuestionIndex].answers?.map((answer) => (
                    <label
                      key={answer.id}
                      className={clsx(
                        'flex items-center space-x-4 p-4 border rounded-xl cursor-pointer transition-all duration-200',
                        userAnswers.find(a => a.questionId === questions[currentQuestionIndex].id)?.answerId?.split(',').includes(answer.id)
                          ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                          : 'bg-gray-50 border-gray-200 hover:bg-emerald-50/50 hover:border-emerald-200'
                      )}
                    >
                      <input
                        type="checkbox"
                        value={answer.id}
                        checked={userAnswers.find(a => a.questionId === questions[currentQuestionIndex].id)?.answerId?.split(',').includes(answer.id) || false}
                        onChange={(e) => {
                          const newAnswers = [...userAnswers];
                          const answerIndex = newAnswers.findIndex(a => a.questionId === questions[currentQuestionIndex].id);
                          if (answerIndex >= 0) {
                            const currentAnswerIds = newAnswers[answerIndex].answerId ? newAnswers[answerIndex].answerId!.split(',') : [];
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
                              answerId: currentAnswerIds.join(',')
                            };
                          }
                          setUserAnswers(newAnswers);
                        }}
                        className="sr-only"
                      />
                      <span className="w-6 h-6 min-w-[1.5rem] rounded border-2 border-emerald-500 flex items-center justify-center bg-white">
                        <svg
                          className={clsx(
                            "w-4 h-4 text-emerald-500 transition-all duration-200",
                            userAnswers.find(a => a.questionId === questions[currentQuestionIndex].id)?.answerId?.split(',').includes(answer.id)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          viewBox="0 0 16 16"
                        >
                          <polyline points="4,8 7,11 12,5" />
                        </svg>
                      </span>
                      <span className="text-gray-800 text-base flex-1">{answer.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Последовательность (drag & drop) */}
              {questions[currentQuestionIndex].question_type === 'sequence' && (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    {isMobileDevice ? 'Удерживайте и перетащите' : 'Перетащите'} варианты для установки правильной последовательности:
                  </p>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={({ active, over }) => {
                      if (!over || active.id === over.id) return;
                      const oldIndex = userAnswers.find(a => a.questionId === questions[currentQuestionIndex].id)?.userOrder?.findIndex(id => String(id) === String(active.id)) ?? -1;
                      const newIndex = userAnswers.find(a => a.questionId === questions[currentQuestionIndex].id)?.userOrder?.findIndex(id => String(id) === String(over.id)) ?? -1;
                      if (oldIndex >= 0 && newIndex >= 0) {
                        const newOrder = arrayMove(userAnswers.find(a => a.questionId === questions[currentQuestionIndex].id)?.userOrder || [], oldIndex, newIndex);
                        setUserAnswers(prev => prev.map(a =>
                          a.questionId === questions[currentQuestionIndex].id
                            ? { ...a, userOrder: newOrder }
                            : a
                        ));
                      }
                    }}
                  >
                    <SortableContext items={userAnswers.find(a => a.questionId === questions[currentQuestionIndex].id)?.userOrder || []} strategy={verticalListSortingStrategy}>
                      <ul className="space-y-3">
                        {userAnswers.find(a => a.questionId === questions[currentQuestionIndex].id)?.userOrder?.map((answerId, idx) => {
                          const answer = questions[currentQuestionIndex].answers?.find(a => String(a.id) === String(answerId));
                          return (
                            <SortableSequenceItem 
                              key={answerId} 
                              id={String(answerId)} 
                              text={answer?.text} 
                              index={idx}
                              isMobile={isMobileDevice}
                            />
                          );
                        })}
                      </ul>
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              {/* Текстовый ответ */}
              {questions[currentQuestionIndex].question_type === 'text' && (
                <div>
                  <textarea
                    value={userAnswers.find(a => a.questionId === questions[currentQuestionIndex].id)?.textAnswer || ''}
                    onChange={(e) => {
                      const newAnswers = [...userAnswers];
                      const answerIndex = newAnswers.findIndex(a => a.questionId === questions[currentQuestionIndex].id);
                      if (answerIndex >= 0) {
                        newAnswers[answerIndex] = {
                          ...newAnswers[answerIndex],
                          textAnswer: e.target.value
                        };
                      }
                      setUserAnswers(newAnswers);
                    }}
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 resize-none"
                    rows={isMobileDevice ? 4 : 6}
                    placeholder="Введите ваш ответ..."
                  />
                </div>
              )}
            </div>

            {/* Кнопки навигации */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              {currentQuestionIndex > 0 ? (
                <button
                  onClick={() => {
                    saveUserAnswer();
                    setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
                    setQuestionStartTime(Date.now());
                  }}
                  disabled={submitting}
                  className="flex items-center px-6 py-3 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Назад
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => {
                  saveUserAnswer();
                  if (currentQuestionIndex < questions.length - 1) {
                    setCurrentQuestionIndex(prev => prev + 1);
                    setQuestionStartTime(Date.now());
                  } else {
                    handleSubmitTest();
                  }
                }}
                disabled={submitting}
                className="flex items-center px-6 py-3 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Сохранение...
                  </>
                ) : currentQuestionIndex < questions.length - 1 ? (
                  <>
                    Далее
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Завершить тест
                    <Send className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Компонент для элементов последовательности с улучшенной поддержкой мобильных устройств
function SortableSequenceItem({ id, text, index, isMobile }: { 
  id: string; 
  text?: string; 
  index: number;
  isMobile: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1000 : 'auto',
        touchAction: 'none',
      }}
      className={clsx(
        'bg-white rounded-xl px-4 py-4 flex items-center shadow-sm border-2 select-none',
        isDragging 
          ? 'ring-2 ring-emerald-400 shadow-lg border-emerald-300 bg-emerald-50' 
          : 'border-gray-200 hover:border-emerald-200 hover:shadow-md',
        isMobile ? 'active:scale-105' : ''
      )}
      {...attributes}
      {...listeners}
    >
      <span className={clsx(
        "mr-4 text-gray-400 hover:text-emerald-600 transition-colors",
        isMobile ? 'cursor-grab active:cursor-grabbing' : 'cursor-grab'
      )}>
        <GripVertical size={20} />
      </span>
      <span className="mr-3 text-gray-500 font-semibold text-lg min-w-[2rem]">
        {index + 1}.
      </span>
      <span className="text-gray-800 text-base flex-1 leading-relaxed">
        {text || '—'}
      </span>
    </li>
  );
}
