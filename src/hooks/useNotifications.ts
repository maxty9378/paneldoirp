import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { NotificationTask } from '../types';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Получение уведомлений пользователя
  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('notification_tasks')
        .select('*')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        throw fetchError;
      }

      setNotifications(data || []);
    } catch (err: any) {
      console.error('Ошибка загрузки уведомлений:', err);
      setError(err.message || 'Ошибка загрузки уведомлений');
    } finally {
      setLoading(false);
    }
  };

  // Отметить уведомление как прочитанное
  const markAsRead = async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notification_tasks')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (updateError) {
        throw updateError;
      }

      // Обновляем локальное состояние
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, status: 'completed' as const, completed_at: new Date().toISOString() }
            : notification
        )
      );
    } catch (err: any) {
      console.error('Ошибка обновления уведомления:', err);
      setError(err.message || 'Ошибка обновления уведомления');
    }
  };

  // Создать новое уведомление
  const createNotification = async (
    assignedTo: string,
    title: string,
    description?: string,
    type: NotificationTask['type'] = 'general',
    priority: NotificationTask['priority'] = 'medium',
    metadata: Record<string, any> = {}
  ) => {
    try {
      const { data, error: createError } = await supabase
        .from('notification_tasks')
        .insert({
          user_id: user?.id,
          assigned_to: assignedTo,
          title,
          description,
          type,
          priority,
          metadata
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Если уведомление создано для текущего пользователя, добавляем в локальное состояние
      if (assignedTo === user?.id) {
        setNotifications(prev => [data, ...prev]);
      }

      return data;
    } catch (err: any) {
      console.error('Ошибка создания уведомления:', err);
      setError(err.message || 'Ошибка создания уведомления');
      throw err;
    }
  };

  // Получить количество непрочитанных уведомлений
  const getUnreadCount = () => {
    return notifications.filter(n => n.status === 'pending').length;
  };

  // Форматирование времени
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'только что';
    if (diffInMinutes < 60) return `${diffInMinutes} мин назад`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} час${diffInHours > 1 ? 'а' : ''} назад`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} дн${diffInDays > 1 ? 'ей' : 'ь'} назад`;
    
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Загружаем уведомления при изменении пользователя
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setLoading(false);
    }
  }, [user?.id]);

  return {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    createNotification,
    getUnreadCount,
    formatTime
  };
}
