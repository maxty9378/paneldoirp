import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  BookOpen,
  TrendingUp,
  Award,
  Shield,
  MapPin,
  Video,
  CalendarDays,
  Users2,
  CheckCircle2,
  Info,
  Play,
  Pause,
  Loader2,
  XCircle,
  RefreshCw,
  ArrowRight,
  Sparkle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getCachedEvents, setCachedEvents, clearEventsCache } from '../lib/eventsCache';
import { Event, USER_ROLE_LABELS } from '../types';
import { supabase } from '../lib/supabase';

// Интерфейс для мероприятия с дополнительной информацией
interface EventWithDetails extends Event {
  event_type?: {
    id: string;
    name: string;
    name_ru: string;
  };
  participants_count?: number;
}

// Единая карта статусов, чтобы визуально унифицировать карточки
const STATUS_MAP = {
  draft: { label: '', tone: 'text-slate-600 bg-slate-100', ring: 'ring-slate-200', Icon: Pause },
  published: { label: '', tone: 'text-[#0E9F6E] bg-[#0E9F6E]/10', ring: 'ring-[#0E9F6E]/20', Icon: Play },
  active: {
    label: 'Активно',
    tone: 'text-[#0E9F6E] bg-[#0E9F6E]/10',
    ring: 'ring-[#0E9F6E]/20',
    Icon: () => <div className="h-3.5 w-3.5 rounded-full bg-[#0E9F6E]" />
  },
  ongoing: { label: 'Идёт', tone: 'text-sky-600 bg-sky-50', ring: 'ring-sky-200', Icon: Loader2 },
  completed: { label: '', tone: 'text-slate-600 bg-slate-100', ring: 'ring-slate-200', Icon: CheckCircle2 },
  cancelled: { label: '', tone: 'text-rose-600 bg-rose-50', ring: 'ring-rose-200', Icon: XCircle }
} as const;

// Вспомогательная функция для отображения типа мероприятия
const TYPE_LABELS = {
  training: { label: 'Онлайн тренинг', icon: Video },
  webinar: { label: 'Вебинар', icon: CalendarDays },
  workshop: { label: 'Мастер-класс', icon: Users2 },
  exam: { label: 'Экзамен', icon: CheckCircle2 },
  other: { label: 'Другое', icon: Info }
} as const;

// Карточка мероприятия с визуальной идентикой
function EventCard({ event, animationDelay = 0 }: { event: EventWithDetails; animationDelay?: number }) {
  const { userProfile } = useAuth();

  // Развёрнутые комментарии на русском по требованию пользователя
  // Определяем, имеет ли эксперт доступ к карточке экзамена
  const role = userProfile?.role;
  const isExpert = role === 'expert';
  const isAdmin = role === 'administrator';
  const expertEmails = Array.isArray(event.expert_emails) ? event.expert_emails : [];
  const isExamTalentReserve = event.event_type?.name === 'exam_talent_reserve';
  const isExpertAssigned = isExpert && expertEmails.includes(userProfile?.email || '');
  const shouldOpenExam = isExamTalentReserve && (isAdmin || isExpertAssigned);

  if (isExpert && isExamTalentReserve && !shouldOpenExam) {
    return null;
  }

  // Подготавливаем дату для компактного отображения
  const baseDate = event.start_date || event.date_time || event.created_at || '';
  const parsedDate = useMemo(() => {
    const d = new Date(baseDate);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [baseDate]);

  const status = STATUS_MAP[event.status as keyof typeof STATUS_MAP] || STATUS_MAP.draft;
  const { label, tone: statusTone, ring, Icon: StatusIcon } = status;

  const typeInfo = event.type
    ? TYPE_LABELS[event.type as keyof typeof TYPE_LABELS] || { label: event.event_type?.name_ru || 'Мероприятие', icon: Info }
    : {
        label: event.event_type?.name === 'exam_talent_reserve' ? 'Экзамен' : event.event_type?.name_ru || 'Мероприятие',
        icon: event.event_type?.name === 'exam_talent_reserve' ? CheckCircle2 : Info
      };

  const TypeIcon = typeInfo.icon;

  // Отдельная функция для акцентной плашки с датой
  const DateAccent = ({ date }: { date: Date | null }) => {
    if (!date) {
      return (
        <div className="rounded-2xl border border-slate-200/50 bg-slate-50/80 px-4 py-3 text-center backdrop-blur-sm">
          <div className="text-[11px] font-medium text-slate-500">Дата</div>
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

    const monthWithCorrectEnding = month.endsWith('ь') ? `${month.slice(0, -1)}я` : month;

    return (
      <div className="relative rounded-2xl border border-[#0E9F6E]/20 bg-gradient-to-br from-[#0E9F6E]/5 to-[#0E9F6E]/10 px-4 py-3 text-center shadow-sm backdrop-blur-sm">
        <div className="flex items-end justify-center gap-1 leading-none">
          <span className="text-2xl font-bold text-slate-900 md:text-3xl">{day}</span>
        </div>
        <div className="mt-1 text-[12px] font-medium text-slate-600">{monthWithCorrectEnding}</div>
        <div className="mt-2 text-[11px] font-semibold text-slate-700">{time}</div>
      </div>
    );
  };

  const typeChipClasses = useMemo(() => {
    if (event.event_type?.name === 'exam_talent_reserve') {
      return 'animate-gradient-shift text-white ring-0 shadow-lg';
    }

    const typeColors: Record<string, string> = {
      training: 'bg-sky-50 text-sky-700 ring-sky-200',
      webinar: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
      workshop: 'bg-purple-50 text-purple-700 ring-purple-200',
      exam: 'bg-rose-50 text-rose-700 ring-rose-200',
      other: 'bg-amber-50 text-amber-700 ring-amber-200'
    };

    return typeColors[event.type || 'other'] || 'bg-slate-50 text-slate-700 ring-slate-200';
  }, [event.event_type?.name, event.type]);

    return (
      <article
        className="dashboard-card-enter group relative flex h-full min-w-[260px] flex-col overflow-hidden rounded-[26px] border border-white/40 bg-white/70 p-5 shadow-[0_28px_60px_-36px_rgba(15,23,42,0.55)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_48px_80px_-42px_rgba(15,23,42,0.45)] sm:min-w-0"
        style={{ animationDelay: `${animationDelay}ms` }}
      >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,159,110,0.08),transparent_65%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex h-full flex-col">
        <header className="mb-4 flex flex-shrink-0 items-start justify-between gap-3">
          <div className="min-w-0 flex flex-col gap-3">
            <div className="flex flex-col gap-2">
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
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-semibold ring-1 shadow-sm ${typeChipClasses}`}
                >
                  <TypeIcon className="h-3.5 w-3.5" />
                  {typeInfo.label}
                </span>
              </div>
            </div>

            <h3 className="text-lg font-semibold leading-tight text-slate-900">{event.title}</h3>
            {event.location && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>

          <div className="w-[108px] shrink-0">
            <DateAccent date={parsedDate} />
          </div>
        </header>

        <div className="flex-1">
          {event.description && (
            <div className="mb-4 rounded-[20px] border border-slate-200/50 bg-slate-50/70 p-4 backdrop-blur-sm">
              <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{event.description}</p>
            </div>
          )}
        </div>

        <footer className="mt-auto flex-shrink-0">
          <button
            onClick={() => {
              if (shouldOpenExam) {
                window.location.href = `/expert-exam/${event.id}`;
              } else {
                window.location.href = `/event/${event.id}`;
              }
            }}
            className={`group/button relative w-full justify-center overflow-hidden rounded-2xl py-3 px-4 font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0EA47A]/30 ${
              shouldOpenExam
                ? 'bg-gradient-to-r from-[#0EA47A] via-[#06A478] to-[#059669] text-white hover:from-[#059669] hover:to-[#047857]'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            } shadow-sm hover:shadow-lg`}
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

// Карточка статистики с вариативной цветовой палитрой
function StatsCard({
  title,
  value,
  icon,
  tone
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  tone: 'emerald' | 'slate' | 'blue' | 'amber';
}) {
  const palette = {
    emerald: {
      badge: 'bg-emerald-500/10 text-emerald-600',
      border: 'border-emerald-500/15'
    },
    slate: {
      badge: 'bg-slate-500/10 text-slate-600',
      border: 'border-slate-500/15'
    },
    blue: {
      badge: 'bg-sky-500/10 text-sky-600',
      border: 'border-sky-500/15'
    },
    amber: {
      badge: 'bg-amber-500/10 text-amber-600',
      border: 'border-amber-500/15'
    }
  } as const;

  const colors = palette[tone];

  return (
    <div
      className={`relative flex min-w-[150px] flex-1 items-center gap-3 overflow-hidden rounded-[22px] border ${colors.border} bg-white/80 px-4 py-3 shadow-[0_24px_44px_-32px_rgba(15,23,42,0.5)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-0.5`}
    >
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${colors.badge}`}>{icon}</div>
      <div className="space-y-1">
        <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{title}</div>
        <div className="text-lg font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

// Лоадер в фирменном стиле, чтобы не дублировать разметку
function LoadingPulse({ message = 'Загружаем данные…' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-emerald-500 border-t-transparent" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}

// Приветственный блок для эффекта "Apple 2025"
function HeroPanel({
  greeting,
  fullName,
  motivationalMessage,
  roleLabel,
  gradientAngle
}: {
  greeting: string;
  fullName: string;
  motivationalMessage: string;
  roleLabel: string;
  gradientAngle: number;
}) {
  const firstName = useMemo(() => {
    const parts = fullName.split(' ');
    return parts.length > 1 ? parts[1] : parts[0];
  }, [fullName]);

  return (
    <section
      className="relative overflow-hidden rounded-[32px] border border-white/15 px-6 py-8 text-white shadow-[0_44px_120px_-70px_rgba(8,47,35,0.8)] sm:px-10 sm:py-10"
      style={{
        background: `linear-gradient(${gradientAngle}deg, rgba(11,138,103,0.95) 0%, rgba(8,115,86,0.9) 45%, rgba(6,93,70,0.95) 100%)`
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),transparent_55%)]" />
      <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-emerald-300/30 blur-3xl" />
      <div className="absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_40%)]" />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
            <Sparkle className="h-3.5 w-3.5" />
            <span>Панель развития</span>
          </div>
          <div className="space-y-3">
            <h1 className="text-[28px] font-semibold leading-tight sm:text-[34px]">
              {greeting}, {firstName}!
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">{motivationalMessage}</p>
          </div>
          <div className="inline-flex flex-wrap items-center gap-2 text-xs text-white/85 sm:text-sm">
            <Shield className="h-4 w-4" />
            <span className="font-medium">Ваша роль — {roleLabel}</span>
          </div>
        </div>


      </div>
    </section>
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

  // Фиксируем мотивационное сообщение, чтобы оно не дёргалось при рендерах
  const motivationalMessage = useMemo(() => {
    if (userProfile?.role === 'expert') {
      const expertMessages = [
        'Спасибо за ваш вклад в развитие команды!',
        'Ваша экспертная оценка помогает расти другим.',
        'Благодарим за участие в наставничестве.',
        'Ваш опыт ценен для всей команды.',
        'Спасибо за вашу экспертную поддержку.'
      ];
      return expertMessages[Math.floor(Math.random() * expertMessages.length)];
    }

    const messages = [
      'Готовы к новым знаниям?',
      'Продолжайте развиваться!',
      'Каждый день — новая возможность учиться.',
      'Ваш путь к успеху начинается здесь.',
      'Инвестируйте в своё будущее.'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }, [userProfile?.role]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHeroGradientAngle(prev => (prev + 1) % 360);
    }, 120);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  // Загружаем мероприятия с учётом кэша и принудительного обновления
  const fetchUserEvents = useCallback(
    async (forceRefresh = false) => {
      if (!user?.id || !userProfile?.role) return;

      try {
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

        if (error) {
          console.error('Error fetching events:', error);
          setEventsError(`Ошибка загрузки мероприятий: ${error.message}`);
          return;
        }

        if (data) {
          const uniqueEvents = data.reduce((acc, event) => {
            if (!acc.find(e => e.id === event.id)) {
              acc.push(event);
            }
            return acc;
          }, [] as EventWithDetails[]);

          const eventsWithDetails = uniqueEvents.map(event => ({
            ...event,
            participants_count: 0
          }));

          setUpcomingEvents(eventsWithDetails);
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
    },
    [user?.id, userProfile?.role, userProfile?.email]
  );

  // Загружаем компактную статистику по роли
  const fetchStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      const isAdmin = userProfile?.role && ['administrator', 'moderator', 'trainer'].includes(userProfile.role);
      const isExpert = userProfile?.role === 'expert';

      if (isAdmin) {
        const { data: eventsData } = await supabase.from('events').select('id, status').eq('status', 'active');
        const { data: participantsData } = await supabase.from('event_participants').select('id');

        setStats({
          activeEvents: eventsData?.length || 0,
          totalParticipants: participantsData?.length || 0,
          completedCourses: 0,
          averageRating: 4.8
        });
      } else if (isExpert) {
        const { data: expertEventsData } = await supabase
          .from('events')
          .select('id, status')
          .contains('expert_emails', [userProfile?.email])
          .eq('status', 'active');

        setStats({
          activeEvents: expertEventsData?.length || 0,
          totalParticipants: 0,
          completedCourses: 0,
          averageRating: 0
        });
      } else {
        const { data: userEventsData } = await supabase
          .from('events')
          .select('id, status')
          .eq('status', 'active')
          .eq('event_participants.user_id', user.id);

        setStats({
          activeEvents: userEventsData?.length || 0,
          totalParticipants: 0,
          completedCourses: 0,
          averageRating: 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [user?.id, userProfile?.role, userProfile?.email]);

  useEffect(() => {
    if (user && userProfile) {
      clearEventsCache();
      fetchUserEvents();
      fetchStats();
    }
  }, [user, userProfile, fetchUserEvents, fetchStats]);

  const role = userProfile?.role;

  const statsCards = useMemo(() => {
    if (!role) return [];

    if (role === 'expert') {
      return [
        {
          title: 'Активные экзамены',
          value: stats.activeEvents,
          icon: <CheckCircle2 className="h-5 w-5" />,
          tone: 'emerald' as const
        }
      ];
    }

    const baseCards = [
      {
        title: 'Активные мероприятия',
        value: stats.activeEvents,
        icon: <BookOpen className="h-5 w-5" />,
        tone: 'emerald' as const
      },
      {
        title: 'Завершенные курсы',
        value: stats.completedCourses,
        icon: <Award className="h-5 w-5" />,
        tone: 'amber' as const
      }
    ];

    if (['administrator', 'moderator', 'trainer'].includes(role)) {
      baseCards.push(
        {
          title: 'Участники',
          value: stats.totalParticipants,
          icon: <Users className="h-5 w-5" />,
          tone: 'blue' as const
        },
        {
          title: 'Средняя оценка',
          value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—',
          icon: <TrendingUp className="h-5 w-5" />,
          tone: 'slate' as const
        }
      );
    }

    return baseCards;
  }, [role, stats]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingPulse message="Загружаем ваш дашборд…" />
      </div>
    );
  }

  return (
    <div className="relative pb-28 pb-safe-bottom md:pb-12">
      <div className="absolute inset-x-0 -top-24 h-56 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.22),transparent_65%)] blur-3xl" />
      <div className="absolute inset-x-0 top-40 h-72 bg-[radial-gradient(circle_at_center,_rgba(6,164,120,0.12),transparent_70%)] blur-2xl" />

      <div className="relative z-10 flex flex-col gap-8">
        <HeroPanel
          greeting={getGreeting()}
          fullName={userProfile?.full_name || 'Пользователь'}
          motivationalMessage={motivationalMessage}
          roleLabel={userProfile?.role ? USER_ROLE_LABELS[userProfile.role] : 'Не определена'}
          gradientAngle={heroGradientAngle}
        />

        {/* Instagram Stories Style Achievements - Full Width */}
        <section className="space-y-4">
          <div className="relative w-full rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-xl shadow-2xl">
            {/* Instagram Stories Progress Bars */}
            <div className="flex gap-2 mb-6">
              <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full w-full bg-white rounded-full"></div>
              </div>
              <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full w-0 bg-white rounded-full"></div>
              </div>
              <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full w-0 bg-white rounded-full"></div>
              </div>
            </div>
            
            {/* Stories Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 p-0.5">
                <div className="h-full w-full rounded-full bg-gradient-to-br from-purple-200 to-purple-100 flex items-center justify-center">
                  <span className="text-sm">⭐</span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Достижения</h3>
                <p className="text-xs text-white/70">3 истории</p>
              </div>
            </div>
            
            {/* Stories Content - Instagram Style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Story 1 - Active */}
              <div className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 p-0.5">
                    <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
                      <span className="text-lg">⭐</span>
                    </div>
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-white"></div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white">Первый шаг</h4>
                  <p className="text-xs text-white/70">Завершено • 2 мин назад</p>
                </div>
                <div className="text-white/50">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>

              {/* Story 2 - Pending */}
              <div className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 p-0.5">
                    <div className="h-full w-full rounded-full bg-white/60 flex items-center justify-center">
                      <span className="text-lg text-gray-600">⭐</span>
                    </div>
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gray-400 border-2 border-white"></div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white/80">Второй шаг</h4>
                  <p className="text-xs text-white/50">В ожидании</p>
                </div>
                <div className="text-white/30">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>

              {/* Story 3 - Pending */}
              <div className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 p-0.5">
                    <div className="h-full w-full rounded-full bg-white/60 flex items-center justify-center">
                      <span className="text-lg text-gray-600">⭐</span>
                    </div>
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gray-400 border-2 border-white"></div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white/80">Третий шаг</h4>
                  <p className="text-xs text-white/50">В ожидании</p>
                </div>
                <div className="text-white/30">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Instagram Style Button */}
            <button className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#3E8074] to-[#4a8f81] py-3 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
              <span>Смотреть все истории</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Ваш прогресс</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statsCards.map(card => (
              <StatsCard key={card.title} title={card.title} value={card.value} icon={card.icon} tone={card.tone} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Ближайшие мероприятия</h2>
            <button
              onClick={() => fetchUserEvents(true)}
              disabled={eventsLoading}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors duration-200 hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${eventsLoading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>

          {eventsLoading ? (
            <LoadingPulse message="Загружаем мероприятия…" />
          ) : eventsError ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-red-100 bg-red-50/60 px-6 py-8 text-center text-red-600">
              <XCircle className="h-10 w-10" />
              <p className="text-sm font-semibold">{eventsError}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
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
                <p className="text-xs text-slate-500">Обратитесь к администратору, чтобы записаться и получить новые события.</p>
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
            <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 scrollbar-hide sm:-mx-6 sm:px-6 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:mx-0 md:px-0 xl:grid-cols-3">
              {upcomingEvents.map((event, index) => (
                <EventCard key={event.id} event={event} animationDelay={index * 70} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
