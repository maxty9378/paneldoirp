import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Award, 
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { clsx } from 'clsx';

interface TestResult {
  id: string;
  test_id: string;
  event_id: string;
  status: string;
  score: number;
  start_time: string;
  completed_at: string;
  test: {
    id: string;
    title: string;
    description?: string;
    type: 'entry' | 'final' | 'annual';
    passing_score: number;
    time_limit: number;
  };
  event: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
  };
  answers?: TestAnswer[];
}

interface TestAnswer {
  id: string;
  question_id: string;
  answer_id?: string;
  text_answer?: string;
  is_correct: boolean;
  user_order?: number[];
  question: {
    id: string;
    question: string;
    question_type: string;
    points: number;
    correct_order?: number[];
    answers?: {
      id: string;
      text: string;
      is_correct: boolean;
      order: number;
    }[];
  };
}

export default function TestResultsPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  console.log('TestResultsPage mounted with attemptId:', attemptId);
  console.log('User profile:', userProfile);

  useEffect(() => {
    console.log('useEffect triggered with attemptId:', attemptId, 'userProfile?.id:', userProfile?.id);
    if (attemptId) {
      fetchTestResult();
    }
  }, [attemptId]);

  const fetchTestResult = async () => {
    console.log('fetchTestResult called with attemptId:', attemptId);
    setLoading(true);
    setError(null);
    
    try {
      // Проверяем права доступа
      console.log('User profile:', userProfile);
      console.log('User role:', userProfile?.role);
      const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';
      console.log('Is admin check:', isAdmin);
      
      // Загружаем результат теста
      const { data: resultData, error: resultError } = await supabase
        .from('user_test_attempts')
        .select(`
          id,
          test_id,
          event_id,
          status,
          score,
          start_time,
          completed_at,
          test:tests(
            id,
            title,
            description,
            type,
            passing_score,
            time_limit
          ),
          event:events(
            id,
            title,
            start_date,
            end_date
          )
        `)
        .eq('id', attemptId)
        .single();

      if (resultError) throw resultError;
      if (!resultData) throw new Error('Результат теста не найден');
      
      // Проверяем права доступа
      if (!isAdmin && resultData.user_id !== userProfile?.id) {
        throw new Error('У вас нет прав для просмотра этого результата');
      }

      // Загружаем ответы пользователя
      const { data: answersData, error: answersError } = await supabase
        .from('user_test_answers')
        .select(`
          id,
          question_id,
          answer_id,
          text_answer,
          is_correct,
          user_order,
          question:test_questions(
            id,
            question,
            question_type,
            points,
            correct_order,
            answers:test_answers(
              id,
              text,
              is_correct,
              "order"
            )
          )
        `)
        .eq('attempt_id', attemptId)
        .order('created_at', { ascending: true });

      if (answersError) throw answersError;

      console.log('Loaded test result:', resultData);
      console.log('Loaded answers:', answersData);
      console.log('Is admin:', isAdmin);
      console.log('Result user_id:', resultData.user_id);
      console.log('Current user_id:', userProfile?.id);

      setResult({
        ...resultData,
        answers: answersData || []
      });

      console.log('Final result set:', {
        ...resultData,
        answers: answersData || []
      });

    } catch (err: any) {
      console.error('Ошибка загрузки результата теста:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTestTypeLabel = (type: string) => {
    switch (type) {
      case 'entry': return 'Входной тест';
      case 'final': return 'Итоговый тест';
      case 'annual': return 'Годовой тест';
      default: return 'Тест';
    }
  };

  const getTestTypeColor = (type: string) => {
    switch (type) {
      case 'entry': return 'bg-blue-100 text-blue-800';
      case 'final': return 'bg-purple-100 text-purple-800';
      case 'annual': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / 1000 / 60);
    return `${duration} мин`;
  };

  const handleBack = () => {
    navigate('/testing');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-sns-green" />
          <span className="text-gray-600">Загрузка результатов...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-800 mb-2">Ошибка загрузки</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Назад
        </button>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Результат не найден</h3>
        <p className="text-yellow-700">Запрашиваемый результат теста не найден</p>
        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
        >
          Назад
        </button>
      </div>
    );
  }

  const isPassed = result.score >= result.test.passing_score;
  const correctAnswers = result.answers?.filter(answer => answer.is_correct).length || 0;
  const totalQuestions = result.answers?.length || 0;

  console.log('Render state:', {
    loading,
    error,
    result: result ? {
      id: result.id,
      score: result.score,
      answersCount: result.answers?.length || 0,
      hasAnswers: !!result.answers && result.answers.length > 0
    } : null,
    showAnswers,
    isPassed,
    correctAnswers,
    totalQuestions
  });

  return (
    <div className="space-y-6 pb-safe-bottom">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Назад к тестам</span>
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Результаты теста</h1>
      </div>

      {/* Основная информация о тесте */}
      <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <span className={clsx(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                getTestTypeColor(result.test.type)
              )}>
                {getTestTypeLabel(result.test.type)}
              </span>
              <h2 className="text-xl font-semibold text-gray-900">{result.test.title}</h2>
            </div>
            <p className="text-gray-600 mb-2">
              Мероприятие: {result.event.title}
            </p>
            {result.test.description && (
              <p className="text-sm text-gray-500">{result.test.description}</p>
            )}
          </div>
          <div className="text-right">
            <div className={clsx(
              "text-3xl font-bold",
              isPassed ? "text-green-600" : "text-red-600"
            )}>
              {result.score}%
            </div>
            <div className="text-sm text-gray-500">
              Проходной балл: {result.test.passing_score}%
            </div>
            <div className={clsx(
              "mt-2 px-3 py-1 rounded-full text-sm font-medium",
              isPassed 
                ? "bg-green-100 text-green-800" 
                : "bg-red-100 text-red-800"
            )}>
              {isPassed ? 'Тест пройден' : 'Тест не пройден'}
            </div>
          </div>
        </div>

        {/* Детальная статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-600">Правильных ответов</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {correctAnswers} / {totalQuestions}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-600">Точность</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0}%
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <span className="text-sm text-gray-600">Время прохождения</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {formatDuration(result.start_time, result.completed_at)}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-orange-600" />
              <span className="text-sm text-gray-600">Дата прохождения</span>
            </div>
            <div className="text-sm font-medium text-gray-900 mt-1">
              {formatDate(result.completed_at)}
            </div>
          </div>
        </div>

        {/* Кнопка для просмотра ответов */}
        <button
          onClick={() => {
            console.log('Toggle answers button clicked');
            console.log('Current showAnswers state:', showAnswers);
            console.log('Result answers:', result.answers);
            const newState = !showAnswers;
            console.log('Setting showAnswers to:', newState);
            setShowAnswers(newState);
          }}
          className="w-full bg-blue-50 text-blue-700 px-4 py-3 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center space-x-2"
        >
          <FileText size={16} />
          <span>{showAnswers ? 'Скрыть детали' : 'Показать детали ответов'}</span>
        </button>
      </div>

      {/* Детали ответов */}
      {console.log('Rendering details section, showAnswers:', showAnswers)}
      {showAnswers && (
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Детали ответов</h3>
          {result.answers && result.answers.length > 0 ? (
            <div className="space-y-4">
              {result.answers.map((answer, index) => (
                <div key={answer.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold",
                        answer.is_correct ? "bg-green-500" : "bg-red-500"
                      )}>
                        {answer.is_correct ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        Вопрос {index + 1}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {answer.question.points} балл(ов)
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-gray-900 font-medium">{answer.question.question}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">Ваш ответ:</p>
                    <div className="text-gray-900">
                      {answer.question.question_type === 'text' ? (
                        <p>{answer.text_answer || 'Ответ не указан'}</p>
                      ) : answer.question.question_type === 'sequence' ? (
                        <div>
                          {answer.user_order && answer.user_order.length > 0 ? (
                            <ol className="list-decimal list-inside space-y-1">
                              {answer.user_order.map((orderIndex, idx) => {
                                const sequenceAnswer = answer.question.answers?.find(a => a.order === orderIndex);
                                return (
                                  <li key={idx} className="text-gray-900">
                                    {sequenceAnswer?.text || `Элемент ${orderIndex}`}
                                  </li>
                                );
                              })}
                            </ol>
                          ) : (
                            <p>Порядок не указан</p>
                          )}
                        </div>
                      ) : (
                        <p>
                          {answer.question.answers?.find(a => a.id === answer.answer_id)?.text || 'Ответ не указан'}
                        </p>
                      )}
                    </div>
                  </div>

                  {!answer.is_correct && answer.question.question_type !== 'text' && (
                    <div className="mt-3 bg-green-50 rounded-lg p-3">
                      <p className="text-sm text-green-600 mb-1">Правильный ответ:</p>
                      <div className="text-green-800">
                        {answer.question.question_type === 'sequence' ? (
                          <div>
                            {answer.question.correct_order && answer.question.correct_order.length > 0 ? (
                              <ol className="list-decimal list-inside space-y-1">
                                {answer.question.correct_order.map((orderIndex, idx) => {
                                  const sequenceAnswer = answer.question.answers?.find(a => a.order === orderIndex);
                                  return (
                                    <li key={idx} className="text-green-800">
                                      {sequenceAnswer?.text || `Элемент ${orderIndex}`}
                                    </li>
                                  );
                                })}
                              </ol>
                            ) : (
                              <p>Правильный порядок не указан</p>
                            )}
                          </div>
                        ) : (
                          <p>
                            {answer.question.answers?.find(a => a.is_correct)?.text || 'Не указан'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ответы не найдены</h3>
              <p className="text-gray-600">Детальная информация об ответах недоступна</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 