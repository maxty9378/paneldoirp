  import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { 
  Filter,
  Search,
  Plus,
  Download,
  Upload,
  Loader2,
  TrendingUp,
  Award,
  CalendarDays,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Calendar as CalendarIcon,
  Zap,
  AlertCircle,
  Calendar,
  Play,
  CheckCircle,
  Pause
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
  event_types?: {
    id: string;
    name: string;
    name_ru: string;
  };
  }

  type SortBy = 'start_date' | 'title' | 'participants' | 'status' | 'created_at';

export function EventsView({ onCreateEvent, onNavigateToEvent, onEditEvent }: EventsViewProps) {
    const [events, setEvents] = useState<EventWithStats[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<EventWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<SortBy>('start_date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
    const [showSearchFilters, setShowSearchFilters] = useState(false);
  const { user, userProfile } = useAuth();

    useEffect(() => {
      if (user) {
        fetchEvents();
      }
    }, [user]);

    useEffect(() => {
      filterAndSortEvents();
    }, [events, searchTerm, statusFilter, typeFilter, sortBy, sortOrder]);

    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from('events')
        .select(`
          *,
          event_types (
            id,
            name,
            name_ru
          )
        `)
          .order('start_date', { ascending: false });
      
        if (error) {
          setError(`Ошибка загрузки: ${error.message}`);
          setLoading(false);
          return;
        }
      
        if (!data || data.length === 0) {
          setEvents([]);
          setFilteredEvents([]);
          setLoading(false);
          return;
        }

        const eventsWithStats: EventWithStats[] = await Promise.all(data.map(async (event: Event) => {
          const { data: participantsData } = await supabase
            .from('event_participants')
            .select('id, user_id')
            .eq('event_id', event.id);
          const participantsCount = participantsData ? participantsData.length : 0;
        
          const { data: completedAttempts } = await supabase
            .from('user_test_attempts')
            .select('id, user_id')
            .eq('event_id', event.id)
            .eq('status', 'completed');
          const completedCount = completedAttempts ? completedAttempts.length : 0;
        
          const { data: allAttempts } = await supabase
            .from('user_test_attempts')
            .select('id, user_id')
            .eq('event_id', event.id);
          const allAttemptsCount = allAttempts ? allAttempts.length : 0;
        
          const testPassPercent = participantsCount > 0 ? Math.round((completedCount / participantsCount) * 100) : 0;
          const notPassedCount = participantsCount - completedCount;
        
          return {
            ...event,
            participants_count: participantsCount,
            test_completed_count: completedCount,
            test_pass_percent: testPassPercent,
            test_not_passed_count: notPassedCount
          };
        }));
      
        setEvents(eventsWithStats);
        setFilteredEvents(eventsWithStats);
      } catch (error) {
        setError(`Произошла ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      } finally {
        setLoading(false);
      }
    };

    const filterAndSortEvents = () => {
      let filtered = [...events];

      if (searchTerm) {
        filtered = filtered.filter(event =>
          event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.location?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (statusFilter !== 'all') {
        filtered = filtered.filter(event => event.status === statusFilter);
      }

      if (typeFilter !== 'all') {
        filtered = filtered.filter(event => event.type === typeFilter);
      }

      filtered.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortBy) {
          case 'start_date':
          aValue = new Date(a.start_date || a.date_time || '');
          bValue = new Date(b.start_date || b.date_time || '');
            break;
          case 'title':
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case 'participants':
            aValue = a.participants_count || 0;
            bValue = b.participants_count || 0;
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'created_at':
          aValue = new Date(a.created_at || '');
          bValue = new Date(b.created_at || '');
            break;
          default:
          aValue = new Date(a.start_date || a.date_time || '');
          bValue = new Date(b.start_date || b.date_time || '');
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      setFilteredEvents(filtered);
    };
    
    const canCreateEvents = userProfile?.role && ['trainer', 'moderator', 'administrator'].includes(userProfile.role);
  console.log('canCreateEvents:', canCreateEvents, 'userProfile.role:', userProfile?.role);
    


    const handleDeleteEvent = async (eventId: string) => {
      if (confirm('Вы уверены, что хотите удалить это мероприятие?')) {
        try {
          const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId);
          
          if (error) throw error;
          fetchEvents();
        } catch (error) {
          console.error('Error deleting event:', error);
        }
      }
    };

      const toggleEventSelection = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

      if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-sns-500 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-sns-400 rounded-full animate-spin mx-auto" style={{ animationDelay: '0.5s' }}></div>
            </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-700">Загрузка мероприятий</h3>
            <p className="text-slate-500">Подготавливаем данные для вас...</p>
          </div>
            </div>
          </div>
        );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-800">Ошибка загрузки</h3>
            <p className="text-slate-600">{error}</p>
                    </div>
                      <button 
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-6 py-3 bg-sns-500 text-white font-medium rounded-xl hover:bg-sns-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Попробовать снова
                      </button>
                    </div>
          </div>
        );
    }

    return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-sns-500 to-sns-600 rounded-xl flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Мероприятия по обучению
            </h1>
            <p className="text-slate-600 text-sm">
              {canCreateEvents 
                ? 'Создавайте и управляйте обучающими программами'
                : 'Участвуйте в образовательных мероприятиях'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Search and Filters Button */}
          <button
            onClick={() => setShowSearchFilters(!showSearchFilters)}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all duration-200 text-sm flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>Поиск</span>
            <Filter className="w-4 h-4" />
          </button>

          {canCreateEvents && (
            <>
              <button className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all duration-200 text-sm">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span>Экспорт</span>
                </div>
              </button>
              <button className="px-4 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all duration-200 text-sm">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>Импорт</span>
                </div>
              </button>
            </>
          )}
          {canCreateEvents && (
            <button 
              onClick={() => onCreateEvent && onCreateEvent()}
              className="px-4 py-2 bg-sns-500 text-white font-medium rounded-lg hover:bg-sns-600 transition-all duration-200 text-sm"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Создать мероприятие</span>
              </div>
            </button>
          )}
        </div>
              </div>

        {/* Search and Filters Panel */}
        {showSearchFilters && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mt-4">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="flex-1">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-sns-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Поиск мероприятий..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-sns-500 focus:bg-white transition-all duration-200 text-slate-700 placeholder-slate-400 text-sm"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-sns-500 transition-all duration-200 text-slate-700 text-sm"
              >
                <option value="all">Все статусы</option>
                <option value="draft">Черновик</option>
                <option value="published">Опубликовано</option>
                <option value="active">Активно</option>
                <option value="ongoing">Проходит</option>
                <option value="completed">Завершено</option>
                <option value="cancelled">Отменено</option>
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-sns-500 transition-all duration-200 text-slate-700 text-sm"
              >
                <option value="all">Все типы</option>
                {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-sns-500 transition-all duration-200 text-slate-700 text-sm"
              >
                <option value="start_date">По дате проведения</option>
                <option value="title">По названию</option>
                <option value="participants">По участникам</option>
                <option value="status">По статусу</option>
                <option value="created_at">По дате создания</option>
              </select>

              {/* Sort Order */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-sns-500 transition-all duration-200 text-slate-700 text-sm"
              >
                <option value="desc">По убыванию</option>
                <option value="asc">По возрастанию</option>
              </select>

              {/* Reset Button */}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setSortBy('start_date');
                  setSortOrder('desc');
                }}
                className="px-3 py-2 text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all duration-200 font-medium text-sm"
              >
                Сбросить
              </button>
            </div>
          </div>
        )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <div className="group bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
              <p className="text-xs font-medium text-slate-600">Всего</p>
              <p className="text-xl font-bold text-slate-800">{events.length}</p>
              </div>
            <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4 text-slate-600" />
              </div>
            </div>
          </div>

        <div className="group bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
              <p className="text-xs font-medium text-slate-600">Активные</p>
              <p className="text-xl font-bold text-emerald-600">{events.filter(e => ['active', 'published', 'ongoing'].includes(e.status)).length}</p>
              </div>
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </div>

        <div className="group bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
              <p className="text-xs font-medium text-slate-600">Завершено</p>
              <p className="text-xl font-bold text-indigo-600">{events.filter(e => e.status === 'completed').length}</p>
              </div>
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
          </div>

        <div className="group bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
              <p className="text-xs font-medium text-slate-600">Черновики</p>
              <p className="text-xl font-bold text-slate-600">{events.filter(e => e.status === 'draft').length}</p>
              </div>
            <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Pause className="w-4 h-4 text-slate-600" />
              </div>
            </div>
          </div>

        <div className="group bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
              <p className="text-xs font-medium text-slate-600">В этом месяце</p>
              <p className="text-xl font-bold text-purple-600">{events.filter(e => {
                const eventDate = new Date(e.start_date || e.date_time || '');
                  const now = new Date();
                  return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
                }).length}</p>
              </div>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <CalendarDays className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </div>

        <div className="group bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
              <p className="text-xs font-medium text-slate-600">Задачи</p>
              <p className="text-xl font-bold text-red-600">{events.reduce((acc, event) => {
                const tasks = [];
                if (event.pending_tests && event.pending_tests > 0) {
                  tasks.push(`${event.pending_tests} не прошли тест`);
                }
                if (event.pending_feedback && event.pending_feedback > 0) {
                  tasks.push(`${event.pending_feedback} не заполнили обратную связь`);
                }
                if (event.status === 'completed' && !event.has_report) {
                  tasks.push('Не отправлен отчет');
                }
                return acc + tasks.length;
              }, 0)}</p>
              </div>
            <div className="w-8 h-8 bg-gradient-to-br from-red-100 to-red-200 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4 text-red-600" />
              </div>
            </div>
          </div>
        </div>



        {/* Bulk Actions */}
        {selectedEvents.length > 0 && canCreateEvents && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
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
              <button className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all duration-200 font-medium">
                  Активировать
                </button>
              <button className="px-4 py-2 bg-slate-500 text-white rounded-xl hover:bg-slate-600 transition-all duration-200 font-medium">
                  Деактивировать
                </button>
              <button className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 font-medium">
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-12 h-12 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            {events.length === 0 ? 'Нет мероприятий' : 'Мероприятия не найдены'}
          </h3>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            {events.length === 0 
              ? (canCreateEvents 
                  ? 'Начните создавать мероприятия для обучения ваших сотрудников'
                  : 'Мероприятия появятся здесь, когда вы будете добавлены как участник'
                )
              : 'Попробуйте изменить параметры поиска или фильтры'
            }
          </p>
          {canCreateEvents && events.length === 0 && (
            <button
              onClick={() => onCreateEvent && onCreateEvent()}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-sns-500 to-sns-600 text-white font-semibold rounded-xl transition-all duration-300"
            >
              <Plus className="w-5 h-5 mr-2" />
              Создать первое мероприятие
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEvents.map((event: EventWithStats, idx: number) => (
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