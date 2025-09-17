import React, { useState, useEffect } from 'react';
import { Calendar, Users, BookOpen, TrendingUp, Award, Shield, MapPin, Link as LinkIcon, Video, CalendarDays, Users2, CheckCircle2, Info, Play, Pause, Loader2, XCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getDeclension } from '../utils/textUtils';
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
    draft: { label: '', tone: 'text-white bg-slate-500', ring: 'ring-slate-500', dot: 'bg-slate-500', Icon: Pause },
    published: { label: '', tone: 'text-white bg-emerald-500', ring: 'ring-emerald-500', dot: 'bg-emerald-500', Icon: Play },
    active: { label: 'Активно', tone: 'text-emerald-700 bg-emerald-50', ring: 'ring-emerald-200', dot: 'bg-emerald-500', Icon: () => <div className="h-3.5 w-3.5 rounded bg-emerald-500" /> },
    ongoing: { label: 'Идёт', tone: 'text-indigo-700 bg-indigo-50', ring: 'ring-indigo-200', dot: 'bg-indigo-500', Icon: Loader2 },
    completed: { label: '', tone: 'text-white bg-blue-500', ring: 'ring-blue-500', dot: 'bg-blue-500', Icon: CheckCircle2 },
    cancelled: { label: '', tone: 'text-white bg-rose-500', ring: 'ring-rose-500', dot: 'bg-rose-500', Icon: XCircle },
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
    : { label: event.event_type?.name_ru || 'Мероприятие', icon: Info };
  
  const TypeIcon = typeInfo.icon;
  
  // Цветовые классы для типа
  const getTypeChipClasses = (type: string) => {
    const typeColors = {
      training: 'bg-blue-500 text-white ring-blue-500',
      webinar: 'bg-blue-100 text-blue-700 ring-blue-200',
      workshop: 'bg-purple-100 text-purple-700 ring-purple-200',
      exam: 'bg-rose-100 text-rose-700 ring-rose-200',
      other: 'bg-amber-100 text-amber-700 ring-amber-200',
    };
    return typeColors[type as keyof typeof typeColors] || 'bg-slate-100 text-slate-700 ring-slate-200';
  };
  
  // Акцент даты
  const DateAccent = ({ date }: { date: Date | null }) => {
    if (!date) {
      return (
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-center ring-1 ring-slate-200">
          <div className="text-[11px] text-slate-500">Дата</div>
          <div className="text-sm font-semibold text-slate-700">Не указана</div>
        </div>
      );
    }

    const day = date.toLocaleDateString('ru-RU', { day: '2-digit' });
    const month = date.toLocaleDateString('ru-RU', { month: 'long' });
    const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);
    
    // Исправляем окончания месяцев
    const monthWithCorrectEnding = month.endsWith('ь') ? month.slice(0, -1) + 'я' : month;

    return (
      <div className="rounded-2xl ring-1 px-4 py-3 bg-gradient-to-br from-emerald-50 to-emerald-100 ring-emerald-200 shadow-sm text-center relative">
        <div className="flex items-end justify-center gap-1 leading-none">
          <span className="text-3xl md:text-4xl font-extrabold text-slate-900">{day}</span>
        </div>
        <div className="mt-1 text-[14px] font-medium text-slate-500">{monthWithCorrectEnding}</div>
        <div className="mt-2 text-[12px] font-semibold text-slate-900">
          {time}
        </div>
      </div>
    );
  };
  
  return (
    <article
      className="group relative overflow-hidden rounded-2xl bg-white border border-white/60 p-4 shadow-[0_1px_2px_rgba(2,8,23,0.06)] hover:shadow-[0_10px_30px_rgba(2,8,23,0.08)] transition-all flex flex-col h-full"
    >
      {/* Верх: дата-время + статус/тип */}
      <header className="mb-3 flex items-start justify-between gap-3 flex-shrink-0">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex flex-col gap-2">
            {/* Статус */}
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
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
              <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-semibold ring-1 shadow-sm ${getTypeChipClasses(event.type || 'other')}`}>
                <TypeIcon className="h-3.5 w-3.5" />
                {typeInfo.label}
              </span>
            </div>
          </div>

          {/* Название */}
          <h3 className="line-clamp-2 text-lg font-bold leading-tight text-slate-900">
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
          <div className="mb-4 rounded-xl bg-slate-50/70 p-3 ring-1 ring-slate-200">
            <p className="line-clamp-3 text-sm leading-relaxed text-slate-700">
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
          
          if (isExpertForThisExam) {
            return (
              <button 
                onClick={() => window.location.href = `/expert-exam/${event.id}`}
                className="w-full justify-center relative overflow-hidden bg-gradient-to-r from-[#06A478] via-[#059669] to-[#06A478] hover:from-[#059669] hover:via-[#047857] hover:to-[#059669] text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-300 shadow-sm hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#06A478] focus:ring-offset-2"
                title="Перейти к оценке"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]"></div>
                <span className="text-sm font-medium relative z-10">Перейти к оценке</span>
              </button>
            );
          }
          
          return (
            <button 
              onClick={() => window.location.href = `/event/${event.id}`}
              className="w-full justify-center relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:via-teal-600 hover:to-emerald-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-300 shadow-sm hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              title="Открыть"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]"></div>
              <span className="text-sm font-medium relative z-10">Открыть</span>
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

  const getMotivationalMessage = () => {
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
  };

  // Загрузка мероприятий пользователя
  const fetchUserEvents = async () => {
    if (!user?.id) return;
    
    try {
      setEventsLoading(true);
      setEventsError(null);

      const isAdmin = userProfile?.role && ['administrator', 'moderator', 'trainer'].includes(userProfile.role);
      const isExpert = userProfile?.role === 'expert';
      
      // Сначала проверим, есть ли вообще мероприятия в базе
      const { data: allEvents, error: allEventsError } = await supabase
        .from('events')
        .select('id, title, status, start_date')
        .limit(5);
      
      console.log('All events check - data:', allEvents, 'error:', allEventsError);
      
      let query;
      
      if (isAdmin) {
        // Администраторы видят все мероприятия (как в EventsView)
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
      
      if (data && data.length > 0) {
        console.log('First event sample:', data[0]);
      }

      if (error) {
        console.error('Error fetching events:', error);
        setEventsError('Ошибка загрузки мероприятий');
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
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setEventsError('Ошибка загрузки мероприятий');
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
      <section className="bg-gradient-to-r from-sns-500 to-sns-600 rounded-2xl p-5 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">
              {getGreeting()}, {extractFirstName(userProfile?.full_name || 'Пользователь')}!
            </h1>
            <p className="text-white/90 text-base sm:text-lg mb-2">
              {getMotivationalMessage()}
            </p>
            <div className="flex items-center space-x-2 text-white/80 text-sm">
              <Shield size={16} />
              <span>
                Роль: {userProfile?.role ? USER_ROLE_LABELS[userProfile.role] : 'Не определена'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-2 sm:mt-0">
            <div className="flex items-center space-x-2">
              <Calendar size={20} />
              <span>
                {new Date().toLocaleDateString('ru-RU', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'long'
                })}
              </span>
            </div>
          </div>
        </div>
        {/* Декоративный круг для красоты */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
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
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Ближайшие мероприятия
          </h2>
          <button className="text-sns-500 hover:text-sns-600 transition-colors text-sm font-medium">
            Смотреть все
          </button>
        </div>
        
        {eventsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-sns-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Загрузка мероприятий...</p>
            </div>
          </div>
        ) : eventsError ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{eventsError}</p>
            <button 
              onClick={fetchUserEvents}
              className="text-sns-500 hover:text-sns-600 transition-colors text-sm font-medium"
            >
              Попробовать снова
            </button>
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">У вас пока нет предстоящих мероприятий</p>
            <p className="text-sm text-gray-500">Обратитесь к администратору для записи на мероприятия</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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