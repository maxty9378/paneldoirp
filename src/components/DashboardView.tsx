import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Users, BookOpen, TrendingUp, Award, Shield, MapPin, Video, CalendarDays, Users2, CheckCircle2, Info, Play, Pause, Loader2, XCircle, RefreshCw, ArrowRight } from 'lucide-react';
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
  const { userProfile } = useAuth();
  // Парсинг даты
  const parseDate = (event: EventWithDetails) => {
    const base = event.start_date || event.date_time || event.created_at || '';
    const d = new Date(base);
    return isNaN(d.getTime()) ? null : d;
  };
  
  const d = parseDate(event);
  const role = userProfile?.role;
  const isExpert = role === 'expert';
  const isAdmin = role === 'administrator';
  const expertEmails = Array.isArray(event.expert_emails) ? event.expert_emails : [];
  const isExamTalentReserve = event.event_type?.name === 'exam_talent_reserve';
  const isExpertAssigned = isExpert && expertEmails.includes(userProfile?.email || '');
  const shouldOpenExam = isExamTalentReserve && (isAdmin || isExpertAssigned);

  if (isExpert && !shouldOpenExam) {
    return null;
  }
  
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
      className="group relative min-w-[260px] sm:min-w-0 overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.65)] transition-all duration-300 flex flex-col h-full hover:-translate-y-1 hover:shadow-[0_32px_60px_-30px_rgba(15,23,42,0.35)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(6,164,120,0.08),transparent_65%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative flex flex-col h-full">
        {/* Верх: дата-время + статус/тип */}
        <header className="mb-4 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="flex flex-col gap-3 min-w-0">
            <div className="flex flex-col gap-2">
              {/* Статус */}
              <div className="flex flex-wrap items-center gap-2">
                {!isExpert && (
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ring-1 shadow-sm ${
                      !label ? 'h-7 w-7 justify-center rounded-lg p-0' : 'rounded-full px-2 py-1'
                    } ${statusTone} ${ring}`}
                  >
                    <StatusIcon className={`${!label ? 'h-4 w-4' : 'h-3.5 w-3.5'} ${event.status === 'ongoing' && 'animate-spin'}`} />
                    {label && <span>{label}</span>}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-semibold ring-1 shadow-sm ${getTypeChipClasses(event.type || 'other', event.event_type?.name)}`}>
                  <TypeIcon className="h-3.5 w-3.5" />
                  {typeInfo.label}
                </span>
              </div>
            </div>

            {/* Название */}
            <h3 className="text-lg font-semibold leading-tight text-slate-900">
              {event.title}
            </h3>
            {event.location && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
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
              <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
                {event.description}
              </p>
            </div>
          )}
        </div>
      
        {/* Низ: действия */}
        <footer className="mt-auto flex-shrink-0">
          <button
            onClick={() => {
              if (shouldOpenExam) {
                window.location.href = `/expert-exam/${event.id}`;
              } else {
                window.location.href = `/event/${event.id}`;
              }
            }}
            className={`group/button w-full justify-center relative overflow-hidden ${
              shouldOpenExam
                ? 'bg-gradient-to-r from-[#0EA47A] via-[#06A478] to-[#059669] text-white hover:from-[#059669] hover:to-[#047857]'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            } font-medium py-3 px-4 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0EA47A]/30`}
            title={shouldOpenExam ? 'Перейти к оценке' : 'Открыть событие'}
          >
            <span className="relative z-10 inline-flex items-center justify-center gap-2 text-sm font-medium">
              {shouldOpenExam ? 'Перейти к оценке' : 'Открыть событие'}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/button:translate-x-0.5" />
            </span>
          </button>
        </footer>
      </div>
    </article>
  );
}

// Карточка статистики
function StatsCard({
  title,
  value,
  icon
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative flex min-w-[150px] flex-1 items-center gap-3 overflow-hidden rounded-2xl border border-white/40 bg-white/70 px-4 py-3 backdrop-blur-xl shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)] transition-transform duration-300 hover:-translate-y-0.5">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
        {icon}
      </div>
      <div className="space-y-1">
        <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{title}</div>
        <div className="text-lg font-semibold text-slate-900">{value}</div>
      </div>
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
  const [heroGradientAngle, setHeroGradientAngle] = useState(120);

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

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHeroGradientAngle(prev => (prev + 1) % 360);
    }, 120);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

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
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-medium">Загружаем ваш дашборд…</p>
        </div>
      </div>
    );
  }

  const role = userProfile?.role;

  return (
    <div className="relative pb-28 md:pb-12 pb-safe-bottom">
      <div className="absolute inset-x-0 -top-24 h-56 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.22),transparent_65%)] blur-3xl" />
      <div className="absolute inset-x-0 top-40 h-72 bg-[radial-gradient(circle_at_center,_rgba(6,164,120,0.12),transparent_70%)] blur-2xl" />

      <div className="relative z-10 flex flex-col gap-8">
        <section
          className="relative overflow-hidden rounded-[28px] border border-white/20 px-6 py-7 sm:px-8 sm:py-9 text-white shadow-[0_40px_80px_-50px_rgba(8,47,35,0.78)]"
          style={{
            background: `linear-gradient(${heroGradientAngle}deg, rgba(14,164,120,0.95) 0%, rgba(12,142,111,0.9) 45%, rgba(6,98,71,0.95) 100%)`
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),transparent_55%)]" />
          <div className="absolute -top-20 right-0 h-52 w-52 rounded-full bg-emerald-300/35 blur-3xl" />
          <div className="absolute bottom-0 -left-16 h-60 w-60 rounded-full bg-emerald-500/25 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0)_35%)]" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-4">
              <div className="space-y-3">
                <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">
                  {getGreeting()}, {extractFirstName(userProfile?.full_name || 'Пользователь')}!
                </h1>
                <p className="max-w-xl text-sm sm:text-base text-white/85 leading-relaxed">
                  {motivationalMessage}
                </p>
              </div>
              <div className="inline-flex flex-wrap items-center gap-2 text-xs sm:text-sm text-white/80">
                <Shield className="h-4 w-4" />
                <span className="font-medium">
                  Ваша роль — {userProfile?.role ? USER_ROLE_LABELS[userProfile.role] : 'Не определена'}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-left text-sm font-medium text-white/85 backdrop-blur-sm">
                Поддерживаем ваш путь по программе «Потенциал ГДФ».
              </div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <Calendar className="h-4 w-4" />
                <span>Мы всегда рядом, чтобы помочь вам в развитии</span>
              </div>
            </div>
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">Ваш прогресс</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {role !== 'expert' && (
              <>
                <StatsCard
                  title="Активные мероприятия"
                  value={stats.activeEvents}
                  icon={<BookOpen className="h-5 w-5" />}
                />
                <StatsCard
                  title="Завершенные курсы"
                  value={stats.completedCourses}
                  icon={<Award className="h-5 w-5" />}
                />
              </>
            )}
            {role && ['administrator', 'moderator', 'trainer'].includes(role) && (
              <StatsCard
                title="Участники"
                value={stats.totalParticipants}
                icon={<Users className="h-5 w-5" />}
              />
            )}
            {role && ['administrator', 'moderator', 'trainer'].includes(role) && (
              <StatsCard
                title="Средняя оценка"
                value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
                icon={<TrendingUp className="h-5 w-5" />}
              />
            )}
            {role === 'expert' && (
              <StatsCard
                title="Активные экзамены"
                value={stats.activeEvents}
                icon={<CheckCircle2 className="h-5 w-5" />}
              />
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Ближайшие мероприятия</h2>
            <button
              onClick={() => fetchUserEvents(true)}
              disabled={eventsLoading}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors duration-200 hover:text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${eventsLoading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>

          {eventsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <div className="w-8 h-8 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium">Загружаем мероприятия…</p>
              </div>
            </div>
          ) : eventsError ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-red-100 bg-red-50/60 px-6 py-8 text-center text-red-600">
              <XCircle className="h-10 w-10" />
              <p className="text-sm font-semibold">{eventsError}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => fetchUserEvents(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-600"
                >
                  <RefreshCw className="h-4 w-4" />
                  Попробовать снова
                </button>
                <button
                  onClick={() => fetchUserEvents()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-white/60"
                >
                  Загрузить из кэша
                </button>
              </div>
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200/70 bg-white/70 px-6 py-12 text-center">
              <BookOpen size={48} className="text-slate-300" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">У вас пока нет предстоящих мероприятий</p>
                <p className="text-xs text-slate-500">Обратитесь к администратору, чтобы записаться и получить новые события</p>
              </div>
              <button
                onClick={() => fetchUserEvents(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Обновить
              </button>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-6 md:overflow-visible md:-mx-0 md:px-0 scrollbar-hide">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
