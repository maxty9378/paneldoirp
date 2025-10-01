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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/50 transform animate-scale-in">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <User className="text-white" size={20} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Войти как</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all"
            >
              ×
            </button>
          </div>

          {cachedUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4">
                <User className="text-gray-400" size={40} />
              </div>
              <p className="text-gray-700 font-medium mb-2">Нет сохраненных аккаунтов</p>
              <p className="text-sm text-gray-500 mt-2">
                Войдите в систему, чтобы сохранить аккаунт для быстрого доступа
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 font-medium mb-4">
                Выберите профиль для входа:
              </p>
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
              
              {cachedUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer group transition-all duration-200 ${
                    selectedUser?.id === user.id && isLoading
                      ? 'bg-blue-50 border-blue-400 shadow-lg shadow-blue-500/20'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md'
                  }`}
                  onClick={() => handleQuickLogin(user)}
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="w-14 h-14 rounded-2xl object-cover"
                      />
                    ) : (
                      <User className="text-white" size={28} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-lg truncate mb-0.5">{user.full_name}</p>
                    <div className="flex items-center space-x-2 mt-1.5">
                      <Shield className="text-gray-500" size={14} />
                      <span className="text-sm text-gray-600 font-medium">{getRoleDisplayName(user.role)}</span>
                    </div>
                  </div>

                  {selectedUser?.id === user.id && isLoading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeUser(user.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all"
                    >
                      <X size={18} />
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
