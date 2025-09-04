import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { clsx } from 'clsx';

export function LoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, user, loading, authError } = useAuth();

  // Функция для добавления домена @sns.ru при отправке формы
  const prepareIdentifier = (value: string): string => {
    // Если введенное значение не содержит @, добавляем @sns.ru
    // Логика соответствует useAuth: есть @ = email, нет @ = SAP номер
    if (!value.includes('@')) {
      return value + '@sns.ru';
    }
    return value;
  };


  
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const preparedIdentifier = prepareIdentifier(identifier);
    const result = await signIn(preparedIdentifier, password);
    
    // The error state is now handled in the useAuth hook,
    // so we don't need to do anything else here
    if (result.error) {
      console.log('Login failed:', result.error.message);
    } else {
      console.log('Login successful');
    }
  };

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e5f3ff] via-[#eafaf1] to-[#b6e0fe] px-4" style={{backgroundImage: 'linear-gradient(120deg, #e5f3ff 0%, #eafaf1 60%, #b6e0fe 100%)'}}>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-green-200 max-w-md w-full">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Авторизация успешна</h2>
            <p className="text-gray-600 mb-4">Вы вошли как {user.full_name || user.email}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Перейти в систему
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e5f3ff] via-[#eafaf1] to-[#b6e0fe] px-4" style={{backgroundImage: 'linear-gradient(120deg, #e5f3ff 0%, #eafaf1 60%, #b6e0fe 100%)'}}>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">

          <h2 className="mt-2 text-3xl font-extrabold" style={{ color: '#06A478' }}>Добро пожаловать</h2>
          <p className="mt-2 text-base font-medium" style={{ color: '#06A478' }}>Система управления обучением SNS</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-xl bg-white p-6 shadow-md border border-gray-200">
            <div className="space-y-4">
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
                  Имя пользователя или SAP номер
                </label>
                <div className="relative">
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    required
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06A478] focus:border-[#06A478] focus:z-10 transition-all duration-200 sm:text-sm"
                    placeholder="Имя пользователя или SAP номер"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Пароль
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06A478] focus:border-[#06A478] focus:z-10 transition-all duration-200 sm:text-sm pr-10"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-red-600">{authError}</p>
                  </div>
                </div>
              )}

              <div className="mt-5">
                <button
                  type="submit"
                  disabled={loading}
                  className={clsx(
                    'group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#06A478]',
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#06A478] hover:bg-[#05976b]'
                  )}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>Авторизация...</span>
                    </div>
                  ) : (
                    'Войти в систему'
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-xs text-gray-500">
            Система управления обучением и развитием сотрудников SNS • 2025
          </p>
          <div className="mt-2">
            <a href="https://sns.ru" target="_blank" rel="noopener noreferrer" className="text-xs text-[#06A478] underline hover:text-[#06A478] transition-colors">sns.ru</a>
          </div>
        </div>
      </div>
    </div>
  );
}