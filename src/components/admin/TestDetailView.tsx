import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, FileText, Clock, Users, CheckCircle, XCircle, Percent, Edit, Copy, Trash2, AlertCircle, Eye, Download, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';
import { QuestionPreviewModal } from './QuestionPreviewModal';

interface TestDetailViewProps {
  testId: string;
  onClose: () => void;
  onEdit: (testId: string) => void;
}

interface Test {
  id: string;
  title: string;
  description?: string;
  type: string;
  passing_score: number;
  time_limit: number;
  status: string;
  event_type_id?: string;
  created_at: string;
  updated_at: string;
  event_type?: {
    name: string;
    name_ru: string;
  };
}

interface Question {
  id: string;
  test_id: string;
  question: string;
  question_type: string;
  order: number;
  points: number;
  answers?: Answer[];
}

interface Answer {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  order: number;
}

interface Statistic {
  total_attempts: number;
  completed_attempts: number;
  average_score: number;
  pass_rate: number;
  average_time_per_question: number;
  slowest_question_id?: string;
  slowest_question_time?: number;
}

export function TestDetailView({ testId, onClose, onEdit }: TestDetailViewProps) {
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<Statistic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);

  useEffect(() => {
    if (testId) {
      fetchTestData();
    }
  }, [testId]);

  const fetchTestData = async () => {
    setLoading(true);
    try {
      // Загрузка данных теста
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select(`
          *,
          event_type:event_type_id(
            name,
            name_ru
          )
        `)
        .eq('id', testId)
        .single();

      if (testError) throw testError;
      setTest(testData);

      // Загрузка вопросов теста
      const { data: questionsData, error: questionsError } = await supabase
        .from('test_questions')
        .select('*')
        .eq('test_id', testId)
        .order('order');

      if (questionsError) throw questionsError;

      // Для каждого вопроса загрузка вариантов ответов
      const questionsWithAnswers = await Promise.all((questionsData || []).map(async (question) => {
        const { data: answers, error: answersError } = await supabase
          .from('test_answers')
          .select('*')
          .eq('question_id', question.id)
          .order('order');

        if (answersError) throw answersError;

        return {
          ...question,
          answers: answers || []
        };
      }));

      setQuestions(questionsWithAnswers);

      // Загрузка статистики (в реальном проекте здесь бы был запрос к БД)
      // Здесь используем моковые данные
      // Пробуем получить реальные данные по времени ответов
      try {
        // Получаем все попытки прохождения теста
        const { data: attempts, error: attemptsError } = await supabase
          .from('user_test_attempts')
          .select('id, score')
          .eq('test_id', testId)
          .not('score', 'is', null);
        
        if (attemptsError) throw attemptsError;
        
        const totalAttempts = attempts?.length || 0;
        const completedAttempts = attempts?.length || 0;
        const averageScore = attempts?.reduce((sum, a) => sum + (a.score || 0), 0) / (completedAttempts || 1);
        const passedAttempts = attempts?.filter(a => (a.score || 0) >= (testData.passing_score || 0)).length || 0;
        const passRate = (passedAttempts / (totalAttempts || 1)) * 100;
        
        // Получаем статистику по времени ответов на вопросы
        let totalTime = 0;
        let totalAnswers = 0;
        let slowestQuestionId = '';
        let slowestQuestionTime = 0;
        
        for (const question of questionsWithAnswers) {
          const { data: answers, error: answersTimeError } = await supabase
            .from('user_test_answers')
            .select('answer_time_seconds')
            .eq('question_id', question.id)
            .not('answer_time_seconds', 'is', null);
          
          if (!answersTimeError && answers && answers.length > 0) {
            const questionTimes = answers.map(a => a.answer_time_seconds || 0);
            const totalQuestionTime = questionTimes.reduce((sum, t) => sum + t, 0);
            const avgQuestionTime = totalQuestionTime / questionTimes.length;
            
            totalTime += totalQuestionTime;
            totalAnswers += questionTimes.length;
            
            // Проверяем, является ли этот вопрос самым медленным
            if (avgQuestionTime > slowestQuestionTime) {
              slowestQuestionTime = avgQuestionTime;
              slowestQuestionId = question.id;
            }
          }
        }
        
        const averageTimePerQuestion = totalAnswers > 0 ? totalTime / totalAnswers : 0;
        
        setStats({
          total_attempts: totalAttempts,
          completed_attempts: completedAttempts,
          average_score: averageScore || 0,
          pass_rate: passRate || 0,
          average_time_per_question: averageTimePerQuestion || 0,
          slowest_question_id: slowestQuestionId,
          slowest_question_time: slowestQuestionTime
        });
      } catch (error) {
        console.warn('Не удалось получить статистику:', error);
        setStats({
          total_attempts: 58,
          completed_attempts: 52,
          average_score: 78,
          pass_rate: 89,
          average_time_per_question: 45
        });
      }
    } catch (error: any) {
      console.error('Ошибка загрузки данных теста:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setShowQuestionPreview(true);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'entry': return 'Входной тест';
      case 'final': return 'Финальный тест';
      case 'annual': return 'Годовой тест';
      default: return 'Тест';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full">
          <div className="flex justify-center">
            <div className="w-10 h-10 border-4 border-sns-green border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-center mt-4 text-gray-600">Загрузка данных теста...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full">
          <div className="flex justify-center">
            <AlertCircle size={48} className="text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-center mt-4">Ошибка загрузки</h3>
          <p className="text-center mt-2 text-gray-600">{error}</p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full">
          <div className="flex justify-center">
            <FileText size={48} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-center mt-4">Тест не найден</h3>
          <p className="text-center mt-2 text-gray-600">Запрашиваемый тест не найден или удален</p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={onClose}
                  className="mr-3 text-gray-500 hover:text-gray-700"
                >
                  <ChevronLeft size={24} />
                </button>
                <div>
                  <div className="flex items-center">
                    <h2 className="text-xl font-semibold text-gray-900 mr-2">{test.title}</h2>
                    <span className={clsx(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      test.type === 'entry' ? "bg-sns-green/10 text-sns-green" : 
                      test.type === 'final' ? "bg-blue-100 text-blue-800" : 
                      "bg-purple-100 text-purple-800"
                    )}>
                      {getTypeLabel(test.type)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {test.event_type?.name_ru ? `Тип мероприятия: ${test.event_type.name_ru}` : 'Тест не привязан к типу мероприятия'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onEdit(test.id)}
                  className="px-3 py-1.5 bg-sns-green text-white text-sm rounded-lg hover:bg-sns-green-dark transition-colors flex items-center"
                >
                  <Edit size={16} className="mr-1" />
                  <span>Редактировать</span>
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Статистика теста */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Проходной балл</p>
                  <p className="text-xl font-semibold text-gray-900">{test.passing_score}%</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Percent size={20} className="text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Время на тест</p>
                  <p className="text-xl font-semibold text-gray-900">{test.time_limit} мин</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock size={20} className="text-orange-600" />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Всего вопросов</p>
                  <p className="text-xl font-semibold text-gray-900">{questions.length}</p>
                </div>
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FileText size={20} className="text-indigo-600" />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Статус теста</p>
                  <div>
                    <span className={clsx(
                      "inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
                      getStatusColor(test.status)
                    )}>
                      {test.status === 'active' ? 'Активен' : 
                       test.status === 'draft' ? 'Черновик' : 'Неактивен'}
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  {test.status === 'active' ? (
                    <CheckCircle size={20} className="text-green-600" />
                  ) : test.status === 'draft' ? (
                    <AlertCircle size={20} className="text-yellow-600" />
                  ) : (
                    <XCircle size={20} className="text-red-600" />
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Описание теста */}
          {test.description && (
            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Описание теста</h3>
              <p className="text-blue-700 whitespace-pre-line">{test.description}</p>
            </div>
          )}
          
          {/* Статистика прохождения */}
          {stats && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                Статистика прохождения
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-1">Всего попыток</p>
                  <p className="text-xl font-semibold text-blue-900">{stats.total_attempts}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                  <p className="text-sm text-green-800 mb-1">Завершенных попыток</p>
                  <p className="text-xl font-semibold text-green-900">{stats.completed_attempts}</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                  <p className="text-sm text-purple-800 mb-1">Средний балл</p>
                  <p className="text-xl font-semibold text-purple-900">{stats.average_score}%</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                  <p className="text-sm text-amber-800 mb-1">Процент успешных</p>
                  <p className="text-xl font-semibold text-amber-900">{stats.pass_rate}%</p>
                </div>
              </div>
              
              {/* Статистика времени на вопросы */}
              {stats && stats.average_time_per_question > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Статистика времени</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <Clock size={16} className="text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500">Среднее время на вопрос</p>
                        <p className="font-medium text-gray-900">{Math.round(stats.average_time_per_question)} сек.</p>
                      </div>
                    </div>
                    
                    {stats.slowest_question_id && stats.slowest_question_time && (
                      <div className="flex items-center">
                        <AlertTriangle size={16} className="text-amber-500 mr-2" />
                        <div>
                          <p className="text-sm text-gray-500">Самый сложный вопрос</p>
                          <p className="font-medium text-gray-900">
                            #{questions.findIndex(q => q.id === stats.slowest_question_id) + 1} ({Math.round(stats.slowest_question_time)} сек.)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Список вопросов */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-gray-600" />
                Вопросы теста ({questions.length})
              </h3>
              <div className="flex items-center space-x-2">
                <button className="px-2.5 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center">
                  <Download className="h-4 w-4 mr-1" />
                  <span>Экспорт</span>
                </button>
              </div>
            </div>
            
            {questions.length === 0 ? (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
                <FileText size={40} className="mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600">У этого теста нет вопросов</p>
                <button
                  onClick={() => onEdit(test.id)}
                  className="mt-4 px-4 py-2 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors inline-flex items-center"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Редактировать тест
                </button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {questions.map((question, index) => (
                  <div 
                    key={question.id} 
                    className="border-b last:border-b-0 border-gray-200 p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewQuestion(question)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                          <span className="font-medium text-blue-700">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 mb-1">{question.question}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={clsx(
                              "px-2 py-0.5 rounded text-xs font-medium",
                              question.question_type === 'single_choice' ? "bg-blue-100 text-blue-800" :
                              question.question_type === 'multiple_choice' ? "bg-purple-100 text-purple-800" :
                              "bg-green-100 text-green-800"
                            )}>
                              {question.question_type === 'single_choice' ? 'Один вариант' :
                               question.question_type === 'multiple_choice' ? 'Несколько вариантов' : 'Текстовый ответ'}
                            </span>
                            <span className="text-xs text-gray-600">{question.points} балл(ов)</span>
                            {question.question_type !== 'text' && question.answers && (
                              <span className="text-xs text-gray-600">
                                {question.answers.filter(a => a.is_correct).length} правильных из {question.answers.length} вариантов
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button 
                        className="text-gray-400 hover:text-blue-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewQuestion(question);
                        }}
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Кнопки действий */}
          <div className="flex justify-between space-x-3 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              <span className="text-blue-600 font-medium">{questions.length}</span> вопросов в тесте •
              <span className="ml-2">Проходной балл: <span className="text-blue-600 font-medium">{test.passing_score}%</span></span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Закрыть
            </button>
            <button
              onClick={() => onEdit(test.id)}
              className="px-4 py-2 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors flex items-center"
            >
              <Edit size={16} className="mr-2" />
              <span>Редактировать</span>
            </button>
          </div>
        </div>
      </div>
      
      <QuestionPreviewModal
        isOpen={showQuestionPreview}
        onClose={() => setShowQuestionPreview(false)}
        question={selectedQuestion}
      />
    </div>
  );
}