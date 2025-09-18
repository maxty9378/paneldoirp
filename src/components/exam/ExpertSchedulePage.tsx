import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, MapPin, Users, ArrowLeft, ChevronRight, Loader2, AlertOctagon, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DetailedScheduleItem {
  id?: string;
  startTime?: string;
  endTime?: string;
  time?: string;
  title: string;
  description?: string;
  duration?: string | number;
  type?: string;
  location?: string;
  speaker?: string;
}

interface ExamEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  detailed_schedule?: DetailedScheduleItem[];
  event_types?: {
    name: string;
    name_ru: string;
  };
  talent_categories?: {
    name: string;
    name_ru: string;
  };
}

const ExpertSchedulePage: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile?.email) {
      fetchExpertExams();
    }
  }, [userProfile?.email]);

  const fetchExpertExams = async () => {
    if (!userProfile?.email) {
      console.log('❌ Нет email пользователя');
      return;
    }

    try {
      setLoading(true);
      
      let query = supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          location,
          start_date,
          end_date,
          detailed_schedule,
          expert_emails,
          event_types(name, name_ru),
          talent_categories(name, name_ru)
        `)
        .eq('event_types.name', 'exam_talent_reserve')
        .order('start_date', { ascending: true });

      // Для экспертов показываем только их экзамены, для администраторов - все
      if (userProfile.role === 'expert') {
        query = query.contains('expert_emails', [userProfile.email]);
      }

      const { data: examData, error: examError } = await query;


      if (examError) {
        console.error('❌ Ошибка загрузки экзаменов:', examError);
        setError('Ошибка загрузки расписания');
        return;
      }

      setExams(examData || []);
    } catch (err) {
      console.error('❌ Ошибка fetchExpertExams:', err);
      setError('Ошибка загрузки расписания');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return 'Дата не указана';
      }
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Дата не указана';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return 'Время не указано';
      }
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Moscow'
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Время не указано';
    }
  };

  if (loading || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            {!userProfile ? 'Загрузка профиля пользователя...' : 'Загрузка расписания...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchExpertExams}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center">
                <Calendar className="w-6 h-6 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Расписание экзаменов</h1>
                  <p className="text-sm text-gray-500">
                    {userProfile?.role === 'administrator' 
                      ? 'Все экзамены кадрового резерва' 
                      : 'Ваши назначенные экзамены'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {exams.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {userProfile?.role === 'administrator' 
                ? 'Нет экзаменов кадрового резерва' 
                : 'Нет назначенных экзаменов'
              }
            </h3>
            <p className="text-gray-500">
              {userProfile?.role === 'administrator' 
                ? 'В системе пока нет экзаменов кадрового резерва' 
                : 'Вы пока не назначены ни на один экзамен'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {exams.map((exam) => (
              <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                {/* Заголовок экзамена */}
                <div className="p-4 border-b border-gray-100">
                  <div className="space-y-4">
                    {/* Название мероприятия */}
                    <h2 className="text-lg font-semibold text-gray-900 leading-tight" style={{ lineHeight: '1.1' }}>
                      {exam.title}
                    </h2>
                    
                    {/* Дата */}
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{formatDate(exam.start_date)}</span>
                    </div>
                  </div>
                </div>

                {/* Детальное расписание */}
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    Расписание экзамена
                  </h3>
                  <div className="space-y-3">
                    {(() => {
                      // Используем данные из базы или fallback на стандартное расписание
                      const scheduleData = exam.detailed_schedule && exam.detailed_schedule.length > 0 
                        ? exam.detailed_schedule 
                        : [
                            { startTime: '09:00', endTime: '09:30', title: 'Приветственный кофе-брейк', duration: '30 мин', description: '' },
                            { startTime: '09:30', endTime: '09:35', title: 'Начало мероприятия', duration: '5 мин', description: 'Вступительное слово членов экзаменационной комиссии. Инструктаж.' },
                            { startTime: '09:35', endTime: '12:30', title: 'Решение и защита прикладных кейсов', duration: '2ч 55 мин', description: '5 мин на инструктаж, 20 мин на подготовку решения 2-х кейсов всеми участниками, 30 минут на защиту 2-х кейсов каждого участника' },
                            { startTime: '12:30', endTime: '13:30', title: 'Обед', duration: '1ч', description: '' },
                            { startTime: '13:30', endTime: '15:15', title: 'Защита проекта сотрудниками КР', duration: '1ч 45 мин', description: '5 минут - инструктаж по защите проекта, 20 минут на защиту проекта каждым участником' },
                            { startTime: '15:15', endTime: '15:30', title: 'Кофе-брейк', duration: '15 мин', description: '' },
                            { startTime: '15:30', endTime: '17:20', title: 'Диагностическая игра "Командное решение"', duration: '1ч 50 мин', description: '5 мин на инструктаж, 40 мин. на выполнение задания - постройку моста, 40 мин. на обратную связь от экспертов' },
                            { startTime: '17:20', endTime: '17:35', title: 'Перерыв для резервистов', duration: '15 мин', description: 'Подсчет результатов ЦО' },
                            { startTime: '17:35', endTime: '18:00', title: 'Подведение итогов комплексного экзамена', duration: '25 мин', description: 'Заключительное слово ЧЭК, вручение дипломов и наград выпускникам, фуршет' }
                          ];

                      return scheduleData.map((item, index) => (
                        <div key={item.id || index} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold">
                                {item.time || item.startTime || 'Время не указано'}
                              </div>
                              {item.endTime && (
                                <div className="text-gray-500 text-sm">
                                  — {item.endTime}
                                </div>
                              )}
                              {item.duration && (
                                <div className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                                  {item.duration}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">
                            {item.title}
                          </h4>
                          
                          {item.description && (
                            <p className="text-gray-600 text-sm leading-relaxed mb-3">
                              {item.description}
                            </p>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Кнопка перехода в корпоративном стиле */}
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => navigate(`/expert-exam/${exam.id}`)}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ 
                      minHeight: '48px',
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation'
                    }}
                  >
                    <Calendar className="w-4 h-4" />
                    Перейти к экзамену
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpertSchedulePage;
