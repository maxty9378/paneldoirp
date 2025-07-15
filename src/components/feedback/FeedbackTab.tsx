import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { MessageSquare, CheckCircle, PlusCircle, StarIcon, BarChart } from 'lucide-react';
import { FeedbackForm } from './FeedbackForm';
import { FeedbackStats } from './FeedbackStats';
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
    canSubmitFeedback: false,
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
    if (eventId && userProfile?.id) {
      checkFeedbackStatus();
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
      // Проверяем, заполнил ли пользователь уже обратную связь
      const { data: submissions, error: submissionsError } = await supabase
        .from('feedback_submissions')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userProfile?.id)
        .maybeSingle();

      if (submissionsError) throw submissionsError;
      
      const hasSubmitted = !!submissions;

      // Если администратор или тренер, они всегда могут просматривать статистику
      if (isTrainer) {
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

      if (error) throw error;

      let reasonText = null;
      if (!data && !hasSubmitted) {
        reasonText = "Для заполнения обратной связи необходимо успешно пройти входной и финальный тесты";
      } else if (hasSubmitted) {
        reasonText = "Вы уже отправили обратную связь";
      }

      setFeedbackStatus({
        canSubmitFeedback: data && !hasSubmitted,
        hasSubmittedFeedback: hasSubmitted,
        reasonDisabled: reasonText
      });
    } catch (err) {
      console.error('Error checking feedback status:', err);
      setError('Не удалось проверить статус обратной связи');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbackStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_event_feedback_stats', {
        p_event_id: eventId
      });
      if (error) throw error;
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
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', Array.from(userIds));
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
      setFeedbackStats([]);
    }
  };

  const handleFeedbackSuccess = () => {
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
        {Array(full).fill(0).map((_, i) => <StarIcon key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />)}
        {half && <StarIcon className="h-5 w-5 text-yellow-400 fill-yellow-400 opacity-50" />}
        {Array(empty).fill(0).map((_, i) => <StarIcon key={i+10} className="h-5 w-5 text-gray-200" />)}
        <span className="ml-2 font-medium text-gray-700">{rating.toFixed(1)}</span>
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
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6 font-mabry">
      {/* Заголовок с действиями */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
            Обратная связь
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            {isTrainer
              ? "Отзывы участников о качестве проведенного мероприятия"
              : "Поделитесь вашим мнением о прошедшем мероприятии"}
          </p>
        </div>
        
        {(!isTrainer || feedbackStatus.canSubmitFeedback) && (
          <button
            onClick={() => setShowFeedbackForm(true)}
            disabled={!feedbackStatus.canSubmitFeedback && !isTrainer}
            className={clsx(
              "inline-flex items-center px-4 py-2 rounded-lg text-base font-semibold shadow transition-all duration-200",
              feedbackStatus.canSubmitFeedback || isTrainer
                ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800 hover:shadow-lg"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            )}
          >
            {feedbackStatus.hasSubmittedFeedback ? null : (
              <>
                <PlusCircle className="h-4 w-4 mr-2" />
                <span>Оставить отзыв</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Информация о статусе обратной связи для обычных пользователей */}
      {!isTrainer && (
        <div className={clsx(
          "p-4 rounded-lg",
          feedbackStatus.hasSubmittedFeedback
            ? "bg-green-50 border border-green-200"
            : feedbackStatus.canSubmitFeedback
              ? "bg-blue-50 border border-blue-200"
              : "bg-yellow-50 border border-yellow-200"
        )}>
          {feedbackStatus.hasSubmittedFeedback ? (
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-700">
                Спасибо за вашу обратную связь! Ваш отзыв очень важен для нас.
              </p>
            </div>
          ) : feedbackStatus.canSubmitFeedback ? (
            <div className="flex items-center">
              <StarIcon className="h-5 w-5 text-blue-600 mr-2" />
              <p className="text-blue-700">
                Вы можете оставить обратную связь по этому мероприятию. Пожалуйста, поделитесь своим мнением.
              </p>
            </div>
          ) : (
            <div className="flex items-center">
              <StarIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-yellow-700">
                {feedbackStatus.reasonDisabled || "Для отправки обратной связи необходимо успешно пройти входной и финальный тесты."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Статистика обратной связи для тренеров и администраторов */}
      {isTrainer && feedbackStats.length > 0 && (
        <div className="my-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика по вопросам обратной связи</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feedbackStats.filter(q => q.question_type === 'rating').map((q, idx) => (
              <div key={q.question_id || idx} className="bg-white rounded-xl shadow-lg p-6 flex flex-col mb-2">
                <div className="text-gray-900 font-medium mb-2">{q.question}</div>
                <div className="flex items-center mb-2">
                  {renderStars(q.average_rating)}
                  <span className="ml-3 text-gray-500 text-sm">{q.response_count} ответ(ов)</span>
                </div>
                {/* Распределение оценок */}
                {renderRatingDistribution(q)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Модальное окно с формой обратной связи */}
      {showFeedbackForm && (
        <FeedbackForm
          eventId={eventId}
          onClose={() => setShowFeedbackForm(false)}
          onSuccess={handleFeedbackSuccess}
        />
      )}

      {/* Всплывающее сообщение об успешной отправке отзыва */}
      {success && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg text-lg font-semibold z-50 animate-fade-in">
          Спасибо за ваш отзыв!
        </div>
      )}
    </div>
  );
}