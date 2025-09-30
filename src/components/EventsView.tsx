import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Filter,
  ListFilter,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Shield,
  Sparkle,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Event, EVENT_TYPE_LABELS, USER_ROLE_LABELS } from '../types';
import { EventCard } from './events/EventCard';

type SortBy = 'start_date' | 'title' | 'participants' | 'status' | 'created_at';

type EventsFetchMode = 'admin' | 'expert' | 'participant';

interface EventsViewProps {
  onCreateEvent?: () => void;
  onNavigateToEvent?: (eventId: string) => void;
  onEditEvent?: (eventId: string) => void;
}

interface EventWithStats extends Event {
  participants_count?: number;
  test_completed_count?: number;
  test_not_passed_count?: number;
  test_pending_review_count?: number;
  test_pass_percent?: number;
  event_types?: { id: string; name: string; name_ru: string } | null;
}

interface FetchOptions {
  silent?: boolean;
}

export function EventsView({ onCreateEvent, onNavigateToEvent, onEditEvent }: EventsViewProps) {
  const { user, userProfile } = useAuth();
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('start_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [showFilters, setShowFilters] = useState(false);
  const [heroGradientAngle, setHeroGradientAngle] = useState(120);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const role = userProfile?.role ?? user?.role ?? 'employee';

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHeroGradientAngle((prev) => (prev + 1) % 360);
    }, 120);

    return () => window.clearInterval(interval);
  }, []);

  const motivationalMessage = useMemo(() => {
    if (role === 'expert') {
      const phrases = [
        'Спасибо за экспертную поддержку команды!',
        'Ваша оценка помогает коллегам расти.',
        'Вы делаете обучение точнее и эффективнее.'
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }

    const phrases = [
      'Продолжайте развитие и поддерживайте команду знаниями.',
      'Каждое мероприятие приближает нас к сильной команде.',
      'Учиться и делиться опытом — ваша суперсила сегодня.'
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }, [role]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  }, []);

  const fetchEvents = useCallback(
    async ({ silent = false }: FetchOptions = {}) => {
      if (!user?.id) {
        return;
      }

      if (!silent) {
        setLoading(true);
      }
      setError(null);

      try {
        const mode: EventsFetchMode = role === 'expert'
          ? 'expert'
          : ['administrator', 'moderator', 'trainer'].includes(role)
            ? 'admin'
            : 'participant';

        let eventsQuery = supabase
          .from('events')
          .select('*, event_types(id, name, name_ru)')
          .order('start_date', { ascending: false });

        if (mode === 'expert') {
          eventsQuery = eventsQuery.contains('expert_emails', [userProfile?.email]);
        }

        if (mode === 'participant') {
          eventsQuery = eventsQuery
            .select('*, event_types(id, name, name_ru), event_participants!inner(user_id)')
            .eq('event_participants.user_id', user.id)
            .order('start_date', { ascending: false });
        }

        const { data, error: eventsError } = await eventsQuery;

        if (eventsError) {
          throw eventsError;
        }

        const normalizedEvents = (data ?? []).map((event: any) => ({
          ...event,
          event_types: event.event_types ?? null
        })) as EventWithStats[];

        if (normalizedEvents.length === 0) {
          setEvents([]);
          return;
        }

        const eventIds = normalizedEvents.map((event) => event.id).filter(Boolean);
        const eventTypeIds = normalizedEvents
          .map((event) => event.event_type_id)
          .filter((id): id is string => Boolean(id));

        const [participantsResponse, attemptsResponse, testsResponse] = await Promise.all([
          eventIds.length
            ? supabase
                .from('event_participants')
                .select('event_id')
                .in('event_id', eventIds)
            : Promise.resolve({ data: [] as { event_id: string }[], error: null }),
          eventIds.length
            ? supabase
                .from('user_test_attempts')
                .select('event_id, status')
                .in('event_id', eventIds)
            : Promise.resolve({ data: [] as { event_id: string; status: string }[], error: null }),
          eventTypeIds.length
            ? supabase
                .from('tests')
                .select('event_type_id, passing_score')
                .in('event_type_id', eventTypeIds)
            : Promise.resolve({ data: [] as { event_type_id: string; passing_score: number }[], error: null })
        ]);

        if (participantsResponse.error) throw participantsResponse.error;
        if (attemptsResponse.error) throw attemptsResponse.error;
        if (testsResponse.error) throw testsResponse.error;

        const participantsMap = participantsResponse.data?.reduce<Record<string, number>>((acc, row: any) => {
          if (!row?.event_id) return acc;
          acc[row.event_id] = (acc[row.event_id] ?? 0) + 1;
          return acc;
        }, {}) ?? {};

        const completedAttemptsMap: Record<string, number> = {};
        const pendingReviewMap: Record<string, number> = {};

        attemptsResponse.data?.forEach((row: any) => {
          if (!row?.event_id) return;
          if (row.status === 'completed') {
            completedAttemptsMap[row.event_id] = (completedAttemptsMap[row.event_id] ?? 0) + 1;
          }
          if (row.status === 'pending_review') {
            pendingReviewMap[row.event_id] = (pendingReviewMap[row.event_id] ?? 0) + 1;
          }
        });

        const passingScoreMap = testsResponse.data?.reduce<Record<string, number>>((acc, row: any) => {
          if (!row?.event_type_id) return acc;
          if (!(row.event_type_id in acc)) {
            acc[row.event_type_id] = row.passing_score ?? 70;
          }
          return acc;
        }, {}) ?? {};

        const eventsWithStats = normalizedEvents.map((event) => {
          const participantsCount = participantsMap[event.id] ?? 0;
          const completedCount = completedAttemptsMap[event.id] ?? 0;
          const pendingReviewCount = pendingReviewMap[event.id] ?? 0;
          const passingScore = passingScoreMap[event.event_type_id] ?? 70;
          const notPassedCount = Math.max(participantsCount - completedCount, 0);

          return {
            ...event,
            participants_count: participantsCount,
            test_completed_count: completedCount,
            test_pending_review_count: pendingReviewCount,
            test_not_passed_count: notPassedCount,
            test_pass_percent: passingScore
          };
        });

        setEvents(eventsWithStats);
      } catch (fetchError: any) {
        console.error('Ошибка загрузки мероприятий:', fetchError);
        setError(fetchError?.message ?? 'Не удалось загрузить мероприятия');
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [role, user?.id, userProfile?.email]
  );

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user, fetchEvents]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchEvents({ silent: true });
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchEvents]);

  const filteredEvents = useMemo(() => {
    let list = [...events];
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (activeTab === 'active') {
      list = list.filter((event) => ['active', 'published', 'ongoing', 'draft'].includes(event.status));
    } else {
      list = list.filter((event) => event.status === 'completed');
    }

    if (normalizedSearch) {
      list = list.filter((event) =>
        event.title?.toLowerCase().includes(normalizedSearch) ||
        event.description?.toLowerCase().includes(normalizedSearch) ||
        event.location?.toLowerCase().includes(normalizedSearch)
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter((event) => event.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      list = list.filter((event) => event.type === typeFilter);
    }

    list.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'title':
          aValue = (a.title || '').toLowerCase();
          bValue = (b.title || '').toLowerCase();
          break;
        case 'participants':
          aValue = a.participants_count ?? 0;
          bValue = b.participants_count ?? 0;
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'created_at':
          aValue = new Date(a.created_at || '').getTime();
          bValue = new Date(b.created_at || '').getTime();
          break;
        case 'start_date':
        default:
          aValue = new Date(a.start_date || a.date_time || '').getTime();
          bValue = new Date(b.start_date || b.date_time || '').getTime();
          break;
      }

      const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortOrder === 'asc' ? result : -result;
    });

    return list;
  }, [events, activeTab, searchTerm, statusFilter, typeFilter, sortBy, sortOrder]);

  const aggregatedStats = useMemo(() => {
    const total = events.length;
    const active = events.filter((event) => ['active', 'published', 'ongoing', 'draft'].includes(event.status)).length;
    const completed = events.filter((event) => event.status === 'completed').length;
    const upcoming = events.filter((event) => {
      const date = new Date(event.start_date || event.date_time || '');
      if (Number.isNaN(date.getTime())) return false;
      return date >= new Date();
    }).length;
    const participants = events.reduce((acc, event) => acc + (event.participants_count ?? 0), 0);
    const pendingReviews = events.reduce((acc, event) => acc + (event.test_pending_review_count ?? 0), 0);

    return { total, active, completed, upcoming, participants, pendingReviews };
  }, [events]);

  const insight = useMemo(() => {
    if (!events.length) {
      return 'Как только появится первое мероприятие, здесь отобразится его статус.';
    }

    return `Активных мероприятий: ${aggregatedStats.active}. Тестов на проверке: ${aggregatedStats.pendingReviews}.`;
  }, [aggregatedStats.active, aggregatedStats.pendingReviews, events.length]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setSortBy('start_date');
    setSortOrder('desc');
    setShowFilters(false);
  };

  if (loading) {
    return <EventsSkeleton />;
  }

  if (error) {
    return <EventsError message={error} onRetry={() => fetchEvents()} />;
  }

  const roleLabel = USER_ROLE_LABELS[role] ?? 'Сотрудник';
  const fullName = userProfile?.full_name || user?.full_name || 'Коллега';

  return (
    <div className="space-y-8 pb-safe-bottom">
      <HeroPanel
        gradientAngle={heroGradientAngle}
        greeting={greeting}
        fullName={fullName}
        motivationalMessage={motivationalMessage}
        roleLabel={roleLabel}
        insight={insight}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Всего мероприятий"
          value={aggregatedStats.total}
          icon={<CalendarDays className="h-4 w-4" />}
          tone="emerald"
        />
        <StatsCard
          title="Активные сейчас"
          value={aggregatedStats.active}
          icon={<Play className="h-4 w-4" />}
          tone="blue"
        />
        <StatsCard
          title="Ближайшие"
          value={aggregatedStats.upcoming}
          icon={<ArrowRight className="h-4 w-4" />}
          tone="slate"
        />
        <StatsCard
          title="Тестов на проверке"
          value={aggregatedStats.pendingReviews}
          icon={<AlertCircle className="h-4 w-4" />}
          tone="amber"
        />
      </section>

      <section className="rounded-[28px] border border-white/40 bg-white/80 p-6 shadow-[0_28px_60px_-36px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Поиск по названию, описанию или месту..."
              className="w-full rounded-2xl border border-slate-200 bg-white/70 py-3 pl-11 pr-12 text-sm font-medium text-slate-700 transition focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                aria-label="Очистить поиск"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              <ListFilter className="h-4 w-4" />
              {showFilters ? 'Скрыть фильтры' : 'Фильтры'}
            </button>
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 rounded-2xl border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Сбросить
            </button>
            <button
              onClick={onCreateEvent}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-600 hover:to-emerald-700"
              disabled={!['trainer', 'moderator', 'administrator'].includes(role)}
            >
              <CalendarDays className="h-4 w-4" />
              Создать мероприятие
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              label="Статус"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'Все статусы' },
                { value: 'draft', label: 'Черновик' },
                { value: 'published', label: 'Опубликовано' },
                { value: 'active', label: 'Активно' },
                { value: 'ongoing', label: 'Проходит' },
                { value: 'completed', label: 'Завершено' },
                { value: 'cancelled', label: 'Отменено' }
              ]}
            />
            <FilterSelect
              label="Тип"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'all', label: 'Все типы' },
                ...Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))
              ]}
            />
            <FilterSelect
              label="Сортировка"
              value={sortBy}
              onChange={(value) => setSortBy(value as SortBy)}
              options={[
                { value: 'start_date', label: 'По дате проведения' },
                { value: 'title', label: 'По названию' },
                { value: 'participants', label: 'По участникам' },
                { value: 'status', label: 'По статусу' },
                { value: 'created_at', label: 'По дате создания' }
              ]}
            />
            <FilterSelect
              label="Порядок"
              value={sortOrder}
              onChange={(value) => setSortOrder(value as 'asc' | 'desc')}
              options={[
                { value: 'desc', label: 'Сначала новые' },
                { value: 'asc', label: 'Сначала старые' }
              ]}
            />
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {statusFilter !== 'all' && (
            <FilterChip onClear={() => setStatusFilter('all')}>Статус: {statusFilter}</FilterChip>
          )}
          {typeFilter !== 'all' && (
            <FilterChip onClear={() => setTypeFilter('all')}>Тип: {EVENT_TYPE_LABELS[typeFilter] ?? typeFilter}</FilterChip>
          )}
          {searchTerm && (
            <FilterChip onClear={() => setSearchTerm('')}>Поиск: {searchTerm}</FilterChip>
          )}
        </div>
      </section>

      <section className="space-y-5">
        <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm font-medium text-slate-600">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 rounded-full px-4 py-2 transition ${
              activeTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            <Play className="h-4 w-4" />
            Активные
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 rounded-full px-4 py-2 transition ${
              activeTab === 'completed' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Завершённые
          </button>
        </div>

        {filteredEvents.length === 0 ? (
          <EmptyEventsState
            hasEvents={events.length > 0}
            canCreate={['trainer', 'moderator', 'administrator'].includes(role)}
            onCreateEvent={onCreateEvent}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
                canCreateEvents={['trainer', 'moderator', 'administrator'].includes(role)}
                onNavigateToEvent={onNavigateToEvent}
                onEditEvent={onEditEvent}
                onDeleteEvent={handleDeleteEvent}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );

  async function handleDeleteEvent(eventId: string) {
    if (!window.confirm('Удалить мероприятие?')) return;

    try {
      const { error: deleteError } = await supabase.from('events').delete().eq('id', eventId);
      if (deleteError) throw deleteError;
      await fetchEvents({ silent: true });
    } catch (deleteErr) {
      console.error('Ошибка удаления мероприятия:', deleteErr);
      alert('Не удалось удалить мероприятие. Попробуйте позже.');
    }
  }
}

function HeroPanel({
  gradientAngle,
  greeting,
  fullName,
  motivationalMessage,
  roleLabel,
  insight,
  onRefresh,
  isRefreshing
}: {
  gradientAngle: number;
  greeting: string;
  fullName: string;
  motivationalMessage: string;
  roleLabel: string;
  insight: string;
  onRefresh: () => void;
  isRefreshing: boolean;
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

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
            <Sparkle className="h-3.5 w-3.5" />
            <span>Центр мероприятий</span>
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
          <p className="max-w-xl text-xs text-white/75 sm:text-sm">{insight}</p>
        </div>

        <button
          onClick={onRefresh}
          className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 transition-transform group-hover:rotate-12" />
          )}
          <span>Обновить данные</span>
        </button>
      </div>
    </section>
  );
}

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
    <div className={`relative flex min-w-[150px] flex-1 items-center gap-3 overflow-hidden rounded-[22px] border ${colors.border} bg-white/80 px-4 py-3 shadow-[0_24px_44px_-32px_rgba(15,23,42,0.5)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-0.5`}>
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${colors.badge}`}>{icon}</div>
      <div className="space-y-1">
        <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{title}</div>
        <div className="text-lg font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
      <span>{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  );
}

function FilterChip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
      {children}
      <button
        onClick={onClear}
        className="rounded-full p-1 transition hover:bg-slate-200"
        aria-label="Очистить фильтр"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function EmptyEventsState({
  hasEvents,
  canCreate,
  onCreateEvent
}: {
  hasEvents: boolean;
  canCreate: boolean;
  onCreateEvent?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-300 bg-white/70 py-16 text-center shadow-inner">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100">
        <CalendarDays className="h-12 w-12 text-slate-400" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">
        {hasEvents ? 'По фильтрам ничего не найдено' : 'Пока нет мероприятий'}
      </h3>
      <p className="mb-6 max-w-md text-sm text-slate-600">
        {hasEvents
          ? 'Попробуйте изменить параметры фильтра или поиск.'
          : canCreate
            ? 'Создайте первое мероприятие и приглашайте коллег прямо из панели.'
            : 'Как только вас добавят участником, мероприятия появятся здесь.'}
      </p>
      {canCreate && !hasEvents && (
        <button
          onClick={onCreateEvent}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-600 hover:to-emerald-700"
        >
          <CalendarDays className="h-4 w-4" />
          Создать первое мероприятие
        </button>
      )}
    </div>
  );
}

function EventsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-48 rounded-[32px] bg-gradient-to-r from-emerald-200/60 via-emerald-100/40 to-emerald-200/60" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded-[22px] bg-slate-100" />
        ))}
      </div>
      <div className="h-40 rounded-[28px] bg-white/70" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-64 rounded-[26px] bg-white/60" />
        ))}
      </div>
    </div>
  );
}

function EventsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[32px] border border-rose-200 bg-rose-50/80 px-8 py-16 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-rose-100">
        <AlertCircle className="h-12 w-12 text-rose-500" />
      </div>
      <h3 className="text-xl font-semibold text-rose-700 mb-2">Ошибка загрузки</h3>
      <p className="mb-6 max-w-md text-sm text-rose-600">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600"
      >
        <RefreshCw className="h-4 w-4" />
        Попробовать снова
      </button>
    </div>
  );
}
