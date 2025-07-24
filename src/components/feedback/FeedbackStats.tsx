import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Star, BarChart, User, Calendar, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import { clsx } from 'clsx';

interface FeedbackStatsProps {
  eventId: string;
}

interface FeedbackQuestion {
  question_id: string;
  question: string;
  question_type: string;
  average_rating: number | null;
  response_count: number;
  responses: Array<{
    value: number;
    user_id: string;
    submission_id: string;
    submitted_at: string;
  }>;
}

interface EventParticipant {
  id: string;
  user_id: string;
  full_name: string;
  feedback_submitted: boolean;
}

export function FeedbackStats({ eventId }: FeedbackStatsProps) {
  const { userProfile } = useAuth();
  const [feedbackStats, setFeedbackStats] = useState<FeedbackQuestion[]>([]);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  
  // Определяем, является ли пользователь участником (employee)
  const isEmployee = userProfile?.role === 'employee';
  
  // Если пользователь является участником, не показываем компонент
  if (isEmployee) {
    return null;
  }

  useEffect(() => {
    fetchFeedbackData();
  }, [eventId]);

  const fetchFeedbackData = async () => {
    setLoading(true);
    try {
      // Получаем статистику обратной связи
      const { data, error } = await supabase.rpc('get_event_feedback_stats', {
        p_event_id: eventId
      });

      if (error) throw error;
      
      setFeedbackStats(data || []);
      
      // Вычисляем общую статистику
      if (data && data.length > 0) {
        const ratingQuestions = data.filter(q => 
          q.question_type === 'rating' && q.average_rating !== null
        );
        
        if (ratingQuestions.length > 0) {
          const totalRating = ratingQuestions.reduce(
            (sum, q) => sum + (q.average_rating || 0), 0
          );
          setAverageRating(Math.round((totalRating / ratingQuestions.length) * 10) / 10);
        }
        
        if (data[0]?.responses) {
          const uniqueSubmissionIds = new Set();
          data.forEach(q => 
            q.responses.forEach(r => uniqueSubmissionIds.add(r.submission_id))
          );
          setTotalSubmissions(uniqueSubmissionIds.size);
        }
      }

      // Получаем участников мероприятия
      const { data: participantsData, error: participantsError } = await supabase
        .from('event_participants')
        .select(`
          id,
          user_id,
          feedback_submitted,
          user:user_id(
            id,
            full_name
          )
        `)
        .eq('event_id', eventId)
        .eq('attended', true);

      if (participantsError) throw participantsError;
      
      setParticipants(
        (participantsData || []).map(p => ({
          id: p.id,
          user_id: p.user_id,
          full_name: p.user?.full_name || 'Неизвестный пользователь',
          feedback_submitted: p.feedback_submitted
        }))
      );

    } catch (err) {
      console.error('Error fetching feedback stats:', err);
      setError('Не удалось загрузить статистику обратной связи');
    } finally {
      setLoading(false);
    }
  };

  // Генерируем процент участников, заполнивших обратную связь
  const getFeedbackCompletionRate = () => {
    if (participants.length === 0) return 0;
    const submittedCount = participants.filter(p => p.feedback_submitted).length;
    return Math.round((submittedCount / participants.length) * 100);
  };

  // Рендерим звезды для средней оценки
  const renderStars = (rating: number | null) => {
    if (rating === null) return null;
    
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
        ))}
        {hasHalfStar && (
          <span className="relative">
            <Star className="w-5 h-5 text-gray-300 fill-gray-300" />
            <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            </div>
          </span>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className="w-5 h-5 text-gray-300" />
        ))}
        <span className="ml-2 font-medium text-gray-700">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Рендерим прогресс-бар для распределения оценок
  const renderRatingDistribution = (question: FeedbackQuestion) => {
    if (!question.responses || question.responses.length === 0) return null;
    
    // Подсчитываем количество каждой оценки
    const ratings = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    question.responses.forEach(response => {
      if (response.value >= 1 && response.value <= 5) {
        ratings[response.value as 1|2|3|4|5]++;
      }
    });
    
    const totalResponses = question.responses.length;
    
    return (
      <div className="mt-2 space-y-1">
        {Object.entries(ratings).map(([rating, count]) => {
          const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
          return (
            <div key={rating} className="flex items-center text-xs">
              <span className="w-6 text-gray-600">{rating}</span>
              <div className="flex-1 mx-2 h-2 bg-gray-200 rounded-full overflow-hidden">
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
              <span className="w-8 text-right text-gray-600">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-md space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="text-red-800 font-medium mb-2">Ошибка загрузки статистики</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (feedbackStats.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-md">
        <div className="text-center py-6">
          <BarChart className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Обратная связь отсутствует</h3>
          <p className="text-gray-600">
            Участники пока не оставили обратной связи по мероприятию.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-700 font-medium">Общая оценка</h3>
            <div className="text-yellow-500">
              <Star className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center">
              {renderStars(averageRating)}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Средний балл по всем критериям
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-700 font-medium">Обратная связь</h3>
            <div className="text-blue-500">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-gray-900">{getFeedbackCompletionRate()}%</div>
            <p className="text-sm text-gray-500">
              Участников оставили обратную связь
              <span className="ml-1 text-blue-600 font-medium">
                ({participants.filter(p => p.feedback_submitted).length} из {participants.length})
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-700 font-medium">Отзывы</h3>
            <div className="text-green-500">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-gray-900">{totalSubmissions}</div>
            <p className="text-sm text-gray-500">
              Всего получено отзывов
            </p>
          </div>
        </div>
      </div>

      {/* Детальная статистика по вопросам */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Оценка по критериям</h3>
        </div>
        <div className="p-6 space-y-8">
          {feedbackStats
            .filter(q => q.question_type === 'rating')
            .map((question) => (
              <div key={question.question_id} className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-gray-900 font-medium">{question.question}</h4>
                    <div className="mt-1">
                      {renderStars(question.average_rating)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500">
                      {question.response_count} ответов
                    </span>
                  </div>
                </div>
                {renderRatingDistribution(question)}
              </div>
            ))}
        </div>
      </div>

      {/* Список участников и их статус */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Статус обратной связи от участников</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Участник
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {participants.map(participant => (
                <tr key={participant.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {participant.full_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {participant.feedback_submitted ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Заполнено
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Не заполнено
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {participants.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-10 text-center text-gray-500">
                    Нет участников
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}