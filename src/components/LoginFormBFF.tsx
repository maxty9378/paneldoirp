import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle, AlertCircle, Clock, QrCode as QrCodeIcon } from 'lucide-react';
import { useAuthBFF } from '../hooks/useAuthBFF';
import { QuickLoginModal } from './QuickLoginModal';
import { QRScannerModal } from './QRScannerModal';
import { hasCachedUsers } from '../lib/userCache';
import { Spinner } from './ui/Spinner';
import { useNavigate } from 'react-router-dom';

interface LoginFormBFFProps {
  onSuccess?: () => void;
}

export function LoginFormBFF({ onSuccess }: LoginFormBFFProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuickLogin, setShowQuickLogin] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  const { signIn, user, loading, authError } = useAuthBFF();
  const navigate = useNavigate();
  
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

  const handleQRScan = (token: string) => {
    // Перенаправляем на страницу QR авторизации
    navigate(`/auth/qr/${token}`);
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
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#06A478] to-[#048a6b] rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Вход в систему</h1>
          <p className="text-gray-600">Добро пожаловать в платформу обучения</p>
        </div>

        {authError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800">{authError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
              Email или SAP номер
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="email@sns.ru или SAP номер"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06A478] focus:border-transparent transition-all"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Пароль
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06A478] focus:border-transparent transition-all"
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-[#06A478] to-[#048a6b] text-white py-3 px-6 rounded-lg font-semibold hover:from-[#048a6b] hover:to-[#06A478] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size={20} iconClassName="text-white" />
                Вход...
              </span>
            ) : (
              'Войти'
            )}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          {hasCachedUsers() && (
            <button
              onClick={() => setShowQuickLogin(true)}
              className="w-full py-3 px-4 border-2 border-[#06A478] text-[#06A478] rounded-lg font-semibold hover:bg-[#06A478] hover:text-white transition-all"
            >
              Быстрый вход
            </button>
          )}

          <button
            onClick={() => setShowQRScanner(true)}
            className="w-full py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <QrCodeIcon className="h-5 w-5" />
            Вход по QR-коду
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>Сессия сохраняется автоматически</span>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            Через BFF (Backend-for-Frontend) для обхода блокировок провайдеров
          </p>
        </div>
      </div>

      {showQuickLogin && (
        <QuickLoginModal
          onClose={() => setShowQuickLogin(false)}
          onLogin={handleQuickLogin}
        />
      )}

      {showQRScanner && (
        <QRScannerModal
          onClose={() => setShowQRScanner(false)}
          onScan={handleQRScan}
        />
      )}
    </div>
  );
}

