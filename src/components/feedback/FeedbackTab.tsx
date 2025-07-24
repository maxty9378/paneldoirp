import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { MessageSquare, CheckCircle, PlusCircle, Star, BarChart, Users, TrendingUp, Award } from 'lucide-react';
import { FeedbackForm } from './FeedbackForm';
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

  const isAdmin = adminStatOnly || (userProfile?.role === 'administrator' || userProfile?.role === 'moderator');
  const isTrainer = adminStatOnly || userProfile?.role === 'trainer' || isAdmin;

  useEffect(() => {
    console.log('useEffect triggered:', { eventId, userId: userProfile?.id, userProfile });
    if (eventId && userProfile?.id) {
      checkFeedbackStatus();
    } else if (eventId && !userProfile?.id) {
      console.log('User profile not loaded yet');
    }
  }, [eventId, userProfile?.id]);

  useEffect(() => {
    if (isTrainer && eventId) {
      fetchFeedbackStats();
    }
  }, [isTrainer, eventId]);

  useEffect(() => {
    console.log('FeedbackTab: feedbackStats', feedbackStats, 'averageRating', averageRating);
  }, [feedbackStats, averageRating]);

  const checkFeedbackStatus = async () => {
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
  };

  const fetchFeedbackStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_event_feedback_stats', {
        p_event_id: eventId
      });
      if (error) {
        console.error('Error fetching feedback stats:', error);
        throw error;
      }
      // Получаем имена пользователей
      if (data && data.length > 0) {
        const userIds = new Set<string>();
        data.forEach((question: any) => {
          if (question.responses) {
            question.responses.forEach((response: any) => {
              if (response.user_id) {
                userIds.add(response.user_id);
              }
            });
          }
        });
        // Создаем карту id -> full_name
        const userNamesMap: Record<string, string> = {};
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', Array.from(userIds));
        
        if (usersError) {
          console.error('Error fetching user names:', usersError);
          // Продолжаем без имен пользователей
        }
        usersData?.forEach((user: any) => {
          userNamesMap[user.id] = user.full_name || '';
        });
        // Добавляем имена в данные ответов
        data.forEach((question: any) => {
          if (question.responses) {
            question.responses.forEach((response: any) => {
              if (response.user_id && userNamesMap[response.user_id]) {
                response.user_full_name = userNamesMap[response.user_id];
              }
            });
          }
        });
      }
      setFeedbackStats(data || []);
    } catch (err) {
      console.error('Error fetching feedback stats:', err);
      setFeedbackStats([]);
    }
  };

  const handleFeedbackSuccess = () => {
    console.log('Feedback submitted successfully');
    checkFeedbackStatus();
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  // Возвращает процент участников, оставивших отзыв (заглушка, если нет данных о количестве участников)
  const getFeedbackCompletionRate = () => {
    // Если потребуется — можно добавить загрузку участников и считать процент
    return 0;
  };

  function renderStars(rating: number | null) {
    if (rating == null) return <span className="text-gray-400">Нет оценок</span>;
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    return (
      <span className="flex items-center">
        {Array(full).fill(0).map((_, i) => <Star key={i} className="h-5 w-5" style={{ color: '#F59E0B', fill: '#F59E0B' }} />)}
        {half && <Star className="h-5 w-5 opacity-50" style={{ color: '#F59E0B', fill: '#F59E0B' }} />}
        {Array(empty).fill(0).map((_, i) => <Star key={i+10} className="h-5 w-5 text-gray-200" />)}
        <span className="ml-3 font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-full text-sm">{rating.toFixed(1)}</span>
      </span>
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
    // Подсчитываем количество каждой оценки и кто поставил
    const ratings: { [key: number]: any[] } = {1: [], 2: [], 3: [], 4: [], 5: []};
    (question.responses as any[]).forEach((response: any) => {
      if (response.value >= 1 && response.value <= 5) {
        ratings[response.value].push(response);
      }
    });
    const totalResponses = (question.responses as any[]).length;
    return (
      <div className="mt-2 space-y-2">
        {Object.entries(ratings).reverse().map(([rating, responses]) => {
          const respArr = responses as any[];
          const count = respArr.length;
          const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
          return (
            <div key={rating} className="mb-1">
              <div className="flex items-center text-xs mb-1">
                <span className="w-6 text-gray-600 font-bold">{rating}</span>
                <div className="flex-1 mx-2 relative">
                  {/* Прогресс-бар */}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
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
                  {/* Аватарки поверх полоски */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center w-full pointer-events-none pl-8" style={{ zIndex: 2 }}>
                    {respArr.map((resp: any, i: number) => {
                      const initials = resp.user_full_name
                        ? getInitials(resp.user_full_name)
                        : (resp.user_id ? resp.user_id.substring(0, 2).toUpperCase() : 'U');
                      return (
                        <div
                          key={resp.user_id || i}
                          className={clsx(
                            "inline-flex items-center justify-center w-8 h-8 rounded-full font-medium text-xs shadow border-2 border-white backdrop-blur bg-white/70",
                            getUserColor(resp.user_id),
                            i !== 0 && "-ml-3"
                          )}
                          title={resp.user_full_name || resp.user_id || 'Пользователь'}
                          style={{ pointerEvents: 'auto' }}
                        >
                          {initials}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <span className="w-8 text-right text-gray-600">{count}</span>
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
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1,2,3].map(i => (
            <div key={i} className="bg-gray-100 rounded-xl h-24 animate-pulse shadow flex flex-col items-center justify-center">
              <div className="h-8 w-8 bg-gray-200 rounded-full mb-2" />
              <div className="h-4 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="h-10 bg-gray-200 rounded w-40 mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="text-red-800 font-medium mb-2">Ошибка</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Заголовок */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex-1">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                Обратная связь
              </h2>
              <p className="text-gray-600 text-sm mt-1 font-medium">
                {isTrainer
                  ? "Отзывы участников о качестве проведенного мероприятия"
                  : "Поделитесь вашим мнением о прошедшем мероприятии"}
              </p>
            </div>
          </div>
          
          {!feedbackStatus.hasSubmittedFeedback && (
            <button
              onClick={() => {
                console.log('Feedback button clicked');
                console.log('Current status:', feedbackStatus);
                console.log('isTrainer:', isTrainer);
                setShowFeedbackForm(true);
              }}
              disabled={!feedbackStatus.canSubmitFeedback && !isTrainer}
              className={clsx(
                "inline-flex items-center px-6 py-3 rounded-xl text-base font-semibold transition-all duration-200",
                (feedbackStatus.canSubmitFeedback || isTrainer)
                  ? "text-white shadow-md hover:shadow-lg"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
              style={(feedbackStatus.canSubmitFeedback || isTrainer) ? { backgroundColor: '#06A478' } : {}}
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              <span>Оставить отзыв</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Информация о статусе обратной связи для обычных пользователей */}
        {!isTrainer && (
        <div className={clsx(
          "p-6 rounded-xl border border-gray-200 transition-all duration-200",
          feedbackStatus.hasSubmittedFeedback
            ? "bg-green-50 border-green-200"
            : feedbackStatus.canSubmitFeedback
              ? "bg-blue-50 border-blue-200"
              : "bg-amber-50 border-amber-200"
        )}>
          {feedbackStatus.hasSubmittedFeedback ? (
            <div className="flex items-center">
              <div className="p-2 rounded-full mr-4" style={{ backgroundColor: '#10B981' }}>
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-lg">
                  Спасибо за вашу обратную связь!
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  Ваш отзыв очень важен для нас и поможет улучшить качество обучения.
                </p>
              </div>
            </div>
          ) : feedbackStatus.canSubmitFeedback ? (
            <div className="flex items-center">
              <div className="p-2 rounded-full mr-4" style={{ backgroundColor: '#06A478' }}>
                <Star className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-lg">
                  Готовы поделиться мнением?
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  Вы можете оставить обратную связь по этому мероприятию. Пожалуйста, поделитесь своим мнением.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <div className="p-2 rounded-full mr-4" style={{ backgroundColor: '#F59E0B' }}>
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-lg">
                  Необходимо пройти тесты
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  {feedbackStatus.reasonDisabled || "Для заполнения обратной связи необходимо пройти входной и финальный тесты."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

        {/* Статистика обратной связи для тренеров и администраторов */}
        {isTrainer && feedbackStats.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#06A478' }}>
                <BarChart className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Статистика по вопросам обратной связи</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {feedbackStats.filter(q => q.question_type === 'rating').map((q, idx) => (
                <div key={q.question_id || idx} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                  <div className="text-gray-900 font-semibold text-lg mb-4">{q.question}</div>
                  <div className="flex items-center justify-between mb-4">
                    {renderStars(q.average_rating)}
                    <div className="flex items-center gap-2 text-gray-500">
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">{q.response_count} ответ(ов)</span>
                    </div>
                  </div>
                  {/* Распределение оценок */}
                  {renderRatingDistribution(q)}
                </div>
              ))}
            </div>
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
        <div className="fixed bottom-6 right-6 text-white px-6 py-4 rounded-xl shadow-lg text-lg font-semibold z-50 animate-fade-in" style={{ backgroundColor: '#10B981' }}>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6" />
            <span>Спасибо за ваш отзыв!</span>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}