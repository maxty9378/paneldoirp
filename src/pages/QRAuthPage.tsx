import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, QrCode, Smartphone, RefreshCw, ExternalLink } from 'lucide-react';
import { QRStatusIndicator } from '../components/QRStatusIndicator';

type Status = 'loading' | 'success' | 'error';
type Step = 'qr' | 'auth' | 'profile';

type TimelineItem = {
  key: Step;
  title: string;
  description: string;
};

const timeline: TimelineItem[] = [
  {
    key: 'qr',
    title: 'Сканирование QR',
    description: 'Проверяем токен и подтверждаем, что QR принадлежит экспертному аккаунту.'
  },
  {
    key: 'auth',
    title: 'Создание сессии',
    description: 'Генерируем безопасную ссылку авторизации.'
  },
  {
    key: 'profile',
    title: 'Загрузка профиля',
    description: 'Открываем панель эксперта с учётом ваших прав доступа.'
  }
];

export default function QRAuthPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>('loading');
  const [step, setStep] = useState<Step>('qr');
  const [message, setMessage] = useState('Проверяем QR-токен…');
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [manualPrompt, setManualPrompt] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const buildVersion = import.meta.env.VITE_BUILD_VERSION || import.meta.env.VITE_APP_VERSION || 'local-dev';
  const buildTimestampRaw = import.meta.env.VITE_BUILD_TIMESTAMP || '';
  const buildTimestampDisplay = useMemo(() => {
    if (buildTimestampRaw) {
      const parsed = new Date(buildTimestampRaw);
      if (!Number.isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(parsed);
      }
    }
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());
  }, [buildTimestampRaw]);

  const alive = useRef(true);
  useEffect(() => () => {
    alive.current = false;
  }, []);

  const safeSet = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    if (alive.current) setter(value);
  };

  const addDebugInfo = (info: string) => {
    const timestamp = new Date().toLocaleTimeString('ru-RU');
    setDebugInfo(prev => `${prev}[${timestamp}] ${info}\n`);
    console.log(`[DEBUG] ${info}`);
  };

  const activeStepIndex = useMemo(() => timeline.findIndex(item => item.key === step), [step]);

  useEffect(() => {
    let controller: AbortController | null = null;

    const execute = async () => {
      if (!token) {
        safeSet(setStatus, 'error');
        safeSet(setMessage, 'QR-токен не найден. Обновите QR и попробуйте снова.');
        return;
      }

      // Диагностика
      addDebugInfo(`🔗 Токен: ${token.substring(0, 8)}...`);
      addDebugInfo(`📱 Устройство: ${navigator.userAgent.substring(0, 50)}...`);
      addDebugInfo(`🌍 Online: ${navigator.onLine ? 'Да' : 'Нет'}`);

      try {
        safeSet(setStatus, 'loading');
        safeSet(setStep, 'qr');
        safeSet(setMessage, 'Проверяем QR-токен…');
        safeSet(setFallbackUrl, null);
        safeSet(setManualPrompt, false);

        // Получаем переменные окружения
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oaockmesooydvausfoca.supabase.co';
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hb2NrbWVzb295ZHZhdXNmb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzI4NDEsImV4cCI6MjA2Njk0ODg0MX0.gwWS35APlyST7_IUvQvJtGO4QmGsvbE95lnQf0H1PUE';

        controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller?.abort(), 15000);

        const headers = {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        };

        addDebugInfo(`📤 Отправка запроса к Edge Function...`);
        addDebugInfo(`🌐 URL: ${supabaseUrl}/functions/v1/qr-direct-auth`);
        
        const response = await fetch(`${supabaseUrl}/functions/v1/qr-direct-auth`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ token }),
          signal: controller.signal,
          cache: 'no-cache',
          mode: 'cors'
        });
        
        addDebugInfo(`📥 Получен ответ: HTTP ${response.status}`);

        window.clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          addDebugInfo(`❌ Ошибка HTTP ${response.status}: ${errorText}`);
          throw new Error(`Ошибка авторизации: ${response.status} — ${errorText}`);
        }

        const data = await response.json();
        addDebugInfo(`✅ Успешный ответ от сервера`);

        if (!data?.success) {
          addDebugInfo(`❌ Сервер вернул ошибку: ${data?.error || 'Неизвестная ошибка'}`);
          throw new Error(data?.error || 'Не удалось подтвердить QR-токен.');
        }

        safeSet(setStep, 'auth');
        safeSet(setMessage, 'Создаём сессию…');

        // Переходим по magic link
        if (data.redirectUrl) {
          addDebugInfo(`🔗 Получен redirect URL: ${data.redirectUrl.substring(0, 50)}...`);
          safeSet(setMessage, 'Авторизация завершена, переходим…');
          safeSet(setFallbackUrl, data.redirectUrl);
          
          // Небольшая задержка для показа сообщения
          await new Promise(resolve => setTimeout(resolve, 500));
          
          safeSet(setStep, 'profile');
          safeSet(setStatus, 'success');

          // Выполняем редирект
          const performRedirect = () => {
            addDebugInfo(`🔄 Выполнение редиректа`);
            
            // Используем более надежный способ для мобильных устройств
            const link = document.createElement('a');
            link.href = data.redirectUrl;
            link.target = '_self';
            link.style.display = 'none';
            document.body.appendChild(link);
            
            try {
              link.click();
              addDebugInfo(`✅ Клик по ссылке выполнен`);
            } catch (e) {
              addDebugInfo(`⚠️ Клик не удался, пробуем window.location: ${e}`);
              window.location.href = data.redirectUrl;
            }
            
            // Удаляем ссылку
            setTimeout(() => {
              if (document.body.contains(link)) {
                document.body.removeChild(link);
              }
            }, 1000);
          };

          performRedirect();

          // Показываем кнопку ручного перехода через 3 секунды
          window.setTimeout(() => {
            if (document.visibilityState === 'visible' && alive.current) {
              safeSet(setManualPrompt, true);
              safeSet(setMessage, 'Если переход не произошёл, нажмите кнопку ниже.');
            }
          }, 3000);
        } else {
          throw new Error('Сервер не вернул данные для авторизации.');
        }
      } catch (error: any) {
        addDebugInfo(`❌ Ошибка авторизации: ${error?.message || 'Неизвестная ошибка'}`);
        console.error('QR auth error:', error);
        if (!alive.current) return;

        if (error?.name === 'AbortError') {
          addDebugInfo(`⏰ Таймаут запроса`);
          safeSet(setMessage, 'Время ожидания истекло. Проверьте сеть и повторите попытку.');
        } else {
          safeSet(setMessage, error?.message || 'Не удалось выполнить авторизацию.');
        }

        safeSet(setStatus, 'error');
      }
    };

    execute();

    return () => {
      controller?.abort();
    };
  }, [token, attempt]);

  const progress = useMemo(() => {
    if (status === 'success') return manualPrompt ? 90 : 100;
    if (status === 'error') return 0;
    return [40, 75, 95][activeStepIndex] || 30;
  }, [status, activeStepIndex, manualPrompt]);

  const handleRetry = () => {
    setAttempt(prev => prev + 1);
  };

  const handleManualOpen = () => {
    if (!fallbackUrl) return;
    window.location.href = fallbackUrl;
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F5F7F9] pb-safe-bottom">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,159,110,0.08),transparent_70%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(255,255,255,0.9)_0%,_rgba(245,249,247,0.95)_100%)]"
        aria-hidden
      />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <section
          className="w-[min(96vw,520px)] space-y-6 rounded-[32px] border border-white/50 bg-white/80 p-6 text-slate-900 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur-2xl sm:p-8"
          role="status"
          aria-live="polite"
        >
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10">
                <ShieldCheck className="h-5 w-5 text-emerald-500" aria-hidden />
              </div>
              <div>
                <h1 className="text-xl font-semibold sm:text-2xl text-slate-900">Вход эксперта</h1>
                <p className="text-sm text-slate-500">Быстрая авторизация по QR-коду</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700">
              <Smartphone className="h-3.5 w-3.5" aria-hidden />
              <span>QR-авторизация</span>
            </div>
          </header>

          <QRStatusIndicator status={status} step={step} message={message} />

          <div className="rounded-3xl border border-white/60 bg-white/70 p-4 sm:p-5 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.25)]">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
              <QrCode className="h-4 w-4 text-emerald-500" aria-hidden />
              <span>Этапы авторизации</span>
            </div>
            <ol className="space-y-3 text-sm text-slate-600">
              {timeline.map((item, index) => {
                const isActive = index === activeStepIndex;
                const isDone = index < activeStepIndex || status === 'success';
                return (
                  <li
                    key={item.key}
                    className={`rounded-2xl border px-4 py-3 transition-all ${
                      isDone
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : isActive
                        ? 'border-emerald-100 bg-white text-slate-800 shadow-[0_12px_30px_-25px_rgba(15,23,42,0.35)]'
                        : 'border-slate-200/70 bg-white/60'
                    }`}
                  >
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed sm:text-sm">{item.description}</p>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/70 px-4 py-4 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.3)]">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Прогресс</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-200 transition-[width] duration-500 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 text-sm text-slate-600">
            {status === 'error' && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-2 font-medium text-white shadow-lg shadow-rose-500/30 transition hover:bg-rose-600 w-full"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  Повторить попытку
                </button>
                
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 w-full"
                >
                  <span>Перейти на главную</span>
                </button>
              </div>
            )}

            {manualPrompt && fallbackUrl && (
              <button
                type="button"
                onClick={handleManualOpen}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2 font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Открыть ссылку вручную
              </button>
            )}

            <p className="text-xs leading-relaxed text-slate-500">
              Если процесс завис, обновите QR-код в приложении оценки и сканируйте снова. Чтобы переход прошёл автоматически, держите браузер открытым.
            </p>
            
            {/* Debug панель */}
            {debugInfo && (
              <div className="mt-4 p-3 bg-slate-100 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-slate-600">🔍 Диагностика:</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(debugInfo).then(() => {
                        addDebugInfo('📋 Логи скопированы в буфер обмена');
                      }).catch(() => {
                        addDebugInfo('❌ Не удалось скопировать логи');
                      });
                    }}
                    className="text-xs text-blue-500 hover:text-blue-600"
                  >
                    Копировать
                  </button>
                  <button
                    onClick={() => setDebugInfo('')}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Очистить
                  </button>
                </div>
                <pre className="text-[10px] text-slate-600 whitespace-pre-wrap font-mono leading-tight max-h-32 overflow-y-auto">
                  {debugInfo}
                </pre>
              </div>
            )}
            
          <p className="text-[11px] text-slate-400 text-center">Последнее обновление: {buildTimestampDisplay} · {buildVersion}</p>
          </div>
        </section>
      </main>
    </div>
  );
}
