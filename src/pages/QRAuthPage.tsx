import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, QrCode } from 'lucide-react';
import { isIOS } from '../utils/mobileOptimization';
import { QRStatusIndicator } from '../components/QRStatusIndicator';

type Status = 'loading' | 'success' | 'error';
type Step = 'qr' | 'auth' | 'profile';

function Dots() {
  return (
    <span className="inline-flex gap-1 ml-1 align-baseline">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" />
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
      <div
        className="h-full bg-emerald-400 transition-[width] duration-500 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export default function QRAuthPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>('loading');
  const [step, setStep] = useState<Step>('qr');
  const [message, setMessage] = useState('Проверяем QR-токен…');

  // чтобы не дергать setState после unmount
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  // helper: безопасно ставим состояние
  const safeSet = (setter: React.Dispatch<React.SetStateAction<any>>, v: any) => {
    if (alive.current) setter(v);
  };

  useEffect(() => {
    const run = async () => {
      if (!token) {
        safeSet(setStatus, 'error');
        safeSet(setMessage, 'QR-токен не найден');
        return;
      }

      try {
        safeSet(setStep, 'qr');
        safeSet(setMessage, 'Проверяем токен…');

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !anonKey) {
          throw new Error('Не настроены переменные окружения');
        }

        // Простой запрос без сложных таймаутов
        const res = await fetch(`${supabaseUrl}/functions/v1/auth-by-qr-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('QR auth server error:', res.status, errorText);
          throw new Error(`Ошибка сервера: ${res.status} - ${errorText}`);
        }

        const data = await res.json();
        if (!data?.success) {
          throw new Error(data?.error || 'Ошибка авторизации');
        }

        // Проверяем наличие redirectUrl
        if (!data.redirectUrl) {
          throw new Error('Не получен URL для перенаправления');
        }

        // Простой редирект на magic link
        safeSet(setStep, 'auth');
        safeSet(setMessage, 'Перенаправляем…');
        
        (window as any).authCallbackProcessing = true;
        
        // Немедленный редирект без задержек
        window.location.replace(data.redirectUrl);
        
      } catch (e: any) {
        console.error('QR auth error:', e);
        if (!alive.current) return;
        safeSet(setStatus, 'error');
        safeSet(setMessage, e?.message || 'Ошибка авторизации');
        setTimeout(() => navigate('/'), 3000);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const isLoading = status === 'loading';
  const progress = isLoading ? (step === 'qr' ? 30 : step === 'auth' ? 70 : 100) : 100;

  // expert-режим — если путь /auth/qr/*
  const isExpert = typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/qr');

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* фон */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black" />
      <div className="absolute -top-40 -right-32 h-[420px] w-[420px] rounded-full blur-3xl opacity-20 bg-emerald-500" />
      <div className="absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full blur-3xl opacity-20 bg-teal-500" />

      {/* центрированная карточка */}
      <main className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <section
          className="w-[min(96vw,560px)] rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 sm:p-8 text-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]"
          role="status"
          aria-live="polite"
          aria-busy={isLoading}
        >
          {/* шапка */}
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              {isExpert ? <ShieldCheck size={22} className="text-emerald-300" /> : <QrCode size={22} className="text-emerald-300" />}
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold">
                {isExpert ? 'Вход эксперта' : 'Авторизация'}
              </h1>
              <p className="text-white/60 text-sm">
                {isLoading ? (
                  <>
                    {step === 'qr' && <>Проверяем QR и готовим ссылку<Dots /></>}
                    {step === 'auth' && <>Подтверждаем токен и ставим сессию<Dots /></>}
                    {step === 'profile' && <>Загружаем профиль<Dots /></>}
                  </>
                ) : status === 'success'
                  ? 'Почти готово…'
                  : 'Возврат на главную'}
              </p>
            </div>
          </div>

          {/* основной блок */}
          <QRStatusIndicator 
            status={status}
            step={step}
            message={message}
            isIOS={isIOS}
          />

          <div className="w-full mt-2">
            <ProgressBar value={progress} />
          </div>

          {status === 'error' && (
            <button
              onClick={() => navigate('/')}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
            >
              На главную
            </button>
          )}

          {/* подсказка для экспертов */}
          {isExpert && status === 'loading' && (
            <p className="mt-4 text-center text-xs text-white/50">
              Если загрузка затянулась — обновите QR в приложении оценки и сканируйте снова.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
