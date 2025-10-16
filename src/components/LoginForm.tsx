import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { QuickLoginModal } from './QuickLoginModal';
import { hasCachedUsers } from '../lib/userCache';
import { Spinner } from './ui/Spinner';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuickLogin, setShowQuickLogin] = useState(false);

  const { signIn, user, loading, authError } = useAuth();
  
  // Показываем экран успеха только если пользователь загружен и не идет процесс авторизации
  const showSuccessScreen = user && !loading;

  // Функция для добавления домена @sns.ru при отправке формы
  const prepareIdentifier = (value: string): string => {
    if (!value.includes('@')) {
      return value + '@sns.ru';
    }
    return value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    const preparedIdentifier = prepareIdentifier(identifier);
    const result = await signIn(preparedIdentifier, password);
    
    if (!result.error && onSuccess) {
      onSuccess();
    }
    
    setIsSubmitting(false);
  };

  const handleQuickLogin = async (email: string, password: string) => {
    const result = await signIn(email, password);
    if (!result.error && onSuccess) {
      onSuccess();
    }
  };

  if (showSuccessScreen) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="login-form bg-white rounded-2xl p-8 shadow-lg border">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Добро пожаловать!</h2>
            <p className="text-gray-600 mb-6">{user.full_name || user.email}</p>
            <div className="flex items-center justify-center text-green-600">
              <Spinner
                size={20}
                direction="horizontal"
                iconClassName="text-green-600"
                label="Перенаправляем..."
                labelClassName="text-green-600 font-medium"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Показываем форму только если нет пользователя и не идет загрузка
  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="login-form bg-white rounded-2xl p-8 shadow-lg border">
          <div className="text-center">
            <Spinner size={48} className="mx-auto mb-6" label="Подождите" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Обработка авторизации...</h2>
            <p className="text-gray-600">Пожалуйста, подождите</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="login-form bg-white rounded-2xl p-8 shadow-lg border">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <div className="login-icon w-16 h-16 bg-gradient-to-br from-[#06A478] to-[#4ade80] rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Добро пожаловать</h1>
          <p className="text-gray-600 text-sm">Система управления обучением SNS</p>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Поле логина */}
          <div className="space-y-2">
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
              Имя пользователя или SAP номер
            </label>
            <div className="relative">
              <input
                id="identifier"
                name="identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06A478] focus:border-transparent transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
                placeholder="Введите логин или SAP номер"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Поле пароля */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Пароль
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06A478] focus:border-transparent transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
                placeholder="Введите пароль"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Ошибка */}
          {authError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{authError}</p>
            </div>
          )}

          {/* Кнопка входа */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full bg-gradient-to-r from-[#06A478] to-[#4ade80] text-white py-3 px-4 rounded-lg font-medium hover:from-[#05976b] hover:to-[#22c55e] focus:outline-none focus:ring-2 focus:ring-[#06A478] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isSubmitting || loading ? (
                <div className="flex items-center justify-center text-white">
                  <Spinner
                    size={20}
                    direction="horizontal"
                    light
                    label="Авторизация..."
                    labelClassName="text-white"
                  />
                </div>
              ) : (
                <span className="flex items-center justify-center">
                  <span>Войти в систему</span>
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Быстрый вход */}
        {hasCachedUsers() && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">или</span>
              </div>
            </div>
            
            <button
              type="button"
              data-quick-login
              onClick={() => setShowQuickLogin(true)}
              className="mt-4 w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#06A478] focus:ring-offset-2 transition-all duration-200"
            >
              <Clock className="h-5 w-5 mr-2 text-[#06A478]" />
              <span>Быстрый вход</span>
            </button>
          </div>
        )}

        {/* Футер */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-xs text-gray-500">
            Система управления обучением и развитием сотрудников SNS • 2025
          </p>
          <div>
            <a 
              href="https://sns.ru" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs text-[#06A478] hover:text-[#05976b] transition-colors"
            >
              sns.ru
            </a>
          </div>
          {/* Версия приложения */}
          <p className="text-[10px] text-gray-400 font-mono">
            {import.meta.env.VITE_FULL_VERSION || `v${import.meta.env.VITE_APP_VERSION || 'dev'} · ${new Date(import.meta.env.VITE_BUILD_TIMESTAMP || Date.now()).toLocaleDateString('ru-RU')}`}
          </p>
        </div>
      </div>

      {/* Модальное окно быстрого входа */}
      <QuickLoginModal
        isOpen={showQuickLogin}
        onClose={() => setShowQuickLogin(false)}
        onLogin={handleQuickLogin}
      />
    </div>
  );
}