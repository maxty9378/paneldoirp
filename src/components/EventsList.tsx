import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  LinkIcon,
  Filter,
  Search,
  Plus,
  Download,
  Upload,
  BarChart3,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  TrendingUp,
  Zap,
  Video,
  BookOpen,
  Target,
  Eye,
  Edit,
  Trash2,
  Copy,
  Send,
  MoreVertical,
  Loader2,
  Star
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { clsx } from 'clsx';
import { Event, EVENT_TYPE_LABELS } from '../types';

interface EventsListProps {
  onCreateEvent?: () => void;
}

interface EventWithStats extends Event {
  participants_count?: number;
  attendance_rate?: number;
  pending_tests?: number;
  pending_feedback?: number;
  has_report?: boolean;
}

type ViewMode = 'grid' | 'list' | 'calendar';
type SortBy = 'start_date' | 'title' | 'participants' | 'status' | 'created_at';

export function EventsList({ onCreateEvent }: EventsListProps) {
  const { userProfile } = useAuth();
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('start_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
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
      
      console.log('Fetching events for user:', user?.id, 'role:', userProfile?.role);
      
      // Проверяем роль пользователя
      const isAdmin = userProfile?.role && ['administrator', 'moderator', 'trainer'].includes(userProfile.role);
      const isExpert = userProfile?.role === 'expert';
      
      let data, error;
      
      if (isAdmin) {
        // Администраторы видят все мероприятия
        const result = await supabase
          .from('events')
          .select(`
            *,
            event_types (*)
          `)
          .order('start_date', { ascending: false });
        data = result.data;
        error = result.error;
      } else if (isExpert) {
        // Эксперты видят мероприятия, где они указаны в expert_emails
        const result = await supabase
          .from('events')
          .select(`
            *,
            event_types (*)
          `)
          .contains('expert_emails', [userProfile?.email])
          .order('start_date', { ascending: false });
        data = result.data;
        error = result.error;
      } else {
        // Обычные пользователи видят только мероприятия, в которых они участвуют
        const result = await supabase
          .from('events')
          .select(`
            *,
            event_types (*),
            event_participants!inner(user_id)
          `)
          .eq('event_participants.user_id', user?.id)
          .order('start_date', { ascending: false });
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Supabase error:', error);
        setError(`Ошибка загрузки: ${error.message}`);
        setLoading(false);
        return;
      }
      
      if (!data || data.length === 0) {
        console.log('No events found in database');
        setEvents([]);
        setFilteredEvents([]);
        setLoading(false);
        return;
      }
      
      console.log('Fetched events:', data);
      
      // Добавляем статистику к каждому мероприятию
      const eventsWithStats = data.map(event => {
        return {
          ...event,
          participants_count: Math.floor(Math.random() * 20) + 5, // Mock data
          attendance_rate: Math.floor(Math.random() * 100), // Mock data
          pending_tests: Math.floor(Math.random() * 5), // Mock data
          pending_feedback: Math.floor(Math.random() * 3), // Mock data
          has_report: Math.random() > 0.5 // Mock data
        };
      });
      
      console.log('Events with stats:', eventsWithStats);
      setEvents(eventsWithStats);
      setFilteredEvents(eventsWithStats);
      
    } catch (error) {
      console.error('Error fetching events:', error);
      setError(`Произошла ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortEvents = () => {
    let filtered = [...events];

    console.log('Filtering events. Total:', events.length);

    // Поиск
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log('After search filter:', filtered.length);
    }

    // Фильтр по статусу
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter);
      console.log('After status filter:', filtered.length);
    }

    // Фильтр по типу
    if (typeFilter !== 'all') {
      filtered = filtered.filter(event => event.type === typeFilter);
      console.log('After type filter:', filtered.length);
    }

    // Сортировка
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'start_date':
          aValue = new Date(a.start_date || a.date_time);
          bValue = new Date(b.start_date || b.date_time);
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
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          aValue = new Date(a.start_date || a.date_time);
          bValue = new Date(b.start_date || b.date_time);
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    console.log('Final filtered events:', filtered.length);
    setFilteredEvents(filtered);
  };

  const canCreateEvents = userProfile?.role && ['trainer', 'moderator', 'administrator'].includes(userProfile.role);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'published': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-sns-100 text-sns-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'active': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Черновик';
      case 'published': return 'Опубликовано';
      case 'ongoing': return 'Проходит';
      case 'completed': return 'Завершено';
      case 'cancelled': return 'Отменено';
      case 'active': return 'Активно';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
      case 'ongoing':
      case 'active':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'completed':
        return <CheckCircle size={16} className="text-blue-600" />;
      case 'cancelled':
        return <XCircle size={16} className="text-red-600" />;
      case 'draft':
        return <AlertCircle size={16} className="text-yellow-600" />;
      default:
        return <AlertCircle size={16} className="text-gray-600" />;
    }
  };

  const getTypeIcon = (typeName: string) => {
    switch (typeName) {
      case 'online_training':
        return <Video size={16} className="text-blue-600" />;
      case 'in_person_training':
        return <Users size={16} className="text-green-600" />;
      case 'webinar':
        return <BookOpen size={16} className="text-purple-600" />;
      case 'exam':
        return <FileText size={16} className="text-red-600" />;
      case 'workshop':
        return <Target size={16} className="text-orange-600" />;
      default:
        return <Calendar size={16} className="text-gray-600" />;
    }
  };

  const getUrgentTasks = (event: EventWithStats) => {
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
    return tasks;
  };

  const eventStats = {
    total: events.length,
    active: events.filter(e => e.status === 'active' || e.status === 'published').length,
    completed: events.filter(e => e.status === 'completed').length,
    draft: events.filter(e => e.status === 'draft').length,
    thisMonth: events.filter(e => {
      const eventDate = new Date(e.start_date || e.date_time);
      const now = new Date();
      return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
    }).length,
    urgentTasks: events.reduce((acc, event) => acc + getUrgentTasks(event).length, 0)
  };

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
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-gray-600">Загрузка мероприятий...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ошибка загрузки</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchEvents}
            className="btn-primary"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мои мероприятия</h1>
          <p className="text-gray-600 mt-2 mobile-text">
            {canCreateEvents 
              ? 'Создание и управление обучающими мероприятиями'
              : 'Просмотр мероприятий и участие в обучении'
            }
          </p>
        </div>
        {/* Скрываем кнопки управления для экспертов */}
        {userProfile?.role !== 'expert' && (
          <div className="flex items-center gap-3">
            {canCreateEvents && (
              <>
                <button className="btn-outline flex items-center space-x-2">
                  <Download size={20} />
                  <span>Экспорт</span>
                </button>
                <button className="btn-outline flex items-center space-x-2">
                  <Upload size={18} />
                  <span>Импорт</span>
                </button>
              </>
            )}
            {canCreateEvents && (
              <button 
                onClick={onCreateEvent}
                className="btn-primary flex items-center space-x-2 shadow hover:scale-105 active:scale-95"
              >
                <Plus size={20} />
                <span>Создать мероприятие</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Скрываем статистику для экспертов */}
      {userProfile?.role !== 'expert' && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="card flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Всего</p>
                <p className="text-2xl font-bold text-gray-900">{eventStats.total}</p>
              </div>
              <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
                <Calendar size={20} className="text-primary" />
              </div>
            </div>
          </div>
          <div className="card flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Активные</p>
                <p className="text-2xl font-bold text-primary">{eventStats.active}</p>
              </div>
              <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
                <CheckCircle size={20} className="text-primary" />
              </div>
            </div>
          </div>
          <div className="card flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Завершено</p>
                <p className="text-2xl font-bold text-primary">{eventStats.completed}</p>
              </div>
              <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
                <Star size={20} className="text-primary" />
              </div>
            </div>
          </div>
          <div className="card flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Черновики</p>
                <p className="text-2xl font-bold text-yellow-600">{eventStats.draft}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <AlertCircle size={20} className="text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="card flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">В этом месяце</p>
                <p className="text-2xl font-bold text-primary">{eventStats.thisMonth}</p>
              </div>
              <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
                <TrendingUp size={20} className="text-primary" />
              </div>
            </div>
          </div>
          <div className="card flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Горящие задачи</p>
                <p className="text-2xl font-bold text-red-600">{eventStats.urgentTasks}</p>
              </div>
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <Zap size={20} className="text-red-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Скрываем поиск и фильтры для экспертов */}
      {userProfile?.role !== 'expert' && (
        <div className="card p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary" />
                <input
                  type="text"
                  placeholder="Поиск по названию, описанию или месту проведения..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-primary rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 mobile-text"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-primary rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 min-w-[140px] mobile-text"
              >
                <option value="all">Все статусы</option>
                <option value="draft">Черновик</option>
                <option value="published">Опубликовано</option>
                <option value="active">Активно</option>
                <option value="ongoing">Проходит</option>
                <option value="completed">Завершено</option>
                <option value="cancelled">Отменено</option>
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-outline flex items-center space-x-2"
              >
                <Filter size={20} />
                <span>Фильтры</span>
              </button>
            </div>

            {/* View Mode */}
            <div className="flex items-center bg-primary-light rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={clsx(
                  "px-3 py-2 rounded-xl transition-colors",
                  viewMode === 'grid' ? 'bg-white shadow' : 'text-primary'
                )}
              >
                <BarChart3 size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  "px-3 py-2 rounded-xl transition-colors",
                  viewMode === 'list' ? 'bg-white shadow' : 'text-primary'
                )}
              >
                <FileText size={18} />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={clsx(
                  "px-3 py-2 rounded-xl transition-colors",
                  viewMode === 'calendar' ? 'bg-white shadow' : 'text-primary'
                )}
              >
                <Calendar size={18} />
              </button>
            </div>
        </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-primary">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Сортировка
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="w-full px-3 py-2 border border-primary rounded-xl focus:ring-2 focus:ring-primary focus:border-primary mobile-text"
                  >
                    <option value="start_date">По дате проведения</option>
                    <option value="title">По названию</option>
                    <option value="participants">По количеству участников</option>
                    <option value="status">По статусу</option>
                    <option value="created_at">По дате создания</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Порядок
                  </label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    className="w-full px-3 py-2 border border-primary rounded-xl focus:ring-2 focus:ring-primary focus:border-primary mobile-text"
                  >
                    <option value="desc">По убыванию</option>
                    <option value="asc">По возрастанию</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Фильтр по задачам
                  </label>
                  <select className="w-full px-3 py-2 border border-primary rounded-xl focus:ring-2 focus:ring-primary focus:border-primary mobile-text">
                    <option value="all">Все мероприятия</option>
                    <option value="pending_tests">Есть незавершенные тесты</option>
                    <option value="pending_feedback">Нет обратной связи</option>
                    <option value="no_report">Нет отчета</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setTypeFilter('all');
                      setSortBy('start_date');
                      setSortOrder('desc');
                    }}
                    className="btn-outline w-full"
                  >
                    Сбросить фильтры
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Скрываем Bulk Actions для экспертов */}
      {selectedEvents.length > 0 && canCreateEvents && userProfile?.role !== 'expert' && (
        <div className="bg-primary-light border border-primary rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-primary">
                Выбрано мероприятий: {selectedEvents.length}
              </span>
              <button
                onClick={() => setSelectedEvents([])}
                className="text-primary hover:text-primary-dark text-sm"
              >
                Отменить выбор
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button className="btn-primary text-sm">Активировать</button>
              <button className="btn-outline text-sm">Деактивировать</button>
              <button className="btn-outline text-sm border-red-400 text-red-600 hover:bg-red-50">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {events.length === 0 ? 'Нет мероприятий' : 'Мероприятия не найдены'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {events.length === 0 
              ? (canCreateEvents 
                  ? 'Начните создавать мероприятия для своих сотрудников'
                  : 'Мероприятия появятся здесь, когда вы будете добавлены как участник'
                )
              : 'Попробуйте изменить фильтры поиска'
            }
          </p>
          {canCreateEvents && events.length === 0 && (
            <div className="mt-6">
              <button
                onClick={onCreateEvent}
                className="btn-primary inline-flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Создать первое мероприятие
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={clsx(
          "grid gap-6",
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
            : 'grid-cols-1'
        )}>
          {filteredEvents.map((event) => (
            {/* Модернизированная карточка мероприятия */}
            <div
              key={event.id}
              className="group transition-all duration-300 overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-br from-white via-blue-50 to-purple-50 border border-primary/10 hover:shadow-[0_8px_32px_rgba(80,36,255,0.10)] hover:-translate-y-1 mobile-card"
            >
              <div className="p-7 flex flex-col h-full">
                {/* Верхняя строка: дата и статус */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center text-primary font-medium text-sm space-x-2">
                    <Calendar className="h-5 w-5 mr-1 text-primary" />
                    {format(new Date(event.start_date || event.date_time), 'dd MMMM yyyy', { locale: ru })}
                  </div>
                  <span className={clsx(
                    "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-200 via-purple-200 to-blue-100 text-primary shadow-sm border border-blue-100"
                  )}>
                    {getStatusIcon(event.status)}
                    <span className="ml-1">{getStatusText(event.status)}</span>
                  </span>
                </div>
                {/* Название */}
                <h3 className="text-xl font-extrabold text-gray-900 mb-2 group-hover:text-primary transition-colors duration-200">
                  {event.title}
                </h3>
                {/* Описание */}
                {event.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2 bg-white/60 rounded-lg px-2 py-1">
                    {event.description}
                  </p>
                )}
                {/* Метаданные: время, место, участники */}
                <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-4">
                  <div className="flex items-center"><Clock className="h-4 w-4 mr-1" />{format(new Date(event.start_date || event.date_time), 'HH:mm')}{event.end_date && ` - ${format(new Date(event.end_date), 'HH:mm')}`}</div>
                  {event.location && (
                    <div className="flex items-center"><MapPin className="h-4 w-4 mr-1" />{event.location}</div>
                  )}
                  <div className="flex items-center"><Users className="h-4 w-4 mr-1" />{event.participants_count || 0} участников{event.max_participants && ` из ${event.max_participants}`}</div>
                  {(event.meeting_link || event.link) && (
                    <div className="flex items-center"><LinkIcon className="h-4 w-4 mr-1" />Ссылка на встречу</div>
                  )}
                </div>
                {/* Срочные задачи */}
                {getUrgentTasks(event).length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl animate-pulse">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap size={16} className="text-red-600" />
                      <span className="text-sm font-medium text-red-800">Требует внимания</span>
                    </div>
                    <ul className="text-xs text-red-700 space-y-1">
                      {getUrgentTasks(event).map((task, index) => (
                        <li key={index}>• {task}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Нижний блок: дата создания, баллы, кнопки */}
                <div className="flex items-center justify-between pt-4 border-t border-primary-light mt-auto">
                  <div className="flex items-center space-x-4">
                    <div className="text-xs text-gray-500">
                      Создано {format(new Date(event.created_at), 'dd.MM.yyyy')}
                    </div>
                    {event.points > 0 && (
                      <div className="flex items-center text-xs font-medium text-primary">
                        <Star size={12} className="mr-1" />
                        <span>{event.points} баллов</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Кнопки управления с анимацией и тултипами */}
                    {(() => {
                      const isExpert = userProfile?.role === 'expert';
                      const isAdmin = userProfile?.role === 'administrator';
                      const isExamTalentReserve = event.event_types?.name === 'exam_talent_reserve';
                      const isExpertForThisExam = (isExpert || isAdmin) && isExamTalentReserve && (event.expert_emails?.includes(userProfile?.email || '') || isAdmin);
                      
                      // Отладка
                      console.log('EventsList - Event:', event.title, 'Type:', event.event_types?.name, 'IsExpert:', isExpert, 'IsAdmin:', isAdmin, 'IsExam:', isExamTalentReserve, 'IsExpertForThisExam:', isExpertForThisExam);
                      
                      // Для администраторов: если это экзамен, показываем кнопку "Оценить"
                      if (isAdmin && isExamTalentReserve) {
                        return (
                          <button 
                            onClick={() => window.location.href = `/expert-exam/${event.id}`}
                            className="btn-primary flex items-center px-3 py-2 rounded-xl transition-all duration-300 hover:bg-[#059669] text-white" 
                            title="Перейти к оценке"
                          >
                            <Star size={16} className="mr-1" />
                            <span className="text-sm font-medium">Оценить</span>
                          </button>
                        );
                      }
                      
                      // Для экспертов, назначенных на конкретный экзамен
                      if (isExpertForThisExam) {
                        return (
                          <button 
                            onClick={() => window.location.href = `/expert-exam/${event.id}`}
                            className="btn-primary flex items-center px-3 py-2 rounded-xl transition-all duration-300 hover:bg-[#059669] text-white" 
                            title="Перейти к оценке"
                          >
                            <Star size={16} className="mr-1" />
                            <span className="text-sm font-medium">Оценить</span>
                          </button>
                        );
                      }
                      
                      // Для экспертов все мероприятия ведут на страницу эксперта
                      if (isExpert) {
                        return (
                          <button 
                            onClick={() => window.location.href = `/expert-exam/36520f72-c191-4e32-ba02-aa17c482c50b`}
                            className="btn-outline flex items-center px-3 py-2 rounded-xl transition-all duration-300 hover:bg-primary hover:text-white" 
                            title="Открыть"
                          >
                            <Eye size={16} />
                          </button>
                        );
                      }
                      
                      return (
                        <button 
                          onClick={() => window.location.href = `/event/${event.id}`}
                          className="btn-outline flex items-center px-3 py-2 rounded-xl transition-all duration-300 hover:bg-primary hover:text-white" 
                          title="Просмотр"
                        >
                          <Eye size={16} />
                        </button>
                      );
                    })()}
                    {canCreateEvents && (
                      <>
                        <button className="btn-outline flex items-center px-3 py-2 rounded-xl transition-all duration-300 hover:bg-primary/80 hover:text-white" title="Редактировать">
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteEvent(event.id)}
                          className="btn-outline flex items-center px-3 py-2 rounded-xl border-red-400 text-red-600 hover:bg-red-50 transition-all duration-300" 
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* --- конец карточки --- */}
          ))}
        </div>
      )}
    </div>
  );