import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  Filter,
  Search,
  Plus,
  Download,
  Upload,
  RefreshCw,
  CalendarDays,
  Calendar as CalendarIcon,
  Zap,
  AlertCircle,
  Play,
  CheckCircle,
  Pause,
  X,
  ChevronRight,
} from 'lucide-react';
import { Event, EVENT_TYPE_LABELS } from '../types';
import { EventCard } from './events/EventCard';

interface EventsViewProps {
  onCreateEvent?: () => void;
  onNavigateToEvent?: (eventId: string) => void;
  onEditEvent?: (eventId: string) => void;
}

interface EventWithStats extends Event {
  participants_count?: number;
  attendance_rate?: number;
  pending_tests?: number;
  pending_feedback?: number;
  has_report?: boolean;
  test_completed_count?: number;
  test_not_passed_count?: number;
  test_pass_percent?: number;
  event_types?: { id: string; name: string; name_ru: string };
}

type SortBy = 'start_date' | 'title' | 'participants' | 'status' | 'created_at';

export function EventsView({ onCreateEvent, onNavigateToEvent, onEditEvent }: EventsViewProps) {
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('start_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const { user, userProfile } = useAuth();

  // Debounce поиска — приятнее UX и меньше ререндеров
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  useEffect(() => {
    if (user) fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const isAdmin =
        !!userProfile?.role &&
        ['administrator', 'moderator', 'trainer'].includes(userProfile.role);

      let data: any[] | null = null;
      let err: any = null;

      if (isAdmin) {
        const { data: d, error: e } = await supabase
          .from('events')
          .select('*, event_types(id, name, name_ru)')
          .order('start_date', { ascending: false });
        data = d;
        err = e;
      } else {
        const { data: d, error: e } = await supabase
          .from('events')
          .select('*, event_types(id, name, name_ru), event_participants!inner(user_id)')
          .eq('event_participants.user_id', user?.id)
          .order('start_date', { ascending: false });
        data = d;
        err = e;
      }

      if (err) {
        setError(`Ошибка загрузки: ${err.message}`);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      // Подтягиваем быстрые метрики по каждому событию
      const eventsWithStats: EventWithStats[] = await Promise.all(
        data.map(async (event: Event) => {
          const { data: participantsData } = await supabase
            .from('event_participants')
            .select('id, user_id')
            .eq('event_id', event.id);

          const participantsCount = participantsData?.length || 0;

          const { data: completedAttempts } = await supabase
            .from('user_test_attempts')
            .select('id, user_id')
            .eq('event_id', event.id)
            .eq('status', 'completed');

          const completedCount = completedAttempts?.length || 0;

          const testPassPercent =
            participantsCount > 0 ? Math.round((completedCount / participantsCount) * 100) : 0;

          const notPassedCount = Math.max(participantsCount - completedCount, 0);

          return {
            ...event,
            participants_count: participantsCount,
            test_completed_count: completedCount,
            test_pass_percent: testPassPercent,
            test_not_passed_count: notPassedCount,
          };
        })
      );

      setEvents(eventsWithStats);
    } catch (e: any) {
      setError(`Произошла ошибка: ${e?.message || 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация + сортировка — на мемо, чтобы не трясти DOM
  const filteredEvents = useMemo(() => {
    let list = [...events];

    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      list = list.filter(
        (ev) =>
          ev.title?.toLowerCase().includes(s) ||
          ev.description?.toLowerCase().includes(s) ||
          ev.location?.toLowerCase().includes(s)
      );
    }

    if (statusFilter !== 'all') list = list.filter((ev) => ev.status === statusFilter);
    if (typeFilter !== 'all') list = list.filter((ev) => ev.type === typeFilter);

    list.sort((a, b) => {
      let av: any;
      let bv: any;
      switch (sortBy) {
        case 'title':
          av = (a.title || '').toLowerCase();
          bv = (b.title || '').toLowerCase();
          break;
        case 'participants':
          av = a.participants_count || 0;
          bv = b.participants_count || 0;
          break;
        case 'status':
          av = a.status || '';
          bv = b.status || '';
          break;
        case 'created_at':
          av = new Date(a.created_at || 0).getTime();
          bv = new Date(b.created_at || 0).getTime();
          break;
        case 'start_date':
        default:
          av = new Date((a as any).start_date || (a as any).date_time || 0).getTime();
          bv = new Date((b as any).start_date || (b as any).date_time || 0).getTime();
      }
      const res = av < bv ? -1 : av > bv ? 1 : 0;
      return sortOrder === 'asc' ? res : -res;
    });

    return list;
  }, [events, debouncedSearch, statusFilter, typeFilter, sortBy, sortOrder]);

  const canCreateEvents =
    !!userProfile?.role && ['trainer', 'moderator', 'administrator'].includes(userProfile.role);

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Удалить мероприятие?')) return;
    try {
      const { error: delErr } = await supabase.from('events').delete().eq('id', eventId);
      if (delErr) throw delErr;
      await fetchEvents();
    } catch (e) {
      console.error('Error deleting event:', e);
    }
  };

  const toggleEventSelection = (id: string) => {
    setSelectedEvents((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // ---------------- UI helpers ----------------
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setSortBy('start_date');
    setSortOrder('desc');
  };

  // ---------------- Render ----------------

  if (loading) {
    return (
      <div className="min-h-[420px]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sns-500 to-sns-600 animate-pulse" />
            <div className="h-6 w-48 bg-slate-200 rounded-md animate-pulse" />
          </div>
          <div className="hidden md:flex gap-2">
            <div className="h-9 w-32 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-9 w-40 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-9 w-44 bg-slate-200 rounded-lg animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="h-4 w-16 bg-slate-200 rounded mb-2 animate-pulse" />
              <div className="h-6 w-10 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[420px] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-800">Ошибка загрузки</h3>
            <p className="text-slate-600">{error}</p>
          </div>
          <button
            onClick={() => fetchEvents()}
            className="inline-flex items-center px-6 py-3 bg-sns-500 text-white font-medium rounded-xl hover:bg-sns-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  const activeCount = events.filter((e) => ['active', 'published', 'ongoing'].includes(e.status)).length;
  const completedCount = events.filter((e) => e.status === 'completed').length;
  const draftsCount = events.filter((e) => e.status === 'draft').length;
  const inMonthCount = events.filter((e) => {
    const d = new Date((e as any).start_date || (e as any).date_time || '');
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const tasksCount = events.reduce((acc, ev) => {
    let t = 0;
    if (ev.pending_tests && ev.pending_tests > 0) t++;
    if (ev.pending_feedback && ev.pending_feedback > 0) t++;
    // отчет
    if (ev.status === 'completed' && !ev.has_report) t++;
    return acc + t;
  }, 0);

  return (
    <div className="space-y-8 pb-safe-bottom">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-sns-500 to-sns-600 rounded-xl flex items-center justify-center shadow-sm">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Мероприятия по обучению</h1>
            <p className="text-slate-600 text-sm">
              {canCreateEvents ? 'Создавайте и управляйте программами' : 'Участвуйте и проходите обучение'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearchFilters((v) => !v)}
            className="px-3.5 py-2 h-9 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all text-sm inline-flex items-center gap-2"
            title="Поиск и фильтры"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Поиск</span>
            <Filter className="w-4 h-4" />
          </button>

          {canCreateEvents && (
            <>
              <button className="px-3.5 py-2 h-9 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all text-sm inline-flex items-center gap-2">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Экспорт</span>
              </button>
              <button className="px-3.5 py-2 h-9 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all text-sm inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Импорт</span>
              </button>
            </>
          )}

          {canCreateEvents && (
            <button
              onClick={() => onCreateEvent?.()}
              className="px-3.5 py-2 h-9 bg-sns-500 text-white font-medium rounded-lg hover:bg-sns-600 transition-all text-sm inline-flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Создать</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      {showSearchFilters && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mt-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-sns-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Поиск по названию, описанию или месту…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-sns-500 focus:bg-white transition-all text-sm"
                />
                {searchTerm && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100"
                    onClick={() => setSearchTerm('')}
                    aria-label="Очистить"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sns-500 text-sm"
                title="Статус"
              >
                <option value="all">Все статусы</option>
                <option value="draft">Черновик</option>
                <option value="published">Опубликовано</option>
                <option value="active">Активно</option>
                <option value="ongoing">Проходит</option>
                <option value="completed">Завершено</option>
                <option value="cancelled">Отменено</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sns-500 text-sm"
                title="Тип"
              >
                <option value="all">Все типы</option>
                {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sns-500 text-sm"
                title="Сортировка"
              >
                <option value="start_date">По дате проведения</option>
                <option value="title">По названию</option>
                <option value="participants">По участникам</option>
                <option value="status">По статусу</option>
                <option value="created_at">По дате создания</option>
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sns-500 text-sm"
                title="Порядок"
              >
                <option value="desc">По убыванию</option>
                <option value="asc">По возрастанию</option>
              </select>

              <button
                onClick={resetFilters}
                className="px-3 py-2 text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all font-medium text-sm"
                title="Сбросить фильтры"
              >
                Сбросить
              </button>
            </div>
          </div>

          {/* Чипы-состояния под фильтрами */}
          <div className="flex flex-wrap gap-2 mt-3">
            {statusFilter !== 'all' && (
              <Chip onClear={() => setStatusFilter('all')}>Статус: {statusFilter}</Chip>
            )}
            {typeFilter !== 'all' && <Chip onClear={() => setTypeFilter('all')}>Тип: {typeFilter}</Chip>}
            {debouncedSearch && <Chip onClear={() => setSearchTerm('')}>Поиск: {debouncedSearch}</Chip>}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard
          label="Всего"
          value={events.length}
          icon={<CalendarIcon className="w-4 h-4 text-slate-600" />}
          iconWrapClass="from-slate-100 to-slate-200"
        />
        <StatCard
          label="Активные"
          value={activeCount}
          valueClass="text-emerald-600"
          icon={<Play className="w-4 h-4 text-emerald-600" />}
          iconWrapClass="from-emerald-100 to-emerald-200"
        />
        <StatCard
          label="Завершено"
          value={completedCount}
          valueClass="text-indigo-600"
          icon={<CheckCircle className="w-4 h-4 text-indigo-600" />}
          iconWrapClass="from-indigo-100 to-indigo-200"
        />
        <StatCard
          label="Черновики"
          value={draftsCount}
          valueClass="text-slate-700"
          icon={<Pause className="w-4 h-4 text-slate-600" />}
          iconWrapClass="from-slate-100 to-slate-200"
        />
        <StatCard
          label="Этот месяц"
          value={inMonthCount}
          valueClass="text-purple-600"
          icon={<CalendarDays className="w-4 h-4 text-purple-600" />}
          iconWrapClass="from-purple-100 to-purple-200"
        />
        <StatCard
          label="Задачи"
          value={tasksCount}
          valueClass="text-red-600"
          icon={<Zap className="w-4 h-4 text-red-600" />}
          iconWrapClass="from-red-100 to-red-200"
        />
      </div>

      {/* Bulk actions */}
      {selectedEvents.length > 0 && canCreateEvents && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <span className="text-sm font-semibold text-blue-900">
                  Выбрано мероприятий: {selectedEvents.length}
                </span>
                <button
                  onClick={() => setSelectedEvents([])}
                  className="block text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Отменить выбор
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ActionBtn>Активировать</ActionBtn>
              <ActionBtn className="bg-slate-500 hover:bg-slate-600">Деактивировать</ActionBtn>
              <ActionBtn className="bg-red-500 hover:bg-red-600">Удалить</ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CalendarIcon className="w-12 h-12 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            {events.length === 0 ? 'Нет мероприятий' : 'Ничего не найдено'}
          </h3>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            {events.length === 0
              ? canCreateEvents
                ? 'Создайте первое мероприятие для команды'
                : 'Здесь появятся ваши мероприятия, когда вас добавят участником'
              : 'Попробуйте скорректировать поиск или фильтры'}
          </p>
          {canCreateEvents && events.length === 0 && (
            <button
              onClick={() => onCreateEvent?.()}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-sns-500 to-sns-600 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="w-5 h-5 mr-2" />
              Создать первое мероприятие
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEvents.map((event, idx) => (
            <EventCard
              key={event.id}
              event={event}
              index={idx}
              canCreateEvents={canCreateEvents || false}
              onNavigateToEvent={onNavigateToEvent}
              onEditEvent={onEditEvent}
              onDeleteEvent={handleDeleteEvent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Маленькие UI-компоненты ---------- */

function StatCard({
  label,
  value,
  valueClass,
  icon,
  iconWrapClass,
}: {
  label: string;
  value: number | string;
  valueClass?: string;
  icon: React.ReactNode;
  iconWrapClass?: string;
}) {
  return (
    <div className="group bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-600">{label}</p>
          <p className={`text-xl font-bold ${valueClass || 'text-slate-800'}`}>{value}</p>
        </div>
        <div
          className={`w-8 h-8 bg-gradient-to-br ${iconWrapClass || 'from-slate-100 to-slate-200'} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function Chip({
  children,
  onClear,
}: {
  children: React.ReactNode;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-3 py-1">
      {children}
      <button
        onClick={onClear}
        className="p-0.5 rounded-full hover:bg-slate-200"
        aria-label="Очистить"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

function ActionBtn({
  children,
  className = 'bg-emerald-500 hover:bg-emerald-600',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      className={`px-4 py-2 text-white rounded-xl transition-all font-medium shadow-sm ${className}`}
    >
      {children}
    </button>
  );
}
