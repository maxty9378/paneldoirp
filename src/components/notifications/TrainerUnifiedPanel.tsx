import React, { useState, useEffect } from 'react';
import { X, Users, CheckCircle, Clock, AlertCircle, ChevronRight, ChevronLeft, Bell, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrainerNotification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'action';
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon: React.ReactNode;
  priority: number;
  autoHide?: boolean;
  autoHideDelay?: number;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  inProgress: boolean;
}

interface TrainerUnifiedPanelProps {
  event: any;
  userProfile: any;
  participants: any[];
  onMarkAttendance?: () => void;
  onViewParticipants?: () => void;
  onStartEvent?: () => void;
  onCompleteEvent?: () => void;
}

export function TrainerUnifiedPanel({
  event,
  userProfile,
  participants,
  onMarkAttendance,
  onViewParticipants,
  onStartEvent,
  onCompleteEvent
}: TrainerUnifiedPanelProps) {
  const [notifications, setNotifications] = useState<TrainerNotification[]>([]);
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'notifications' | 'progress'>('notifications');

  // Генерируем уведомления на основе состояния мероприятия
  useEffect(() => {
    if (!userProfile || userProfile.role !== 'trainer' || !event) return;

    const newNotifications: TrainerNotification[] = [];
    const now = new Date();
    const eventStart = new Date(event.start_date);
    const eventEnd = new Date(event.end_date);
    const isEventStarted = now >= eventStart;
    const isEventEnded = event.status === 'completed' || (event.end_date && now >= eventEnd);
    const isEventToday = now.toDateString() === eventStart.toDateString();

    const totalParticipants = participants.length;
    const attendedParticipants = participants.filter(p => p.attended).length;
    const unattendedParticipants = totalParticipants - attendedParticipants;

    // 1. ВЫСШИЙ ПРИОРИТЕТ: Отметить присутствие участников
    if (isEventStarted && !isEventEnded && unattendedParticipants > 0) {
      newNotifications.push({
        id: 'mark-attendance',
        type: 'action',
        title: 'Отметьте присутствие',
        description: `${unattendedParticipants} из ${totalParticipants} участников не отмечены как присутствующие`,
        actionText: 'Отметить присутствие',
        onAction: onMarkAttendance,
        icon: <Users className="w-5 h-5" />,
        priority: 1,
        autoHide: false
      });
    }

    // 2. ВЫСШИЙ ПРИОРИТЕТ: Начать мероприятие
    if (!isEventStarted && isEventToday) {
      const timeUntilStart = Math.floor((eventStart.getTime() - now.getTime()) / (1000 * 60));
      if (timeUntilStart <= 0) {
        newNotifications.push({
          id: 'start-event',
          type: 'action',
          title: 'Начните мероприятие',
          description: 'Время начала мероприятия наступило. Нажмите для начала.',
          actionText: 'Начать мероприятие',
          onAction: onStartEvent,
          icon: <AlertCircle className="w-5 h-5" />,
          priority: 1,
          autoHide: false
        });
      }
    }

    // 3. СРЕДНИЙ ПРИОРИТЕТ: Мероприятие скоро начнется
    if (isEventToday && !isEventStarted && totalParticipants > 0) {
      const timeUntilStart = Math.floor((eventStart.getTime() - now.getTime()) / (1000 * 60));
      if (timeUntilStart <= 30 && timeUntilStart > 0) {
        newNotifications.push({
          id: 'event-starting',
          type: 'warning',
          title: 'Мероприятие скоро начнется',
          description: `До начала мероприятия осталось ${timeUntilStart} минут. Подготовьте материалы.`,
          icon: <Clock className="w-5 h-5" />,
          priority: 2,
          autoHide: false
        });
      }
    }

    // 4. ИНФОРМАЦИОННОЕ: Мероприятие можно завершить
    if (isEventStarted && event.status !== 'completed' && event.end_date && now >= eventEnd) {
      newNotifications.push({
        id: 'event-can-be-completed',
        type: 'info',
        title: 'Мероприятие можно завершить',
        description: 'Время мероприятия истекло. Используйте кнопку на странице для завершения.',
        icon: <CheckCircle className="w-5 h-5" />,
        priority: 3,
        autoHide: false
      });
    }

    // 5. СРЕДНИЙ ПРИОРИТЕТ: Завершить отметку присутствия
    if (isEventEnded && attendedParticipants < totalParticipants) {
      newNotifications.push({
        id: 'complete-attendance',
        type: 'info',
        title: 'Завершите отметку присутствия',
        description: `Мероприятие завершено. Отметьте присутствие оставшихся участников.`,
        actionText: 'Завершить отметку',
        onAction: onMarkAttendance,
        icon: <CheckCircle className="w-5 h-5" />,
        priority: 2,
        autoHide: false
      });
    }

    // 6. НИЗКИЙ ПРИОРИТЕТ: Просмотреть участников
    if (totalParticipants > 0 && !isEventEnded) {
      newNotifications.push({
        id: 'view-participants',
        type: 'info',
        title: 'Просмотрите участников',
        description: `В мероприятии участвует ${totalParticipants} человек. Проверьте состав участников.`,
        actionText: 'Посмотреть участников',
        onAction: onViewParticipants,
        icon: <Users className="w-5 h-5" />,
        priority: 3,
        autoHide: false
      });
    }

    newNotifications.sort((a, b) => a.priority - b.priority);
    setNotifications(newNotifications);
    setCurrentNotificationIndex(0);
  }, [event, userProfile, participants, onMarkAttendance, onViewParticipants, onStartEvent, onCompleteEvent]);

  // Автоматическое скрытие уведомлений
  useEffect(() => {
    const currentNotification = notifications[currentNotificationIndex];
    if (currentNotification?.autoHide && currentNotification.autoHideDelay) {
      const timer = setTimeout(() => {
        dismissNotification(currentNotification.id);
      }, currentNotification.autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [notifications, currentNotificationIndex]);

  const dismissNotification = (id: string) => {
    setDismissedNotifications(prev => new Set([...prev, id]));
    
    const nextIndex = currentNotificationIndex + 1;
    if (nextIndex < notifications.length) {
      setCurrentNotificationIndex(nextIndex);
    } else {
      setCurrentNotificationIndex(0);
    }
  };

  const showNextNotification = () => {
    const nextIndex = (currentNotificationIndex + 1) % notifications.length;
    setCurrentNotificationIndex(nextIndex);
  };

  const showPreviousNotification = () => {
    const prevIndex = currentNotificationIndex - 1 < 0 ? notifications.length - 1 : currentNotificationIndex - 1;
    setCurrentNotificationIndex(prevIndex);
  };

  const visibleNotifications = notifications.filter(n => !dismissedNotifications.has(n.id));
  const currentNotification = visibleNotifications[currentNotificationIndex];

  // Логика для прогресса
  const now = new Date();
  const eventStart = new Date(event.start_date);
  const eventEnd = new Date(event.end_date);
  const isEventStarted = now >= eventStart;
  const isEventEnded = event.status === 'completed' || (event.end_date && now >= eventEnd);
  
  const totalParticipants = participants.length;
  const attendedParticipants = participants.filter(p => p.attended).length;
  const unattendedParticipants = totalParticipants - attendedParticipants;

  const tasks: Task[] = [
    {
      id: 'check-participants',
      title: 'Проверить участников',
      completed: totalParticipants > 0,
      inProgress: false
    },
    {
      id: 'mark-attendance',
      title: 'Отметить присутствие',
      completed: unattendedParticipants === 0 && totalParticipants > 0,
      inProgress: isEventStarted && unattendedParticipants > 0
    },
    {
      id: 'conduct-event',
      title: 'Провести мероприятие',
      completed: isEventEnded,
      inProgress: isEventStarted && !isEventEnded
    },
    {
      id: 'complete-event',
      title: 'Завершить мероприятие',
      completed: event.status === 'completed',
      inProgress: event.end_date && now >= eventEnd && event.status !== 'completed'
    }
  ];

  const completedTasks = tasks.filter(t => t.completed).length;
  const progressPercentage = (completedTasks / tasks.length) * 100;

  // Панель показывается только для тренеров
  if (userProfile?.role !== 'trainer') return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="pointer-events-auto"
      >
        {isCollapsed ? (
          // СВЁРНУТЫЙ ВИД: круглая FAB
          <button
            onClick={() => setIsCollapsed(false)}
            className="relative flex items-center justify-center w-14 h-14 rounded-full
                       bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl
                       border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgba(2,6,23,.1)]
                       hover:shadow-[0_12px_40px_rgba(2,6,23,.15)]
                       transition-all"
            aria-label="Открыть панель тренера"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500/15 to-emerald-600/10 pointer-events-none" />
            {activeTab === 'notifications' ? (
              <Bell className="w-6 h-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            ) : (
              <BarChart3 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            )}

            {/* Бейдж количества уведомлений */}
            {visibleNotifications.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full
                               bg-emerald-600 text-white text-[11px] font-semibold
                               flex items-center justify-center shadow-md">
                {visibleNotifications.length}
              </span>
            )}
          </button>
        ) : (
          // РАЗВЁРНУТЫЙ ВИД: стеклянная карточка справа снизу
          <motion.div
            key="trainer-panel"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-[320px] sm:w-[360px] rounded-2xl
                       bg-white/75 dark:bg-zinc-900/70 backdrop-blur-xl
                       border border-white/50 dark:border-white/10
                       shadow-[0_12px_50px_rgba(2,6,23,.15)]"
          >
            {/* Хедер с табами и кнопками */}
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <div className="inline-flex p-1 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/60">
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition
                    ${activeTab === 'notifications'
                      ? 'bg-white dark:bg-zinc-900 shadow-sm text-emerald-700 dark:text-emerald-300'
                      : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'}`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  Уведомления
                  {visibleNotifications.length > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full
                                     bg-emerald-600 text-white text-[10px]">{visibleNotifications.length}</span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('progress')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition
                    ${activeTab === 'progress'
                      ? 'bg-white dark:bg-zinc-900 shadow-sm text-emerald-700 dark:text-emerald-300'
                      : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'}`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Прогресс
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Свернуть */}
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-800 dark:hover:text-white
                             hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition"
                  aria-label="Свернуть"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Закрыть текущее уведомление (в вкладке уведомлений) */}
                {activeTab === 'notifications' && currentNotification && (
                  <button
                    onClick={() => dismissNotification(currentNotification.id)}
                    className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-800 dark:hover:text-white
                               hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition"
                    aria-label="Скрыть уведомление"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Контент */}
            <AnimatePresence mode="wait">
              {activeTab === 'notifications' ? (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="px-4 pb-4"
                >
                  {currentNotification ? (
                    <>
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className={`p-2.5 rounded-lg ring-1 ring-inset
                            ${currentNotification.type === 'action'
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                              : currentNotification.type === 'warning'
                              ? 'bg-amber-50 text-amber-700 ring-amber-200'
                              : currentNotification.type === 'success'
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                              : 'bg-zinc-100 text-zinc-700 ring-zinc-200'}`}
                        >
                          {currentNotification.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {currentNotification.title}
                          </h4>
                          {visibleNotifications.length > 1 && (
                            <p className="mt-0.5 text-[11px] text-zinc-500">
                              {currentNotificationIndex + 1} из {visibleNotifications.length}
                            </p>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-zinc-700 dark:text-zinc-200 mb-4">
                        {currentNotification.description}
                      </p>

                      {currentNotification.actionText && currentNotification.onAction && (
                        <button
                          onClick={currentNotification.onAction}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5
                                     rounded-lg text-sm font-medium
                                     bg-emerald-600 text-white hover:bg-emerald-700
                                     shadow-sm transition"
                        >
                          {currentNotification.actionText}
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}

                      {visibleNotifications.length > 1 && (
                        <div className="mt-3 flex items-center justify-center gap-2">
                          <button
                            onClick={showPreviousNotification}
                            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-800 dark:hover:text-white
                                       hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition"
                            aria-label="Предыдущее"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-xs text-zinc-500">
                            {currentNotificationIndex + 1} / {visibleNotifications.length}
                          </span>
                          <button
                            onClick={showNextNotification}
                            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-800 dark:hover:text-white
                                       hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition"
                            aria-label="Следующее"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-10 text-center text-zinc-500">
                      <Bell className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                      <p className="text-sm">Нет активных уведомлений</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="progress"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="px-4 pb-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Прогресс</h4>
                    <span className="text-xs text-zinc-500">{completedTasks}/{tasks.length}</span>
                  </div>

                  {/* прогресс-бар */}
                  <div className="w-full h-2 rounded-full bg-zinc-200/80 dark:bg-zinc-700/60 mb-4 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-full bg-emerald-600"
                    />
                  </div>

                  <div className="space-y-2">
                    {tasks.map(task => (
                      <div key={task.id} className="flex items-center gap-2 text-xs">
                        {task.completed ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : task.inProgress ? (
                          <Clock className="w-4 h-4 text-blue-600" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-zinc-300 dark:border-zinc-600" />
                        )}
                        <span className={`${task.completed
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : task.inProgress
                            ? 'text-blue-700 dark:text-blue-400'
                            : 'text-zinc-600 dark:text-zinc-300'}`}>
                          {task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
