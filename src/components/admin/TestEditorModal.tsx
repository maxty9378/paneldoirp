import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronUp, Save, CheckCircle, AlarmClock, Percent, Edit, Copy, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface Test {
  id?: string;
  title: string;
  description: string;
  type: string;
  passing_score: number;
  time_limit: number;
  event_type_id: string | null;
  status: string;
}

interface Question {
  id?: string;
  test_id?: string;
  question: string;
  question_type: string; // 'single_choice' | 'multiple_choice' | 'text' | 'sequence'
  order: number;
  points: number;
  answers?: Answer[];
  correct_order?: number[];
  isNew?: boolean;
  isExpanded?: boolean;
}

interface Answer {
  id?: string;
  question_id?: string;
  text: string;
  is_correct: boolean;
  order: number;
  isNew?: boolean;
}

interface EventType {
  id: string;
  name: string;
  name_ru: string;
}

interface TestEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  testId?: string; // null для создания, id для редактирования
  onSuccess: () => void;
}

export function TestEditorModal({ isOpen, onClose, testId, onSuccess }: TestEditorModalProps) {
  const [test, setTest] = useState<Test>({
    title: '',
    description: '',
    type: 'entry',
    passing_score: 70,
    time_limit: 30,
    event_type_id: null,
    status: 'draft'
  });
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Загрузка данных при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      fetchEventTypes();
      if (testId) {
        fetchTestData(testId);
      } else {
        // Сброс состояния для нового теста
        setTest({
          title: '',
          description: '',
          type: 'entry',
          passing_score: 70,
          time_limit: 30,
          event_type_id: null,
          status: 'draft'
        });
        setQuestions([]);
        setError(null);
        setSuccess(false);
      }
    }
  }, [isOpen, testId]);
  
  // Загрузка типов мероприятий
  const fetchEventTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('event_types')
        .select('id, name, name_ru')
        .order('name_ru');
        
      if (error) throw error;
      setEventTypes(data || []);
    } catch (error) {
      console.error('Ошибка загрузки типов мероприятий:', error);
    }
  };
  
  // Загрузка данных теста для редактирования
  const fetchTestData = async (id: string) => {
    setLoading(true);
    try {
      // Загружаем основные данные теста
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', id)
        .single();
        
      if (testError) throw testError;
      setTest(testData);
      
      // Загружаем вопросы
      const { data: questionData, error: questionError } = await supabase
        .from('test_questions')
        .select('*')
        .eq('test_id', id)
        .order('order');
        
      if (questionError) throw questionError;
      
      // Загрузка вариантов для каждого вопроса
      const questionsWithAnswers = await Promise.all(questionData.map(async (question) => {
        let answers, answersError;
        if (question.question_type === 'sequence') {
          const { data: sequenceAnswers, error: sequenceAnswersError } = await supabase
            .from('test_sequence_answers')
            .select('*')
            .eq('question_id', question.id)
            .order('answer_order');
          if (sequenceAnswersError) throw sequenceAnswersError;
          answers = sequenceAnswers.map((a, index) => ({
            ...a,
            text: a.answer_text,
            order: a.answer_order
          }));
        } else {
          ({ data: answers, error: answersError } = await supabase
            .from('test_answers')
            .select('*')
            .eq('question_id', question.id)
            .order('order'));
        }
        if (answersError) throw answersError;
        return {
          ...question,
          answers: answers || [],
          isExpanded: false
        };
      }));
      
      setQuestions(questionsWithAnswers || []);
    } catch (error) {
      console.error('Ошибка загрузки данных теста:', error);
      setError('Не удалось загрузить данные теста');
    } finally {
      setLoading(false);
    }
  };
  
  // Обработчики изменения полей теста
  const handleTestChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTest(prev => ({ ...prev, [name]: value }));
  };
  
  // Добавление нового вопроса
  const handleAddQuestion = () => {
    const newQuestionOrder = questions.length > 0 
      ? Math.max(...questions.map(q => q.order)) + 1 
      : 1;
      
    const newQuestion: Question = {
      question: '',
      question_type: 'single_choice',
      order: newQuestionOrder,
      points: 1,
      answers: [],
      isNew: true,
      isExpanded: true
    };
    
    setQuestions([...questions, newQuestion]);
  };
  
  // Изменение вопроса
  const handleQuestionChange = (index: number, field: string, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { 
      ...updatedQuestions[index], 
      [field]: value 
    };
    setQuestions(updatedQuestions);
  };
  
  // Удаление вопроса
  const handleDeleteQuestion = (index: number) => {
    if (confirm('Вы уверены, что хотите удалить этот вопрос?')) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };
  
  // Управление развернутыми/свернутыми вопросами
  const toggleQuestionExpanded = (index: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index].isExpanded = !updatedQuestions[index].isExpanded;
    setQuestions(updatedQuestions);
  };
  
  // Добавление нового варианта ответа
  const handleAddAnswer = (questionIndex: number) => {
    const question = questions[questionIndex];
    const answers = question.answers || [];
    
    const newAnswerOrder = answers.length > 0 
      ? Math.max(...answers.map(a => a.order)) + 1 
      : 1;
      
    const newAnswer: Answer = {
      text: '',
      is_correct: false,
      order: newAnswerOrder,
      isNew: true
    };
    
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].answers = [...answers, newAnswer];
    setQuestions(updatedQuestions);
  };
  
  // Изменение варианта ответа
  const handleAnswerChange = (questionIndex: number, answerIndex: number, field: string, value: any) => {
    const updatedQuestions = [...questions];
    const question = updatedQuestions[questionIndex];
    const answers = [...(question.answers || [])];
    
    // Если это изменение is_correct для single_choice, сначала снимаем все отметки
    if (field === 'is_correct' && value === true && question.question_type === 'single_choice') {
      answers.forEach(answer => answer.is_correct = false);
    }
    
    answers[answerIndex] = { ...answers[answerIndex], [field]: value };
    question.answers = answers;
    
    setQuestions(updatedQuestions);
  };
  
  // Удаление варианта ответа
  const handleDeleteAnswer = (questionIndex: number, answerIndex: number) => {
    const updatedQuestions = [...questions];
    const question = updatedQuestions[questionIndex];
    const answers = question.answers?.filter((_, i) => i !== answerIndex) || [];
    question.answers = answers;
    
    setQuestions(updatedQuestions);
  };
  
  // Валидация формы
  const validateForm = (): boolean => {
    // Базовая валидация полей теста
    if (!test.title.trim()) {
      setError('Название теста обязательно');
      return false;
    }
    
    if (questions.length === 0) {
      setError('Добавьте хотя бы один вопрос');
      return false;
    }
    
    // Валидация каждого вопроса
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      if (!question.question.trim()) {
        setError(`Вопрос ${i+1}: Текст вопроса обязателен`);
        return false;
      }
      
      // Для вопросов с выбором нужны варианты ответов
      if ((question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && 
          (!question.answers || question.answers.length === 0)) {
        setError(`Вопрос ${i+1}: Добавьте хотя бы один вариант ответа`);
        return false;
      }
      
      // Для single_choice должен быть ровно один правильный ответ
      if (question.question_type === 'single_choice' && 
          question.answers && 
          question.answers.filter(a => a.is_correct).length !== 1) {
        setError(`Вопрос ${i+1}: Должен быть ровно один правильный ответ`);
        return false;
      }
      
      // Для multiple_choice должен быть хотя бы один правильный ответ
      if (question.question_type === 'multiple_choice' && 
          question.answers && 
          !question.answers.some(a => a.is_correct)) {
        setError(`Вопрос ${i+1}: Должен быть хотя бы один правильный ответ`);
        return false;
      }
      
      // Проверяем, что все варианты ответов имеют текст
      if (question.answers) {
        for (let j = 0; j < question.answers.length; j++) {
          if (!question.answers[j].text.trim()) {
            setError(`Вопрос ${i+1}, вариант ${j+1}: Текст ответа обязателен`);
            return false;
          }
        }
      }
    }
    
    return true;
  };
  
  // Сохранение теста
  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaveLoading(true);
    setError(null);
    
    try {
      let testId = test.id;
      
      // 1. Сохраняем или обновляем тест
      if (testId) {
        // Обновляем существующий тест
        const { error: updateError } = await supabase
          .from('tests')
          .update({
            title: test.title,
            description: test.description,
            type: test.type,
            passing_score: test.passing_score,
            time_limit: test.time_limit,
            event_type_id: test.event_type_id,
            status: test.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', testId);
          
        if (updateError) throw updateError;
      } else {
        // Создаем новый тест
        const { data: newTest, error: insertError } = await supabase
          .from('tests')
          .insert({
            title: test.title,
            description: test.description,
            type: test.type,
            passing_score: test.passing_score,
            time_limit: test.time_limit,
            event_type_id: test.event_type_id,
            status: test.status
          })
          .select()
          .single();
          
        if (insertError) throw insertError;
        testId = newTest.id;
      }
      
      // 2. Сохраняем вопросы и ответы
      for (const question of questions) {
        let questionId = question.id;
        
        if (questionId && !question.isNew) {
          // Обновляем существующий вопрос
          const { error: updateQuestionError } = await supabase
            .from('test_questions')
            .update({
              question: question.question,
              question_type: question.question_type,
              order: question.order,
              points: question.points,
              updated_at: new Date().toISOString()
            })
            .eq('id', questionId);
            
          if (updateQuestionError) throw updateQuestionError;
        } else {
          // Создаем новый вопрос
          const { data: newQuestion, error: insertQuestionError } = await supabase
            .from('test_questions')
            .insert({
              test_id: testId,
              question: question.question,
              question_type: question.question_type,
              order: question.order,
              points: question.points
            })
            .select()
            .single();
            
          if (insertQuestionError) throw insertQuestionError;
          questionId = newQuestion.id;
        }
        
        // Сохранение вариантов
        if (question.answers && question.question_type !== 'text') {
          if (!question.isNew && question.id) {
            if (question.question_type === 'sequence') {
              await supabase.from('test_sequence_answers').delete().eq('question_id', question.id);
            } else {
              await supabase.from('test_answers').delete().eq('question_id', question.id);
            }
          }
          if (question.question_type === 'sequence') {
            const answersToInsert = question.answers.map((answer, index) => ({
              question_id: questionId,
              answer_text: answer.text,
              answer_order: index + 1
            }));
            const { error: insertAnswersError } = await supabase
              .from('test_sequence_answers')
              .insert(answersToInsert);
            if (insertAnswersError) throw insertAnswersError;
          } else {
            const answersToInsert = question.answers.map((answer, index) => ({
              question_id: questionId,
              text: answer.text,
              is_correct: answer.is_correct,
              order: index + 1
            }));
            const { error: insertAnswersError } = await supabase
              .from('test_answers')
              .insert(answersToInsert);
            if (insertAnswersError) throw insertAnswersError;
          }
        }
      }
      
      // Помечаем как успешно созданный/обновленный
      setSuccess(true);
      
      // Закрываем модальное окно после успешного сохранения
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
      
    } catch (error: any) {
      console.error('Ошибка сохранения теста:', error);
      setError(error.message || 'Ошибка сохранения теста');
    } finally {
      setSaveLoading(false);
    }
  };

  if (!isOpen) return null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = questions.findIndex(q => String(q.id || q.order) === String(active.id));
    const newIndex = questions.findIndex(q => String(q.id || q.order) === String(over.id));
    const newQuestions = arrayMove(questions, oldIndex, newIndex).map((q, idx) => ({ ...q, order: idx + 1 }));

    setQuestions(newQuestions);

    // Сохраняем порядок сразу в Supabase, если тест уже создан и вопросы имеют id
    if (testId) {
      // Обновляем order для всех вопросов параллельно
      const updates = newQuestions
        .filter(q => q.id) // только существующие вопросы
        .map(q =>
          supabase
            .from('test_questions')
            .update({ order: q.order })
            .eq('id', q.id)
        );
      try {
        await Promise.all(updates);
      } catch (e) {
        console.error('Ошибка сохранения порядка вопросов:', e);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {testId ? 'Редактирование теста' : 'Создание нового теста'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-10 flex flex-col justify-center items-center">
            <div className="w-10 h-10 border-4 border-sns-green border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Загрузка данных...</p>
          </div>
        ) : success ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Тест сохранен</h3>
            <p className="text-gray-600 mb-6">Тест успешно сохранен в системе</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}
            
            {/* Основная информация о тесте */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название теста *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={test.title}
                    onChange={handleTestChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Введите название теста"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип теста *
                  </label>
                  <select
                    name="type"
                    value={test.type}
                    onChange={handleTestChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="entry">Входной тест</option>
                    <option value="final">Финальный тест</option>
                    <option value="annual">Годовой тест</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  name="description"
                  value={test.description}
                  onChange={handleTestChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Описание теста"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Проходной балл (%)
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      name="passing_score"
                      value={test.passing_score}
                      onChange={handleTestChange}
                      min="1"
                      max="100"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ограничение времени (мин)
                  </label>
                  <div className="relative">
                    <AlarmClock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      name="time_limit"
                      value={test.time_limit}
                      onChange={handleTestChange}
                      min="1"
                      max="180"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Статус
                  </label>
                  <select
                    name="status"
                    value={test.status}
                    onChange={handleTestChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="draft">Черновик</option>
                    <option value="active">Активный</option>
                    <option value="inactive">Неактивный</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Тип мероприятия
                </label>
                <select
                  name="event_type_id"
                  value={test.event_type_id || ''}
                  onChange={handleTestChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Выберите тип мероприятия</option>
                  {eventTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name_ru || type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Вопросы теста */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Вопросы ({questions.length})
                </h3>
                <button
                  onClick={handleAddQuestion}
                  className="px-3 py-1.5 bg-sns-green text-white text-sm rounded-lg hover:bg-sns-green-dark transition-colors flex items-center space-x-1"
                >
                  <Plus size={16} />
                  <span>Добавить вопрос</span>
                </button>
              </div>
              
              {questions.length === 0 ? (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <FileText size={32} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-4">У этого теста пока нет вопросов</p>
                  <button
                    onClick={handleAddQuestion}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Добавить первый вопрос
                  </button>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={questions.map(q => String(q.id || q.order))} strategy={verticalListSortingStrategy}>
                    {questions.map((question, index) => (
                      <div 
                        key={question.id || question.order} 
                        id={String(question.id || question.order)}
                        className={clsx(
                          "border rounded-lg transition-all",
                          question.isExpanded ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"
                        )}
                      >
                        {/* Заголовок вопроса (всегда видимый) */}
                        <div 
                          className="p-4 flex justify-between items-start cursor-pointer"
                          onClick={() => toggleQuestionExpanded(index)}
                        >
                          <div className="flex items-center">
                            <span className="cursor-grab mr-3 text-gray-400 text-xl select-none">☰</span>
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                              <span className="font-medium text-gray-600">{index + 1}</span>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 line-clamp-1">
                                {question.question || 'Новый вопрос'}
                              </h4>
                              <div className="flex items-center mt-1">
                                <span className={clsx(
                                  "px-2 py-0.5 rounded text-xs mr-2",
                                  question.question_type === 'single_choice' ? "bg-blue-100 text-blue-800" :
                                  question.question_type === 'multiple_choice' ? "bg-purple-100 text-purple-800" :
                                  question.question_type === 'sequence' ? "bg-yellow-100 text-yellow-800" :
                                  "bg-green-100 text-green-800"
                                )}>
                                  {question.question_type === 'single_choice' ? 'Один из списка' :
                                   question.question_type === 'multiple_choice' ? 'Несколько из списка' :
                                   question.question_type === 'sequence' ? 'Последовательность' :
                                   'Текстовый ответ'}
                                </span>
                                <span className="text-xs text-gray-500">{question.points} балл(ов)</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteQuestion(index);
                              }}
                              className="text-gray-400 hover:text-red-600 transition-colors mr-2"
                              title="Удалить вопрос"
                            >
                              <Trash2 size={16} />
                            </button>
                            {question.isExpanded ? (
                              <ChevronUp size={18} className="text-gray-500" />
                            ) : (
                              <ChevronDown size={18} className="text-gray-500" />
                            )}
                          </div>
                        </div>
                        
                        {/* Детали вопроса (развернутая часть) */}
                        {question.isExpanded && (
                          <div className="px-4 pb-4 pt-2">
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Текст вопроса *
                                </label>
                                <input
                                  type="text"
                                  value={question.question}
                                  onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Введите текст вопроса"
                                  required
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Тип вопроса
                                  </label>
                                  <select
                                    value={question.question_type}
                                    onChange={(e) => handleQuestionChange(index, 'question_type', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  >
                                    <option value="single_choice">Один из списка</option>
                                    <option value="multiple_choice">Несколько из списка</option>
                                    <option value="text">Текстовый ответ</option>
                                    <option value="sequence">Последовательность</option>
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Баллы за вопрос
                                  </label>
                                  <input
                                    type="number"
                                    value={question.points}
                                    onChange={(e) => handleQuestionChange(index, 'points', parseInt(e.target.value) || 1)}
                                    min="1"
                                    max="100"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                              </div>
                              
                              {/* Варианты ответов для вопросов с выбором */}
                              {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                      Варианты ответов
                                    </label>
                                    <button
                                      onClick={() => handleAddAnswer(index)}
                                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 flex items-center space-x-1"
                                    >
                                      <Plus size={12} />
                                      <span>Добавить</span>
                                    </button>
                                  </div>
                                  
                                  {(!question.answers || question.answers.length === 0) ? (
                                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                      <p className="text-gray-500 text-sm">Нет вариантов ответа</p>
                                      <button
                                        onClick={() => handleAddAnswer(index)}
                                        className="mt-2 text-blue-600 hover:underline text-sm"
                                      >
                                        Добавить вариант ответа
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {question.answers.map((answer, answerIndex) => (
                                        <div 
                                          key={answerIndex} 
                                          className={clsx(
                                            "flex items-center border rounded-lg p-3",
                                            answer.is_correct ? "border-green-300 bg-green-50" : "border-gray-200"
                                          )}
                                        >
                                          <div className="flex-shrink-0 mr-3">
                                            <input
                                              type={question.question_type === 'single_choice' ? 'radio' : 'checkbox'}
                                              checked={answer.is_correct}
                                              onChange={(e) => handleAnswerChange(index, answerIndex, 'is_correct', e.target.checked)}
                                              className={question.question_type === 'single_choice' 
                                                ? "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" 
                                                : "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"}
                                            />
                                          </div>
                                          <div className="flex-1">
                                            <input
                                              type="text"
                                              value={answer.text}
                                              onChange={(e) => handleAnswerChange(index, answerIndex, 'text', e.target.value)}
                                              className="w-full px-3 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                              placeholder="Текст ответа"
                                              required
                                            />
                                          </div>
                                          <button
                                            onClick={() => handleDeleteAnswer(index, answerIndex)}
                                            className="ml-2 text-gray-400 hover:text-red-600 transition-colors"
                                            title="Удалить ответ"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Для текстовых ответов */}
                              {question.question_type === 'text' && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                                  <p className="text-blue-800 mb-2">
                                    <span className="font-medium">Текстовый ответ:</span> Участник введет свой ответ в текстовое поле.
                                  </p>
                                  <p className="text-blue-600">
                                    Такие вопросы требуют ручной проверки после прохождения теста.
                                  </p>
                                </div>
                              )}

                              {/* UI для задания правильной последовательности */}
                              {question.question_type === 'sequence' && question.answers && question.answers.length > 1 && (
                                <div className="mt-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Правильная последовательность:</label>
                                  <ul>
                                    {question.answers.map((answer, ansIdx) => (
                                      <li key={answer.id || ansIdx} className="flex items-center gap-2 mb-1">
                                        <span className="flex-1">{answer.text}</span>
                                        <button type="button" disabled={ansIdx === 0} onClick={() => moveSequenceAnswerUp(index, ansIdx)} className="px-2 py-1 text-xs bg-gray-100 rounded disabled:opacity-50">↑</button>
                                        <button type="button" disabled={ansIdx === question.answers.length - 1} onClick={() => moveSequenceAnswerDown(index, ansIdx)} className="px-2 py-1 text-xs bg-gray-100 rounded disabled:opacity-50">↓</button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
            
            {/* Кнопки действий */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saveLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saveLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Сохранение...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Сохранить тест</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}