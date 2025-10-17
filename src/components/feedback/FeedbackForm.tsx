import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Star, Send, AlertTriangle, CheckCircle2, MessageSquare } from 'lucide-react';
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
  const { userProfile } = useAuthBFF();
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
        console.log('Fetching feedback template for event:', eventId);
        setLoading(true);
        
        // Получаем тип мероприятия
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('event_type_id')
          .eq('id', eventId)
          .single();
        
        if (eventError) {
          console.error('Error fetching event data:', eventError);
          throw eventError;
        }
        console.log('Event data:', eventData);
        
        // Находим шаблон обратной связи для этого типа мероприятия
        const { data: templateData, error: templateError } = await supabase
          .from('feedback_templates')
          .select('*')
          .eq('event_type_id', eventData.event_type_id)
          .eq('is_default', true)
          .single();
        
        if (templateError) {
          console.error('Error fetching feedback template:', templateError);
          if (templateError.code === 'PGRST116') {
            setError('Для этого типа мероприятия не настроена форма обратной связи');
          } else {
            setError('Не удалось загрузить шаблон обратной связи');
          }
          setLoading(false);
          return;
        }
        
        console.log('Template data:', templateData);
        setTemplate(templateData);
        
        // Загружаем вопросы для шаблона
        const { data: questionsData, error: questionsError } = await supabase
          .from('feedback_questions')
          .select('*')
          .eq('template_id', templateData.id)
          .order('order_num');
        
        if (questionsError) {
          console.error('Error fetching questions:', questionsError);
          throw questionsError;
        }
        
        console.log('Questions data:', questionsData);
        setQuestions(questionsData || []);
        
        if (!questionsData || questionsData.length === 0) {
          setError('В шаблоне обратной связи нет вопросов');
          setLoading(false);
          return;
        }
        
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
        if (err instanceof Error) {
          if (err.message.includes('function does not exist')) {
            setError('Функция загрузки шаблона не найдена в базе данных');
          } else if (err.message.includes('permission denied')) {
            setError('Нет прав для загрузки шаблона обратной связи');
          } else {
            setError(`Произошла ошибка при загрузке формы обратной связи: ${err.message}`);
          }
        } else {
          setError('Произошла ошибка при загрузке формы обратной связи');
        }
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
    console.log('Rating changed:', questionId, rating);
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
    console.log('Checking form validity:', { questions: questions.length, answers: answers.length });
    
    // Проверяем, что на все обязательные вопросы с рейтингом даны ответы
    const requiredRatingQuestions = questions.filter(q => q.required && q.question_type === 'rating');
    console.log('Required rating questions:', requiredRatingQuestions.length);
    
    for (const question of requiredRatingQuestions) {
      const answer = answers.find(a => a.questionId === question.id);
      console.log('Question:', question.question, 'Answer:', answer);
      if (!answer || answer.ratingValue === undefined || answer.ratingValue === null) {
        console.log('Missing answer for question:', question.question);
        return false;
      }
    }
    
    console.log('Form is valid');
    return true;
  };
  
  // Вычисляем средний рейтинг
  const calculateAverageRating = () => {
    const ratingAnswers = answers.filter(a => a.ratingValue !== undefined && a.ratingValue !== null);
    console.log('Rating answers:', ratingAnswers.length);
    
    if (ratingAnswers.length === 0) {
      console.log('No rating answers found');
      return null;
    }
    
    const sum = ratingAnswers.reduce((total, answer) => total + (answer.ratingValue || 0), 0);
    const average = Math.round((sum / ratingAnswers.length) * 10) / 10; // Округляем до 1 знака
    console.log('Average rating:', average);
    return average;
  };
  
  // Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted');
    
    if (!isFormValid()) {
      console.log('Form is not valid');
      setError('Пожалуйста, ответьте на все обязательные вопросы');
      return;
    }
    
    if (!userProfile || !template) {
      console.log('Missing userProfile or template:', { userProfile: !!userProfile, template: !!template });
      setError('Ошибка идентификации пользователя или шаблона');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Создаем запись о заполненной форме
      const calculatedRating = overallRating || calculateAverageRating() || 0;
      console.log('Calculated rating:', calculatedRating, 'Overall rating:', overallRating);
      
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
      
      if (submissionError) {
        console.error('Error creating feedback submission:', submissionError);
        throw submissionError;
      }
      
      // Создаем записи об ответах на вопросы
      const answersToInsert = answers
        .filter(a => (a.ratingValue !== undefined && a.ratingValue !== null) || a.textValue)
        .map(answer => ({
          submission_id: submission.id,
          question_id: answer.questionId,
          rating_value: answer.ratingValue || null,
          text_value: answer.textValue || null
        }));
      
      console.log('Answers to insert:', answersToInsert.length);
      
      if (answersToInsert.length > 0) {
        const { error: answersError } = await supabase
          .from('feedback_answers')
          .insert(answersToInsert);
        
        if (answersError) {
          console.error('Error creating feedback answers:', answersError);
          throw answersError;
        }
      }
      
      // Обновляем статус заполнения обратной связи в таблице участников
      const { error: updateError } = await supabase
        .from('event_participants')
        .update({ feedback_submitted: true })
        .match({ event_id: eventId, user_id: userProfile.id });
      
      if (updateError) {
        console.error('Error updating participant status:', updateError);
        // Не прерываем процесс, так как основная форма уже отправлена
      }
      
      console.log('Feedback submitted successfully');
      setSuccess(true);
      
      // Закрываем форму после успешной отправки
      setTimeout(() => {
        console.log('Closing form after success');
        onSuccess();
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error('Error submitting feedback:', err);
      if (err instanceof Error) {
        if (err.message.includes('duplicate key')) {
          setError('Вы уже отправили обратную связь для этого мероприятия');
        } else if (err.message.includes('foreign key')) {
          setError('Ошибка связи с базой данных');
        } else {
          setError(`Произошла ошибка при отправке обратной связи: ${err.message}`);
        }
      } else {
        setError('Произошла ошибка при отправке обратной связи');
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  // Рендерим звезды для рейтинга
  const renderStars = (questionId: string, currentRating: number | undefined | null) => {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => handleRatingChange(questionId, rating)}
              className={clsx(
                "p-2 rounded-full transition-all duration-200",
                (currentRating || 0) >= rating
                  ? "hover:bg-amber-50"
                  : "text-gray-300 hover:text-gray-400 hover:bg-gray-50"
              )}
              style={(currentRating || 0) >= rating ? { color: '#F59E0B', fill: '#F59E0B' } : {}}
              title={`${rating} ${rating === 1 ? 'балл' : rating < 5 ? 'балла' : 'баллов'}`}
            >
              <Star className="w-7 h-7 fill-current" />
            </button>
          ))}
        </div>
        <div className="ml-4 px-3 py-1 bg-gray-100 rounded-full">
          <span className="text-sm font-semibold text-gray-700">
            {currentRating ? `${currentRating} ${currentRating === 1 ? 'балл' : currentRating < 5 ? 'балла' : 'баллов'}` : 'Не выбрано'}
          </span>
        </div>
      </div>
    );
  };

  // --- Новый компактный и адаптивный рендер ---
  console.log('FeedbackForm render:', {
    loading,
    error,
    success,
    template: !!template,
    questionsCount: questions.length,
    eventId
  });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-4 animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-lg w-full max-h-[95vh] overflow-y-auto flex flex-col">
        {/* Шапка с заголовком и описанием */}
        <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-sns-100">
              <MessageSquare className="h-5 w-5 text-sns-500" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                {template?.name || 'Стандартная форма обратной связи для оценки качества проведения тренинга'}
              </h2>
              {template?.description && (
                <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-snug">
                  {template.description}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-200"
            aria-label="Закрыть"
          >
            <X size={22} />
          </button>
        </div>

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 shadow-lg" style={{ backgroundColor: '#10B981' }}>
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Спасибо за вашу обратную связь!
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Ваши ответы помогут нам улучшить качество обучения и сделать будущие мероприятия еще лучше.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 p-4">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-xl text-sm flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <span className="text-red-600 font-medium">{error}</span>
              </div>
            )}

            {/* Инструкция по оценке */}
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs sm:text-sm flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400" />
              <span>1 — очень плохо, 2 — плохо, 3 — удовлетворительно, 4 — хорошо, 5 — отлично</span>
            </div>

            <div className="flex-1 flex flex-col gap-4">
              {questions.map((question) => (
                <div key={question.id} className={clsx(
                  'p-3 border rounded-xl bg-white flex flex-col gap-2',
                  question.required ? 'border-blue-200' : 'border-gray-200'
                )}>
                  <label className="block font-semibold text-gray-900 text-sm mb-1">
                    {question.question}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {question.question_type === 'rating' ? (
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => {
                        const currentRating = answers.find(a => a.questionId === question.id)?.ratingValue;
                        return (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => handleRatingChange(question.id, rating)}
                            className={clsx(
                              'p-1 rounded-full transition-all duration-200',
                              currentRating && currentRating >= rating
                                ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400'
                            )}
                            style={currentRating && currentRating >= rating ? { color: '#F59E0B', fill: '#F59E0B' } : {}}
                            title={`${rating} ${rating === 1 ? 'балл' : rating < 5 ? 'балла' : 'баллов'}`}
                          >
                            <Star className="w-6 h-6 fill-current" />
                          </button>
                        );
                      })}
                      {/* Не показываем подпись "Не выбрано" */}
                      {(() => {
                        const currentRating = answers.find(a => a.questionId === question.id)?.ratingValue;
                        return currentRating ? (
                          <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs font-semibold text-gray-700">
                            {currentRating} {currentRating === 1 ? 'балл' : currentRating < 5 ? 'балла' : 'баллов'}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  ) : (
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-sm"
                      rows={3}
                      value={answers.find(a => a.questionId === question.id)?.textValue || ''}
                      onChange={e => handleTextChange(question.id, e.target.value)}
                      placeholder="Введите ваш ответ..."
                      required={question.required}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Общая оценка */}
            <div className="p-3 border border-purple-200 rounded-xl bg-purple-50 flex flex-col gap-2">
              <label className="block font-semibold text-gray-900 text-sm mb-1">
                Общая оценка мероприятия
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setOverallRating(rating)}
                    className={clsx(
                      'p-1 rounded-full transition-all duration-200',
                      overallRating && overallRating >= rating
                        ? 'text-purple-500' : 'text-gray-300 hover:text-purple-500'
                    )}
                    style={overallRating && overallRating >= rating ? { color: '#a78bfa', fill: '#a78bfa' } : {}}
                    title={`${rating} ${rating === 1 ? 'балл' : rating < 5 ? 'балла' : 'баллов'}`}
                  >
                    <Star className="w-6 h-6 fill-current" />
                  </button>
                ))}
                {/* Не показываем подпись "Не выбрано" */}
                {overallRating ? (
                  <span className="ml-2 px-2 py-0.5 bg-white border border-purple-200 rounded-full text-xs font-semibold text-purple-700">
                    {overallRating} {overallRating === 1 ? 'балл' : overallRating < 5 ? 'балла' : 'баллов'}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-gray-500 bg-white p-2 rounded-lg border border-gray-200 mt-1">
                <span className="font-medium">💡</span> Если не указано, будет автоматически рассчитана как среднее значение всех оценок.
              </p>
            </div>

            {/* Комментарии */}
            <div className="p-3 border border-gray-200 rounded-xl bg-gray-50 flex flex-col gap-2">
              <label className="block font-semibold text-gray-900 text-sm mb-1">
                Дополнительные комментарии
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-sm"
                rows={3}
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Поделитесь вашими мыслями о мероприятии..."
              />
            </div>

            {/* Кнопки */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-semibold text-sm"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={submitting || !isFormValid()}
                className={clsx(
                  'w-full sm:w-auto px-6 py-2 rounded-lg transition-all duration-200 font-semibold shadow-md text-sm',
                  submitting || !isFormValid()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'text-white hover:shadow-lg bg-sns-500'
                )}
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span>Отправка...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Send className="w-4 h-4 mr-1" />
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