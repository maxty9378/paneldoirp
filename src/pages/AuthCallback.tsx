import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Расширяем window для флага обработки
declare global {
  interface Window {
    authCallbackProcessing?: boolean;
  }
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;

    // Устанавливаем флаг обработки
    window.authCallbackProcessing = true;

    (async () => {
      try {
        console.log('🔄 AuthCallback: start');
        const url = new URL(window.location.href);
        const search = url.searchParams;
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

        // 1) PKCE: ?code=...
        const authCode = search.get('code');
        if (authCode) {
          console.log('🔑 PKCE code detected, exchanging for session...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
          if (error) {
            console.error('❌ exchangeCodeForSession error:', error);
            return hardHome();
          }
          console.log('✅ PKCE session established for:', data.user?.email);

          cleanupUrl();
          return softHome();
        }

        // 2) Имплисит/магик-линк: в hash пришли access_token/refresh_token
        const at = search.get('access_token') || hash.get('access_token');
        const rt = search.get('refresh_token') || hash.get('refresh_token');
        if (at && rt) {
          console.log('🔑 Tokens detected in URL, setSession...');
          const { error } = await supabase.auth.setSession({
            access_token: at,
            refresh_token: rt,
          });
          if (error) {
            console.error('❌ setSession error:', error);
            return hardHome();
          }
          console.log('✅ Session set via tokens');

          cleanupUrl();
          return softHome();
        }

        // 3) Магик-линк токен-хэш
        const tokenHash = search.get('token') || hash.get('token');
        if (tokenHash) {
          console.log('🔑 token_hash detected, verifyOtp...');
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'magiclink',
          });
          if (error) {
            console.error('❌ verifyOtp error:', error);
            return hardHome();
          }
          console.log('✅ OTP verified');

          cleanupUrl();
          return softHome();
        }

        // 4) Ничего не нашли — домой
        console.log('ℹ️ No auth params found, go home');
        hardHome();
      } catch (e) {
        console.error('❌ AuthCallback fatal:', e);
        hardHome();
      }
    })();

    function cleanupUrl() {
      // чистим урл от параметров, но без жёсткого перезагруза
      window.history.replaceState({}, '', '/');
    }

    function softHome() {
      // Снимаем флаг обработки перед навигацией
      window.authCallbackProcessing = false;
      // Немедленное перенаправление без задержек
      navigate('/');
    }

    function hardHome() {
      // Снимаем флаг обработки
      window.authCallbackProcessing = false;
      // аварийно разруливаем возможные «полупроводы»
      window.location.replace('/');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Обработка авторизации...</p>
      </div>
    </div>
  );
}