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
        console.log('🔄 AuthCallback: window.authCallbackProcessing =', window.authCallbackProcessing);
        
        // Проверяем, есть ли уже активная сессия
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (session?.user && !sessionError) {
          console.log('✅ AuthCallback: User already authenticated:', session.user.email);
          console.log('🔄 AuthCallback: Redirecting to home without processing tokens');
          window.authCallbackProcessing = false;
          navigate('/');
          return;
        }
        
        const url = new URL(window.location.href);
        const search = url.searchParams;
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        console.log('🔄 AuthCallback: URL parsed, search params:', Object.fromEntries(search.entries()));
        console.log('🔄 AuthCallback: hash params:', Object.fromEntries(hash.entries()));

        // 1) PKCE: ?code=...
        const authCode = search.get('code');
        if (authCode) {
          console.log('🔑 PKCE code detected, exchanging for session...');
          console.log('🔑 AuthCallback: About to call exchangeCodeForSession');
          const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
          console.log('🔑 AuthCallback: exchangeCodeForSession completed');
          if (error) {
            console.error('❌ exchangeCodeForSession error:', error);
            return hardHome();
          }
          console.log('✅ PKCE session established for:', data.user?.email);

          console.log('🔄 AuthCallback: About to cleanup URL');
          cleanupUrl();
          console.log('🔄 AuthCallback: About to navigate home');
          return softHome();
        }

        // 2) Имплисит/магик-линк: в hash пришли access_token/refresh_token
        const at = search.get('access_token') || hash.get('access_token');
        const rt = search.get('refresh_token') || hash.get('refresh_token');
        if (at && rt) {
          console.log('🔑 Tokens detected in URL, setSession...');
          console.log('🔑 AuthCallback: About to call setSession');
          const { error } = await supabase.auth.setSession({
            access_token: at,
            refresh_token: rt,
          });
          console.log('🔑 AuthCallback: setSession completed');
          if (error) {
            console.error('❌ setSession error:', error);
            return hardHome();
          }
          console.log('✅ Session set via tokens');

          console.log('🔄 AuthCallback: About to cleanup URL');
          cleanupUrl();
          console.log('🔄 AuthCallback: About to navigate home');
          return softHome();
        }

        // 3) Магик-линк токен-хэш
        const tokenHash = search.get('token') || hash.get('token');
        if (tokenHash) {
          console.log('🔑 token_hash detected, verifyOtp...');
          console.log('🔑 AuthCallback: About to call verifyOtp');
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'magiclink',
          });
          console.log('🔑 AuthCallback: verifyOtp completed');
          if (error) {
            console.error('❌ verifyOtp error:', error);
            return hardHome();
          }
          console.log('✅ OTP verified');

          console.log('🔄 AuthCallback: About to cleanup URL');
          cleanupUrl();
          console.log('🔄 AuthCallback: About to navigate home');
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
      console.log('🔄 AuthCallback: Cleaning up URL');
      // чистим урл от параметров, но без жёсткого перезагруза
      window.history.replaceState({}, '', '/');
      console.log('🔄 AuthCallback: URL cleaned up');
    }

    function softHome() {
      console.log('🔄 AuthCallback: softHome() called');
      // Снимаем флаг обработки перед навигацией
      window.authCallbackProcessing = false;
      console.log('🔄 AuthCallback: Flag cleared, about to navigate');
      // Немедленное перенаправление без задержек
      navigate('/');
      console.log('🔄 AuthCallback: navigate() called');
      
      // Дополнительная страховка - сбрасываем флаг через таймаут
      setTimeout(() => {
        if (window.authCallbackProcessing) {
          console.log('🔄 AuthCallback: Force clearing flag after timeout');
          window.authCallbackProcessing = false;
        }
      }, 1000);
    }

    function hardHome() {
      console.log('🔄 AuthCallback: hardHome() called');
      // Снимаем флаг обработки
      window.authCallbackProcessing = false;
      console.log('🔄 AuthCallback: Flag cleared, about to replace location');
      // аварийно разруливаем возможные «полупроводы»
      window.location.replace('/');
      console.log('🔄 AuthCallback: location.replace() called');
      
      // Дополнительная страховка - сбрасываем флаг через таймаут
      setTimeout(() => {
        if (window.authCallbackProcessing) {
          console.log('🔄 AuthCallback: Force clearing flag after timeout');
          window.authCallbackProcessing = false;
        }
      }, 1000);
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