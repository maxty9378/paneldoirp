import React, { useState } from 'react';
import { createAdminUser } from '../utils/createAdmin';
import { Loader2, Check, AlertCircle, UserPlus, ExternalLink, ShieldAlert, Lock } from 'lucide-react';
import { clsx } from 'clsx';

// Component for creating an admin user
export function AdminCreator() {
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<{ 
    success: boolean; 
    message: string; 
    configurationRequired?: boolean;
    partialSuccess?: boolean;
  } | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const handleCreateAdmin = async () => {
    setIsCreating(true);
    setCredentials(null);
    setResult(null);

    try {
      // Try the new bootstrap admin edge function first
      console.log("🔑 Вызов edge function create-bootstrap-admin");
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-bootstrap-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log("🔑 Успешное создание через edge function:", data);
        setResult({ 
          success: true, 
          message: 'Администратор успешно создан. Используйте указанные учётные данные для входа.' 
        });
        setCredentials({ 
          email: data.email || 'doirp@sns.ru', 
          password: data.password || '123456' 
        });
        return;
      } else {
        console.log("🔑 Edge function не сработала, пробуем RPC:", data);
      }
      
      // If edge function fails, try the RPC function
      console.log("🔑 Вызов RPC функции rpc_bootstrap_admin");
      const { data: rpcData, error: rpcError } = await supabase.rpc('rpc_bootstrap_admin');
      
      if (!rpcError && rpcData) {
        console.log("🔑 Успешное создание через RPC:", rpcData);
        setResult({ 
          success: true, 
          message: 'Администратор успешно создан. Используйте указанные учётные данные для входа.' 
        });
        setCredentials({ 
          email: rpcData.email || 'doirp@sns.ru', 
          password: rpcData.password || '123456' 
        });
        return;
      } else {
        console.warn("🔑 RPC функция не сработала:", rpcError);
      }
      
      // Fall back to the original method
      console.log("🔑 Пробуем оригинальный метод createAdminUser");
      const oldMethodResponse = await createAdminUser();
      console.log("🔑 Ответ на создание администратора:", response);
      
      setResult({ 
        success: response.success, 
        message: response.message,
        configurationRequired: response.configurationRequired,
        partialSuccess: response.partialSuccess
      });
      setResult({ 
        success: oldMethodResponse.success, 
        message: oldMethodResponse.message,
        configurationRequired: oldMethodResponse.configurationRequired,
        partialSuccess: oldMethodResponse.partialSuccess
      });
      
      if (oldMethodResponse.email && oldMethodResponse.password) {
        setCredentials({ 
          email: oldMethodResponse.email, 
          password: oldMethodResponse.password 
        });
      } else if (oldMethodResponse.success) {
        setCredentials({ 
          email: 'doirp@sns.ru', 
          password: '123456' 
        });
      }
    } catch (error) {
      console.error("🔑 Ошибка создания администратора:", error);
      setResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Произошла ошибка при создании администратора' 
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-6">
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl mx-auto flex items-center justify-center mb-3 border border-blue-200">
            <UserPlus className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Создание администратора</h3>
          <p className="text-sm text-gray-600 mt-1">
            Создание первой учётной записи администратора
          </p>
        </div>

        {result && (
          <div className={clsx(
            "mb-4 p-4 rounded-xl text-sm",
            result.configurationRequired
              ? "bg-amber-50 text-amber-800 border border-amber-200"
              : result.success 
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
          )}>
            <div className="flex items-start">
              {result.configurationRequired ? (
                <ShieldAlert className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              ) : result.success ? (
                <Check className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium">{result.message}</p>
                
                {result.configurationRequired && (
                  <div className="mt-2">
                    <p className="font-medium mb-1">Необходимо в Supabase Dashboard:</p>
                    <ol className="list-decimal pl-5 space-y-1 text-xs">
                      <li>Перейдите в раздел Authentication → Settings</li>
                      <li>Отключите опцию "Enable Email Confirmation"</li>
                      <li>Нажмите "Save"</li>
                      <li>Вернитесь и создайте администратора снова</li>
                    </ol>
                    <p className="mt-1">
                      <a 
                        href="https://app.supabase.com/project/_/auth/users" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Перейти в Supabase Dashboard
                      </a>
                    </p>
                  </div>
                )}
                
                {result.partialSuccess && (
                  <p className="text-xs mt-1">
                    Замечание: Auth пользователь не был создан автоматически. Войти в систему может быть невозможно.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {credentials ? (
          <div className="space-y-3 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Данные администратора:</h4>
            <div className="text-sm">
              <span className="font-medium text-gray-700">Email:</span>
              <span className="ml-2 text-gray-600 font-mono">{credentials.email}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-700">Пароль:</span>
              <span className="ml-2 text-gray-600 font-mono">{credentials.password}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-700">Роль:</span>
              <span className="ml-2 text-gray-600">Администратор</span>
            </div>
            <div className="flex items-center text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
              <Lock className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
              <span>Используйте эти данные для входа в систему</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-600 text-center">
              <span>Стандартные данные: <b>doirp@sns.ru</b> / <b>123456</b></span>
           </div>
          </div>
        )}

        <button
          onClick={handleCreateAdmin}
          disabled={isCreating || (result?.success === true && !result.configurationRequired)}
          className={clsx(
            "w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center",
            isCreating || (result?.success === true && !result.configurationRequired)
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          )}
        >
          {isCreating ? (
            <div className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Создание администратора...
            </div>
          ) : result?.success && !result.configurationRequired ? (
            <div className="flex items-center justify-center">
              <Check className="h-5 w-5 mr-2" />
              Администратор создан!
            </div>
          ) : result?.configurationRequired ? (
            <div className="flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 mr-2" />
              Попробовать снова
            </div>
          ) : ( 
            <div className="flex items-center justify-center">
              <UserPlus className="h-5 w-5 mr-2" />
              Создать администратора
            </div>
          )}
        </button>
      </div>
    </div>
  );
}