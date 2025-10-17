import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, QrCode, RefreshCw } from 'lucide-react';

type Status = 'loading' | 'success' | 'error';

export default function QRAuthPage() {
  const { token } = useParams<{ token: string }>();

  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Проверяем QR-токен…');
  const [attempt, setAttempt] = useState(0);

  const alive = useRef(true);
  useEffect(() => () => {
    alive.current = false;
  }, []);

  useEffect(() => {
    const execute = async () => {
      if (!token) {
        setStatus('error');
        setMessage('QR-токен не найден');
        return;
      }

      try {
        setStatus('loading');
        setMessage('Авторизация…');

        // Используем проверенную функцию auth-by-qr-token
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oaockmesooydvausfoca.supabase.co';
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hb2NrbWVzb295ZHZhdXNmb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzI4NDEsImV4cCI6MjA2Njk0ODg0MX0.gwWS35APlyST7_IUvQvJtGO4QmGsvbE95lnQf0H1PUE';

        const response = await fetch(`${supabaseUrl}/functions/v1/auth-by-qr-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
          },
          body: JSON.stringify({ token })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data?.success) {
          throw new Error(data?.error || 'Ошибка авторизации');
        }

        if (data.redirectUrl) {
          setStatus('success');
          setMessage('Успешно! Переходим…');
          
          // Редирект на magic link
          setTimeout(() => {
            if (alive.current) {
              window.location.href = data.redirectUrl;
            }
          }, 500);
        } else {
          throw new Error('Нет ссылки для редиректа');
        }
      } catch (error: any) {
        console.error('QR auth error:', error);
        if (!alive.current) return;
        setStatus('error');
        setMessage(error?.message || 'Ошибка авторизации');
      }
    };

    execute();
  }, [token, attempt]);

  const handleRetry = () => {
    setAttempt(prev => prev + 1);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F5F7F9] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,159,110,0.08),transparent_70%)]"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border border-white/50 bg-white/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 mb-4">
              <ShieldCheck className="h-8 w-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Вход эксперта</h1>
            <p className="text-sm text-gray-600">QR-авторизация</p>
          </div>

          <div className="space-y-6">
            {/* Статус */}
            <div className="text-center">
              {status === 'loading' && (
                <div className="space-y-3">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                  <p className="text-sm text-gray-600">{message}</p>
                </div>
              )}

              {status === 'success' && (
                <div className="space-y-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-green-600">{message}</p>
                </div>
              )}

              {status === 'error' && (
                <div className="space-y-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-red-600">{message}</p>
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Повторить
                  </button>
                </div>
              )}
            </div>

            {/* Информация */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <QrCode className="h-4 w-4" />
                <span>Быстрая авторизация для экспертов</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
