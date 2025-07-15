import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Save, CheckCircle, Star, MessageSquare, AlignLeft } from 'lucide-react';
import { clsx } from 'clsx';

interface FeedbackTemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  templateId?: string; // Если указан, редактируем существующий шаблон
  eventTypeId?: string; // Если указан, создаем шаблон для определенного типа мероприятия
  onSuccess: () => void;
}

interface EventType {
  id: string;
  name: string;
  name_ru: string;
}

interface FeedbackTemplate {
  id?: string;
  name: string;
  description: string;
  event_type_id: string;
  is_default: boolean;
}

interface FeedbackQuestion {
  id?: string;
  template_id?: string;
  question: string;
  question_type: 'rating' | 'text';
  required: boolean;
  order_num: number;
  isNew?: boolean;
}

export function FeedbackTemplateEditor({
  isOpen,
  onClose,
  templateId,
  eventTypeId,
  onSuccess
}: FeedbackTemplateEditorProps) {
  const [template, setTemplate] = useState<FeedbackTemplate>({
    name: '',
    description: '',
    event_type_id: eventTypeId || '',
    is_default: false
  });
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchEventTypes();
      
      if (templateId) {
        fetchTemplateData(templateId);
      } else {
        // Инициализируем новый шаблон
        setTemplate({
          name: '',
          description: '',
          event_type_id: eventTypeId || '',
          is_default: false
        });
        
        // Добавляем стандартные вопросы для нового шаблона
        setQuestions([
          {
            question: 'Знание преподаваемого материала',
            question_type: 'rating',
            required: true,
            order_num: 1,
            isNew: true
          },
          {
            question: 'Умение связать теорию с практикой',
            question_type: 'rating',
            required: true,
            order_num: 2,
            isNew: true
          },
          {
            question: 'Способность заинтересовать аудиторию',
            question_type: 'rating',
            required: true,
            order_num: 3,
            isNew: true
          },
          {
            question: 'Общая оценка работы тренера',
            question_type: 'rating',
            required: true,
            order_num: 4,
            isNew: true
          },
          {
            question: 'Комментарии и предложения',
            question_type: 'text',
            required: false,
            order_num: 5,
            isNew: true
          }
        ]);
        
        setLoading(false);
      }
    }
  }, [isOpen, templateId, eventTypeId]);

  const fetchEventTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('event_types')
        .select('id, name, name_ru')
        .order('name_ru');
      
      if (error) throw error;
      setEventTypes(data || []);
    } catch (err) {
      console.error('Error fetching event types:', err);
      setError('Не удалось загрузить типы мероприятий');
    }
  };

  const fetchTemplateData = async (id: string) => {
    try {
      setLoading(true);
      
      // Загружаем данные шаблона
      const { data: templateData, error: templateError } = await supabase
        .from('feedback_templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (templateError) throw templateError;
      
      setTemplate(templateData);
      
      // Загружаем вопросы шаблона
      const { data: questionsData, error: questionsError } = await supabase
        .from('feedback_questions')
        .select('*')
        .eq('template_id', id)
        .order('order_num');
      
      if (questionsError) throw questionsError;
      
      setQuestions(questionsData || []);
      
    } catch (err) {
      console.error('Error fetching template data:', err);
      setError('Не удалось загрузить данные шаблона');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (field: keyof FeedbackTemplate, value: any) => {
    setTemplate({ ...template, [field]: value });
  };

  const handleQuestionChange = (index: number, field: keyof FeedbackQuestion, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  const handleAddQuestion = () => {
    const newOrder = questions.length > 0 
      ? Math.max(...questions.map(q => q.order_num)) + 1 
      : 1;
    
    setQuestions([
      ...questions, 
      {
        question: '',
        question_type: 'rating',
        required: true,
        order_num: newOrder,
        isNew: true
      }
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === questions.length - 1)
    ) {
      return;
    }
    
    const newQuestions = [...questions];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap order numbers
    const temp = newQuestions[index].order_num;
    newQuestions[index].order_num = newQuestions[swapIndex].order_num;
    newQuestions[swapIndex].order_num = temp;
    
    // Swap positions in array
    [newQuestions[index], newQuestions[swapIndex]] = [newQuestions[swapIndex], newQuestions[index]];
    
    setQuestions(newQuestions);
  };

  const validateForm = () => {
    if (!template.name.trim()) {
      setError('Необходимо указать название шаблона');
      return false;
    }
    
    if (!template.event_type_id) {
      setError('Необходимо выбрать тип мероприятия');
      return false;
    }
    
    if (questions.length === 0) {
      setError('Добавьте хотя бы один вопрос');
      return false;
    }
    
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question.trim()) {
        setError(`Вопрос ${i + 1} не может быть пустым`);
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    setError(null);
    
    try {
      let savedTemplateId = template.id;
      
      // Создаем или обновляем шаблон
      if (savedTemplateId) {
        // Обновляем существующий шаблон
        const { error: updateError } = await supabase
          .from('feedback_templates')
          .update({
            name: template.name,
            description: template.description,
            event_type_id: template.event_type_id,
            is_default: template.is_default,
            updated_at: new Date().toISOString()
          })
          .eq('id', savedTemplateId);
        
        if (updateError) throw updateError;
        
      } else {
        // Создаем новый шаблон
        const { data: newTemplate, error: insertError } = await supabase
          .from('feedback_templates')
          .insert({
            name: template.name,
            description: template.description,
            event_type_id: template.event_type_id,
            is_default: template.is_default
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        
        savedTemplateId = newTemplate.id;
      }
      
      // Обрабатываем вопросы
      // Если редактируем существующий шаблон, удаляем все вопросы и создаем заново
      if (template.id) {
        const { error: deleteError } = await supabase
          .from('feedback_questions')
          .delete()
          .eq('template_id', savedTemplateId);
        
        if (deleteError) throw deleteError;
      }
      
      // Создаем новые вопросы
      const questionsToInsert = questions.map((q, index) => ({
        template_id: savedTemplateId,
        question: q.question,
        question_type: q.question_type,
        required: q.required,
        order_num: index + 1 // Обновляем порядок для уверенности
      }));
      
      const { error: questionsError } = await supabase
        .from('feedback_questions')
        .insert(questionsToInsert);
      
      if (questionsError) throw questionsError;
      
      // Устанавливаем флаг успешного сохранения
      setSuccess(true);
      
      // Закрываем модальное окно через небольшую задержку
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
      
    } catch (err) {
      console.error('Error saving feedback template:', err);
      setError('Ошибка сохранения шаблона обратной связи');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {templateId ? 'Редактирование шаблона обратной связи' : 'Создание шаблона обратной связи'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-10 flex flex-col justify-center items-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Загрузка данных...</p>
          </div>
        ) : success ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Шаблон успешно сохранен
            </h3>
            <p className="text-gray-600">
              Шаблон обратной связи успешно {templateId ? 'обновлен' : 'создан'}.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Основная информация о шаблоне */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название шаблона *
                </label>
                <input
                  type="text"
                  value={template.name}
                  onChange={(e) => handleTemplateChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Например: Оценка тренинга по продажам"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={template.description}
                  onChange={(e) => handleTemplateChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Краткое описание назначения этого шаблона обратной связи"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Тип мероприятия *
                </label>
                <select
                  value={template.event_type_id}
                  onChange={(e) => handleTemplateChange('event_type_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!!eventTypeId} // Блокируем, если тип передан извне
                >
                  <option value="">Выберите тип мероприятия</option>
                  {eventTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name_ru || type.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={template.is_default}
                  onChange={(e) => handleTemplateChange('is_default', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
                  Использовать по умолчанию для выбранного типа мероприятий
                </label>
              </div>
            </div>
            
            {/* Вопросы */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Вопросы ({questions.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 inline mr-1" />
                  Добавить вопрос
                </button>
              </div>
              
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div 
                    key={index} 
                    className={clsx(
                      "p-4 border rounded-lg",
                      question.question_type === 'rating' ? "border-blue-200 bg-blue-50" : "border-green-200 bg-green-50"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-2">
                        <div className={clsx(
                          "mt-0.5 p-1 rounded-full",
                          question.question_type === 'rating' ? "bg-blue-100" : "bg-green-100"
                        )}>
                          {question.question_type === 'rating' ? (
                            <Star className={clsx(
                              "h-4 w-4",
                              question.question_type === 'rating' ? "text-blue-600" : "text-green-600"
                            )} />
                          ) : (
                            <AlignLeft className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {question.question_type === 'rating' ? 'Рейтинг' : 'Текст'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(index, 'down')}
                          disabled={index === questions.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(index)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
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
                        />
                      </div>
                      
                      <div className="flex flex-wrap gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Тип вопроса
                          </label>
                          <select
                            value={question.question_type}
                            onChange={(e) => handleQuestionChange(index, 'question_type', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="rating">Рейтинг (1-5 звезд)</option>
                            <option value="text">Текстовый ответ</option>
                          </select>
                        </div>
                        
                        <div className="flex items-end h-9">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={question.required}
                              onChange={(e) => handleQuestionChange(index, 'required', e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">Обязательный вопрос</span>
                          </label>
                        </div>
                      </div>
                      
                      {question.question_type === 'rating' && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-500 mb-1">Предпросмотр:</div>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className="w-5 h-5 text-gray-300"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {questions.length === 0 && (
                  <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                    <MessageSquare className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">У этого шаблона пока нет вопросов</p>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Добавить первый вопрос
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Кнопки */}
            <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span>Сохранение...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    <span>Сохранить шаблон</span>
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