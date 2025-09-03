import React, { useState } from 'react';
import { Bell, X, Clock, AlertCircle } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { NOTIFICATION_TYPE_LABELS, NOTIFICATION_PRIORITY_LABELS } from '../../types';

export function NotificationBell() {
  const [showNotifications, setShowNotifications] = useState(false);
  const { 
    notifications, 
    loading, 
    error, 
    markAsRead, 
    getUnreadCount, 
    formatTime 
  } = useNotifications();

  const unreadCount = getUnreadCount();

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="p-2 text-gray-400 hover:text-gray-600 transition-colors relative"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Уведомления</h3>
            <button
              onClick={() => setShowNotifications(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                Загрузка уведомлений...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">
                <AlertCircle size={20} className="mx-auto mb-2" />
                Ошибка загрузки уведомлений
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Нет уведомлений
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    notification.status === 'pending' ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    if (notification.status === 'pending') {
                      markAsRead(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          notification.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                          notification.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                          notification.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {NOTIFICATION_PRIORITY_LABELS[notification.priority]}
                        </span>
                      </div>
                      {notification.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock size={12} />
                        <span>{formatTime(notification.created_at)}</span>
                        <span className="text-gray-300">•</span>
                        <span>{NOTIFICATION_TYPE_LABELS[notification.type]}</span>
                      </div>
                    </div>
                    {notification.status === 'pending' && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1 flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}