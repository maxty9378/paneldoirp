import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronUp, Save, CheckCircle, AlarmClock, Percent, Edit, Copy, FileText as FileTextIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  question_type: string;
  order: number;
  points: number;
  answers?: Answer[];
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

interface TestCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  testId?: string; // null для создания, id для редактирования
  onSuccess: () => void;
}

// Sortable item component for @dnd-kit
function SortableAnswerItem({ 
  answer, 
  answerIndex, 
  questionIndex, 
  onAnswerChange, 
  onDeleteAnswer 
}: {
  answer: Answer;
  answerIndex: number;
  questionIndex: number;
  onAnswerChange: (questionIndex: number, answerIndex: number, field: string, value: any) => void;
  onDeleteAnswer: (questionIndex: number, answerIndex: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `answer-${questionIndex}-${answerIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={
        'bg-gray-100 rounded px-4 py-2 flex items-center shadow ' +
        (isDragging ? 'ring-2 ring-green-400' : '')
      }
    >
      <span className="mr-2 text-gray-400">{answerIndex + 1}.</span>
      <input
        type="text"
        value={answer.text}
        onChange={(e) => onAnswerChange(questionIndex, answerIndex, 'text', e.target.value)}
        className="flex-1 px-3 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
        placeholder="Текст ответа"
        required
      />
      <button
        {...attributes}
        {...listeners}
        className="ml-2 p-1 text-gray-400 hover:text-blue-600 cursor-grab"
        title="Перетащить для изменения порядка"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      <button
        onClick={() => onDeleteAnswer(questionIndex, answerIndex)}
        className="ml-2 text-gray-400 hover:text-red-600 transition-colors"
        title="Удалить ответ"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

export function TestCreationModal({ isOpen, onClose, testId, onSuccess }: TestCreationModalProps) {
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

  // Sensors for @dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for @dnd-kit
  const handleDragEnd = (event: any, questionIndex: number) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const questionItem = questions[questionIndex];
      const answers = questionItem.answers || [];
      
      const oldIndex = answers.findIndex((_, index) => `answer-${questionIndex}-${index}` === active.id);
      const newIndex = answers.findIndex((_, index) => `answer-${questionIndex}-${index}` === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newAnswers = arrayMove(answers, oldIndex, newIndex);
        const reordered = newAnswers.map((a, i) => ({ ...a, order: i + 1 }));
        handleQuestionChange(questionIndex, 'answers', reordered);
      }
    }
  };
  
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
      
      // Для каждого вопроса загружаем варианты ответов
      const questionsWithAnswers = await Promise.all(questionData.map(async (question) => {
        let answers: Answer[] = [];
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
          const { data: answersData, error: answersError } = await supabase
            .from('test_answers')
            .select('*')
            .eq('question_id', question.id)
            .order('order');
          if (answersError) throw answersError;
          answers = answersData.map((a, index) => ({ ...a, order: index + 1 }));
        }
        
        return {
          ...question,
          answers: answers || [],
          isExpanded: false // По умолчанию вопросы свернуты
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

  // Функция для перемещения элемента в массиве
  const moveQuestion = (array: any[], fromIndex: number, toIndex: number) => {
    const newArray = [...array];
    const [movedItem] = newArray.splice(fromIndex, 1);
    newArray.splice(toIndex, 0, movedItem);
    return newArray.map((item, index) => ({ ...item, order: index + 1 }));
  };
  
  // Добавление нового варианта ответа
  const handleAddAnswer = (questionIndex: number) => {
    const questionItem = questions[questionIndex];
    let answers: Answer[] = [];

    if (questionItem.question_type === 'sequence') {
      const newAnswerOrder = questionItem.answers?.length > 0 
        ? Math.max(...questionItem.answers.map(a => a.order)) + 1 
        : 1;
      
      const newAnswer: Answer = {
        text: '',
        is_correct: false,
        order: newAnswerOrder,
        isNew: true
      };
      answers = [...(questionItem.answers || []), newAnswer];
    } else {
      const newAnswerOrder = questionItem.answers?.length > 0 
        ? Math.max(...questionItem.answers.map(a => a.order)) + 1 
        : 1;
      
      const newAnswer: Answer = {
        text: '',
        is_correct: false,
        order: newAnswerOrder,
        isNew: true
      };
      answers = [...(questionItem.answers || []), newAnswer];
    }
    
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].answers = answers;
    setQuestions(updatedQuestions);
  };
  
  // Изменение варианта ответа
  const handleAnswerChange = (questionIndex: number, answerIndex: number, field: string, value: any) => {
    const updatedQuestions = [...questions];
    const currentQuestion = updatedQuestions[questionIndex];
    const answers = [...(currentQuestion.answers || [])];
    
    // Если это изменение is_correct для single_choice, сначала снимаем все отметки
    if (field === 'is_correct' && value === true && currentQuestion.question_type === 'single_choice') {
      answers.forEach(answer => answer.is_correct = false);
    }
    
    answers[answerIndex] = { ...answers[answerIndex], [field]: value };
    currentQuestion.answers = answers;
    
    setQuestions(updatedQuestions);
  };
  
  // Удаление варианта ответа
  const handleDeleteAnswer = (questionIndex: number, answerIndex: number) => {
    const updatedQuestions = [...questions];
    const currentQuestion = updatedQuestions[questionIndex];
    const answers = currentQuestion.answers?.filter((_, i) => i !== answerIndex) || [];
    currentQuestion.answers = answers;
    
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
      const questionItem = questions[i];
      
      if (!questionItem.question.trim()) {
        setError(`Вопрос ${i+1}: Текст вопроса обязателен`);
        return false;
      }
      
      // Для вопросов с выбором нужны варианты ответов
      if ((questionItem.question_type === 'single_choice' || questionItem.question_type === 'multiple_choice') && 
          (!questionItem.answers || questionItem.answers.length === 0)) {
        setError(`Вопрос ${i+1}: Добавьте хотя бы один вариант ответа`);
        return false;
      }
      
      // Для single_choice должен быть ровно один правильный ответ
      if (questionItem.question_type === 'single_choice' && 
          questionItem.answers && 
          questionItem.answers.filter(a => a.is_correct).length !== 1) {
        setError(`Вопрос ${i+1}: Должен быть ровно один правильный ответ`);
        return false;
      }
      
      // Для multiple_choice должен быть хотя бы один правильный ответ
      if (questionItem.question_type === 'multiple_choice' && 
          questionItem.answers && 
          !questionItem.answers.some(a => a.is_correct)) {
        setError(`Вопрос ${i+1}: Должен быть хотя бы один правильный ответ`);
        return false;
      }
      
      // Проверяем, что все варианты ответов имеют текст
      if (questionItem.answers) {
        for (let j = 0; j < questionItem.answers.length; j++) {
          if (!questionItem.answers[j].text.trim()) {
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
      for (const questionItem of questions) {
        let questionId = questionItem.id;
        
        if (questionId && !questionItem.isNew) {
          // Обновляем существующий вопрос
          const { error: updateQuestionError } = await supabase
            .from('test_questions')
            .update({
              question: questionItem.question,
              question_type: questionItem.question_type,
              order: questionItem.order,
              points: questionItem.points,
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
              question: questionItem.question,
              question_type: questionItem.question_type,
              order: questionItem.order,
              points: questionItem.points
            })
            .select()
            .single();
            
          if (insertQuestionError) throw insertQuestionError;
          questionId = newQuestion.id;
        }
        
        // Сохранение вариантов
        if (questionItem.answers && questionItem.question_type !== 'text') {
          if (!questionItem.isNew && questionItem.id) {
            if (questionItem.question_type === 'sequence') {
              await supabase.from('test_sequence_answers').delete().eq('question_id', questionItem.id);
            } else {
              await supabase.from('test_answers').delete().eq('question_id', questionItem.id);
            }
          }
          if (questionItem.question_type === 'sequence') {
            const answersToInsert = questionItem.answers.map((answer, index) => ({
              question_id: questionId,
              answer_text: answer.text,
              answer_order: answer.order ?? index + 1
            }));
            const { error: insertAnswersError } = await supabase
              .from('test_sequence_answers')
              .insert(answersToInsert);
            if (insertAnswersError) throw insertAnswersError;
          } else {
            const answersToInsert = questionItem.answers.map((answer, index) => ({
              question_id: questionId,
              text: answer.text,
              is_correct: answer.is_correct,
              order: answer.order
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

  useEffect(() => {
    if (questions.length > 0) {
      const base = Math.floor(100 / questions.length);
      const last = 100 - base * (questions.length - 1);
      setQuestions(prev => prev.map((q, i) => ({ ...q, points: i === prev.length - 1 ? last : base })));
    }
  }, [questions.length]);

  if (!isOpen) return null;

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
                    <option value="final">Итоговый тест</option>
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
                      min="0"
                      max="180"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      id="unlimited_time"
                      checked={test.time_limit === 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTest(prev => ({ ...prev, time_limit: 0 }));
                        } else {
                          setTest(prev => ({ ...prev, time_limit: 30 }));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="unlimited_time" className="ml-2 block text-sm text-gray-500">
                      Без ограничения времени
                    </label>
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
                  <FileTextIcon size={32} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-4">У этого теста пока нет вопросов</p>
                  <button
                    onClick={handleAddQuestion}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Добавить первый вопрос
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((questionItem, index) => (
                    <div 
                      key={index} 
                      className={clsx(
                        "border rounded-lg transition-all shadow-sm",
                        questionItem.isExpanded ? "border-sns-green bg-green-50/40" : "border-gray-200 bg-white"
                      )}
                    >
                      {/* Заголовок вопроса (всегда видимый) */}
                      <div 
                        className="p-4 flex justify-between items-center cursor-pointer gap-2"
                        onClick={() => toggleQuestionExpanded(index)}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Буллит с номером */}
                          <div className="w-9 h-9 min-w-9 min-h-9 rounded-full bg-sns-green flex items-center justify-center shadow text-white font-bold text-base">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-gray-900 truncate text-base leading-tight">
                              {questionItem.question || 'Новый вопрос'}
                            </h4>
                            <div className="flex items-center mt-1 gap-2">
                              <span className={clsx(
                                "px-2 py-0.5 rounded text-xs font-medium",
                                questionItem.question_type === 'single_choice' ? "bg-blue-100 text-blue-800" :
                                questionItem.question_type === 'multiple_choice' ? "bg-purple-100 text-purple-800" :
                                questionItem.question_type === 'sequence' ? "bg-yellow-100 text-yellow-800" :
                                "bg-green-100 text-green-800"
                              )}>
                                {questionItem.question_type === 'single_choice' ? 'Один из списка' :
                                 questionItem.question_type === 'multiple_choice' ? 'Несколько из списка' :
                                 questionItem.question_type === 'sequence' ? 'Последовательность' :
                                 'Текстовый ответ'}
                              </span>
                              <span className="text-xs text-gray-500">{questionItem.points} балл(ов)</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {/* Кнопки вверх/вниз */}
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={e => { e.stopPropagation(); if (index > 0) setQuestions(moveQuestion(questions, index, index - 1)); }}
                            className="rounded-full p-1.5 text-sns-green hover:bg-sns-green/10 disabled:opacity-30 transition"
                            title="Переместить вверх"
                          >
                            <ChevronUp size={18} />
                          </button>
                          <button
                            type="button"
                            disabled={index === questions.length - 1}
                            onClick={e => { e.stopPropagation(); if (index < questions.length - 1) setQuestions(moveQuestion(questions, index, index + 1)); }}
                            className="rounded-full p-1.5 text-sns-green hover:bg-sns-green/10 disabled:opacity-30 transition"
                            title="Переместить вниз"
                          >
                            <ChevronDown size={18} />
                          </button>
                          <button 
                            onClick={e => { e.stopPropagation(); handleDeleteQuestion(index); }}
                            className="rounded-full p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Удалить вопрос"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button className="ml-1 text-gray-400 hover:text-sns-green transition" tabIndex={-1}>
                            {questionItem.isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </div>
                      </div>
                      
                      {/* Детали вопроса (развернутая часть) */}
                      {questionItem.isExpanded && (
                        <div className="px-4 pb-4 pt-2">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Текст вопроса *
                              </label>
                              <input
                                type="text"
                                value={questionItem.question}
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
                                  value={questionItem.question_type}
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
                                  value={questionItem.points}
                                  onChange={(e) => handleQuestionChange(index, 'points', parseInt(e.target.value) || 1)}
                                  min="1"
                                  max="100"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  disabled
                                />
                              </div>
                            </div>
                            
                            {/* Варианты ответов для вопросов с выбором и последовательности */}
                            {(questionItem.question_type === 'single_choice' || questionItem.question_type === 'multiple_choice' || questionItem.question_type === 'sequence') && (
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <label className="block text-sm font-medium text-gray-700">
                                    Варианты ответа{questionItem.question_type === 'sequence' ? ' (перетащите для правильного порядка)' : ''}
                                  </label>
                                  <button
                                    onClick={() => handleAddAnswer(index)}
                                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 flex items-center space-x-1"
                                  >
                                    <Plus size={12} />
                                    <span>Добавить</span>
                                  </button>
                                </div>
                                {(!questionItem.answers || questionItem.answers.length === 0) ? (
                                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    <p className="text-gray-500 text-sm">Нет вариантов ответа</p>
                                    <button
                                      onClick={() => handleAddAnswer(index)}
                                      className="mt-2 text-blue-600 hover:underline text-sm"
                                    >
                                      Добавить вариант ответа
                                    </button>
                                  </div>
                                ) : questionItem.question_type === 'sequence' ? (
                                  <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={(event) => handleDragEnd(event, index)}
                                  >
                                    <SortableContext
                                      items={(questionItem.answers || []).map((_, answerIndex) => `answer-${index}-${answerIndex}`)}
                                      strategy={verticalListSortingStrategy}
                                    >
                                      <ul className="space-y-2">
                                        {(questionItem.answers || []).map((answer, answerIndex) => (
                                          <SortableAnswerItem
                                            key={answerIndex}
                                            answer={answer}
                                            answerIndex={answerIndex}
                                            questionIndex={index}
                                            onAnswerChange={handleAnswerChange}
                                            onDeleteAnswer={handleDeleteAnswer}
                                          />
                                        ))}
                                      </ul>
                                    </SortableContext>
                                  </DndContext>
                                ) : (
                                  <div className="space-y-2">
                                    {questionItem.answers.map((answer, answerIndex) => (
                                      <div 
                                        key={answerIndex} 
                                        className={clsx(
                                          "flex items-center border rounded-lg p-3",
                                          answer.is_correct ? "border-green-300 bg-green-50" : "border-gray-200"
                                        )}
                                      >
                                        <div className="flex-shrink-0 mr-3">
                                          <input
                                            type={questionItem.question_type === 'single_choice' ? 'radio' : 'checkbox'}
                                            checked={answer.is_correct}
                                            onChange={(e) => handleAnswerChange(index, answerIndex, 'is_correct', e.target.checked)}
                                            className={questionItem.question_type === 'single_choice' 
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
                            {questionItem.question_type === 'text' && (
                              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                                <p className="text-blue-800 mb-2">
                                  <span className="font-medium">Текстовый ответ:</span> Участник введет свой ответ в текстовое поле.
                                </p>
                                <p className="text-blue-600">
                                  Такие вопросы требуют ручной проверки после прохождения теста.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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