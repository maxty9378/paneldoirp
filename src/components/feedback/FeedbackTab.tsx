import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { MessageSquare, CheckCircle, PlusCircle, Star, BarChart, BarChart3, Users, TrendingUp, Award, FileText } from 'lucide-react';
import { FeedbackForm } from './FeedbackForm';
import { FeedbackComments } from './FeedbackComments';
import { clsx } from 'clsx';

interface FeedbackTabProps {
  eventId: string;
  adminStatOnly?: boolean;
}

interface FeedbackStatus {
  canSubmitFeedback: boolean;
  hasSubmittedFeedback: boolean;
  reasonDisabled: string | null;
}

export function FeedbackTab({ eventId, adminStatOnly = false }: FeedbackTabProps) {
  const { userProfile } = useAuth();
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>({
    canSubmitFeedback: true, // По умолчанию разрешаем, пока не проверим
    hasSubmittedFeedback: false,
    reasonDisabled: null
  });
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalSubmissions, setTotalSubmissions] = useState<number>(0);
  const [feedbackStats, setFeedbackStats] = useState<any[]>([]);
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(userProfile?.role === 'employee'); // состояние сворачивания секции обратной связи
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState<{rating: number, participants: any[], question: string} | null>(null);
  const [completionRate, setCompletionRate] = useState<number>(0);
  const [textComments, setTextComments] = useState<any[]>([]);

  const isAdmin = adminStatOnly || (userProfile?.role === 'administrator' || userProfile?.role === 'moderator');
  const isTrainer = adminStatOnly || userProfile?.role === 'trainer' || isAdmin;
  
  // Определяем, является ли пользователь участником (employee)
  const isEmployee = userProfile?.role === 'employee';
  
  // Для сотрудников разворачиваем секцию по умолчанию
  useEffect(() => {
    if (isEmployee) {
      setIsFeedbackExpanded(true);
    }
  }, [isEmployee]);

  useEffect(() => {
    console.log('useEffect triggered:', { eventId, userId: userProfile?.id, userProfile });
    if (eventId && userProfile?.id) {
      checkFeedbackStatus();
    } else if (eventId && !userProfile?.id) {
      console.log('User profile not loaded yet');
    }
  }, [eventId, userProfile?.id, checkFeedbackStatus]);

  useEffect(() => {
    if (isTrainer && eventId) {
      fetchFeedbackStats();
    }
  }, [isTrainer, eventId]);

  useEffect(() => {
    console.log('FeedbackTab: feedbackStats', feedbackStats, 'averageRating', averageRating);
  }, [feedbackStats, averageRating]);

  const checkFeedbackStatus = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Checking feedback status for event:', eventId, 'user:', userProfile?.id);
      
      if (!userProfile?.id) {
        console.log('User profile not loaded');
        setFeedbackStatus({
          canSubmitFeedback: false,
          hasSubmittedFeedback: false,
          reasonDisabled: 'Пользователь не загружен'
        });
        setLoading(false);
        return;
      }
      
      // Проверяем, заполнил ли пользователь уже обратную связь
      const { data: submissions, error: submissionsError } = await supabase
        .from('feedback_submissions')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userProfile?.id)
        .maybeSingle();

      if (submissionsError) {
        console.error('Error checking feedback submissions:', submissionsError);
        throw submissionsError;
      }
      
      const hasSubmitted = !!submissions;
      console.log('Has submitted feedback:', hasSubmitted);

      // Если администратор или тренер, они всегда могут просматривать статистику
      if (isTrainer) {
        console.log('User is trainer/admin, setting status');
        setFeedbackStatus({
          canSubmitFeedback: !hasSubmitted,
          hasSubmittedFeedback: hasSubmitted,
          reasonDisabled: hasSubmitted ? "Вы уже отправили обратную связь" : null
        });
        setLoading(false);
        return;
      }

      // Проверяем, может ли пользователь отправлять обратную связь
      // (прошел ли он входной и финальный тесты)
      const { data, error } = await supabase.rpc('should_show_feedback_form', {
        p_user_id: userProfile?.id,
        p_event_id: eventId
      });

      if (error) {
        console.error('Error calling should_show_feedback_form:', error);
        throw error;
      }

      console.log('should_show_feedback_form result:', data);

      let reasonText = null;
      if (!data && !hasSubmitted) {
        reasonText = "Для заполнения обратной связи необходимо пройти входной и финальный тесты";
      } else if (hasSubmitted) {
        reasonText = "Вы уже отправили обратную связь";
      }

      const status = {
        canSubmitFeedback: data && !hasSubmitted,
        hasSubmittedFeedback: hasSubmitted,
        reasonDisabled: reasonText
      };
      
      console.log('Setting feedback status:', status);
      setFeedbackStatus(status);
    } catch (err) {
      console.error('Error checking feedback status:', err);
      if (err instanceof Error) {
        if (err.message.includes('function does not exist')) {
          setError('Функция проверки статуса не найдена в базе данных');
        } else if (err.message.includes('permission denied')) {
          setError('Нет прав для проверки статуса обратной связи');
        } else {
          setError(`Не удалось проверить статус обратной связи: ${err.message}`);
        }
      } else {
        setError('Не удалось проверить статус обратной связи');
      }
      // Устанавливаем дефолтные значения в случае ошибки
      setFeedbackStatus({
        canSubmitFeedback: false,
        hasSubmittedFeedback: false,
        reasonDisabled: 'Ошибка при проверке статуса'
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, userProfile?.id]);

  const fetchFeedbackStats = async () => {
    try {
      // Получаем информацию о мероприятии и его типе
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, event_type_id')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('Error fetching event data:', eventError);
        throw eventError;
      }

      // Получаем шаблон обратной связи для типа мероприятия
      const { data: templateData, error: templateError } = await supabase
        .from('feedback_templates')
        .select('id, name, description')
        .eq('event_type_id', eventData.event_type_id)
        .eq('is_default', true)
        .limit(1);

      if (templateError) {
        console.error('Error fetching feedback template:', templateError);
        throw templateError;
      }

      // Если шаблон не найден, пропускаем загрузку статистики
      if (!templateData || templateData.length === 0) {
        console.log('No feedback template found for event type:', eventData.event_type_id);
        setFeedbackStats([]);
        setAverageRating(0);
        setTotalSubmissions(0);
        setTextComments([]);
        return;
      }

      const template = templateData[0];

      // Получаем вопросы шаблона
      const { data: questionsData, error: questionsError } = await supabase
        .from('feedback_questions')
        .select('id, question, question_type, required, order_num, options')
        .eq('template_id', template.id)
        .order('order_num');

      if (questionsError) {
        console.error('Error fetching feedback questions:', questionsError);
        throw questionsError;
      }

      // Получаем все заполненные формы обратной связи для мероприятия
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('feedback_submissions')
        .select(`
          id, 
          user_id, 
          overall_rating, 
          comments, 
          is_anonymous,
          users!inner(full_name)
        `)
        .eq('event_id', eventId)
        .eq('template_id', template.id);

      if (submissionsError) {
        console.error('Error fetching feedback submissions:', submissionsError);
        throw submissionsError;
      }

      // Получаем ответы на вопросы
      const { data: answersData, error: answersError } = await supabase
        .from('feedback_answers')
        .select(`
          id, 
          submission_id, 
          question_id, 
          rating_value, 
          text_value, 
          options_value
        `)
        .in('submission_id', submissionsData.map(s => s.id));

      if (answersError) {
        console.error('Error fetching feedback answers:', answersError);
        throw answersError;
      }

      // Получаем данные участников для отображения территорий
      const userIds = submissionsData.map(s => s.user_id);
      const { data: participantsData } = await supabase
        .from('event_participants_view')
        .select('user_id, full_name, territory_name, territory_region')
        .eq('event_id', eventId)
        .in('user_id', userIds);

      // Создаем карту данных участников
      const participantsMap = new Map();
      if (participantsData) {
        participantsData.forEach(p => {
          participantsMap.set(p.user_id, p);
        });
      }

      // Создаем карту ответов по submission_id
      const answersMap = new Map();
      answersData.forEach(answer => {
        if (!answersMap.has(answer.submission_id)) {
          answersMap.set(answer.submission_id, []);
        }
        answersMap.get(answer.submission_id).push(answer);
      });

      // Обрабатываем статистику по вопросам
      const processedStats = questionsData.map(question => {
        const responses: any[] = [];
        let totalRating = 0;
        let ratingCount = 0;

        submissionsData.forEach(submission => {
          const submissionAnswers = answersMap.get(submission.id) || [];
          const questionAnswer = submissionAnswers.find(a => a.question_id === question.id);
          
          if (questionAnswer) {
            let value = null;
            if (question.question_type === 'rating' && questionAnswer.rating_value) {
              value = questionAnswer.rating_value;
              totalRating += value;
              ratingCount++;
            } else if (question.question_type === 'text' && questionAnswer.text_value) {
              value = questionAnswer.text_value;
            } else if (question.question_type === 'options' && questionAnswer.options_value) {
              value = questionAnswer.options_value;
            }

            if (value !== null) {
              const participant = participantsMap.get(submission.user_id);
              responses.push({
                user_id: submission.user_id,
                value: value,
                user_full_name: participant?.full_name || submission.users?.full_name || 'Неизвестный участник',
                user_territory: participant?.territory_name || '',
                user_territory_region: participant?.territory_region || '',
                submission_id: submission.id,
                is_anonymous: submission.is_anonymous
              });
            }
          }
        });

        return {
          question_id: question.id,
          question: question.question,
          question_type: question.question_type,
          required: question.required,
          order_num: question.order_num,
          options: question.options,
          responses: responses,
          average_rating: ratingCount > 0 ? totalRating / ratingCount : null,
          response_count: responses.length
        };
      });

      // Вычисляем общую статистику
      const totalSubmissionsCount = submissionsData.length;
      const overallRatings = submissionsData
        .filter(s => s.overall_rating)
        .map(s => s.overall_rating);
      
      const averageOverallRating = overallRatings.length > 0 
        ? overallRatings.reduce((sum, rating) => sum + rating, 0) / overallRatings.length 
        : 0;

      setFeedbackStats(processedStats);
      setTotalSubmissions(totalSubmissionsCount);
      setAverageRating(averageOverallRating);

      // Собираем текстовые комментарии отдельно
      const allTextComments: any[] = [];
      processedStats.forEach(question => {
        if (question.question_type === 'text') {
          question.responses.forEach((response: any) => {
            allTextComments.push({
              id: `${question.question_id}-${response.submission_id}`,
              ...response,
              question_text: question.question
            });
          });
        }
      });
      setTextComments(allTextComments);

      // Вычисляем процент участников, оставивших отзыв
      const { data: totalParticipantsData } = await supabase
        .from('event_participants_view')
        .select('user_id')
        .eq('event_id', eventId);

      const totalParticipants = totalParticipantsData?.length || 0;
      const completionPercentage = totalParticipants > 0 
        ? Math.round((totalSubmissionsCount / totalParticipants) * 100) 
        : 0;
      
      setCompletionRate(completionPercentage);

    } catch (err) {
      console.error('Error fetching feedback stats:', err);
      setFeedbackStats([]);
      setTotalSubmissions(0);
      setAverageRating(0);
    }
  };

  const handleFeedbackSuccess = () => {
    console.log('Feedback submitted successfully');
    checkFeedbackStatus();
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleRatingClick = (rating: number, participants: any[], question: string) => {
    setSelectedRating({ rating, participants, question });
    setShowParticipantsModal(true);
  };

  // Возвращает процент участников, оставивших отзыв
  const getFeedbackCompletionRate = async () => {
    try {
      // Получаем общее количество участников мероприятия
      const { data: participantsData, error: participantsError } = await supabase
        .from('event_participants_view')
        .select('user_id')
        .eq('event_id', eventId);

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        return 0;
      }

      const totalParticipants = participantsData?.length || 0;
      const feedbackSubmissions = totalSubmissions;

      if (totalParticipants === 0) return 0;
      
      return Math.round((feedbackSubmissions / totalParticipants) * 100);
    } catch (err) {
      console.error('Error calculating feedback completion rate:', err);
      return 0;
    }
  };

  function renderStars(rating: number | null) {
    if (rating == null) return <span className="text-gray-400 text-xs sm:text-sm">Нет оценок</span>;
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    return (
      <div className="flex items-center gap-0.5">
        {Array(full).fill(0).map((_, i) => (
          <svg key={i} className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        {half && (
          <svg className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 fill-current opacity-75" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )}
        {Array(empty).fill(0).map((_, i) => (
          <svg key={i+10} className="h-3 w-3 sm:h-4 sm:w-4 text-gray-300" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  }

  function getInitials(name: string | undefined): string {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '';
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function getUserColor(userId: string | undefined): string {
    if (!userId) return 'bg-gray-100 text-gray-800';
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-yellow-100 text-yellow-800',
      'bg-indigo-100 text-indigo-800',
      'bg-red-100 text-red-800',
      'bg-orange-100 text-orange-800',
      'bg-teal-100 text-teal-800',
    ];
    const sum = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[sum % colors.length];
  }

  function renderRatingDistribution(question: any) {
    if (!question.responses || question.responses.length === 0) return null;
    // Подсчитываем количество каждой оценки
    const ratings: { [key: number]: any[] } = {1: [], 2: [], 3: [], 4: [], 5: []};
    (question.responses as any[]).forEach((response: any) => {
      if (response.value >= 1 && response.value <= 5) {
        ratings[response.value].push(response);
      }
    });
    const totalResponses = (question.responses as any[]).length;
    
    return (
      <div className="space-y-1">
        {Object.entries(ratings).reverse().map(([rating, responses]) => {
          const respArr = responses as any[];
          const count = respArr.length;
          const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
          
          return (
            <div 
              key={rating} 
              className="flex items-center gap-2 p-1 rounded hover:bg-gray-50 cursor-pointer transition-colors duration-200 touch-manipulation"
              onClick={() => handleRatingClick(parseInt(rating), respArr, question.question)}
            >
              <span className="text-xs sm:text-sm text-gray-600 w-3 sm:w-4">{rating}</span>
              <div className="flex-1">
                <div className="h-1.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={clsx(
                      "h-full rounded-full",
                      rating === '5' ? "bg-green-500" :
                      rating === '4' ? "bg-blue-500" :
                      rating === '3' ? "bg-yellow-500" :
                      rating === '2' ? "bg-orange-500" :
                      "bg-red-500"
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 min-w-[50px] sm:min-w-[60px] justify-end">
                <span className="text-xs sm:text-sm font-medium text-gray-900">{count}</span>
                <span className="text-xs text-gray-500">({percentage.toFixed(0)}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  console.log('FeedbackTab render:', {
    loading,
    error,
    feedbackStatus,
    showFeedbackForm,
    isTrainer,
    userProfile: userProfile?.role
  });

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 animate-pulse">
        <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/3 mb-3 sm:mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {[1,2,3].map(i => (
            <div key={i} className="bg-gray-100 rounded-xl h-20 sm:h-24 animate-pulse shadow flex flex-col items-center justify-center">
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-gray-200 rounded-full mb-2" />
              <div className="h-3 w-12 sm:w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="h-8 sm:h-10 bg-gray-200 rounded w-32 sm:w-40 mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6">
        <h3 className="text-red-800 font-medium mb-2 text-sm sm:text-base">Ошибка</h3>
        <p className="text-red-600 text-xs sm:text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Заголовок с возможностью сворачивания */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900">Обратная связь</h3>
              <p className="text-xs sm:text-sm text-gray-400">
                {isTrainer
                  ? "Отзывы участников о качестве проведенного мероприятия"
                  : "Поделитесь вашим мнением о прошедшем мероприятии"}
              </p>
            </div>
            
            <button 
              className="px-4 py-2 bg-[#06A478] text-white rounded-lg text-sm font-medium hover:bg-[#059669] transition-colors"
              onClick={() => setIsFeedbackExpanded(!isFeedbackExpanded)}
            >
              Открыть
            </button>
          </div>
        </div>

        {/* Содержимое секции */}
        {isFeedbackExpanded && (
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Информация о статусе обратной связи для обычных пользователей */}
        {!isTrainer && (
        <div className={clsx(
          "p-4 sm:p-6 rounded-xl border border-gray-200 transition-all duration-200",
          feedbackStatus.hasSubmittedFeedback
            ? "bg-green-50 border-green-200"
            : feedbackStatus.canSubmitFeedback
              ? "bg-blue-50 border-blue-200"
              : "bg-amber-50 border-amber-200"
        )}>
          {feedbackStatus.hasSubmittedFeedback ? (
            <div className="flex items-center">
              <div className="p-1.5 sm:p-2 rounded-full mr-3 sm:mr-4" style={{ backgroundColor: '#10B981' }}>
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-base sm:text-lg">
                  Спасибо за вашу обратную связь!
                </p>
                <p className="text-gray-600 text-xs sm:text-sm mt-1">
                  Ваш отзыв очень важен для нас и поможет улучшить качество обучения.
                </p>
              </div>
            </div>
          ) : feedbackStatus.canSubmitFeedback ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center">
                <div className="p-1.5 sm:p-2 rounded-full mr-3 sm:mr-4" style={{ backgroundColor: '#06A478' }}>
                  <Star className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <p className="text-gray-900 font-semibold text-base sm:text-lg">
                    Готовы поделиться мнением?
                  </p>
                  <p className="text-gray-600 text-xs sm:text-sm mt-1">
                    Вы можете оставить обратную связь по этому мероприятию. Пожалуйста, поделитесь своим мнением.
                  </p>
                </div>
              </div>
              {/* Кнопка "Оставить отзыв" на одном уровне с текстом */}
              <div className="flex justify-end sm:justify-start">
                <button
                  onClick={() => {
                    console.log('Feedback button clicked');
                    console.log('Current status:', feedbackStatus);
                    console.log('isTrainer:', isTrainer);
                    setShowFeedbackForm(true);
                  }}
                  disabled={!feedbackStatus.canSubmitFeedback}
                  className={clsx(
                    "flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 touch-manipulation min-h-[48px] rounded-lg shadow-sm w-full sm:w-auto",
                    feedbackStatus.canSubmitFeedback
                      ? "bg-[#06A478] hover:bg-[#059669] active:bg-[#047857] text-white hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  )}
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Оставить отзыв</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <div className="p-1.5 sm:p-2 rounded-full mr-3 sm:mr-4" style={{ backgroundColor: '#F59E0B' }}>
                <Award className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-base sm:text-lg">
                  Необходимо пройти тесты
                </p>
                <p className="text-gray-600 text-xs sm:text-sm mt-1">
                  {feedbackStatus.reasonDisabled || "Для заполнения обратной связи необходимо пройти входной и финальный тесты."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

        {/* Статистика обратной связи для тренеров и администраторов */}
        {isTrainer && feedbackStats.length > 0 && totalSubmissions > 0 && (
          <div className="space-y-3 sm:space-y-4">
            {/* Общая статистика */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg" style={{ backgroundColor: '#06A47820' }}>
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#06A478' }} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Общая статистика</h3>
                </div>
                <div className="text-xs sm:text-sm font-medium" style={{ color: '#06A478' }}>
                  {completionRate}% участников оставили отзыв
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg" style={{ backgroundColor: '#06A47815' }}>
                      <Users className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: '#06A478' }} />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Всего отзывов</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalSubmissions}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg" style={{ backgroundColor: '#06A47815' }}>
                      <Star className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: '#06A478' }} />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Средняя оценка</p>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">{averageRating.toFixed(1)}</p>
                        {renderStars(averageRating)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg" style={{ backgroundColor: '#06A47815' }}>
                      <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: '#06A478' }} />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Комментарии</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{textComments.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Детальная статистика по вопросам */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
              {feedbackStats.filter(q => q.question_type !== 'text' && q.response_count > 0).map((q, idx) => (
                <div key={q.question_id || idx} className="bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3">
                  <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                    <h4 className="text-gray-900 font-medium text-sm sm:text-base leading-tight pr-2 flex-1">{q.question}</h4>
                    <div className="flex items-center gap-1 text-gray-500 text-xs sm:text-sm">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{q.response_count}</span>
                    </div>
                  </div>
                  
                  {q.question_type === 'rating' && (
                    <>
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        {renderStars(q.average_rating)}
                        <span className="text-sm sm:text-base font-semibold text-gray-900">{q.average_rating?.toFixed(1) || '0.0'}</span>
                      </div>
                      
                      {/* Компактное распределение оценок */}
                      {renderRatingDistribution(q)}
                    </>
                  )}
                  

                  
                  {q.question_type === 'options' && (
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="text-xs sm:text-sm text-gray-600">
                        Выбрано вариантов: <span className="font-semibold text-gray-900">{q.response_count}</span>
                      </div>
                      {q.options && (
                        <div className="text-xs text-gray-600">
                          Доступно: {q.options.split(',').length} вариантов
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Комментарии и предложения */}
            {textComments.length > 0 && (
              <div className="mt-4 sm:mt-6">
                <FeedbackComments comments={textComments} />
              </div>
            )}

          </div>
        )}

        {/* Сообщение о том, что нет данных обратной связи для тренеров */}
        {isTrainer && (feedbackStats.length === 0 || totalSubmissions === 0) && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 sm:p-8 border border-blue-200 shadow-sm">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3">
                Обратная связь пока не получена
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto">
                Участники еще не оставили отзывы о мероприятии. После получения обратной связи здесь появится детальная статистика с оценками и комментариями.
              </p>
            </div>
          </div>
        )}
          </div>
        )}
      </div>

      {/* Модальное окно с формой обратной связи */}
      {showFeedbackForm && (
        <FeedbackForm
          eventId={eventId}
          onClose={() => {
            console.log('Closing feedback form');
            setShowFeedbackForm(false);
          }}
          onSuccess={handleFeedbackSuccess}
        />
      )}

      {/* Всплывающее сообщение об успешной отправке отзыва */}
      {success && (
        <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-lg text-base sm:text-lg font-semibold z-50 animate-fade-in" style={{ backgroundColor: '#10B981' }}>
          <div className="flex items-center gap-2 sm:gap-3">
            <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            <span>Спасибо за ваш отзыв!</span>
          </div>
        </div>
      )}

      {/* Модальное окно со списком участников */}
      {showParticipantsModal && selectedRating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm sm:max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Оценка {selectedRating.rating} звезд
                </h3>
                <button
                  onClick={() => setShowParticipantsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">{selectedRating.question}</p>
            </div>
            
            <div className="p-3 sm:p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-2">
                {selectedRating.participants.map((participant: any, index: number) => (
                  <div key={participant.user_id || index} className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm text-white"
                      style={{ backgroundColor: getUserColor(participant.user_id).includes('bg-blue') ? '#3B82F6' : 
                               getUserColor(participant.user_id).includes('bg-green') ? '#10B981' :
                               getUserColor(participant.user_id).includes('bg-purple') ? '#8B5CF6' :
                               getUserColor(participant.user_id).includes('bg-pink') ? '#EC4899' :
                               getUserColor(participant.user_id).includes('bg-yellow') ? '#F59E0B' :
                               getUserColor(participant.user_id).includes('bg-indigo') ? '#6366F1' :
                               getUserColor(participant.user_id).includes('bg-red') ? '#EF4444' :
                               getUserColor(participant.user_id).includes('bg-orange') ? '#F97316' :
                               getUserColor(participant.user_id).includes('bg-teal') ? '#14B8A6' : '#6B7280' }}
                    >
                      {getInitials(participant.user_full_name)}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-900">
                        {participant.user_full_name || 'Неизвестный участник'}
                      </p>
                                             <div className="text-xs text-gray-500 space-y-0.5">
                         {participant.user_territory && (
                           <p>Филиал: {participant.user_territory}</p>
                         )}
                         {participant.user_territory_region && (
                           <p>Регион: {participant.user_territory_region}</p>
                         )}
                         {!participant.user_territory && !participant.user_territory_region && (
                           <p>ID: {participant.user_id}</p>
                         )}
                       </div>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-3 h-3 sm:w-4 sm:h-4 ${i < selectedRating.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs sm:text-sm text-gray-600 text-center">
                Всего участников: {selectedRating.participants.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}