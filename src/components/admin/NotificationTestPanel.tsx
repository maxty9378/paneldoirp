import React, { useState } from 'react';
import { Bell, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { createSystemNotification, createNotificationForRole } from '../../utils/notificationUtils';
import { useAuth } from '../../hooks/useAuth';

export function NotificationTestPanel() {
  const { user } = useAuth();
  const { createNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType(null);
    }, 3000);
  };

  const createTestNotification = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      await createSystemNotification(
        user.id,
        'Тестовое уведомление',
        'Это тестовое уведомление для проверки работы системы',
        'medium'
      );
      showMessage('success', 'Тестовое уведомление создано!');
    } catch (error) {
      console.error('Ошибка создания уведомления:', error);
      showMessage('error', 'Ошибка создания уведомления');
    } finally {
      setLoading(false);
    }
  };

  const createNotificationForAllTrainers = async () => {
    setLoading(true);
    try {
      await createNotificationForRole(
        'trainer',
        'Уведомление для тренеров',
        'Это уведомление отправлено всем тренерам системы',
        'system',
        'medium'
      );
      showMessage('success', 'Уведомления для тренеров созданы!');
    } catch (error) {
      console.error('Ошибка создания уведомлений:', error);
      showMessage('error', 'Ошибка создания уведомлений');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="w-6 h-6 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900">Тестирование уведомлений</h3>
      </div>
      
      <p className="text-gray-600 mb-6">
        Панель для тестирования системы уведомлений. Используйте эти функции для проверки работы уведомлений.
      </p>

      <div className="space-y-4">
        <button
          onClick={createTestNotification}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={16} />
          {loading ? 'Создание...' : 'Создать тестовое уведомление'}
        </button>

        <button
          onClick={createNotificationForAllTrainers}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Bell size={16} />
          {loading ? 'Отправка...' : 'Уведомить всех тренеров'}
        </button>
      </div>

      {message && (
        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
          messageType === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {messageType === 'success' ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span className="text-sm">{message}</span>
        </div>
      )}
    </div>
  );
}
