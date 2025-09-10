import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Award, FileText, CheckCircle, XCircle, BarChart4, Download, User, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';

interface TestResultsViewProps {
  testId: string;
  attemptId: string;
  score: number;
  isPassed: boolean;
  onClose: () => void;
}

interface Test {
  id: string;
  title: string;
  type: string;
  passing_score: number;
}

interface Question {
  id: string;
  question: string;
  question_type: string;
  points: number;
  order: number;
  user_answers: UserAnswer[];
  correct_answers: Answer[];
}

interface Answer {
  id: string;
  text: string;
  is_correct: boolean;
}

interface UserAnswer {
  id: string;
  answer_id: string;
  text_answer: string;
  is_correct: boolean;
  answer_time_seconds?: number;
  user_order?: string[]; // Добавляем поле для порядка ответов пользователя
}

export function TestResultsView({ testId, attemptId, score, isPassed, onClose }: TestResultsViewProps) {
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchTestResults();
  }, [testId, attemptId]);
  
  const fetchTestResults = async () => {
    setLoading(true);
    try {
      // Загружаем информацию о тесте
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('id, title, type, passing_score')
        .eq('id', testId)
        .single();
        
      if (testError) throw testError;
      setTest(testData);
      
      // Загружаем вопросы теста
      const { data: questionsData, error: questionsError } = await supabase
        .from('test_questions')
        .select('*')
        .eq('test_id', testId)
        .order('order');
        
      if (questionsError) throw questionsError;
      
      // Загружаем правильные ответы для каждого вопроса
      const questionsWithAnswers = await Promise.all(questionsData.map(async (question) => {
        // Получаем все возможные ответы на вопрос
        const { data: answers, error: answersError } = await supabase
          .from('test_answers')
          .select('id, text, is_correct')
          .eq('question_id', question.id)
          .order('order');
          
        if (answersError) throw answersError;
        
        // Получаем ответы пользователя на этот вопрос
        const { data: userAnswers, error: userAnswersError } = await supabase
          .from('user_test_answers')
          .select('id, answer_id, text_answer, is_correct, answer_time_seconds, user_order')
          .eq('attempt_id', attemptId)
          .eq('question_id', question.id);
          
        if (userAnswersError) throw userAnswersError;
        
        return {
          ...question,
          correct_answers: answers?.filter(a => a.is_correct) || [],
          user_answers: userAnswers || []
        };
      }));
      
      setQuestions(questionsWithAnswers);
    } catch (error: any) {
      console.error('Ошибка загрузки результатов теста:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Проверяем, правильно ли ответил пользователь на вопрос
  const isQuestionCorrect = (question: Question): boolean => {
    if (question.question_type === 'text') {
      // Для текстовых вопросов (в реальности нужна более сложная логика)
      return question.user_answers.some(ua => ua.is_correct);
    } else if (question.question_type === 'single_choice') {
      // Для вопросов с одним правильным ответом
      return question.user_answers.some(ua => ua.is_correct);
    } else if (question.question_type === 'multiple_choice') {
      // Для вопросов с несколькими правильными ответами
      // Все ответы пользователя должны быть правильными, и он должен выбрать все правильные ответы
      const correctAnswerIds = new Set(question.correct_answers.map(a => a.id));
      const userAnswerIds = new Set(question.user_answers.map(ua => ua.answer_id).filter(Boolean));
      
      // Проверяем, что все ответы пользователя правильные
      for (const userAnswerId of userAnswerIds) {
        if (!correctAnswerIds.has(userAnswerId)) {
          return false;
        }
      }
      
      // Проверяем, что пользователь выбрал все правильные ответы
      return userAnswerIds.size === correctAnswerIds.size;
    } else if (question.question_type === 'sequence') {
      // Для вопросов типа 'sequence' проверяем порядок ответов пользователя
      const userOrder = question.user_answers[0]?.user_order;
      const correctOrder = question.correct_answers.map(a => a.id);

      if (!userOrder || userOrder.length !== correctOrder.length) {
        return false;
      }

      for (let i = 0; i < userOrder.length; i++) {
        if (userOrder[i] !== correctOrder[i]) {
          return false;
        }
      }
      return true;
    }
    
    return false;
  };
  
  // Получаем процент правильных ответов
  const getCorrectQuestionsPercentage = (): number => {
    if (questions.length === 0) return 0;
    const correctQuestions = questions.filter(q => isQuestionCorrect(q)).length;
    return Math.round((correctQuestions / questions.length) * 100);
  };
  
  // Получаем оценку на основе набранных баллов
  const getGrade = (percentage: number): string => {
    if (percentage >= 90) return 'Отлично';
    if (percentage >= 75) return 'Хорошо';
    if (percentage >= 60) return 'Удовлетворительно';
    return 'Неудовлетворительно';
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sns-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-900">Загрузка результатов...</p>
          <p className="text-sm text-gray-500 mt-2">Пожалуйста, подождите</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
          <div className="text-center">
            <XCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ошибка загрузки результатов</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Вернуться
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!test) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
          <div className="text-center">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Результаты не найдены</h2>
            <p className="text-gray-600 mb-6">Не удалось найти результаты этого теста</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Вернуться
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onClose}
                className="mr-3 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Результаты теста</h1>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Завершить
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto py-6 px-4">
        {/* Общий результат */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className={clsx(
            "p-6 text-white",
            isPassed ? "bg-gradient-to-r from-green-600 to-green-700" : "bg-gradient-to-r from-red-600 to-red-700"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-1">{test.title}</h2>
                <p>{getTypeLabel(test.type)}</p>
              </div>
              <div className="text-center bg-white/10 py-3 px-6 rounded-lg backdrop-blur-sm">
                <div className="text-3xl font-bold">{score}%</div>
                <div className="text-sm">{getGrade(score)}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {isPassed ? (
                <div className="flex items-center bg-white/20 px-3 py-1 rounded-full">
                  <CheckCircle size={16} className="mr-1" />
                  <span>Тест пройден успешно!</span>
                </div>
              ) : (
                <div className="flex items-center bg-white/20 px-3 py-1 rounded-full">
                  <XCircle size={16} className="mr-1" />
                  <span>Тест не пройден. Проходной балл: {test.passing_score}%</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Статистика</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Правильных ответов</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {questions.filter(q => isQuestionCorrect(q)).length} из {questions.length}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle size={20} className="text-green-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Процент правильных</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {getCorrectQuestionsPercentage()}%
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart4 size={20} className="text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Оценка</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {getGrade(score)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Award size={20} className="text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Вопросы и ответы */}
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Детализация по вопросам</h3>
        <div className="space-y-6">
          {questions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className={clsx(
                "p-4 border-l-4",
                isQuestionCorrect(question) ? "border-l-green-500" : "border-l-red-500"
              )}>
                <div className="flex justify-between items-start">
                  <div className="flex items-start">
                    <div className={clsx(
                      "w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0",
                      isQuestionCorrect(question) ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    )}>
                      {isQuestionCorrect(question) ? (
                        <CheckCircle size={16} />
                      ) : (
                        <XCircle size={16} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-1">Вопрос {index + 1}</h4>
                      <p className="text-lg">{question.question}</p>
                    </div>
                  </div>
                  <div className={clsx(
                    "px-2 py-1 rounded text-sm",
                    isQuestionCorrect(question) ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  )}>
                    {isQuestionCorrect(question) ? "Верно" : "Неверно"}
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4">
                {/* Для вопросов с одним или несколькими вариантами ответов */}
                {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Варианты ответов:</h5>
                    
                    {/* Показываем время ответа */}
                    {question.user_answers.length > 0 && question.user_answers[0].answer_time_seconds !== undefined && (
                      <div className="mb-3 p-2 bg-blue-50 rounded-lg inline-block">
                        <div className="flex items-center text-sm text-blue-700">
                          <Clock size={14} className="mr-1" />
                          <span>Время ответа: {Math.round(question.user_answers[0].answer_time_seconds)} сек.</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      {/* Перебираем все возможные ответы */}
                      {question.correct_answers.map(answer => {
                        const userSelected = question.user_answers.some(ua => ua.answer_id === answer.id);
                        
                        return (
                          <div 
                            key={answer.id}
                            className={clsx(
                              "p-3 border rounded-lg flex items-start",
                              answer.is_correct && userSelected
                                ? "border-green-300 bg-green-50"
                                : answer.is_correct
                                ? "border-blue-300 bg-blue-50"
                                : userSelected
                                ? "border-red-300 bg-red-50"
                                : "border-gray-200"
                            )}
                          >
                            <div className="flex-shrink-0 mt-0.5 mr-3">
                              {answer.is_correct ? (
                                <CheckCircle size={16} className="text-green-600" />
                              ) : (
                                <XCircle size={16} className="text-red-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className={clsx(
                                "text-sm",
                                answer.is_correct ? "font-medium" : ""
                              )}>
                                {answer.text}
                              </p>
                              
                              {answer.is_correct && !userSelected && (
                                <p className="text-xs text-blue-700 mt-1">
                                  Это правильный ответ, но вы его не выбрали
                                </p>
                              )}
                              
                              {!answer.is_correct && userSelected && (
                                <p className="text-xs text-red-700 mt-1">
                                  Вы выбрали этот ответ, но он неверный
                                </p>
                              )}
                            </div>
                            {userSelected && (
                              <div className="flex-shrink-0 ml-2">
                                {answer.is_correct ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    Ваш выбор (верно)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                    Ваш выбор (неверно)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Для текстовых вопросов */}
                {question.question_type === 'text' && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Ваш ответ:</h5>
                    {question.user_answers.length > 0 && question.user_answers[0].text_answer ? (
                      <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 mb-2">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">
                          {question.user_answers[0].text_answer}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Вы не ответили на этот вопрос</p>
                    )}
                    
                    {/* Показываем время ответа */}
                    {question.user_answers.length > 0 && question.user_answers[0].answer_time_seconds !== undefined && (
                      <div className="mb-3 p-2 bg-blue-50 rounded-lg inline-block">
                        <div className="flex items-center text-sm text-blue-700">
                          <Clock size={14} className="mr-1" />
                          <span>Время ответа: {Math.round(question.user_answers[0].answer_time_seconds)} сек.</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 p-3 border border-blue-200 rounded-lg bg-blue-50">
                      <h5 className="text-sm font-medium text-blue-800 mb-1">Комментарий проверяющего:</h5>
                      <p className="text-sm text-blue-700">
                        {isQuestionCorrect(question) 
                          ? "Ответ зачтен. Все основные аспекты раскрыты."
                          : "Ответ не зачтен или требует доработки. Проконсультируйтесь с тренером."
                        }
                      </p>
                    </div>
                  </div>
                )}
                {/* Для вопросов типа 'sequence' */}
                {question.question_type === 'sequence' && (
                  <div className="flex flex-col md:flex-row gap-4 mt-2">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">Правильная последовательность:</div>
                      <ol className="list-decimal ml-5">
                        {question.correct_answers.map((a, idx) => (
                          <li key={a.id}>{a.text}</li>
                        ))}
                      </ol>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">Ваш ответ:</div>
                      <ol className="list-decimal ml-5">
                        {(question.user_answers[0]?.user_order || []).map((answerId, idx) => {
                          const answer = question.correct_answers.find(a => String(a.id) === String(answerId));
                          return <li key={answerId}>{answer?.text || '—'}</li>;
                        })}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// Вспомогательная функция для определения типа теста
function getTypeLabel(type: string): string {
  switch (type) {
    case 'entry': return 'Входной тест';
    case 'final': return 'Итоговый тест';
    case 'annual': return 'Годовой тест';
    default: return 'Тест';
  }
}

// Вспомогательная функция для отображения пользовательской последовательности
function getUserSequenceResult(question: Question) {
  if (!question.user_answers || question.user_answers.length === 0) return [];
  const userOrder = question.user_answers[0]?.user_order;
  if (!userOrder || !Array.isArray(userOrder)) return [];
  // Сопоставляем userOrder с текстами вариантов
  const allAnswers = question.correct_answers.concat(); // предполагаем, что correct_answers содержит все варианты
  return userOrder.map(id => allAnswers.find(a => a.id === id)).filter(Boolean);
}