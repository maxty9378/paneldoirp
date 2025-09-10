import React, { useState, useEffect } from 'react';
import { Clock, User, FileText, CheckCircle, Eye, AlertCircle, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';
import { TestReviewModal } from './TestReviewModal';

interface PendingTest {
  attempt_id: string;
  user_name: string;
  user_email: string;
  test_title: string;
  test_type: string;
  submitted_at: string;
  open_questions_count: number;
}

interface ReviewedTest {
  attempt_id: string;
  user_name: string;
  user_email: string;
  test_title: string;
  test_type: string;
  reviewed_at: string;
  score: number;
  passed: boolean;
  correct_answers: number;
  total_answers: number;
  reviewer_name: string;
}

interface TestsPendingReviewProps {
  eventId?: string;
  onReviewComplete?: () => void;
  onEditReview?: (attemptId: string) => void;
}

export function TestsPendingReview({ eventId, onReviewComplete, onEditReview }: TestsPendingReviewProps) {
  const { toast } = useToast();
  const [tests, setTests] = useState<PendingTest[]>([]);
  const [reviewedTests, setReviewedTests] = useState<ReviewedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewedLoading, setReviewedLoading] = useState(true);
  const [showReviewedSection, setShowReviewedSection] = useState(true);
  const [questionStats, setQuestionStats] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);


  useEffect(() => {
    fetchPendingTests();
    fetchReviewedTests();
    fetchQuestionStats();
  }, [eventId]);

  const fetchPendingTests = async () => {
    setLoading(true);
    try {
      // Загружаем попытки тестов со статусом pending_review ИЛИ completed с баллом 0
      let query = supabase
        .from('user_test_attempts')
        .select(`
          id,
          status,
          score,
          completed_at,
          created_at,
          user:user_id(id, full_name, email),
          test:tests(id, title, type)
        `)
        .or('status.eq.pending_review,and(status.eq.completed,score.eq.0)')
        .order('completed_at', { ascending: false });

      // Если указан eventId, фильтруем по мероприятию
      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data: attempts, error: attemptsError } = await query;

      if (attemptsError) throw attemptsError;


      // Для каждой попытки получаем количество открытых вопросов
      const testsWithOpenQuestions = await Promise.all(
        (attempts || []).map(async (attempt) => {
          const { data: openQuestions, error: questionsError } = await supabase
            .from('test_questions')
            .select('id')
            .eq('test_id', attempt.test.id)
            .eq('question_type', 'text');

          if (questionsError) {
            console.error('Ошибка загрузки открытых вопросов:', questionsError);
            return null;
          }

          // Показываем только тесты с открытыми вопросами
          if ((openQuestions?.length || 0) === 0) {
            return null;
          }

          const result = {
            attempt_id: attempt.id,
            user_name: attempt.user.full_name || 'Неизвестно',
            user_email: attempt.user.email || '',
            test_title: attempt.test.title || 'Без названия',
            test_type: attempt.test.type || 'unknown',
            submitted_at: attempt.completed_at || attempt.created_at || new Date().toISOString(),
            open_questions_count: openQuestions?.length || 0
          };

          return result;
        })
      );

      // Фильтруем null значения
      setTests(testsWithOpenQuestions.filter(Boolean) as PendingTest[]);
    } catch (error: any) {
      console.error('Ошибка загрузки тестов на проверке:', error);
      toast(`Ошибка загрузки: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewedTests = async () => {
    setReviewedLoading(true);
    try {
      // Загружаем проверенные тесты с результатами проверки
      const { data: attempts, error: attemptsError } = await supabase
        .from('user_test_attempts')
        .select(`
          id,
          score,
          passed,
          reviewed_at,
          user:user_id(id, full_name, email),
          test:tests(id, title, type, passing_score),
          reviewer:reviewed_by(id, full_name)
        `)
        .not('reviewed_at', 'is', null)
        .order('reviewed_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Получаем детали проверки из test_answer_reviews
      const reviewedTestsWithDetails = await Promise.all(
        (attempts || []).map(async (attempt) => {
          const { data: reviews } = await supabase
            .from('test_answer_reviews')
            .select('is_correct')
            .eq('attempt_id', attempt.id);

          const correctAnswers = reviews?.filter(r => r.is_correct).length || 0;
          const totalAnswers = reviews?.length || 0;

          // Рассчитываем процент из test_answer_reviews для точности
          const calculatedScore = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
          const calculatedPassed = calculatedScore >= (attempt.test.passing_score || 70);

          return {
            attempt_id: attempt.id,
            user_name: attempt.user.full_name || 'Неизвестно',
            user_email: attempt.user.email || '',
            test_title: attempt.test.title || 'Без названия',
            test_type: attempt.test.type || 'unknown',
            reviewed_at: attempt.reviewed_at || new Date().toISOString(),
            score: calculatedScore, // Используем рассчитанный процент
            passed: calculatedPassed, // Используем рассчитанный статус
            correct_answers: correctAnswers,
            total_answers: totalAnswers,
            reviewer_name: attempt.reviewer?.full_name || 'Неизвестно'
          };
        })
      );

      setReviewedTests(reviewedTestsWithDetails);
    } catch (error: any) {
      console.error('Ошибка загрузки проверенных тестов:', error);
      toast(`Ошибка загрузки проверенных тестов: ${error.message}`);
    } finally {
      setReviewedLoading(false);
    }
  };

  const handleReviewTest = (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setShowReviewModal(true);
  };

  const handleReviewComplete = () => {
    setShowReviewModal(false);
    setSelectedAttemptId(null);
    fetchPendingTests();
    fetchReviewedTests();
    onReviewComplete?.();
  };

  const handleEditReview = (attemptId: string) => {
    console.log('handleEditReview called with attemptId:', attemptId);
    onEditReview?.(attemptId);
  };

  const fetchQuestionStats = async () => {
    setStatsLoading(true);
    try {
      if (!eventId) {
        console.log('No eventId provided');
        return;
      }
      console.log('Fetching question stats for eventId:', eventId);

      // Получаем все попытки тестов в рамках мероприятия (включая проверенные)
      const { data: allAttempts, error: attemptsError } = await supabase
        .from('user_test_attempts')
        .select(`
          id,
          test_id,
          status,
          test:tests(id, title)
        `)
        .eq('event_id', eventId)
        .in('status', ['completed', 'pending_review']);

      if (attemptsError) throw attemptsError;

      console.log('All attempts:', allAttempts);

      if (!allAttempts || allAttempts.length === 0) {
        console.log('No attempts found');
        setQuestionStats([]);
        return;
      }

      const attemptIds = allAttempts.map(attempt => attempt.id);
      const testIds = [...new Set(allAttempts.map(attempt => attempt.test_id))];
      console.log('Attempt IDs:', attemptIds);
      console.log('Test IDs:', testIds);

      // Получаем все открытые вопросы для этих тестов
      const { data: testQuestions, error: questionsError } = await supabase
        .from('test_questions')
        .select('id, question, question_type, test_id')
        .in('test_id', testIds)
        .in('question_type', ['text', 'sequence']);

      if (questionsError) throw questionsError;

      console.log('Test questions:', testQuestions);

      if (!testQuestions || testQuestions.length === 0) {
        console.log('No open-ended questions found');
        setQuestionStats([]);
        return;
      }

      // Получаем результаты проверки для всех попыток
      const { data: allReviews, error: reviewsError } = await supabase
        .from('test_answer_reviews')
        .select('question_id, is_correct, attempt_id')
        .in('attempt_id', attemptIds);

      if (reviewsError) {
        console.log('No reviews found (this is OK for new tests):', reviewsError);
      }

      console.log('All reviews:', allReviews);

      // Группируем по вопросам и считаем статистику
      const questionStatsMap = new Map();

      testQuestions.forEach(question => {
        const questionId = question.id;
        const questionText = question.question;
        
        // Находим тест для этого вопроса
        const test = allAttempts.find(attempt => attempt.test_id === question.test_id)?.test;
        const testTitle = test?.title || 'Неизвестный тест';
        
        // Находим все попытки для этого теста
        const testAttempts = allAttempts.filter(attempt => attempt.test_id === question.test_id);
        const totalAnswers = testAttempts.length;
        
        // Находим все ответы на этот вопрос (все попытки)
        const questionReviews = allReviews?.filter(r => r.question_id === questionId) || [];
        
        // Находим правильные ответы
        const correctAnswers = questionReviews.filter(r => r.is_correct === true).length;
        
        const correctPercentage = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
        
        console.log(`Question ${questionId}: totalAnswers=${totalAnswers}, correctAnswers=${correctAnswers}, percentage=${correctPercentage}`);
        
        questionStatsMap.set(questionId, {
          question_id: questionId,
          question_text: questionText,
          test_title: testTitle,
          total_answers: totalAnswers,
          correct_answers: correctAnswers,
          correct_percentage: correctPercentage
        });
      });

      const statsArray = Array.from(questionStatsMap.values());
      console.log('Question stats loaded:', statsArray);
      console.log('Stats array length:', statsArray.length);
      console.log('All reviews data:', allReviews);
      console.log('Test questions data:', testQuestions);
      setQuestionStats(statsArray);
    } catch (error: any) {
      console.error('Ошибка загрузки статистики вопросов:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'entry': return 'Входной';
      case 'final': return 'Финальный';
      case 'annual': return 'Годовой';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'entry': return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
      case 'final': return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
      case 'annual': return 'bg-purple-50 text-purple-700 ring-1 ring-purple-200';
      default: return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-sns-green border-t-transparent rounded-full animate-spin mr-2"></div>
          Загрузка тестов на проверке...
        </div>
      </div>
    );
  }

  // Убираем ранний return и всегда показываем статистику

  return (
    <>

      {/* Секция тестов на проверке */}
      {tests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Нет тестов на проверке
            </h3>
            <p className="text-gray-600 mb-8">
              Все тесты проверены или нет тестов с открытыми вопросами
            </p>
            
            {/* Добавляем секцию проверенных тестов прямо сюда */}
            <div className="mt-8 text-left">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Проверенные тесты ({reviewedTests.length})
              </h4>
              
              {reviewedLoading ? (
                <div className="text-center py-4">
                  <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-gray-500 bg-white">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Загрузка проверенных тестов...
                  </div>
                </div>
              ) : reviewedTests.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">Нет проверенных тестов</p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-3">
                    {reviewedTests.map((test) => (
                      <div key={test.attempt_id} className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{test.user_name}</div>
                            <div className="text-sm text-gray-500">{test.test_title}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              test.passed 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {test.score}%
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {test.correct_answers}/{test.total_answers}
                            </div>
                          </div>
                          <button
                            onClick={() => handleEditReview(test.attempt_id)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Изменить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-soft border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-amber-500" />
                  Тесты на проверке
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {tests.length} тест(ов) ожидают проверки тренером или администратором
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {tests.length} ожидают
                </span>
              </div>
            </div>
          </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Участник
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тест
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Открытые вопросы
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Отправлен
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tests.map((test) => (
                <tr key={test.attempt_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {test.user_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {test.user_email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {test.test_title}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(test.test_type)}`}>
                      {getTypeLabel(test.test_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-600">
                      <FileText className="h-4 w-4 mr-1" />
                      {test.open_questions_count}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {(() => {
                      const date = new Date(test.submitted_at);
                      if (isNaN(date.getTime()) || date.getFullYear() < 2020) {
                        return 'Дата не указана';
                      }
                      return date.toLocaleString('ru-RU');
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleReviewTest(test.attempt_id)}
                      className="inline-flex items-center px-3 py-1.5 text-sm bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Проверить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}






      {/* Общая статистика */}
      <div className="mt-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Общая статистика
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Статистика по всем вопросам Итогового теста "Управление территорией для развития АКБ"
            </p>
          </div>
          <div className="p-6">
            {statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600">Загрузка статистики...</span>
              </div>
            ) : questionStats.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {questionStats.map((stat, index) => (
                  <div key={stat.question_id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900">
                            Вопрос {index + 1}
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {stat.question_text}
                        </p>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {stat.correct_percentage}%
                        </div>
                        <div className="text-sm text-gray-600">
                          {stat.correct_answers}/{stat.total_answers}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          правильных
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          stat.correct_percentage >= 80 
                            ? 'bg-green-500' 
                            : stat.correct_percentage >= 60 
                            ? 'bg-yellow-500' 
                            : stat.correct_percentage >= 40
                            ? 'bg-orange-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${stat.correct_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Нет данных для статистики</p>
                <p className="text-sm text-gray-500 mt-1">
                  Статистика появится после проверки тестов с открытыми вопросами
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно для проверки тестов */}
      {showReviewModal && selectedAttemptId && eventId && (
        <TestReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedAttemptId(null);
          }}
          attemptId={selectedAttemptId}
          eventId={eventId}
        />
      )}
    </>
  );
}
