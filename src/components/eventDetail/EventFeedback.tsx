import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { 
  Star, 
  MessageSquare, 
  BarChart3, 
  Users, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  Award
} from 'lucide-react';

const CORPORATE_GREEN = '#06A478';

interface FeedbackSubmission {
  id: string;
  user_id: string;
  overall_rating: number;
  comments: string;
  submitted_at: string;
  is_anonymous: boolean;
  user?: {
    full_name: string;
  };
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

export function EventFeedback({ event, feedback, onAction }: { event: any; feedback: any; onAction?: any }) {
  const { userProfile } = useAuth();
  const [feedbackStats, setFeedbackStats] = useState<FeedbackQuestion[]>([]);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  
  const isAdmin = userProfile?.role && ['administrator', 'moderator', 'trainer', 'expert'].includes(userProfile.role);
  
  // Определяем, является ли пользователь участником (employee)
  const isEmployee = userProfile?.role === 'employee';
  
  // Если пользователь является участником, не показываем компонент
  if (isEmployee) {
    return null;
  }

  useEffect(() => {
    if (event?.id) {
      fetchFeedbackData();
    }
  }, [event?.id]);

  const fetchFeedbackData = async () => {
    setLoading(true);
    try {
      // Получаем статистику обратной связи
      const { data: statsData, error: statsError } = await supabase.rpc('get_event_feedback_stats', {
        p_event_id: event.id
      });

      if (statsError) throw statsError;
      setFeedbackStats(statsData || []);
      
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
        .eq('event_id', event.id)
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

      // Получаем все отзывы
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('feedback_submissions')
        .select(`
          id,
          user_id,
          overall_rating,
          comments,
          submitted_at,
          is_anonymous,
          user:user_id(
            full_name
          )
        `)
        .eq('event_id', event.id)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;
      setSubmissions(submissionsData || []);

    } catch (err) {
      console.error('Ошибка при загрузке обратной связи:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchFeedbackData();
  };

  // Вычисляем общую статистику
  const totalSubmissions = submissions.length;
  const averageRating = feedbackStats.length > 0 
    ? Math.round((feedbackStats.reduce((sum, q) => sum + (q.average_rating || 0), 0) / feedbackStats.length) * 10) / 10
    : 0;
  
  const feedbackCompletionRate = participants.length > 0 
    ? Math.round((participants.filter(p => p.feedback_submitted).length / participants.length) * 100)
    : 0;

  const positiveComments = submissions.filter(s => s.overall_rating >= 4).length;
  const negativeComments = submissions.filter(s => s.overall_rating <= 2).length;

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5'
    };

    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderRatingDistribution = (question: FeedbackQuestion) => {
    if (question.question_type !== 'rating' || !question.responses) return null;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    question.responses.forEach(r => {
      if (r.value >= 1 && r.value <= 5) {
        distribution[r.value as keyof typeof distribution]++;
      }
    });

    const maxCount = Math.max(...Object.values(distribution));

    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => (
          <div key={rating} className="flex items-center gap-2">
            <div className="flex items-center gap-1 min-w-[60px]">
              <span className="text-xs font-medium text-gray-600">{rating}</span>
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
            </div>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: maxCount > 0 ? `${(distribution[rating as keyof typeof distribution] / maxCount) * 100}%` : '0%'
                }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600 min-w-[20px]">
              {distribution[rating as keyof typeof distribution]}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: CORPORATE_GREEN }}></div>
          <span className="ml-3 text-gray-600">Загрузка обратной связи...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-8 text-red-500">
          <XCircle className="w-12 h-12 mx-auto mb-3" />
          <div className="text-lg font-semibold mb-2">Ошибка загрузки</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Заголовок с возможностью сворачивания */}
      <div 
        className="px-6 py-4 border-b border-gray-100 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <MessageSquare className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Обратная связь участников</h2>
                <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    {averageRating.toFixed(1)} из 5
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {totalSubmissions} отзывов
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    {feedbackCompletionRate}% заполнили
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                refreshData();
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              title="Обновить данные"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Содержимое */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Общая статистика */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500 rounded-lg">
                  <Star className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-700">{averageRating.toFixed(1)}</div>
                  <div className="text-sm text-yellow-600">Средняя оценка</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-700">{totalSubmissions}</div>
                  <div className="text-sm text-blue-600">Всего отзывов</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <ThumbsUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-700">{positiveComments}</div>
                  <div className="text-sm text-green-600">Положительных</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-700">{feedbackCompletionRate}%</div>
                  <div className="text-sm text-purple-600">Заполнили форму</div>
                </div>
              </div>
            </div>
          </div>

          {/* Детальная статистика по вопросам */}
          {feedbackStats.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" style={{ color: CORPORATE_GREEN }} />
                Детальная статистика
              </h3>
              <div className="space-y-6">
                {feedbackStats.map((question) => (
                  <div key={question.question_id} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-gray-900 flex-1">{question.question}</h4>
                      {question.question_type === 'rating' && question.average_rating && (
                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-lg font-bold text-gray-900">
                            {question.average_rating.toFixed(1)}
                          </span>
                          {renderStars(Math.round(question.average_rating), 'sm')}
                        </div>
                      )}
                    </div>
                    
                    {question.question_type === 'rating' && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-600 mb-2">Распределение оценок</div>
                          {renderRatingDistribution(question)}
                        </div>
                        <div className="flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-gray-900 mb-1">
                              {question.response_count}
                            </div>
                            <div className="text-sm text-gray-600">ответов</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Отзывы участников */}
          {submissions.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" style={{ color: CORPORATE_GREEN }} />
                Отзывы участников ({submissions.length})
              </h3>
              
              <div className="space-y-4">
                {(showAllComments ? submissions : submissions.slice(0, 3)).map((submission) => (
                  <div key={submission.id} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-semibold shadow-sm"
                          style={{ backgroundColor: CORPORATE_GREEN }}
                        >
                          {submission.is_anonymous 
                            ? 'А' 
                            : (submission.user?.full_name || 'Н').charAt(0).toUpperCase()
                          }
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {submission.is_anonymous ? 'Анонимный участник' : submission.user?.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(submission.submitted_at)}
                          </div>
                        </div>
                      </div>
                      
                      {submission.overall_rating && (
                        <div className="flex items-center gap-2">
                          {renderStars(submission.overall_rating)}
                          <span className="text-sm font-medium text-gray-600">
                            {submission.overall_rating}/5
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {submission.comments && (
                      <div className="text-gray-700 leading-relaxed">
                        "{submission.comments}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {submissions.length > 3 && (
                <div className="text-center mt-4">
                  <button
                    onClick={() => setShowAllComments(!showAllComments)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  >
                    {showAllComments ? 'Скрыть' : `Показать все ${submissions.length} отзывов`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Пустое состояние */}
          {submissions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">Отзывы пока отсутствуют</p>
              <p className="text-xs text-gray-400 mt-1">Участники еще не оставили обратную связь</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 