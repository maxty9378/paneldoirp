import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Status = 'loading' | 'success' | 'error';
type Step = 'qr' | 'auth' | 'profile';

export default function QRAuthPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>('loading');
  const [step, setStep] = useState<Step>('qr');
  const [message, setMessage] = useState('Обработка QR токена...');

  // флаг, чтобы не дергать setState после unmount
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Токен не найден');
        return;
      }

      try {
        // 1) просим Edge-функцию выдать verify-ссылку
        setStep('qr');
        setMessage('Проверяем токен…');

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        console.log('🌐 Supabase URL:', supabaseUrl);
        
        if (!supabaseUrl) {
          throw new Error('VITE_SUPABASE_URL не настроен');
        }

        const res = await fetch(`${supabaseUrl}/functions/v1/auth-by-qr-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY!}`,
          },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const contentType = res.headers.get('content-type');
          console.error('❌ Response not OK:', res.status, res.statusText);
          console.error('❌ Content-Type:', contentType);
          
          const err = await res.json().catch(() => ({}));
          console.error('❌ Error response:', err);
          throw new Error(err.error || `HTTP ${res.status} ${res.statusText}`);
        }

        const contentType = res.headers.get('content-type');
        console.log('✅ Response OK, Content-Type:', contentType);
        
        // Проверяем, что получили JSON, а не HTML
        if (!contentType?.includes('application/json')) {
          const text = await res.text();
          console.error('❌ Expected JSON but got:', contentType);
          console.error('❌ Response body:', text.substring(0, 200) + '...');
          throw new Error(`Ожидался JSON, получен ${contentType}. Проверьте VITE_SUPABASE_URL`);
        }
        
        const data = await res.json();
        console.log('📝 Edge Function response:', data);
        
        if (!data?.success) {
          throw new Error(data?.error || 'Неожиданный ответ от сервера');
        }

        // 2) Активируем magic link
        setStep('auth');
        setMessage('Выполняю авторизацию…');

        // Обрабатываем разные форматы ответа
        if (data.redirectUrl) {
          // Magic link - активируем через редирект
          console.log('🔗 Redirecting to magic link:', data.redirectUrl);
          window.location.replace(data.redirectUrl);
          return;
        } else if (data.accessToken && data.refreshToken) {
          // Прямые токены (если Edge Function обновлен)
          console.log('🔑 Direct tokens received, setting session...');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.accessToken,
            refresh_token: data.refreshToken
          });

          if (sessionError) {
            throw new Error(`Ошибка установки сессии: ${sessionError.message}`);
          }

          // Успешная авторизация
          setStatus('success');
          setMessage('Авторизация успешна! Перенаправление...');
          
          // Очищаем URL и перенаправляем
          try {
            window.history.replaceState({}, '', '/');
          } catch {}
          
          console.log('🚀 Redirecting to home...');
          setTimeout(() => {
            navigate('/');
          }, 1000);
          return;
        } else if (data.action_link) {
          // На случай, если старый код возвращает action_link без redirectUrl
          console.log('🔗 Fallback: using action_link:', data.action_link);
          window.location.replace(data.action_link);
          return;
        } else if (data.url) {
          // Альтернативный ключ для URL
          console.log('🔗 Fallback: using url:', data.url);
          window.location.replace(data.url);
          return;
        } else {
          // Логируем, чтобы понять, что пришло
          console.error('❌ Unexpected response format:', data);
          console.error('❌ Available keys:', Object.keys(data));
          throw new Error('Неожиданный формат ответа от сервера');
        }

        // Этот код недостижим, так как все ветки выше делают return
        // Оставляем для совместимости, но он не должен выполняться
        console.warn('⚠️ Unexpected code path reached in QRAuthPage');
        throw new Error('Неожиданная ошибка в процессе авторизации');
      } catch (e: any) {
        console.error('QR auth error:', e);
        if (!alive.current) return;
        setStatus('error');
        setMessage(e?.message || 'Ошибка при обработке QR-токена');
        // мягкий возврат домой
        setTimeout(() => navigate('/'), 3000);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // UI
  const icon =
    status === 'error' ? <AlertCircle className="mx-auto mb-4 text-red-600" size={48} /> :
    status === 'success' ? <CheckCircle className="mx-auto mb-4 text-green-600" size={48} /> :
    <Loader2 className="mx-auto mb-4 animate-spin text-blue-600" size={48} />;

  const title =
    status === 'error' ? 'Ошибка' :
    status === 'success' ? 'Успешно!' :
    step === 'qr' ? 'Обработка QR кода' :
    step === 'auth' ? 'Выполнение авторизации' :
    'Загрузка профиля';

  const progress = status === 'loading' ? 
    (step === 'qr' ? 33 : step === 'auth' ? 66 : 100) : 100;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {icon}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-4">{message}</p>

        {status === 'loading' && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {status === 'error' && (
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Вернуться на главную
          </button>
        )}
      </div>
    </div>
  );
}
