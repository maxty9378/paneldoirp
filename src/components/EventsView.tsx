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
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Copy,
  Send,
  MoreVertical,
  Loader2,
  Video,
  BookOpen,
  Target,
  Zap,
  Star
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { clsx } from 'clsx';
import { Event, EVENT_TYPE_LABELS } from '../types';
import { EventCard } from './dashboard/EventCard';

interface EventsViewProps {
  onCreateEvent?: () => void;
  onNavigateToEvent?: (eventId: string) => void;
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

export function EventsView({ onCreateEvent, onNavigateToEvent }: EventsViewProps) {
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
      // Получаем все мероприятия
      const { data, error } = await supabase
        .from('events')
        .select('*')
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
      // Для каждого мероприятия получаем реальную статистику по тестам
      const eventsWithStats: EventWithStats[] = await Promise.all(data.map(async (event: Event) => {
        // Получаем участников
        const { data: participantsData } = await supabase
          .from('event_participants')
          .select('id, user_id')
          .eq('event_id', event.id);
        const participantsCount = participantsData ? participantsData.length : 0;
        // Получаем завершённые попытки тестов
        const { data: completedAttempts } = await supabase
          .from('user_test_attempts')
          .select('id, user_id')
          .eq('event_id', event.id)
          .eq('status', 'completed');
        const completedCount = completedAttempts ? completedAttempts.length : 0;
        // Получаем все попытки тестов (для процента)
        const { data: allAttempts } = await supabase
          .from('user_test_attempts')
          .select('id, user_id')
          .eq('event_id', event.id);
        const allAttemptsCount = allAttempts ? allAttempts.length : 0;
        // Считаем процент прохождения тестов
        const testPassPercent = participantsCount > 0 ? Math.round((completedCount / participantsCount) * 100) : 0;
        // Считаем количество участников, не прошедших тест
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

  // Fallback для отладки: если ничего не рендерится
  let renderContent: React.ReactNode = null;
  try {
    console.log('EventsView render', { events, filteredEvents, loading, error });
    if (loading) {
      renderContent = (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-sns-500 mb-4" />
            <p className="text-gray-600">Загрузка мероприятий...</p>
          </div>
        </div>
      );
    } else if (error) {
      renderContent = (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ошибка загрузки</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 bg-sns-500 text-white rounded-squircle hover:bg-sns-600 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      );
    } else if (filteredEvents.length === 0) {
      renderContent = (
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
                onClick={() => onCreateEvent && onCreateEvent()}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-sns-500 to-sns-600 hover:from-sns-600 hover:to-sns-700 text-white font-medium rounded-squircle shadow-medium hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="h-5 w-5 mr-2" />
                Создать первое мероприятие
              </button>
            </div>
          )}
        </div>
      );
    } else {
      // ... основной рендер списка мероприятий ...
      renderContent = (
        // ... существующий JSX для списка filteredEvents ...
        <div className={clsx(
          "grid gap-6",
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
            : 'grid-cols-1'
        )}>
          {filteredEvents.map((event: EventWithStats) => (
            <div
              key={event.id}
              onClick={() => onNavigateToEvent && onNavigateToEvent(event.id)}
              className="bg-white rounded-squircle-lg shadow-soft hover:shadow-medium transition-all duration-200 overflow-hidden group hover:scale-[1.02] cursor-pointer"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getTypeIcon(event.type || '')}
                      <span className="text-sm text-sns-600 font-medium">
                        {EVENT_TYPE_LABELS[event.type as keyof typeof EVENT_TYPE_LABELS] || 'Неизвестный тип'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-sns-600 transition-colors duration-200 mb-2">
                      {event.title}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={clsx(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      getStatusColor(event.status)
                    )}>
                      {getStatusIcon(event.status)}
                      <span className="ml-1">{getStatusText(event.status)}</span>
                    </span>
                    {canCreateEvents && (
                      <div className="relative">
                        <button className="p-1 text-gray-400 hover:text-gray-600 rounded-squircle-sm hover:bg-gray-100 transition-colors">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {event.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {event.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                    {event.start_date || event.date_time ? format(new Date(event.start_date || event.date_time as string), 'dd MMMM yyyy', { locale: ru }) : '—'}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                    {event.start_date || event.date_time ? format(new Date(event.start_date || event.date_time as string), 'HH:mm') : '—'}
                    {event.end_date ? ` - ${format(new Date(event.end_date as string), 'HH:mm')}` : ''}
                  </div>
                  {event.location && (
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                  {(event.meeting_link || event.link) && (
                    <div className="flex items-center text-sm text-gray-500">
                      <LinkIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">Ссылка на встречу</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                    {event.participants_count || 0} участников
                    {event.max_participants && ` из ${event.max_participants}`}
                  </div>
                  {/* Реальная статистика по тестам */}
                  {event.participants_count > 0 && (
                    <div className="text-xs text-blue-700 mt-1">
                      <div>Тест пройден: <b>{event.test_completed_count}</b> из <b>{event.participants_count}</b></div>
                      <div>Не прошли тест: <b>{event.test_not_passed_count}</b></div>
                      <div>Процент прохождения: <b>{event.test_pass_percent}%</b></div>
                    </div>
                  )}
                </div>
                {/* Urgent Tasks */}
                {getUrgentTasks(event).length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-squircle">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap size={16} className="text-red-600" />
                      <span className="text-sm font-medium text-red-800">Требует внимания</span>
                    </div>
                    <ul className="text-xs text-red-700 space-y-1">
                      {getUrgentTasks(event).map((task: string, index: number) => (
                        <li key={index}>• {task}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-4">
                    <div className="text-xs text-gray-500">
                      Создано {event.created_at ? format(new Date(event.created_at as string), 'dd.MM.yyyy') : ''}
                    </div>
                    {event.points > 0 && (
                      <div className="flex items-center text-xs font-medium text-sns-600">
                        <Star size={12} className="mr-1" />
                        <span>{event.points} баллов</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigateToEvent) {
                          onNavigateToEvent(event.id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-sns-600 hover:bg-sns-50 rounded-squircle-sm transition-colors" 
                      title="Просмотр"
                    >
                      <Eye size={16} />
                    </button>
                    {canCreateEvents && (
                      <>
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-squircle-sm transition-colors" title="Редактировать">
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-squircle-sm transition-colors" 
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
          ))}
        </div>
      );
    }
  } catch (e: any) {
    console.error('Ошибка рендера EventsView:', e);
    renderContent = <div className="text-center py-12 text-red-600">Ошибка рендера: {e.message || e.toString()}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мои мероприятия</h1>
          <p className="text-gray-600 mt-2">
            {canCreateEvents 
              ? 'Создание и управление обучающими мероприятиями'
              : 'Просмотр мероприятий и участие в обучении'
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canCreateEvents && (
            <>
              <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-squircle hover:bg-gray-50 transition-colors">
                <Download size={20} />
                <span>Экспорт</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 border border-blue-200 rounded-squircle hover:bg-blue-200 transition-colors">
                <Upload size={18} />
                <span>Импорт участников</span>
              </button>
            </>
          )}
          {canCreateEvents && (
            <button 
              onClick={() => {
                if (typeof onCreateEvent === 'function') {
                  onCreateEvent();
                } else {
                  // Если функция не определена, можно перенаправить на страницу создания мероприятия
                  window.location.href = '#create-event';
                }
              }}
              className="bg-gradient-to-r from-sns-500 to-sns-600 hover:from-sns-600 hover:to-sns-700 text-white px-4 py-2 rounded-squircle transition-all duration-200 flex items-center space-x-2 shadow-medium hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={20} />
              <span>Создать мероприятие</span>
            </button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-squircle-lg p-4 border border-gray-100 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Всего</p>
              <p className="text-2xl font-bold text-gray-900">{events.length}</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-squircle flex items-center justify-center">
              <Calendar size={20} className="text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-squircle-lg p-4 border border-gray-100 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Активные</p>
              <p className="text-2xl font-bold text-green-600">{events.filter(e => e.status === 'active' || e.status === 'published').length}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-squircle flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-squircle-lg p-4 border border-gray-100 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Завершено</p>
              <p className="text-2xl font-bold text-blue-600">{events.filter(e => e.status === 'completed').length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-squircle flex items-center justify-center">
              <CheckCircle size={20} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-squircle-lg p-4 border border-gray-100 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Черновики</p>
              <p className="text-2xl font-bold text-yellow-600">{events.filter(e => e.status === 'draft').length}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-squircle flex items-center justify-center">
              <AlertCircle size={20} className="text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-squircle-lg p-4 border border-gray-100 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">В этом месяце</p>
              <p className="text-2xl font-bold text-purple-600">{events.filter(e => {
                const eventDate = new Date(e.start_date || e.date_time);
                const now = new Date();
                return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
              }).length}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-squircle flex items-center justify-center">
              <Calendar size={20} className="text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-squircle-lg p-4 border border-gray-100 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Горящие задачи</p>
              <p className="text-2xl font-bold text-red-600">{events.reduce((acc, event) => acc + getUrgentTasks(event).length, 0)}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-squircle flex items-center justify-center">
              <Zap size={20} className="text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-squircle-lg border border-gray-100 p-6 shadow-soft">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по названию, описанию или месту проведения..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-squircle focus:ring-2 focus:ring-sns-500 focus:border-sns-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-squircle focus:ring-2 focus:ring-sns-500 focus:border-sns-500 transition-all duration-200 min-w-[140px]"
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
              className="px-4 py-3 border border-gray-300 rounded-squircle hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <Filter size={20} />
              <span>Фильтры</span>
            </button>
          </div>

          {/* View Mode */}
          <div className="flex items-center bg-gray-100 rounded-squircle p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                "px-3 py-2 rounded-squircle-sm transition-colors",
                viewMode === 'grid' ? 'bg-white shadow-soft' : 'text-gray-600'
              )}
            >
              <FileText size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                "px-3 py-2 rounded-squircle-sm transition-colors",
                viewMode === 'list' ? 'bg-white shadow-soft' : 'text-gray-600'
              )}
            >
              <FileText size={18} />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={clsx(
                "px-3 py-2 rounded-squircle-sm transition-colors",
                viewMode === 'calendar' ? 'bg-white shadow-soft' : 'text-gray-600'
              )}
            >
              <Calendar size={18} />
            </button>
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сортировка
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-squircle focus:ring-2 focus:ring-sns-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-squircle focus:ring-2 focus:ring-sns-500 focus:border-transparent"
                >
                  <option value="desc">По убыванию</option>
                  <option value="asc">По возрастанию</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Фильтр по задачам
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-squircle focus:ring-2 focus:ring-sns-500 focus:border-transparent">
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
                  className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-squircle hover:bg-gray-50 transition-colors"
                >
                  Сбросить фильтры
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedEvents.length > 0 && canCreateEvents && (
        <div className="bg-blue-50 border border-blue-200 rounded-squircle-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                Выбрано мероприятий: {selectedEvents.length}
              </span>
              <button
                onClick={() => setSelectedEvents([])}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Отменить выбор
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 bg-green-600 text-white rounded-squircle hover:bg-green-700 transition-colors text-sm">
                Активировать
              </button>
              <button className="px-3 py-1 bg-yellow-600 text-white rounded-squircle hover:bg-yellow-700 transition-colors text-sm">
                Деактивировать
              </button>
              <button className="px-3 py-1 bg-red-600 text-white rounded-squircle hover:bg-red-700 transition-colors text-sm">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Events Grid */}
      {renderContent}
      {/* Fallback на случай, если ничего не отрендерилось */}
      {!renderContent && <div className="text-center py-12 text-gray-500">Нет данных для отображения</div>}
    </div>
  );
}