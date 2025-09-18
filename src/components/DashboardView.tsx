import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Users, BookOpen, TrendingUp, Award, Shield, MapPin, Link as LinkIcon, Video, CalendarDays, Users2, CheckCircle2, Info, Play, Pause, Loader2, XCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getDeclension } from '../utils/textUtils';
import { getCachedEvents, setCachedEvents, clearEventsCache } from '../lib/eventsCache';
import { Event, USER_ROLE_LABELS } from '../types';
import { supabase } from '../lib/supabase';
// import { AchievementSection } from './achievements';

// Интерфейс для мероприятия с дополнительной информацией
interface EventWithDetails extends Event {
  event_type?: {
    id: string;
    name: string;
    name_ru: string;
  };
  participants_count?: number;
}

// Карточка мероприятия (как в EventsView)
function EventCard({ event }: { event: EventWithDetails }) {
  // Парсинг даты
  const parseDate = (event: EventWithDetails) => {
    const base = event.start_date || event.date_time || event.created_at || '';
    const d = new Date(base);
    return isNaN(d.getTime()) ? null : d;
  };
  
  const d = parseDate(event);
  
  // Статус мероприятия
  const STATUS_MAP = {
    draft: { label: '', tone: 'text-slate-600 bg-slate-100', ring: 'ring-slate-200', dot: 'bg-slate-400', Icon: Pause },
    published: { label: '', tone: 'text-[#06A478] bg-[#06A478]/10', ring: 'ring-[#06A478]/20', dot: 'bg-[#06A478]', Icon: Play },
    active: { label: 'Активно', tone: 'text-[#06A478] bg-[#06A478]/10', ring: 'ring-[#06A478]/20', dot: 'bg-[#06A478]', Icon: () => <div className="h-3.5 w-3.5 rounded-full bg-[#06A478]" /> },
    ongoing: { label: 'Идёт', tone: 'text-blue-600 bg-blue-50', ring: 'ring-blue-200', dot: 'bg-blue-500', Icon: Loader2 },
    completed: { label: '', tone: 'text-slate-600 bg-slate-100', ring: 'ring-slate-200', dot: 'bg-slate-400', Icon: CheckCircle2 },
    cancelled: { label: '', tone: 'text-rose-600 bg-rose-50', ring: 'ring-rose-200', dot: 'bg-rose-400', Icon: XCircle },
  };
  
  const status = STATUS_MAP[event.status as keyof typeof STATUS_MAP] || STATUS_MAP.draft;
  const { label, tone: statusTone, ring, Icon: StatusIcon } = status;
  
  // Тип мероприятия
  const TYPE_LABELS = {
    training: { label: 'Онлайн тренинг', icon: Video },
    webinar: { label: 'Вебинар', icon: CalendarDays },
    workshop: { label: 'Мастер-класс', icon: Users2 },
    exam: { label: 'Экзамен', icon: CheckCircle2 },
    other: { label: 'Другое', icon: Info },
  };
  
  const typeInfo = event.type
    ? TYPE_LABELS[event.type as keyof typeof TYPE_LABELS] || { label: event.event_type?.name_ru || 'Мероприятие', icon: Info }
    : { 
        label: event.event_type?.name === 'exam_talent_reserve' ? 'Экзамен' : (event.event_type?.name_ru || 'Мероприятие'), 
        icon: event.event_type?.name === 'exam_talent_reserve' ? CheckCircle2 : Info 
      };
  
  const TypeIcon = typeInfo.icon;
  
  // Цветовые классы для типа
  const getTypeChipClasses = (type: string, eventTypeName?: string) => {
    // Специальная обработка для экзамена кадрового резерва
    if (eventTypeName === 'exam_talent_reserve') {
      return 'animate-gradient-shift text-white ring-0 shadow-lg';
    }
    
    const typeColors = {
      training: 'bg-blue-50 text-blue-700 ring-blue-200',
      webinar: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
      workshop: 'bg-purple-50 text-purple-700 ring-purple-200',
      exam: 'bg-rose-50 text-rose-700 ring-rose-200',
      other: 'bg-amber-50 text-amber-700 ring-amber-200',
    };
    return typeColors[type as keyof typeof typeColors] || 'bg-slate-50 text-slate-700 ring-slate-200';
  };
  
  // Акцент даты
  const DateAccent = ({ date }: { date: Date | null }) => {
    if (!date) {
      return (
        <div className="rounded-2xl bg-slate-50/80 backdrop-blur-sm px-4 py-3 text-center border border-slate-200/50">
          <div className="text-[11px] text-slate-500 font-medium">Дата</div>
          <div className="text-sm font-semibold text-slate-600">Не указана</div>
        </div>
      );
    }

    const day = date.toLocaleDateString('ru-RU', { day: '2-digit' });
    const month = date.toLocaleDateString('ru-RU', { month: 'long' });
    const time = new Intl.DateTimeFormat('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Europe/Moscow'
    }).format(date);
    
    // Исправляем окончания месяцев
    const monthWithCorrectEnding = month.endsWith('ь') ? month.slice(0, -1) + 'я' : month;

    return (
      <div className="rounded-2xl border border-[#06A478]/20 px-4 py-3 bg-gradient-to-br from-[#06A478]/5 to-[#06A478]/10 backdrop-blur-sm text-center relative shadow-sm">
        <div className="flex items-end justify-center gap-1 leading-none">
          <span className="text-2xl md:text-3xl font-bold text-slate-900">{day}</span>
        </div>
        <div className="mt-1 text-[12px] font-medium text-slate-600">{monthWithCorrectEnding}</div>
        <div className="mt-2 text-[11px] font-semibold text-slate-700">
          {time}
        </div>
      </div>
    );
  };
  
  return (
    <article
      className="group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border border-slate-200/50 p-5 shadow-sm hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 flex flex-col h-full hover:scale-[1.02] hover:border-slate-300/60"
    >
      {/* Верх: дата-время + статус/тип */}
      <header className="mb-3 flex items-start justify-between gap-3 flex-shrink-0">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex flex-col gap-2">
            {/* Статус */}
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const { userProfile } = useAuth();
                const isExpert = userProfile?.role === 'expert';
                
                // Для экспертов не показываем статус
                if (isExpert) {
                  return null;
                }
                
                const isIconOnly = !label;
                const badgeClass = `inline-flex items-center gap-1 text-[10px] font-semibold ring-1 shadow-sm ${
                  isIconOnly ? 'h-7 w-7 justify-center rounded-lg p-0' : 'rounded-full px-2 py-0.5'
                } ${statusTone} ${ring}`;
                const iconSize = isIconOnly ? 'h-4 w-4' : 'h-3.5 w-3.5';

                return (
                  <span className={badgeClass}>
                    <StatusIcon className={`${iconSize} ${event.status === 'ongoing' && 'animate-spin'}`} />
                    {!isIconOnly && <span>{label}</span>}
                  </span>
                );
              })()}
            </div>
            
            {/* Тип мероприятия */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-semibold ring-1 shadow-sm ${getTypeChipClasses(event.type || 'other', event.event_type?.name)}`}>
                <TypeIcon className="h-3.5 w-3.5" />
                {typeInfo.label}
              </span>
            </div>
          </div>

          {/* Название */}
          <h3 className="text-lg font-bold leading-tight text-slate-900">
            {event.title}
          </h3>
        </div>

        {/* Правый – акцент на дате/времени */}
        <div className="shrink-0 w-[112px]">
          <DateAccent date={d} />
        </div>
      </header>

      {/* Описание */}
      <div className="flex-1">
        {event.description && (
          <div className="mb-4 rounded-2xl bg-slate-50/60 backdrop-blur-sm p-4 border border-slate-200/40">
            <p className="line-clamp-3 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
              {event.description}
            </p>
          </div>
        )}
      </div>
      
      {/* Низ: действия */}
      <footer className="mt-auto flex-shrink-0">
        {(() => {
          const { userProfile } = useAuth();
          const isExpert = userProfile?.role === 'expert';
          const isAdmin = userProfile?.role === 'administrator';
          const isExamTalentReserve = event.event_type?.name === 'exam_talent_reserve';
          const isExpertForThisExam = (isExpert || isAdmin) && isExamTalentReserve && (event.expert_emails?.includes(userProfile?.email || '') || isAdmin);
          
          // Для администраторов: если это экзамен, показываем кнопку "Оценить"
          if (isAdmin && isExamTalentReserve) {
            return (
              <button 
                onClick={() => window.location.href = `/expert-exam/${event.id}`}
                className="w-full justify-center relative overflow-hidden bg-gradient-to-r from-[#06A478] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-medium py-3 px-4 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-[#06A478]/25 focus:outline-none focus:ring-2 focus:ring-[#06A478]/20 focus:ring-offset-2 group"
                title="Перейти к оценке"
              >
                <span className="text-sm font-medium relative z-10 group-hover:scale-105 transition-transform duration-200">Перейти к оценке</span>
              </button>
            );
          }
          
          // Для экспертов, назначенных на конкретный экзамен
          if (isExpertForThisExam) {
            return (
              <button 
                onClick={() => window.location.href = `/expert-exam/${event.id}`}
                className="w-full justify-center relative overflow-hidden bg-gradient-to-r from-[#06A478] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-medium py-3 px-4 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-[#06A478]/25 focus:outline-none focus:ring-2 focus:ring-[#06A478]/20 focus:ring-offset-2 group"
                title="Перейти к оценке"
              >
                <span className="text-sm font-medium relative z-10 group-hover:scale-105 transition-transform duration-200">Перейти к оценке</span>
              </button>
            );
          }
          
          // Для экспертов не показываем кнопку
          if (isExpert) {
            return null;
          }
          
          return (
            <button 
              onClick={() => window.location.href = `/event/${event.id}`}
              className="w-full justify-center relative overflow-hidden bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-medium py-3 px-4 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-slate-500/25 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:ring-offset-2 group"
              title="Открыть"
            >
              <span className="text-sm font-medium relative z-10 group-hover:scale-105 transition-transform duration-200">Открыть</span>
            </button>
          );
        })()}
      </footer>
    </article>
  );
}

// Карточка статистики
function StatsCard({
  title,
  value,
  change,
  changeType,
  icon
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-2 items-start">
      <div className="flex items-center gap-2 text-sns-500">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{title}</div>
      {change && (
        <div className={`text-xs mt-1 ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </div>
      )}
    </div>
  );
}

export function DashboardView() {
  const { user, userProfile, loading } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<EventWithDetails[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    activeEvents: 0,
    totalParticipants: 0,
    completedCourses: 0,
    averageRating: 0
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  function extractFirstName(fullName: string): string {
    const parts = fullName.split(' ');
    return parts.length > 1 ? parts[1] : parts[0];
  }

  // Фиксируем мотивационное сообщение с помощью useMemo
  const motivationalMessage = useMemo(() => {
    // Специальные сообщения для экспертов
    if (userProfile?.role === 'expert') {
      const expertMessages = [
        'Спасибо за ваш вклад в развитие команды!',
        'Ваша экспертная оценка помогает расти другим',
        'Благодарим за участие в наставничестве',
        'Ваш опыт ценен для всей команды',
        'Спасибо за вашу экспертную поддержку'
      ];
      return expertMessages[Math.floor(Math.random() * expertMessages.length)];
    }
    
    // Обычные сообщения для остальных ролей
    const messages = [
      'Готовы к новым знаниям?',
      'Продолжайте развиваться!',
      'Каждый день — новая возможность учиться',
      'Ваш путь к успеху начинается здесь',
      'Инвестируйте в свое будущее'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }, [userProfile?.role]); // Пересчитываем только при изменении роли

  // Загрузка мероприятий пользователя с кэшированием
  const fetchUserEvents = async (forceRefresh = false) => {
    if (!user?.id || !userProfile?.role) return;
    
    try {
      // Проверяем кэш, если не принудительное обновление
      if (!forceRefresh) {
        const cachedEvents = getCachedEvents(user.id, userProfile.role);
        if (cachedEvents) {
          setUpcomingEvents(cachedEvents);
          setEventsLoading(false);
          setEventsError(null);
          return;
        }
      }

      setEventsLoading(true);
      setEventsError(null);

      const isAdmin = userProfile?.role && ['administrator', 'moderator', 'trainer'].includes(userProfile.role);
      const isExpert = userProfile?.role === 'expert';
      
      let query;
      
      if (isAdmin) {
        // Администраторы видят все мероприятия
        query = supabase
          .from('events')
          .select(`
            *,
            event_type:event_types(id, name, name_ru),
            event_participants(id)
          `)
          .order('start_date', { ascending: false })
          .limit(6);
      } else if (isExpert) {
        // Эксперты видят мероприятия, где они указаны в expert_emails
        query = supabase
          .from('events')
          .select(`
            *,
            event_type:event_types(id, name, name_ru),
            event_participants(id)
          `)
          .contains('expert_emails', [userProfile?.email])
          .order('start_date', { ascending: false })
          .limit(6);
      } else {
        // Обычные пользователи видят только свои мероприятия
        query = supabase
          .from('events')
          .select(`
            *,
            event_type:event_types(id, name, name_ru),
            event_participants!inner(user_id)
          `)
          .eq('status', 'active')
          .gte('start_date', new Date().toISOString())
          .eq('event_participants.user_id', user.id)
          .order('start_date', { ascending: true })
          .limit(6);
      }

      const { data, error } = await query;

      console.log('Dashboard fetchEvents - isAdmin:', isAdmin, 'user:', user?.id, 'userProfile:', userProfile?.role);
      console.log('Dashboard fetchEvents - data length:', data?.length, 'data:', data, 'error:', error);

      if (error) {
        console.error('Error fetching events:', error);
        setEventsError(`Ошибка загрузки мероприятий: ${error.message}`);
        return;
      }

      if (data) {
        // Для inner join нужно получить уникальные события
        const uniqueEvents = data.reduce((acc, event) => {
          if (!acc.find(e => e.id === event.id)) {
            acc.push(event);
          }
          return acc;
        }, [] as any[]);

        const eventsWithDetails = uniqueEvents.map(event => ({
          ...event,
          participants_count: 0 // Пока не показываем количество участников для простоты
        }));
        
        setUpcomingEvents(eventsWithDetails);
        // Сохраняем в кэш
        setCachedEvents(eventsWithDetails, user.id, userProfile.role);
      } else {
        setUpcomingEvents([]);
        setCachedEvents([], user.id, userProfile.role);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setEventsError(`Произошла ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setEventsLoading(false);
    }
  };

  // Загрузка статистики
  const fetchStats = async () => {
    if (!user?.id) return;

    try {
      const isAdmin = userProfile?.role && ['administrator', 'moderator', 'trainer'].includes(userProfile.role);
      const isExpert = userProfile?.role === 'expert';
      
      if (isAdmin) {
        // Для администраторов - общая статистика
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, status')
          .eq('status', 'active');

        const { data: participantsData } = await supabase
          .from('event_participants')
          .select('id');

        setStats({
          activeEvents: eventsData?.length || 0,
          totalParticipants: participantsData?.length || 0,
          completedCourses: 0, // TODO: реализовать подсчет завершенных курсов
          averageRating: 4.8 // TODO: реализовать подсчет средней оценки
        });
      } else if (isExpert) {
        // Для экспертов - статистика по их мероприятиям
        const { data: expertEventsData } = await supabase
          .from('events')
          .select('id, status')
          .contains('expert_emails', [userProfile?.email])
          .eq('status', 'active');

        setStats({
          activeEvents: expertEventsData?.length || 0,
          totalParticipants: 0, // Не показываем общее количество участников для экспертов
          completedCourses: 0, // TODO: реализовать подсчет завершенных курсов эксперта
          averageRating: 0 // Не показываем среднюю оценку для экспертов
        });
      } else {
        // Для обычных пользователей - их статистика
        const { data: userEventsData } = await supabase
          .from('events')
          .select('id, status')
          .eq('status', 'active')
          .eq('event_participants.user_id', user.id);

        setStats({
          activeEvents: userEventsData?.length || 0,
          totalParticipants: 0, // Не показываем общее количество участников для обычных пользователей
          completedCourses: 0, // TODO: реализовать подсчет завершенных курсов пользователя
          averageRating: 0 // Не показываем среднюю оценку для обычных пользователей
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    if (user && userProfile) {
      // Очищаем кэш при смене пользователя
      clearEventsCache();
      fetchUserEvents();
      fetchStats();
    }
  }, [user, userProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Загрузка данных пользователя...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8 pb-safe-bottom">
      {/* Welcome Section */}
      <section className="bg-gradient-to-br from-[#06A478] via-[#059669] to-[#047857] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold mb-2 text-white">
              {getGreeting()}, {extractFirstName(userProfile?.full_name || 'Пользователь')}
            </h1>
            <p className="text-white/90 text-sm sm:text-base mb-3 leading-relaxed">
              {motivationalMessage}
            </p>
            <div className="flex items-center space-x-2 text-white/80 text-xs">
              <Shield size={14} />
              <span className="font-medium">
                Ваша роль - {userProfile?.role ? USER_ROLE_LABELS[userProfile.role] : 'Не определена'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3 mt-2 sm:mt-0">
            <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/30">
              <Calendar size={16} className="text-white/90" />
              <span className="text-sm font-medium text-white">
                {new Date().toLocaleDateString('ru-RU', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'long'
                })}
              </span>
            </div>
          </div>
        </div>
        {/* Декоративные элементы */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute top-1/2 -right-8 w-16 h-16 bg-white/5 rounded-full pointer-events-none" />
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
        {/* Для экспертов не показываем карточки статистики */}
        {userProfile?.role !== 'expert' && (
          <>
            <StatsCard
              title="Активные мероприятия"
              value={stats.activeEvents}
              icon={<BookOpen size={22} />}
            />
            <StatsCard
              title="Завершенные курсы"
              value={stats.completedCourses}
              icon={<Award size={22} />}
            />
          </>
        )}
        {userProfile?.role && ['administrator', 'moderator', 'trainer'].includes(userProfile.role) && (
          <StatsCard
            title="Участники"
            value={stats.totalParticipants}
            icon={<Users size={22} />}
          />
        )}
        {userProfile?.role && ['administrator', 'moderator', 'trainer'].includes(userProfile.role) && (
          <StatsCard
            title="Средняя оценка"
            value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
            icon={<TrendingUp size={22} />}
          />
        )}
      </section>

      {/* Achievements Section - временно отключено */}
      {/* <AchievementSection /> */}

      {/* Upcoming Events as Cards */}
      <section className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Ближайшие мероприятия
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => fetchUserEvents(true)}
              disabled={eventsLoading}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50/50 hover:bg-slate-100/80 px-2 py-1.5 rounded-lg border border-slate-200/60 hover:border-slate-300/80"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${eventsLoading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>
        </div>
        
        {eventsLoading ? (
          <div className="flex items-center justify-center py-12 mb-32 md:mb-20">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-3 border-[#06A478] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600 font-medium">Загрузка мероприятий...</p>
            </div>
          </div>
        ) : eventsError ? (
          <div className="text-center py-12 mb-32 md:mb-20">
            <XCircle className="mx-auto text-red-500 mb-4" size={48} />
            <p className="text-red-600 mb-4 font-medium">{eventsError}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => fetchUserEvents(true)}
                className="inline-flex items-center px-4 py-2 bg-[#06A478] text-white rounded-2xl hover:bg-[#059669] transition-colors text-sm font-medium shadow-sm hover:shadow-md"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Попробовать снова
              </button>
              <button 
                onClick={() => fetchUserEvents()}
                className="inline-flex items-center px-4 py-2 text-slate-600 border border-slate-300 rounded-2xl hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                Загрузить из кэша
              </button>
            </div>
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="text-center py-12 mb-32 md:mb-20">
            <BookOpen size={48} className="mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 mb-2 font-medium">У вас пока нет предстоящих мероприятий</p>
            <p className="text-sm text-slate-500 mb-6">Обратитесь к администратору для записи на мероприятия</p>
            <button 
              onClick={() => fetchUserEvents(true)}
              className="inline-flex items-center px-4 py-2 text-slate-600 border border-slate-300 rounded-2xl hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Обновить
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-32 md:mb-20 mt-4 md:mt-0" style={{ lineHeight: '1.2' }}>
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* Bottom Navigation для мобильных */}

    </div>
  );
}