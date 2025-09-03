import { supabase } from '../lib/supabase';
import { NotificationTask } from '../types';

// Создание уведомления о новом мероприятии
export const createEventNotification = async (
  assignedTo: string,
  eventTitle: string,
  eventId: string
) => {
  try {
    const { data, error } = await supabase
      .from('notification_tasks')
      .insert({
        assigned_to: assignedTo,
        title: 'Новое мероприятие',
        description: `Добавлено мероприятие "${eventTitle}"`,
        type: 'event',
        priority: 'medium',
        metadata: {
          event_id: eventId,
          event_title: eventTitle
        }
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Ошибка создания уведомления о мероприятии:', error);
    throw error;
  }
};

// Создание уведомления о завершении теста
export const createTestCompletionNotification = async (
  assignedTo: string,
  testTitle: string,
  participantName: string,
  testId: string
) => {
  try {
    const { data, error } = await supabase
      .from('notification_tasks')
      .insert({
        assigned_to: assignedTo,
        title: 'Тест завершен',
        description: `Участник ${participantName} завершил тест "${testTitle}"`,
        type: 'test',
        priority: 'low',
        metadata: {
          test_id: testId,
          test_title: testTitle,
          participant_name: participantName
        }
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Ошибка создания уведомления о тесте:', error);
    throw error;
  }
};

// Создание уведомления о задаче
export const createTaskNotification = async (
  assignedTo: string,
  taskTitle: string,
  taskDescription?: string,
  priority: NotificationTask['priority'] = 'medium',
  dueDate?: string
) => {
  try {
    const { data, error } = await supabase
      .from('notification_tasks')
      .insert({
        assigned_to: assignedTo,
        title: taskTitle,
        description: taskDescription,
        type: 'task',
        priority,
        due_date: dueDate
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Ошибка создания уведомления о задаче:', error);
    throw error;
  }
};

// Создание системного уведомления
export const createSystemNotification = async (
  assignedTo: string,
  title: string,
  description: string,
  priority: NotificationTask['priority'] = 'medium'
) => {
  try {
    const { data, error } = await supabase
      .from('notification_tasks')
      .insert({
        assigned_to: assignedTo,
        title,
        description,
        type: 'system',
        priority
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Ошибка создания системного уведомления:', error);
    throw error;
  }
};

// Создание уведомления для всех пользователей с определенной ролью
export const createNotificationForRole = async (
  role: string,
  title: string,
  description: string,
  type: NotificationTask['type'] = 'general',
  priority: NotificationTask['priority'] = 'medium'
) => {
  try {
    // Получаем всех пользователей с указанной ролью
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('role', role)
      .eq('is_active', true);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      console.log(`Нет активных пользователей с ролью ${role}`);
      return [];
    }

    // Создаем уведомления для всех пользователей
    const notifications = users.map(user => ({
      assigned_to: user.id,
      title,
      description,
      type,
      priority
    }));

    const { data, error } = await supabase
      .from('notification_tasks')
      .insert(notifications)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Ошибка создания уведомлений для роли:', error);
    throw error;
  }
};
