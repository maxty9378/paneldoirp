import React, { useState, useEffect } from 'react';
import { User, LogIn, X, Clock, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface CachedUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  last_sign_in_at: string;
  avatar_url?: string;
}

interface QuickLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (identifier: string, password: string) => Promise<void>;
}

export function QuickLoginModal({ isOpen, onClose, onLogin }: QuickLoginModalProps) {
  const [cachedUsers, setCachedUsers] = useState<CachedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<CachedUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загружаем кэшированных пользователей при открытии модала
  useEffect(() => {
    if (isOpen) {
      loadCachedUsers();
    }
  }, [isOpen]);

  const loadCachedUsers = () => {
    try {
      const cached = localStorage.getItem('cached_users');
      if (cached) {
        const users = JSON.parse(cached);
        // Сортируем по дате последнего входа (новые сверху)
        const sortedUsers = users.sort((a: CachedUser, b: CachedUser) => 
          new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime()
        );
        setCachedUsers(sortedUsers);
      }
    } catch (error) {
      console.error('Ошибка загрузки кэшированных пользователей:', error);
    }
  };

  const handleQuickLogin = async (user: CachedUser) => {
    setSelectedUser(user);
    setError(null);
    
    // Автоматически выполняем вход с паролем 123456
    setIsLoading(true);
    try {
      await onLogin(user.email, '123456');
      // Обновляем дату последнего входа
      updateLastSignIn(user.id);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Ошибка входа');
    } finally {
      setIsLoading(false);
    }
  };


  const updateLastSignIn = (userId: string) => {
    try {
      const cached = localStorage.getItem('cached_users');
      if (cached) {
        const users = JSON.parse(cached);
        const updatedUsers = users.map((user: CachedUser) => 
          user.id === userId 
            ? { ...user, last_sign_in_at: new Date().toISOString() }
            : user
        );
        localStorage.setItem('cached_users', JSON.stringify(updatedUsers));
      }
    } catch (error) {
      console.error('Ошибка обновления даты входа:', error);
    }
  };

  const removeUser = (userId: string) => {
    try {
      const cached = localStorage.getItem('cached_users');
      if (cached) {
        const users = JSON.parse(cached);
        const filteredUsers = users.filter((user: CachedUser) => user.id !== userId);
        localStorage.setItem('cached_users', JSON.stringify(filteredUsers));
        setCachedUsers(filteredUsers);
        if (selectedUser?.id === userId) {
          setSelectedUser(null);
        }
      }
    } catch (error) {
      console.error('Ошибка удаления пользователя:', error);
    }
  };

  const formatLastSignIn = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Только что';
    if (diffInHours < 24) return `${diffInHours} ч. назад`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} дн. назад`;
    return date.toLocaleDateString('ru-RU');
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames: { [key: string]: string } = {
      'employee': 'Сотрудник',
      'supervisor': 'Руководитель',
      'trainer': 'Тренер',
      'expert': 'Эксперт',
      'moderator': 'Модератор',
      'administrator': 'Администратор'
    };
    return roleNames[role] || role;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Clock className="text-blue-600" size={24} />
              <h3 className="text-lg font-semibold">Быстрый вход</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ×
            </button>
          </div>

          {cachedUsers.length === 0 ? (
            <div className="text-center py-8">
              <User className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">Нет сохраненных аккаунтов</p>
              <p className="text-sm text-gray-500 mt-2">
                Войдите в систему, чтобы сохранить аккаунт для быстрого доступа
              </p>
            </div>
          ) : (
            // Список сохраненных пользователей
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Выберите аккаунт для быстрого входа:
              </p>
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
              
              {cachedUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer group ${
                    selectedUser?.id === user.id && isLoading ? 'bg-blue-50 border-blue-300' : ''
                  }`}
                  onClick={() => handleQuickLogin(user)}
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="text-blue-600" size={20} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                    <p className="text-sm text-gray-600 truncate">{user.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Shield className="text-gray-400" size={12} />
                      <span className="text-xs text-gray-500">{getRoleDisplayName(user.role)}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{formatLastSignIn(user.last_sign_in_at)}</span>
                    </div>
                  </div>
                  
                  {selectedUser?.id === user.id && isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeUser(user.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
