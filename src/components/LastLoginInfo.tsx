import React from 'react';
import { User, Calendar } from 'lucide-react';

interface LastLoginInfoProps {
  email: string;
  timestamp: number;
  onLoginAgain: () => void;
}

export function LastLoginInfo({ email, timestamp, onLoginAgain }: LastLoginInfoProps) {
  // Форматируем дату последнего входа
  const formatLastLogin = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'только что';
    } else if (diffMins < 60) {
      return `${diffMins} ${getMinutesText(diffMins)} назад`;
    } else if (diffHours < 24) {
      return `${diffHours} ${getHoursText(diffHours)} назад`;
    } else if (diffDays === 1) {
      return 'вчера';
    } else if (diffDays < 7) {
      return `${diffDays} ${getDaysText(diffDays)} назад`;
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  };

  const getMinutesText = (n: number): string => {
    if (n % 10 === 1 && n % 100 !== 11) return 'минуту';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'минуты';
    return 'минут';
  };

  const getHoursText = (n: number): string => {
    if (n % 10 === 1 && n % 100 !== 11) return 'час';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'часа';
    return 'часов';
  };

  const getDaysText = (n: number): string => {
    if (n % 10 === 1 && n % 100 !== 11) return 'день';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'дня';
    return 'дней';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ borderRadius: '28px' }}>
        {/* Заголовок */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Вы вышли из аккаунта</h2>
              <p className="text-sm text-gray-600">Хотите войти снова?</p>
            </div>
          </div>
        </div>

        {/* Информация о последнем входе */}
        <div className="px-6 py-6 space-y-4">
          <div className="rounded-xl bg-gray-50 p-4 border border-gray-200">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 mb-1">Последний вход</p>
                <p className="text-sm text-gray-600 truncate" title={email}>
                  {email}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatLastLogin(timestamp)}
                </p>
              </div>
            </div>
          </div>

          {/* Подсказка */}
          <div className="rounded-xl bg-blue-50 p-4 border border-blue-200">
            <p className="text-sm text-blue-800">
              💡 <strong>Совет:</strong> Вы можете войти снова одним кликом
            </p>
          </div>
        </div>

        {/* Кнопки */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-3">
          <button
            onClick={onLoginAgain}
            className="w-full bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white py-3 px-4 font-semibold hover:shadow-lg hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] text-sm"
            style={{ borderRadius: '14px' }}
          >
            Войти снова как {email.split('@')[0]}
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all duration-200 text-sm"
            style={{ borderRadius: '14px' }}
          >
            Войти другим аккаунтом
          </button>
        </div>
      </div>
    </div>
  );
}

