import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type Status = 'loading' | 'success' | 'error';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Обработка авторизации...');
  const executedRef = useRef(false);

  // ждём подтверждённую сессию: событие SIGNED_IN или успешный getSession с ретраем
  const waitForSignedIn = () =>
    new Promise<void>((resolve, reject) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) reject(new Error('Превышено время ожидания авторизации'));
      }, 10000);

      const unsub = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          resolved = true;
          clearTimeout(timeout);
          unsub.data.subscription.unsubscribe();
          resolve();
        }
      });

      // параллельно пробуем getSession() с ретраями
      (async () => {
        for (let i = 0; i < 5 && !resolved; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            resolved = true;
            clearTimeout(timeout);
            unsub.data.subscription.unsubscribe();
            resolve();
            return;
          }
          await new Promise(r => setTimeout(r, 300));
        }
      })().catch(() => {});
    });

  useEffect(() => {
    if (executedRef.current) return;
    executedRef.current = true;

    (async () => {
      try {
        console.log('🚀 AuthCallback mounted');
        const href = window.location.href;
        const search = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);

        // 0) Ошибки из URL
        const err = search.get('error') || hash.get('error');
        const errCode = search.get('error_code') || hash.get('error_code');
        const errDesc = search.get('error_description') || hash.get('error_description');
        if (err) {
          throw new Error(`Ошибка авторизации: ${err}${errCode ? ` (${errCode})` : ''}${errDesc ? ` — ${decodeURIComponent(errDesc)}` : ''}`);
        }

        // 1) Happy path: токены в хэше (email magic link / recovery)
        const accessToken = search.get('access_token') || hash.get('access_token');
        const refreshToken = search.get('refresh_token') || hash.get('refresh_token');
        const type = search.get('type') || hash.get('type');

        if (accessToken && refreshToken) {
          console.log('🔑 setSession via tokens, type:', type);
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;

          await waitForSignedIn();

          // чистим URL
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);

          setStatus('success');
          setMessage('Авторизация успешна! Перенаправление...');
          // мягкий редирект (SPA)
          navigate('/', { replace: true });
          // если хочешь «жёсткий» ребилд:
          // window.location.replace('/');
          return;
        }

        // 2) Magic link через token_hash (когда приходит ?token=...&type=magiclink или в #)
        const token = search.get('token') || hash.get('token');
        const t = (type || '').toLowerCase();
        if (token && (t === 'magiclink' || !type)) {
          console.log('🔑 verifyOtp(magiclink) via token_hash');
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'magiclink',
          });
          if (error) throw error;

          await waitForSignedIn();
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);

          setStatus('success');
          setMessage('Авторизация успешна! Перенаправление...');
          navigate('/', { replace: true });
          return;
        }

        // 3) OAuth/PKCE: ?code=...
        const code = search.get('code');
        if (code) {
          console.log('🔑 exchangeCodeForSession');
          const { error } = await supabase.auth.exchangeCodeForSession(href);
          if (error) throw error;

          await waitForSignedIn();
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);

          setStatus('success');
          setMessage('Авторизация успешна! Перенаправление...');
          navigate('/', { replace: true });
          return;
        }

        // 4) Может, сессия уже есть
        const { data, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;
        if (data.session?.user) {
          setStatus('success');
          setMessage('Авторизация уже выполнена. Перенаправление...');
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          navigate('/', { replace: true });
          return;
        }

        // 5) Ничего не подошло
        throw new Error('Не удалось обработать параметры авторизации');
      } catch (e: any) {
        console.error('❌ Auth callback error:', e);
        setStatus('error');
        setMessage(e?.message || 'Произошла ошибка при авторизации');
        // мягкий камбэк на главную через 3 сек
        setTimeout(() => navigate('/', { replace: true }), 3000);
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e5f3ff] via-[#eafaf1] to-[#b6e0fe] px-4">
      <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Обработка авторизации</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Авторизация успешна!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Перейти в систему
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Ошибка авторизации</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Попробовать снова
              </button>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="w-full px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                На главную
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
