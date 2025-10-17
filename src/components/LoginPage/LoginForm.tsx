import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, CircleCheck as CheckCircle, CircleAlert as AlertCircle, QrCode as QrCodeIcon } from 'lucide-react';
import { Spinner } from '../ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { QRScannerModal } from '../QRScannerModal';
import { useNavigate } from 'react-router-dom';
import { LastLoginInfo } from '../LastLoginInfo';
import { getLastLogoutInfo, shouldShowLastLoginInfo } from '../../utils/sessionRecovery';
import { supabase } from '../../lib/supabase';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showLastLoginInfo, setShowLastLoginInfo] = useState(false);
  const [lastLoginData, setLastLoginData] = useState<{ email: string; fullName: string; timestamp: number } | null>(null);

  const { signIn, user, loading, authError } = useAuth();
  const navigate = useNavigate();

  // Проверяем, нужно ли показать окно с информацией о последнем входе
  useEffect(() => {
    if (shouldShowLastLoginInfo()) {
      const logoutInfo = getLastLogoutInfo();
      if (logoutInfo) {
        setLastLoginData(logoutInfo);
        setShowLastLoginInfo(true);
      }
    }
  }, []);
  
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

  const handleQRScan = (token: string) => {
    // Закрываем модальное окно
    setShowQRScanner(false);
    
    // Перенаправляем на страницу QR авторизации с небольшой задержкой
    setTimeout(() => {
      window.location.href = `/auth/qr/${token}`;
    }, 100);
  };

  const handleLoginAgain = async () => {
    if (!lastLoginData) return;
    
    // Закрываем окно с информацией о последнем входе
    setShowLastLoginInfo(false);
    
    // Пытаемся восстановить сессию из localStorage
    try {
      console.log('🔄 Attempting to restore session for:', lastLoginData.email);
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session?.user && !error) {
        console.log('✅ Session restored successfully:', session.user.email);
        // Сессия восстановлена, пользователь автоматически авторизован
        // Просто перезагружаем страницу для применения изменений
        window.location.href = '/';
        return;
      }
      
      console.log('ℹ️ No active session found, showing login form');
      
      // Если сессии нет, показываем форму входа с заполненным логином
      const emailWithoutDomain = lastLoginData.email.replace('@sns.ru', '');
      setIdentifier(emailWithoutDomain);
      
      // Фокусируемся на поле пароля для быстрого ввода
      setTimeout(() => {
        const passwordInput = document.getElementById('password') as HTMLInputElement;
        if (passwordInput) {
          passwordInput.focus();
        }
      }, 100);
    } catch (error) {
      console.error('❌ Error restoring session:', error);
      
      // В случае ошибки показываем форму входа
      const emailWithoutDomain = lastLoginData.email.replace('@sns.ru', '');
      setIdentifier(emailWithoutDomain);
      
      setTimeout(() => {
        const passwordInput = document.getElementById('password') as HTMLInputElement;
        if (passwordInput) {
          passwordInput.focus();
        }
      }, 100);
    }
  };


  if (showSuccessScreen) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/50">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full mx-auto flex items-center justify-center mb-6 shadow-xl shadow-green-500/30 animate-pulse">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-semibold text-gray-900 mb-2">Добро пожаловать!</h2>
            <p className="text-gray-700 font-medium mb-6">{user.full_name || user.email}</p>
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
        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/50">
          <div className="text-center">
            <Spinner size={48} className="mx-auto mb-6" label="Подождите" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Обработка авторизации...</h2>
            <p className="text-gray-600">Пожалуйста, подождите</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-white/95 backdrop-blur-3xl p-6 shadow-2xl border border-white/50" style={{ borderRadius: '28px' }}>
        {/* Заголовок */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 mx-auto flex items-center justify-center mb-4 shadow-xl shadow-blue-500/30" style={{ borderRadius: '20px' }}>
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1 tracking-tight">Добро пожаловать</h1>
          <p className="text-sm text-gray-600">Система управления обучением SNS</p>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Поле логина */}
          <div className="space-y-1.5">
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-800">
              Имя пользователя или SAP номер
            </label>
            <div className="relative">
              <input
                id="identifier"
                name="identifier"
                type="text"
                inputMode="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3.5 py-2.5 border-2 border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all duration-200 bg-white/70 text-gray-900 placeholder-gray-500 font-medium text-sm"
                style={{ borderRadius: '14px' }}
                placeholder="Введите логин или SAP номер"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Поле пароля */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-gray-800">
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
                className="w-full px-3.5 py-2.5 pr-11 border-2 border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all duration-200 bg-white/70 text-gray-900 placeholder-gray-500 font-medium text-sm"
                style={{ borderRadius: '14px' }}
                placeholder="Введите пароль"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Ошибка */}
          {authError && (
            <div className="bg-red-50 border border-red-200 p-3 flex items-start" style={{ borderRadius: '14px' }}>
              <AlertCircle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">{authError}</p>
            </div>
          )}

          {/* Кнопка входа */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white py-3 px-4 font-semibold hover:shadow-lg hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] text-sm"
              style={{ borderRadius: '14px' }}
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
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Кнопка сканирования QR - второстепенная */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowQRScanner(true)}
            className="w-full flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-600 bg-white/50 hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-all duration-200 text-xs"
            style={{ borderRadius: '12px' }}
          >
            <QrCodeIcon className="h-3.5 w-3.5 mr-1.5" />
            <span>Сканировать QR</span>
          </button>
        </div>

        {/* Футер */}
        <div className="mt-5 text-center">
          <p className="text-[10px] text-gray-500 font-medium leading-tight">
            Система управления обучением и развитием сотрудников SNS • 2025
          </p>
          <div className="mt-1">
            <a
              href="https://sns.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-blue-600 hover:text-blue-700 transition-colors font-medium"
            >
              sns.ru
            </a>
          </div>
        </div>
      </div>

      {/* Модальное окно сканирования QR */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
      />

      {/* Окно с информацией о последнем входе */}
      {showLastLoginInfo && lastLoginData && (
        <LastLoginInfo
          email={lastLoginData.email}
          fullName={lastLoginData.fullName}
          timestamp={lastLoginData.timestamp}
          onLoginAgain={handleLoginAgain}
        />
      )}
    </div>
  );
}
