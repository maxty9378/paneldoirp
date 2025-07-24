import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import './EventCard.css';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Video,
  BookOpen,
  Target,
  Zap,
  BarChart3,
  UserCheck,
  Building2,
  GraduationCap,
  Presentation,
  TestTube,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  CalendarDays,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { clsx } from 'clsx';
import { Event, EVENT_TYPE_LABELS } from '../../types';

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

interface EventCardProps {
  event: EventWithStats;
  index: number;
  canCreateEvents: boolean;
  onNavigateToEvent?: (eventId: string) => void;
  onEditEvent?: (eventId: string) => void;
  onDeleteEvent?: (eventId: string) => void;
  isLoading?: boolean;
  showStats?: boolean;
  showUrgentTasks?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export function EventCard({ 
  event, 
  index, 
  canCreateEvents, 
  onNavigateToEvent, 
  onEditEvent, 
  onDeleteEvent,
  isLoading = false,
  showStats = true,
  showUrgentTasks = true,
  variant = 'default'
}: EventCardProps) {
  // Отладочная информация при рендере компонента (только при изменении)
  useEffect(() => {
    console.log('EventCard render:', {
      eventId: event.id,
      eventTitle: event.title,
      canCreateEvents,
      onEditEvent: typeof onEditEvent,
      onDeleteEvent: typeof onDeleteEvent,
      onNavigateToEvent: typeof onNavigateToEvent
    });
  }, [event.id, event.title, canCreateEvents, onEditEvent, onDeleteEvent, onNavigateToEvent]);
  const [openMenu, setOpenMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Закрытие меню при клике вне его
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openMenu) {
        // Проверяем, что клик не внутри меню
        const target = event.target as Element;
        const menuElement = document.querySelector('[data-menu="event-menu"]');
        
        if (menuElement && !menuElement.contains(target)) {
          console.log('Click outside menu detected, closing menu');
          setOpenMenu(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenu]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'published': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ongoing': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'completed': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
      case 'ongoing':
      case 'active':
        return <Play size={16} className="text-emerald-600" />;
      case 'completed':
        return <CheckCircle size={16} className="text-indigo-600" />;
      case 'cancelled':
        return <XCircle size={16} className="text-red-600" />;
      case 'draft':
        return <Pause size={16} className="text-slate-600" />;
      default:
        return <AlertCircle size={16} className="text-slate-600" />;
    }
  };

  const getTypeIcon = (event: EventWithStats) => {
    const typeName = event.event_types?.name || event.type || '';
    switch (typeName) {
      case 'online_training':
        return <Video size={18} className="text-blue-500" />;
      case 'in_person_training':
        return <Building2 size={18} className="text-emerald-500" />;
      case 'webinar':
        return <Presentation size={18} className="text-purple-500" />;
      case 'exam':
        return <TestTube size={18} className="text-red-500" />;
      case 'workshop':
        return <GraduationCap size={18} className="text-orange-500" />;
      case 'conference':
        return <Users size={18} className="text-indigo-500" />;
      case 'welcome_course':
        return <BookOpen size={18} className="text-cyan-500" />;
      case 'online_marathon':
        return <Zap size={18} className="text-yellow-500" />;
      case 'work_session':
        return <Target size={18} className="text-pink-500" />;
      case 'practicum':
        return <GraduationCap size={18} className="text-teal-500" />;
      case 'case_marathon':
        return <BookOpen size={18} className="text-amber-500" />;
      case 'demo_laboratory':
        return <TestTube size={18} className="text-violet-500" />;
      case 'complex_program':
        return <BookOpen size={18} className="text-rose-500" />;
      case 'business_game':
        return <Target size={18} className="text-lime-500" />;
      case 'active_seminar':
        return <Presentation size={18} className="text-sky-500" />;
      case 'team_tracking':
        return <UserCheck size={18} className="text-emerald-500" />;
      default:
        return <Calendar size={18} className="text-slate-500" />;
    }
  };

  const getTypeColor = (event: EventWithStats) => {
    const typeName = event.event_types?.name || event.type || '';
    switch (typeName) {
      case 'online_training': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in_person_training': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'webinar': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'exam': return 'bg-red-50 text-red-700 border-red-200';
      case 'workshop': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'conference': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'welcome_course': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'online_marathon': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'work_session': return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'practicum': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'case_marathon': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'demo_laboratory': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'complex_program': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'business_game': return 'bg-lime-50 text-lime-700 border-lime-200';
      case 'active_seminar': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'team_tracking': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getTypeLabel = (event: EventWithStats) => {
    if (event.event_types?.name_ru) {
      return event.event_types.name_ru;
    }
    if (event.event_types?.name) {
      return event.event_types.name;
    }
    return EVENT_TYPE_LABELS[event.type || ''] || 'Неизвестный тип';
  };

  const getUrgentTasks = useCallback((event: EventWithStats) => {
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
  }, []);

  const toggleMenu = useCallback(() => {
    console.log('toggleMenu called, current openMenu:', openMenu);
    setOpenMenu(prev => !prev);
  }, [openMenu]);

  const closeMenu = useCallback(() => {
    console.log('closeMenu called');
    setOpenMenu(false);
  }, []);

  const getCardGradient = (index: number) => {
    const gradients = [
      'from-white via-blue-50/30 to-indigo-50/30',
      'from-white via-emerald-50/30 to-teal-50/30',
      'from-white via-purple-50/30 to-pink-50/30',
      'from-white via-orange-50/30 to-amber-50/30',
      'from-white via-slate-50/30 to-gray-50/30',
      'from-white via-green-50/30 to-emerald-50/30'
    ];
    return gradients[index % gradients.length];
  };

  const urgentTasks = useMemo(() => getUrgentTasks(event), [getUrgentTasks, event]);
  const hasStats = useMemo(() => (event.participants_count || 0) > 0, [event.participants_count]);
  
  // Определяем размеры карточки в зависимости от варианта
  const cardSize = useMemo(() => {
    switch (variant) {
      case 'compact':
        return 'p-4';
      case 'detailed':
        return 'p-8';
      default:
        return 'p-6';
    }
  }, [variant]);
  
  // Мемоизация обработчиков событий
  const handleCardClick = useCallback(() => {
    if (onNavigateToEvent) {
      onNavigateToEvent(event.id);
    }
  }, [onNavigateToEvent, event.id]);

  const handleViewClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('View button clicked for event:', event.id);
    if (onNavigateToEvent) {
      onNavigateToEvent(event.id);
    } else {
      console.warn('onNavigateToEvent handler is not provided');
    }
  }, [onNavigateToEvent, event.id]);

  const handleViewInMenu = useCallback((e: React.MouseEvent) => {
    console.log('View button in menu clicked');
    e.preventDefault();
    e.stopPropagation();
    handleViewClick(e);
    closeMenu();
  }, [handleViewClick, closeMenu]);

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Edit button clicked for event:', event.id);
    console.log('onEditEvent handler:', onEditEvent);
    console.log('canCreateEvents:', canCreateEvents);
    
    if (onEditEvent && typeof onEditEvent === 'function') {
      try {
        onEditEvent(event.id);
        console.log('onEditEvent called successfully');
      } catch (error) {
        console.error('Error calling onEditEvent:', error);
      }
    } else {
      console.warn('onEditEvent handler is not provided or not a function');
    }
  }, [onEditEvent, event.id, canCreateEvents]);

  // Создаем стабильные обработчики для кнопок меню
  const handleEditInMenu = useCallback((e: React.MouseEvent) => {
    console.log('Edit button in menu clicked');
    e.preventDefault();
    e.stopPropagation();
    handleEditClick(e);
    closeMenu();
  }, [handleEditClick, closeMenu]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Delete button clicked for event:', event.id);
    if (onDeleteEvent) {
      onDeleteEvent(event.id);
    } else {
      console.warn('onDeleteEvent handler is not provided');
    }
  }, [onDeleteEvent, event.id]);

  const handleDeleteInMenu = useCallback((e: React.MouseEvent) => {
    console.log('Delete button in menu clicked');
    e.preventDefault();
    e.stopPropagation();
    
    // Показываем модальное окно подтверждения
    setShowDeleteConfirm(true);
    closeMenu();
  }, [closeMenu]);

  const handleConfirmDelete = useCallback(() => {
    console.log('Delete confirmed for event:', event.id);
    if (onDeleteEvent) {
      onDeleteEvent(event.id);
    }
    setShowDeleteConfirm(false);
  }, [onDeleteEvent, event.id]);

  const handleCancelDelete = useCallback(() => {
    console.log('Delete cancelled');
    setShowDeleteConfirm(false);
  }, []);

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx(
        "group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ease-out",
        "bg-gradient-to-br border border-gray-200 shadow-lg",
        "hover:shadow-xl hover:-translate-y-1",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        getCardGradient(index)
      )}
      style={{
        animationDelay: `${index * 0.05}s`,
      }}
      tabIndex={0}
      role="button"
      aria-label={`Открыть мероприятие: ${event.title}`}
    >
      <div className={clsx("relative flex flex-col h-full", cardSize)}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-white border border-gray-200 shadow-sm">
                {getTypeIcon(event)}
              </div>
              <span className={clsx(
                "inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border",
                "transition-colors duration-200",
                getTypeColor(event)
              )}>
                {getTypeLabel(event)}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-200 mb-2 leading-tight">
              {event.title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className={clsx(
              "inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors duration-200",
              getStatusColor(event.status)
            )}>
              {getStatusIcon(event.status)}
            </div>
            {canCreateEvents && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Menu toggle button clicked, current state:', openMenu);
                    toggleMenu();
                  }}
                  className={clsx(
                    "p-2 rounded-lg transition-all duration-200 cursor-pointer backdrop-blur-sm",
                    openMenu 
                      ? "text-blue-600 bg-blue-100/80 shadow-lg" 
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 hover:shadow-md"
                  )}
                  title="Дополнительно"
                  aria-label="Открыть меню действий"
                  type="button"
                  style={{ 
                    pointerEvents: 'auto',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {openMenu && (
                  <div 
                    data-menu="event-menu"
                    className="absolute right-0 top-full mt-1 w-52 rounded-xl shadow-2xl z-50"
                    style={{ 
                      pointerEvents: 'auto',
                      userSelect: 'none',
                      position: 'absolute',
                      zIndex: 9999,
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                      animation: 'slideIn 0.2s ease-out'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Индикатор открытого меню с эффектом стекла */}
                    <div 
                      className="absolute -top-2 right-5 w-4 h-4 transform rotate-45"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderBottom: 'none',
                        borderRight: 'none'
                      }}
                    ></div>
                    <div className="py-2 px-2">
                      <button
                        onClick={handleViewInMenu}
                        className="w-full px-4 py-3 text-left text-sm text-gray-700 flex items-center gap-3 transition-all duration-200 cursor-pointer select-none rounded-lg glass-menu-button"
                        style={{ 
                          pointerEvents: 'auto',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none',
                          userSelect: 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Eye className="w-4 h-4 text-blue-500" />
                        Просмотр
                      </button>
                      {canCreateEvents && (
                        <button
                          onClick={handleEditInMenu}
                          className="w-full px-4 py-3 text-left text-sm text-gray-700 flex items-center gap-3 transition-all duration-200 cursor-pointer select-none rounded-lg glass-menu-button"
                          type="button"
                          style={{ 
                            pointerEvents: 'auto',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none',
                            userSelect: 'none'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Edit className="w-4 h-4 text-emerald-500" />
                          Редактировать
                        </button>
                      )}
                      {canCreateEvents && (
                        <button
                          onClick={handleDeleteInMenu}
                          className="w-full px-4 py-3 text-left text-sm text-red-600 flex items-center gap-3 transition-all duration-200 cursor-pointer select-none rounded-lg glass-menu-button"
                          style={{ 
                            pointerEvents: 'auto',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none',
                            userSelect: 'none'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="font-medium">
              {event.start_date || event.date_time 
                ? format(new Date(event.start_date || event.date_time as string), 'dd MMM yyyy', { locale: ru })
                : '—'
              }
            </span>
          </div>
          
          {/* Time */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span className="font-medium">
              {event.start_date || event.date_time 
                ? format(new Date(event.start_date || event.date_time as string), 'HH:mm')
                : '—'
              }
              {event.end_date && (
                <span className="ml-1">- {format(new Date(event.end_date as string), 'HH:mm')}</span>
              )}
            </span>
          </div>
          
          {/* Participants */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <UserCheck className="w-4 h-4 text-purple-500" />
            <span className="font-medium">
              {event.participants_count || 0} участников
              {event.max_participants && (
                <span className="text-gray-400 ml-1">из {event.max_participants}</span>
              )}
            </span>
          </div>
          
          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-orange-500" />
            <span className="font-medium truncate" title={event.location || 'Не указано'}>
              {event.location || 'Не указано'}
            </span>
          </div>
        </div>

        {/* Statistics - только если есть участники и включено отображение */}
        {hasStats && showStats && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Статистика тестов</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="text-center">
                <div className="font-bold text-emerald-600 text-base">{event.test_completed_count || 0}</div>
                <div className="text-gray-500 text-xs">Пройдено</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-red-600 text-base">{event.test_not_passed_count || 0}</div>
                <div className="text-gray-500 text-xs">Не прошли</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-blue-600 text-base">{event.test_pass_percent || 0}%</div>
                <div className="text-gray-500 text-xs">Успешность</div>
              </div>
            </div>
          </div>
        )}

        {/* Urgent Tasks - только если есть задачи и включено отображение */}
        {urgentTasks.length > 0 && showUrgentTasks && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Требует внимания</span>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {urgentTasks.map((task: string, index: number) => (
                <li key={index} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                  {task}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-auto">
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              Создано {event.created_at ? format(new Date(event.created_at as string), 'dd.MM.yyyy') : ''}
            </div>
          </div>
          
          {/* Action Button */}
          <button 
            onClick={handleViewClick}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-300" 
            title="Открыть мероприятие"
            aria-label="Открыть мероприятие"
          >
            <span>Подробнее</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Модальное окно подтверждения удаления */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Удаление мероприятия"
        message={`Вы уверены, что хотите удалить мероприятие "${event.title}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        type="danger"
      />
    </div>
  );
}