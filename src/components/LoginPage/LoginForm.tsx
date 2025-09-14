import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Анимации
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (showSuccessScreen) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto"
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/30">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Добро пожаловать!</h2>
            <p className="text-gray-600 mb-6">{user.full_name || user.email}</p>
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              <span className="ml-3 text-green-600 font-medium">Перенаправляем...</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Показываем форму только если нет пользователя и не идет загрузка
  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="text-center">
            <div className="mb-6">
              <Loader2 className="h-12 w-12 text-[#06A478] animate-spin mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Обработка авторизации...</h2>
            <p className="text-gray-600">Пожалуйста, подождите</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
        {/* Заголовок */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#06A478] to-[#4ade80] rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Добро пожаловать</h1>
          <p className="text-gray-600">Система управления обучением SNS</p>
        </motion.div>

        {/* Форма */}
        <motion.form variants={itemVariants} onSubmit={handleSubmit} className="space-y-6">
          {/* Поле логина */}
          <motion.div variants={itemVariants} className="space-y-2">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06A478] focus:border-transparent transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
                placeholder="Введите логин или SAP номер"
                disabled={isSubmitting}
              />
            </div>
          </motion.div>

          {/* Поле пароля */}
          <motion.div variants={itemVariants} className="space-y-2">
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
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06A478] focus:border-transparent transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
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
          </motion.div>

          {/* Ошибка */}
          {authError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start"
            >
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{authError}</p>
            </motion.div>
          )}

          {/* Кнопка входа */}
          <motion.div variants={itemVariants}>
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full bg-gradient-to-r from-[#06A478] to-[#4ade80] text-white py-3 px-4 rounded-xl font-medium hover:from-[#05976b] hover:to-[#22c55e] focus:outline-none focus:ring-2 focus:ring-[#06A478] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting || loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>Авторизация...</span>
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
          </motion.div>
        </motion.form>

        {/* Футер */}
        <motion.div variants={itemVariants} className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Система управления обучением и развитием сотрудников SNS • 2025
          </p>
          <div className="mt-2">
            <a 
              href="https://sns.ru" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs text-[#06A478] hover:text-[#05976b] transition-colors"
            >
              sns.ru
            </a>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
