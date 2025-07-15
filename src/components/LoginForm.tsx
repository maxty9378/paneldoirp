import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Loader2, UserPlus, AlertCircle, Shield, CheckCircle, XCircle, Key } from 'lucide-react';
import { createAdminUser } from '../utils/createAdmin';
import { clsx } from 'clsx';

export function LoginForm() {
  const [identifier, setIdentifier] = useState('doirp@sns.ru');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [adminCreationError, setAdminCreationError] = useState<string | null>(null);
  const [adminCreationResult, setAdminCreationResult] = useState<any>(null);
  const [adminCreationSuccess, setAdminCreationSuccess] = useState(false);
  const [showAdminHelper, setShowAdminHelper] = useState(false);
  const { signIn, user, loading, authError } = useAuth();

  // Function to create admin user
  const handleCreateAdmin = async () => {
    setIsCreatingAdmin(true);
    setAdminCreationError(null);
    setAdminCreationResult(null);
    
    try {
      console.log('🔧 Creating bootstrap admin user...');
      const result = await createAdminUser();
      console.log('🔧 Admin creation result:', result);
      
      setAdminCreationResult(result);
      if (result.success) {
        setAdminCreationSuccess(true);
        setIdentifier('doirp@sns.ru');
        setPassword('123456');
        setShowAdminHelper(false);
      } else {
        const errorMsg = result.error || result.message || 'Ошибка создания администратора';
        console.error('❌ Admin creation failed:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('Error creating admin:', error);
      let errorMessage = error.message || 'Не удалось создать администратора';
      
      // Provide more specific error messages
      if (errorMessage.includes('email_already_confirmed')) {
        errorMessage = 'Администратор уже существует. Попробуйте войти с учетными данными: doirp@sns.ru / 123456';
      } else if (errorMessage.includes('email confirmation')) {
        errorMessage = 'Ошибка подтверждения email. Убедитесь, что в настройках Supabase отключено подтверждение email для новых пользователей.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = 'Ошибка сети. Проверьте подключение к интернету и попробуйте снова.';
      }
      
      setAdminCreationError(errorMessage);
    } finally {
      setIsCreatingAdmin(false);
    }
  };
  
  const isEmail = identifier.includes('@');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowAdminHelper(false); // Hide helper during login attempt
    const result = await signIn(identifier, password);
    
    // The error state is now handled in the useAuth hook,
    // so we don't need to do anything else here
    if (result.error) {
      console.log('Login failed:', result.error.message);
      // Show admin helper for credential errors
      if (result.error.message.includes('Invalid login credentials')) {
        setShowAdminHelper(true);
      }
    } else {
      console.log('Login successful');
    }
  };

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Добро пожаловать</h2>
          <p className="mt-2 text-sm text-gray-600">Войдите в систему управления обучением SNS</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-xl bg-white p-6 shadow-md border border-gray-200">
            <div className="space-y-4">
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
                  Email или SAP номер
                </label>
                <div className="relative">
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    required
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 transition-all duration-200 sm:text-sm"
                    placeholder={isEmail ? 'Корпоративный email' : 'SAP номер'}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                  />
                  {identifier && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <span
                        className={clsx(
                          'text-xs px-2 py-1 rounded-full font-medium',
                          isEmail ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        )}
                      >
                        {isEmail ? 'Email' : 'SAP'}
                      </span>
                    </div>
                  )}
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
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 transition-all duration-200 sm:text-sm pr-10"
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
                  <XCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-600">{authError}</p>
                  </div>
                </div>
              )}

              {/* Admin Creation Helper */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-start">
                  <UserPlus className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">
                      Создание администратора
                    </h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Для первого входа необходимо создать учетную запись администратора.
                    </p>
                    <div className="space-y-3">
                      {!adminCreationSuccess && !isCreatingAdmin && (
                        <button
                          type="button"
                          onClick={handleCreateAdmin}
                          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-md shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center font-medium"
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Создать администратора
                        </button>
                      )}
                      
                      {isCreatingAdmin && (
                        <div className="flex items-center justify-center px-4 py-2 text-blue-700 space-x-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Создание администратора...</span>
                        </div>
                      )}
                      
                      <div className="text-xs text-blue-700 bg-white/50 p-3 rounded border border-blue-100">
                        <div className="font-medium mb-1">Стандартные учетные данные:</div>
                        <div><span className="font-medium">Email:</span> <code className="text-blue-800">doirp@sns.ru</code></div>
                        <div><span className="font-medium">Пароль:</span> <code className="text-blue-800">123456</code></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

                {adminCreationError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-600 whitespace-pre-wrap">{adminCreationError}</p>
                      {adminCreationError.includes('Supabase') && (
                        <div className="mt-2 text-xs text-red-600">
                          <strong>Возможные решения:</strong>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Проверьте настройки Supabase (Authentication → Settings)</li>
                            <li>Убедитесь, что Email Confirmation отключено</li>
                            <li>Проверьте правильность SUPABASE_URL и SUPABASE_ANON_KEY</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {adminCreationSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-green-800 mb-1">
                        Администратор успешно создан!
                      </h4>
                      <p className="text-sm text-green-600">
                        Учетные данные автоматически заполнены. Нажмите "Войти в систему" для продолжения.
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-5">
                  <button
                    type="submit"
                    disabled={loading || isCreatingAdmin}
                    className={clsx(
                      'group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                      (loading || isCreatingAdmin)
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg'
                    )}
                  >
                    {(loading || isCreatingAdmin) ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span>{isCreatingAdmin ? 'Создание администратора...' : 'Авторизация...'}</span>
                      </div>
                    ) : (
                      'Войти в систему'
                    )}
                  </button>
                </div>
                
                {adminCreationResult && adminCreationResult.success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-3">
                    <div className="flex items-center mb-2">
                      <Shield className="h-4 w-4 text-green-600 mr-2" />
                      <p className="text-sm font-medium text-green-800">Учетная запись создана!</p>
                    </div>
                    <p className="text-xs text-green-700">
                      Email: <span className="font-mono">{adminCreationResult.email}</span><br />
                      Пароль: <span className="font-mono">{adminCreationResult.password}</span>
                    </p>
                    <button 
                      type="button" 
                      className="mt-2 text-xs font-medium text-green-700 underline"
                      onClick={() => signIn(adminCreationResult.email, adminCreationResult.password)}
                    >
                      Войти с этими учетными данными
                    </button>
                  </div>
                )}
            </div>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-xs text-gray-500">
            Система управления обучением и развитием сотрудников SNS • 2025
          </p>
        </div>
      </div>
    </div>
  );
}