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
  participants?: Array<{
    id: string;
    user: {
      id: string;
      full_name: string;
    };
  }>;
}

const ExpertSchedulePage: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔄 useEffect triggered:', {
      userProfileEmail: userProfile?.email,
      userProfileRole: userProfile?.role
    });
    
    if (userProfile?.email) {
      console.log('🚀 Starting fetchExpertExams...');
      fetchExpertExams();
    } else {
      console.log('⏸️ Skipping fetchExpertExams - no email');
    }
  }, [userProfile?.email]);

  const fetchExpertExams = async () => {
    if (!userProfile?.email) {
      console.log('❌ Нет email пользователя');
      return;
    }

    try {
      setLoading(true);
      setError(null); // Сбрасываем предыдущие ошибки
      
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
          talent_categories(name, name_ru),
          participants:event_participants(
            id,
            user:users(id, full_name)
          )
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
        console.error('❌ Детали ошибки:', {
          code: examError.code,
          message: examError.message,
          details: examError.details,
          hint: examError.hint
        });
        setError(`Ошибка загрузки расписания: ${examError.message}`);
        return;
      }

      console.log('✅ Экзамены загружены:', examData);
      console.log('📊 Количество экзаменов:', examData?.length || 0);
      
      if (!examData || examData.length === 0) {
        console.log('⚠️ Нет данных об экзаменах');
        setError('Нет доступных экзаменов');
        return;
      }
      
      setExams(examData);
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

  // Функция для проверки, активен ли блок расписания сейчас
  const isCurrentlyActive = (startTime: string, endTime: string) => {
    try {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Moscow'
      });

      // Создаем объекты времени для сравнения
      const [currentHour, currentMinute] = currentTime.split(':').map(Number);
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      const currentMinutes = currentHour * 60 + currentMinute;
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch (error) {
      console.error('Error checking current time:', error);
      return false;
    }
  };


  // Отладочная информация
  console.log('🔍 ExpertSchedulePage render:', {
    loading,
    userProfile: userProfile?.email,
    examsCount: exams.length,
    error
  });

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
    console.log('❌ Показываем ошибку:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchExpertExams}
            className="px-4 py-2 text-white rounded-lg transition-all duration-200 font-semibold"
            style={{ 
              backgroundColor: '#06A478',
              ':hover': { backgroundColor: '#059669' }
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#06A478'}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center">
                <Calendar className="w-6 h-6 mr-3" style={{ color: '#06A478' }} />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900" style={{ lineHeight: '1.1' }}>Расписание экзаменов</h1>
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
      <div className="max-w-7xl mx-auto py-8">
        
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
                            <h2 className="text-lg font-semibold text-gray-900" style={{ lineHeight: '1.1' }}>
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
                  <div className="grid grid-cols-1 gap-y-2">
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

                      return scheduleData.map((item, index) => {
                        const isActive = isCurrentlyActive(item.startTime || '', item.endTime || '');
                        
                        // Убираем отображение резервистов
                        
                        return (
                          <div key={item.id || index} className="group relative">
                            {/* Content card */}
                            <div className="relative">
                              <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1 overflow-hidden ${
                                isActive 
                                  ? 'border-[#06A478] shadow-lg ring-2 ring-[#06A478]/20' 
                                  : 'border-gray-100 group-hover:border-[#06A478]/30'
                              }`}>
                              {/* Card header with gradient */}
                              <div className={`px-4 py-2.5 border-b ${
                                isActive 
                                  ? 'bg-gradient-to-r from-[#06A478]/10 via-[#06A478]/15 to-[#06A478]/10 border-[#06A478]/30' 
                                  : 'bg-gradient-to-r from-[#06A478]/5 via-[#06A478]/10 to-[#06A478]/5 border-[#06A478]/20'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                                      isActive 
                                        ? 'bg-[#06A478] text-white' 
                                        : 'bg-[#06A478] text-white'
                                    }`}>
                                      {item.time || item.startTime || 'Время не указано'}
                                    </div>
                                    {item.endTime && (
                                      <>
                                        <span className="text-[#06A478]/60 text-xs">—</span>
                                        <div className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                          {item.endTime}
                                        </div>
                                      </>
                                    )}
                                    {isActive && (
                                      <div className="bg-[#06A478] text-white px-2.5 py-1 rounded-md text-xs font-bold animate-pulse">
                                        Идёт сейчас
                                      </div>
                                    )}
                                  </div>
                                  {item.duration && (
                                    <div className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                      {item.duration}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Card content */}
                              <div className="px-4 py-3">
                                <h4 className="text-base font-semibold text-gray-900 mb-1.5" style={{ lineHeight: '1.1' }}>
                                  {item.title}
                                </h4>
                                
                                {item.description && (
                                  <p className="text-gray-600 text-sm mb-2" style={{ lineHeight: '1.1' }}>
                                    {item.description}
                                  </p>
                                )}
                                
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Кнопка перехода в корпоративном стиле */}
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => navigate(`/expert-exam/${exam.id}`)}
                    className="w-full px-6 py-3 text-white rounded-lg transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ 
                      minHeight: '48px',
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation',
                      background: 'linear-gradient(to right, #06A478, #059669)',
                      ':hover': { background: 'linear-gradient(to right, #059669, #048A5A)' }
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'linear-gradient(to right, #059669, #048A5A)'}
                    onMouseLeave={(e) => e.target.style.background = 'linear-gradient(to right, #06A478, #059669)'}
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
