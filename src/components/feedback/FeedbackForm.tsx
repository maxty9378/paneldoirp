import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Star, StarIcon, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { clsx } from 'clsx';

interface FeedbackFormProps {
  eventId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface FeedbackTemplate {
  id: string;
  name: string;
  description?: string;
  event_type_id: string;
}

interface FeedbackQuestion {
  id: string;
  template_id: string;
  question: string;
  question_type: 'rating' | 'text';
  required: boolean;
  order_num: number;
}

interface FeedbackAnswer {
  questionId: string;
  ratingValue?: number;
  textValue?: string;
}

export function FeedbackForm({ eventId, onClose, onSuccess }: FeedbackFormProps) {
  const { userProfile } = useAuth();
  const [template, setTemplate] = useState<FeedbackTemplate | null>(null);
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [answers, setAnswers] = useState<FeedbackAnswer[]>([]);
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [comments, setComments] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Загружаем шаблон обратной связи и вопросы
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setLoading(true);
        
        // Получаем тип мероприятия
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('event_type_id')
          .eq('id', eventId)
          .single();
        
        if (eventError) throw eventError;
        
        // Находим шаблон обратной связи для этого типа мероприятия
        const { data: templateData, error: templateError } = await supabase
          .from('feedback_templates')
          .select('*')
          .eq('event_type_id', eventData.event_type_id)
          .eq('is_default', true)
          .single();
        
        if (templateError) {
          console.error('Error fetching feedback template:', templateError);
          setError('Не удалось загрузить шаблон обратной связи');
          setLoading(false);
          return;
        }
        
        setTemplate(templateData);
        
        // Загружаем вопросы для шаблона
        const { data: questionsData, error: questionsError } = await supabase
          .from('feedback_questions')
          .select('*')
          .eq('template_id', templateData.id)
          .order('order_num');
        
        if (questionsError) throw questionsError;
        
        setQuestions(questionsData || []);
        
        // Инициализируем ответы
        setAnswers(
          questionsData.map(q => ({
            questionId: q.id,
            ratingValue: q.question_type === 'rating' ? null : undefined,
            textValue: q.question_type === 'text' ? '' : undefined
          }))
        );
        
      } catch (err) {
        console.error('Error fetching feedback template:', err);
        setError('Произошла ошибка при загрузке формы обратной связи');
      } finally {
        setLoading(false);
      }
    };
    
    if (eventId) {
      fetchTemplate();
    }
  }, [eventId]);
  
  // Обновление рейтинга
  const handleRatingChange = (questionId: string, rating: number) => {
    setAnswers(prev => prev.map(a => 
      a.questionId === questionId 
        ? { ...a, ratingValue: rating }
        : a
    ));
  };
  
  // Обновление текстового ответа
  const handleTextChange = (questionId: string, text: string) => {
    setAnswers(prev => prev.map(a => 
      a.questionId === questionId 
        ? { ...a, textValue: text }
        : a
    ));
  };
  
  // Проверка валидности формы
  const isFormValid = () => {
    // Проверяем, что на все обязательные вопросы с рейтингом даны ответы
    const requiredRatingQuestions = questions.filter(q => q.required && q.question_type === 'rating');
    
    for (const question of requiredRatingQuestions) {
      const answer = answers.find(a => a.questionId === question.id);
      if (!answer || answer.ratingValue === undefined || answer.ratingValue === null) {
        return false;
      }
    }
    
    return true;
  };
  
  // Вычисляем средний рейтинг
  const calculateAverageRating = () => {
    const ratingAnswers = answers.filter(a => a.ratingValue !== undefined && a.ratingValue !== null);
    
    if (ratingAnswers.length === 0) {
      return null;
    }
    
    const sum = ratingAnswers.reduce((total, answer) => total + (answer.ratingValue || 0), 0);
    return Math.round((sum / ratingAnswers.length) * 10) / 10; // Округляем до 1 знака
  };
  
  // Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      setError('Пожалуйста, ответьте на все обязательные вопросы');
      return;
    }
    
    if (!userProfile || !template) {
      setError('Ошибка идентификации пользователя или шаблона');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Создаем запись о заполненной форме
      const calculatedRating = overallRating || calculateAverageRating() || 0;
      
      const { data: submission, error: submissionError } = await supabase
        .from('feedback_submissions')
        .insert({
          user_id: userProfile.id,
          event_id: eventId,
          template_id: template.id,
          overall_rating: calculatedRating,
          comments: comments || null,
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (submissionError) throw submissionError;
      
      // Создаем записи об ответах на вопросы
      const answersToInsert = answers
        .filter(a => (a.ratingValue !== undefined && a.ratingValue !== null) || a.textValue)
        .map(answer => ({
          submission_id: submission.id,
          question_id: answer.questionId,
          rating_value: answer.ratingValue || null,
          text_value: answer.textValue || null
        }));
      
      if (answersToInsert.length > 0) {
        const { error: answersError } = await supabase
          .from('feedback_answers')
          .insert(answersToInsert);
        
        if (answersError) throw answersError;
      }
      
      // Обновляем статус заполнения обратной связи в таблице участников
      await supabase
        .from('event_participants')
        .update({ feedback_submitted: true })
        .match({ event_id: eventId, user_id: userProfile.id });
      
      setSuccess(true);
      
      // Закрываем форму после успешной отправки
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Произошла ошибка при отправке обратной связи');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Рендерим звезды для рейтинга
  const renderStars = (questionId: string, currentRating: number | undefined | null) => {
    return (
      <div className="flex items-center space-x-1 mt-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => handleRatingChange(questionId, rating)}
            className={`p-1 rounded-full transition-colors ${
              (currentRating || 0) >= rating
                ? 'text-yellow-500 hover:text-yellow-600'
                : 'text-gray-300 hover:text-gray-400'
            }`}
            title={`${rating} ${rating === 1 ? 'балл' : rating < 5 ? 'балла' : 'баллов'}`}
          >
            <Star className="w-6 h-6 fill-current" />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-700">
          {currentRating ? `${currentRating} ${currentRating === 1 ? 'балл' : currentRating < 5 ? 'балла' : 'баллов'}` : 'Не выбрано'}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {template?.name || 'Обратная связь по мероприятию'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Спасибо за вашу обратную связь!
            </h3>
            <p className="text-gray-600 mb-4">
              Ваши ответы помогут нам улучшить качество обучения.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {template?.description && (
              <div className="bg-blue-50 text-blue-700 p-4 rounded-lg text-sm">
                <p>{template.description}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-600">{error}</p>
                </div>
              </div>
            )}

            <p className="text-gray-600 text-sm">
              Оцените качество проведенного мероприятия по шкале от 1 до 5, где:
              <br />1 - очень плохо, 2 - плохо, 3 - удовлетворительно, 4 - хорошо, 5 - отлично
            </p>

            <div className="space-y-8">
              {questions.map((question) => (
                <div key={question.id} className={clsx(
                  "p-4 border rounded-lg",
                  question.required ? "border-gray-300" : "border-gray-200 bg-gray-50"
                )}>
                  <label className="block font-medium text-gray-900">
                    {question.question}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {question.question_type === 'rating' ? (
                    renderStars(
                      question.id, 
                      answers.find(a => a.questionId === question.id)?.ratingValue
                    )
                  ) : (
                    <textarea
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      value={answers.find(a => a.questionId === question.id)?.textValue || ''}
                      onChange={(e) => handleTextChange(question.id, e.target.value)}
                      placeholder="Введите ваш ответ..."
                      required={question.required}
                    />
                  )}
                </div>
              ))}

              <div className="p-4 border border-gray-300 rounded-lg">
                <label className="block font-medium text-gray-900">
                  Общая оценка мероприятия
                </label>
                {renderStars('overall', overallRating)}
                <p className="text-sm text-gray-500 mt-2">
                  Если не указано, будет автоматически рассчитана как среднее значение всех оценок.
                </p>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <label className="block font-medium text-gray-900 mb-2">
                  Дополнительные комментарии
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Поделитесь вашими мыслями о мероприятии..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={submitting || !isFormValid()}
                className={clsx(
                  "px-4 py-2 rounded-lg transition-colors",
                  submitting || !isFormValid()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                )}
              >
                {submitting ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span>Отправка...</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Send className="w-4 h-4 mr-2" />
                    <span>Отправить отзыв</span>
                  </div>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}