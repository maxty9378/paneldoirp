import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Play, FileText, Users, BarChart3, Calendar, Clock, CheckCircle, Search, Eye, Download, Upload, Filter, Copy, AlertCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';
import { TestCreationModal } from './TestCreationModal';
import { QuestionPreviewModal } from './QuestionPreviewModal';
import { useAuth } from '../../hooks/useAuth';
import { ParticipantTestsView } from '../testing/ParticipantTestsView';
import { TestResultsOverview } from './TestResultsOverview';

interface Test {
  id: string;
  title: string;
  description?: string;
  type: 'entry' | 'final' | 'annual';
  passing_score: number;
  time_limit: number;
  event_type_id?: string;
  status: 'draft' | 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  questions_count?: number;
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
  explanation?: string;
}

interface Answer {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  order: number;
}

export function TestingView() {
  const { userProfile } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showTestDetails, setShowTestDetails] = useState(false);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [deletingTestId, setDeletingTestId] = useState<string | null>(null);

  // Проверяем, является ли пользователь участником (employee)
  const isEmployee = userProfile?.role === 'employee';
  
  // Состояние для переключения между режимами просмотра
  const [viewMode, setViewMode] = useState<'tests' | 'results'>('tests');
  
  console.log('TestingView render state:', {
    viewMode,
    isEmployee,
    userProfile: userProfile ? { id: userProfile.id, role: userProfile.role } : null
  });

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tests')
        .select(`
          *,
          event_type:event_type_id(
            name,
            name_ru
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Получить количество вопросов для каждого теста
      const testsWithQuestionCounts = await Promise.all((data || []).map(async (test) => {
        const { count, error: countError } = await supabase
          .from('test_questions')
          .select('*', { count: 'exact', head: true })
          .eq('test_id', test.id);

        if (countError) throw countError;

        return {
          ...test,
          questions_count: count || 0
        };
      }));

      setTests(testsWithQuestionCounts);
    } catch (error: any) {
      console.error('Ошибка загрузки тестов:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTestQuestions = async (testId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('test_questions')
        .select('*')
        .eq('test_id', testId)
        .order('order');

      if (error) throw error;

      // Получить варианты ответов для каждого вопроса
      const questionsWithAnswers = await Promise.all((data || []).map(async (question) => {
        let answers = [];
        if (question.question_type === 'sequence') {
          const { data: sequenceAnswers, error: sequenceAnswersError } = await supabase
            .from('test_sequence_answers')
            .select('*')
            .eq('question_id', question.id)
            .order('answer_order');
          if (sequenceAnswersError) throw sequenceAnswersError;
          answers = sequenceAnswers.map(a => ({
            ...a,
            text: a.answer_text,
            order: a.answer_order
          }));
        } else {
          const { data: answersData, error: answersError } = await supabase
            .from('test_answers')
            .select('*')
            .eq('question_id', question.id)
            .order('order');
          if (answersError) throw answersError;
          answers = answersData;
        }
        return {
          ...question,
          answers: answers || []
        };
      }));

      setQuestions(questionsWithAnswers);
      return questionsWithAnswers;
    } catch (error: any) {
      console.error('Ошибка загрузки вопросов:', error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleViewTest = async (test: Test) => {
    setSelectedTest(test);
    await fetchTestQuestions(test.id);
    setShowTestDetails(true);
  };

  const handleViewQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setShowQuestionPreview(true);
  };

  const handleCreateTest = () => {
    setIsEditing(false);
    setSelectedTest(null);
    setShowCreateModal(true);
  };

  const handleEditTest = (test: Test) => {
    setSelectedTest(test);
    setIsEditing(true);
    setShowCreateModal(true);
  };

  const handleDuplicateTest = async (test: Test) => {
    try {
      // Создаем копию теста
      const { data: newTest, error: testError } = await supabase
        .from('tests')
        .insert({
          title: `Копия ${test.title}`,
          description: test.description,
          type: test.type,
          passing_score: test.passing_score,
          time_limit: test.time_limit,
          event_type_id: test.event_type_id,
          status: 'draft' // всегда создаем копию как черновик
        })
        .select()
        .single();

      if (testError) throw testError;

      // Загружаем вопросы оригинального теста
      const originalQuestions = await fetchTestQuestions(test.id);

      // Для каждого вопроса создаем копию
      for (const question of originalQuestions) {
        const { data: newQuestion, error: questionError } = await supabase
          .from('test_questions')
          .insert({
            test_id: newTest.id,
            question: question.question,
            question_type: question.question_type,
            order: question.order,
            points: question.points
          })
          .select()
          .single();

        if (questionError) throw questionError;

        // Если есть варианты ответов, копируем их
        if (question.answers && question.answers.length > 0) {
          const answersToInsert = question.answers.map(answer => ({
            question_id: newQuestion.id,
            text: answer.text,
            is_correct: answer.is_correct,
            order: answer.order
          }));

          const { error: answersError } = await supabase
            .from('test_answers')
            .insert(answersToInsert);

          if (answersError) throw answersError;
        }
      }

      // Обновляем список тестов
      await fetchTests();
      alert(`Тест скопирован успешно. Новый тест: ${newTest.title}`);
    } catch (error: any) {
      console.error('Ошибка при дублировании теста:', error);
      alert(`Ошибка при дублировании теста: ${error.message}`);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот тест? Это действие необратимо.')) return;

    setDeletingTestId(testId);
    try {
      const { error } = await supabase
        .from('tests')
        .delete()
        .eq('id', testId);

      if (error) throw error;

      setTests(tests.filter(test => test.id !== testId));
    } catch (error: any) {
      console.error('Ошибка удаления теста:', error);
      alert(`Ошибка удаления теста: ${error.message}`);
    } finally {
      setDeletingTestId(null);
    }
  };

  const handleTestCreationSuccess = () => {
    fetchTests();
  };

  const filteredTests = tests.filter(test => {
    let matchesSearch = true;
    let matchesType = true;
    
    if (searchTerm) {
      matchesSearch = test.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      (test.description && test.description.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    if (selectedType !== 'all') {
      matchesType = test.type === selectedType;
    }
    
    return matchesSearch && matchesType;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'entry': return 'Входной';
      case 'final': return 'Финальный';
      case 'annual': return 'Годовой';
      default: return type;
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

  // Вычисляем статистику
  const stats = {
    totalTests: tests.length,
    entryTests: tests.filter(test => test.type === 'entry').length,
    finalTests: tests.filter(test => test.type === 'final').length,
    annualTests: tests.filter(test => test.type === 'annual').length,
    activeTests: tests.filter(test => test.status === 'active').length,
    totalQuestions: tests.reduce((sum, test) => sum + (test.questions_count || 0), 0)
  };

  const onlineTrainingTests = filteredTests.filter(test => 
    test.event_type?.name === 'online_training' && 
    ['entry', 'final', 'annual'].includes(test.type)
  );

  const otherTests = filteredTests.filter(test => 
    !(test.event_type?.name === 'online_training' && 
    ['entry', 'final', 'annual'].includes(test.type))
  );

  // Если пользователь является участником, показываем представление для участников
  if (isEmployee) {
    return <ParticipantTestsView />;
  }

  // Если выбран режим просмотра результатов, показываем обзор результатов
  if (viewMode === 'results') {
    return <TestResultsOverview onBack={() => setViewMode('tests')} />;
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Управление тестированием</h1>
        </div>
        <div className="flex items-center space-x-3">
          {/* Переключатель режимов */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('tests')}
              className={clsx(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                viewMode === 'tests'
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Управление тестами
            </button>
            <button
              onClick={() => setViewMode('results')}
              className={clsx(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                viewMode === 'results'
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Результаты тестов
            </button>
          </div>
          <button 
            onClick={handleCreateTest}
            className="bg-sns-green text-white px-4 py-2 rounded-lg hover:bg-sns-green-dark transition-colors flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Создать тест</span>
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Всего тестов</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTests}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Активных тестов</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeTests}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Play size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Входные тесты</p>
              <p className="text-2xl font-bold text-purple-600">{stats.entryTests}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Play size={24} className="text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Финальные тесты</p>
              <p className="text-2xl font-bold text-orange-600">{stats.finalTests}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-orange-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Годовые тесты</p>
              <p className="text-2xl font-bold text-cyan-600">{stats.annualTests}</p>
            </div>
            <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
              <Calendar size={24} className="text-cyan-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Всего вопросов</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.totalQuestions}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FileText size={24} className="text-indigo-600" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Фильтры */}
      <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию или описанию..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">Тип:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sns-green focus:border-transparent"
            >
              <option value="all">Все типы</option>
              <option value="entry">Входные</option>
              <option value="final">Финальные</option>
              <option value="annual">Годовые</option>
            </select>
          </div>
          
          <div className="flex gap-2">
            <button className="flex items-center gap-1 text-sns-green hover:text-sns-green-dark">
              <Download className="h-5 w-5" />
              <span className="text-sm">Экспорт</span>
            </button>
            <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
              <Upload className="h-5 w-5" />
              <span className="text-sm">Импорт</span>
            </button>
          </div>
        </div>
      </div>

      {/* Список тестов для "Технология эффективных продаж" */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-sns-green" />
            Тесты для "Технология эффективных продаж"
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Тесты, автоматически назначаемые при создании мероприятия онлайн-тренинга
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Название теста
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Проходной балл
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Время (мин)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Вопросы
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-sns-green border-t-transparent rounded-full animate-spin mr-2"></div>
                      Загрузка тестов...
                    </div>
                  </td>
                </tr>
              ) : onlineTrainingTests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    <FileText className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                    <p>Нет стандартных тестов для "Технология эффективных продаж"</p>
                    <button
                      onClick={handleCreateTest}
                      className="mt-4 px-4 py-2 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors inline-flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Создать тест
                    </button>
                  </td>
                </tr>
              ) : (
                onlineTrainingTests.map((test) => (
                  <tr key={test.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{test.title}</div>
                      {test.description && (
                        <div className="text-xs text-gray-500 line-clamp-1">{test.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={clsx(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        test.type === 'entry' ? "bg-sns-green/10 text-sns-green" : 
                        test.type === 'final' ? "bg-blue-100 text-blue-800" : 
                        "bg-purple-100 text-purple-800"
                      )}>
                        {getTypeLabel(test.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {test.passing_score}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {test.time_limit === 0 ? (
                        <span className="text-green-600">Не ограничено</span>
                      ) : (
                        `${test.time_limit} мин`
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {test.questions_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={clsx(
                        "px-2.5 py-0.5 rounded-full text-xs font-medium",
                        test.status === 'active' ? 'bg-green-100 text-green-800' :
                        test.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      )}>
                        {test.status === 'active' ? 'Активен' : 
                         test.status === 'draft' ? 'Черновик' : 'Неактивен'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          className="text-gray-400 hover:text-blue-600 transition-colors" 
                          title="Просмотр"
                          onClick={() => handleViewTest(test)}
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          className="text-gray-400 hover:text-sns-green transition-colors" 
                          title="Редактировать"
                          onClick={() => handleEditTest(test)}
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className="text-gray-400 hover:text-blue-600 transition-colors" 
                          title="Дублировать"
                          onClick={() => handleDuplicateTest(test)}
                        >
                          <Copy size={16} />
                        </button>
                        <button 
                          className="text-gray-400 hover:text-red-600 transition-colors" 
                          title="Удалить"
                          onClick={() => handleDeleteTest(test.id)}
                          disabled={deletingTestId === test.id}
                        >
                          {deletingTestId === test.id ? (
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Все остальные тесты */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-gray-500" />
            Все тесты
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Название теста
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Проходной балл
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Время (мин)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Вопросы
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-sns-green border-t-transparent rounded-full animate-spin mr-2"></div>
                      Загрузка тестов...
                    </div>
                  </td>
                </tr>
              ) : otherTests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    <FileText className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                    <p>Другие тесты не найдены</p>
                  </td>
                </tr>
              ) : (
                otherTests.map((test) => (
                  <tr key={test.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{test.title}</div>
                      {test.description && (
                        <div className="text-xs text-gray-500 line-clamp-1">{test.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={clsx(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        test.type === 'entry' ? "bg-sns-green/10 text-sns-green" : 
                        test.type === 'final' ? "bg-blue-100 text-blue-800" : 
                        "bg-purple-100 text-purple-800"
                      )}>
                        {getTypeLabel(test.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {test.passing_score}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {test.time_limit === 0 ? (
                        <span className="text-green-600">Не ограничено</span>
                      ) : (
                        `${test.time_limit} мин`
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {test.questions_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={clsx(
                        "px-2.5 py-0.5 rounded-full text-xs font-medium",
                        test.status === 'active' ? 'bg-green-100 text-green-800' :
                        test.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      )}>
                        {test.status === 'active' ? 'Активен' : 
                         test.status === 'draft' ? 'Черновик' : 'Неактивен'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          className="text-gray-400 hover:text-blue-600 transition-colors" 
                          title="Просмотр"
                          onClick={() => handleViewTest(test)}
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          className="text-gray-400 hover:text-sns-green transition-colors" 
                          title="Редактировать"
                          onClick={() => handleEditTest(test)}
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className="text-gray-400 hover:text-blue-600 transition-colors" 
                          title="Дублировать"
                          onClick={() => handleDuplicateTest(test)}
                        >
                          <Copy size={16} />
                        </button>
                        <button 
                          className="text-gray-400 hover:text-red-600 transition-colors" 
                          title="Удалить"
                          onClick={() => handleDeleteTest(test.id)}
                          disabled={deletingTestId === test.id}
                        >
                          {deletingTestId === test.id ? (
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Модальные окна */}
      {showTestDetails && selectedTest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{selectedTest.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={clsx(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                    selectedTest.type === 'entry' ? "bg-sns-green/10 text-sns-green" : 
                    selectedTest.type === 'final' ? "bg-blue-100 text-blue-800" : 
                    "bg-purple-100 text-purple-800"
                  )}>
                    {getTypeLabel(selectedTest.type)}
                  </span>
                  <span className={clsx(
                    "px-2.5 py-0.5 rounded-full text-xs font-medium",
                    selectedTest.status === 'active' ? 'bg-green-100 text-green-800' :
                    selectedTest.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  )}>
                    {selectedTest.status === 'active' ? 'Активен' : 
                     selectedTest.status === 'draft' ? 'Черновик' : 'Неактивен'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowTestDetails(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Проходной балл</p>
                    <p className="font-medium text-gray-900">{selectedTest.passing_score}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Ограничение времени</p>
                    <p className="font-medium text-gray-900">{selectedTest.time_limit === 0 ? 'Не ограничено' : `${selectedTest.time_limit} минут`}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Вопросов</p>
                    <p className="font-medium text-gray-900">{questions.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Тип мероприятия</p>
                    <p className="font-medium text-gray-900">{selectedTest.event_type?.name_ru || 'Не указан'}</p>
                  </div>
                </div>
                {selectedTest.description && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Описание</p>
                    <p className="text-gray-700">{selectedTest.description}</p>
                  </div>
                )}
              </div>
              
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Список вопросов</h4>
              {questions.length === 0 ? (
                <div className="bg-gray-50 p-8 text-center rounded-lg border border-gray-200">
                  <FileText size={40} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">У этого теста нет вопросов</p>
                  <button
                    onClick={() => handleEditTest(selectedTest)}
                    className="mt-4 px-4 py-2 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors inline-flex items-center"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Редактировать тест
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question, idx) => (
                    <div 
                      key={question.id} 
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => handleViewQuestion(question)}
                    >
                      <div className="flex justify-between">
                        <div className="flex items-center">
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center mr-3 text-blue-700 font-semibold">
                            {idx + 1}
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-900 line-clamp-1">{question.question}</h5>
                            <div className="flex flex-wrap items-center mt-1 gap-2">
                              <span className={clsx(
                                "px-2 py-0.5 rounded text-xs font-medium",
                                question.question_type === 'single_choice' ? "bg-blue-100 text-blue-800" :
                                question.question_type === 'multiple_choice' ? "bg-purple-100 text-purple-800" :
                                "bg-green-100 text-green-800"
                              )}>
                                {question.question_type === 'single_choice' ? 'Один вариант' :
                                 question.question_type === 'multiple_choice' ? 'Несколько вариантов' : 'Текстовый ответ'}
                              </span>
                              <span className="text-xs text-gray-500">{question.points} балл(ов)</span>
                              {question.answers && (
                                <span className="text-xs text-gray-500">
                                  {question.answers.length} вариантов ответа
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div>
                          <Eye size={16} className="text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-end mt-6">
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowTestDetails(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Закрыть
                  </button>
                  <button
                    onClick={() => handleEditTest(selectedTest)}
                    className="px-4 py-2 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors flex items-center"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Редактировать
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <TestCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        testId={isEditing ? selectedTest?.id : undefined}
        onSuccess={handleTestCreationSuccess}
      />
      
      <QuestionPreviewModal
        isOpen={showQuestionPreview}
        onClose={() => setShowQuestionPreview(false)}
        question={selectedQuestion}
      />
    </div>
  );
}