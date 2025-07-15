import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Clock, AlertTriangle, CheckCircle, Save, Flag, X, LifeBuoy, Send, FileText, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';
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

// Утилита для перехода в fullscreen
function requestFullscreen() {
  const element = document.documentElement;
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if ((element as any).webkitRequestFullscreen) {
    (element as any).webkitRequestFullscreen();
  } else if ((element as any).msRequestFullscreen) {
    (element as any).msRequestFullscreen();
  } else {
    alert('Ваш браузер не поддерживает полноэкранный режим для этого приложения. На iPhone/iPad используйте «Добавить на главный экран».');
  }
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
}

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
  const congratsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Удалены showFullscreenPrompt, isIOSDevice, handleFullscreenPrompt

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 0,
        tolerance: 20
      }
    })
  );

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
          setTimeRemaining(testData.time_limit * 60); // Перевод минут в секунды
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
          .select(`
            *,
            answers:test_answers(*)
          `)
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
              q.answers = seqAnswers.map((a: any, index: number) => ({
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
        const correctOrder = seqAnswers.map(a => a.id);
        const isCorrect = JSON.stringify(userAnswer.user_order) === JSON.stringify(correctOrder);
        if (isCorrect) {
          totalPoints += question.points;
        }
      }
    }
  }

  const scorePercentage = maxScore > 0 ? Math.round((totalPoints / maxScore) * 100) : 0;

  console.log('questions:', questions.map(q => ({id: q.id, points: q.points})));
  console.log('maxScore:', maxScore, 'totalPoints:', totalPoints, 'scorePercentage:', scorePercentage);

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

useEffect(() => {
return () => {
  if (congratsTimeoutRef.current) clearTimeout(congratsTimeoutRef.current);
};
}, []);

// Удалены showFullscreenPrompt, isIOSDevice, handleFullscreenPrompt

return (
<div className="font-sans">
  {/* Congratulatory Modal */}
  {showCongrats && (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md mx-4 border border-emerald-200 animate-fade-in">
        <CheckCircle className="mx-auto text-emerald-500 mb-4" size={48} />
        <h2 className="text-2xl font-bold text-gray-900">Поздравляем!</h2>
        <p className="text-base text-gray-600 mt-2">Вы успешно завершили тест.</p>
        <p className="text-sm text-gray-500 mt-2">Перенаправление через несколько секунд...</p>
      </div>
    </div>
  )}
  {/* Overlay-кнопка для fullscreen на мобильных */}
  {/* Удален overlay-контент fullscreen */}
  {/* Main Content */}
  <main className="w-full p-2 sm:p-6">
    {loading && (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent mx-auto"></div>
        <p className="mt-4 text-gray-600 text-lg">Загрузка теста...</p>
      </div>
    )}
    {error && (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      </div>
    )}
    {!loading && !error && test && questions.length > 0 && (
      <div className="bg-transparent sm:bg-white sm:rounded-2xl sm:shadow-lg p-0 sm:p-8 w-full mt-2 mb-2">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
        {/* Question */}
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-6 leading-7">{questions[currentQuestionIndex].question}</h3>
        {/* Answer Options */}
        {questions[currentQuestionIndex].question_type === 'single_choice' && (
          <div className="space-y-2 mb-8">
            {questions[currentQuestionIndex].answers?.map((answer) => (
              <label
                key={answer.id}
                className={clsx(
                  'flex items-center space-x-3 p-3 border rounded-2xl cursor-pointer transition-all duration-200 relative',
                  userAnswers.find(a => a.questionId === questions[currentQuestionIndex].id)?.answerId === answer.id
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                )}
                style={{ minHeight: 0 }}
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
                  className="sr-only peer"
                  aria-label={`Выбрать ответ: ${answer.text}`}
                />
                <span className="w-5 h-5 min-w-[1.25rem] min-h-[1.25rem] aspect-square rounded-full border-2 border-emerald-500 bg-white flex items-center justify-center peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition overflow-hidden">
                  <span className="w-3 h-3 rounded-full bg-white peer-checked:bg-white transition-all"></span>
                </span>
                <span className="text-gray-800 text-sm leading-tight">{answer.text}</span>
              </label>
            ))}
          </div>
        )}
        {questions[currentQuestionIndex].question_type === 'multiple_choice' && (
          <div className="space-y-2 mb-8">
            {questions[currentQuestionIndex].answers?.map((answer) => (
              <label
                key={answer.id}
                className={clsx(
                  'flex items-center space-x-3 p-3 border rounded-2xl cursor-pointer transition-all duration-200 relative',
                  userAnswers.find(a => a.questionId === questions[currentQuestionIndex].id)?.answerId?.split(',').includes(answer.id)
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                )}
                style={{ minHeight: 0 }}
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
                  className="sr-only peer"
                  aria-label={`Выбрать ответ: ${answer.text}`}
                />
                <span className="w-5 h-5 rounded border-2 border-emerald-500 flex items-center justify-center peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition">
                  <svg
                    className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    viewBox="0 0 16 16"
                  >
                    <polyline points="4,8 7,11 12,5" />
                  </svg>
                </span>
                <span className="text-gray-800 text-sm leading-tight">{answer.text}</span>
              </label>
            ))}
          </div>
        )}
        {questions[currentQuestionIndex].question_type === 'sequence' && (
          <div>
            <p className="text-sm text-gray-500 mb-4">Перетащите варианты, чтобы задать правильную последовательность:</p>
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
                <ul className="space-y-2">
                  {userAnswers.find(a => a.questionId === questions[currentQuestionIndex].id)?.userOrder?.map((answerId, idx) => {
                    const answer = questions[currentQuestionIndex].answers?.find(a => String(a.id) === String(answerId));
                    return (
                      <SortableSequenceItem key={answerId} id={String(answerId)} text={answer?.text} index={idx} />
                    );
                  })}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        )}
        {questions[currentQuestionIndex].question_type === 'text' && (
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
            className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
            rows={5}
            placeholder="Введите ваш ответ..."
            aria-label="Текстовый ответ"
          />
        )}
        {/* Navigation Buttons */}
        <div className="fixed bottom-0 left-0 w-full z-40 flex justify-center pointer-events-none px-2 pb-6 sm:px-4 sm:pb-8">
          <div className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-md border border-white/20 shadow-lg ring-1 ring-white/10 rounded-3xl px-4 py-3 flex items-center justify-between gap-4 pointer-events-auto transition-all duration-300 sm:backdrop-blur-lg sm:rounded-2xl sm:px-3">
            <button
              type="button"
              onClick={() => {
                saveUserAnswer();
                setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
                setQuestionStartTime(Date.now());
              }}
              disabled={submitting || currentQuestionIndex === 0}
              className="flex items-center gap-2 min-w-[90px] h-10 px-3 text-sm font-medium text-white bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 hover:ring-1 hover:ring-emerald-500 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
              Назад
            </button>

            <div className="flex items-center justify-center min-w-[50px] h-10 px-2 text-xs text-gray-200 tracking-wide font-mono">
              {currentQuestionIndex + 1} / {questions.length}
            </div>

            <button
              type="button"
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
              className="flex items-center gap-2 min-w-[90px] h-10 px-4 text-sm font-semibold text-white bg-emerald-600 rounded-xl border border-emerald-700 hover:bg-emerald-700 shadow-[0_0_0_2px_#10B98133] hover:shadow-[0_0_0_4px_#10B98144] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Далее
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    )}
  </main>
</div>
);
}

function SortableSequenceItem({ id, text, index }: { id: string; text?: string; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
        touchAction: 'none',
      }}
      className={clsx(
        'bg-white rounded-2xl px-3 py-3 flex items-center shadow-sm border border-gray-200',
        isDragging ? 'ring-2 ring-emerald-400 shadow-md' : 'hover:bg-emerald-50/50'
      )}
      aria-label={`Вариант ответа ${index + 1}: ${text || '—'}`}
    >
      <span
        className="flex items-center cursor-grab active:cursor-grabbing select-none" // убрал w-8 и mr-1
        {...attributes}
        {...listeners}
        tabIndex={0}
        aria-label="Перетащить"
      >
        <GripVertical className="text-gray-400" size={18} />
        <span className="ml-0.5 text-gray-500 font-medium text-xs">{index + 1}.</span> {/* минимальный отступ */}
      </span>
      <span className="text-gray-800 text-sm leading-tight flex-1">{text || '—'}</span>
    </li>
  );
}