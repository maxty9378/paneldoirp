import { useEffect, useRef } from 'react';
import { Spinner } from '../components/ui/Spinner';
import { supabase } from '../lib/supabase';

// Расширяем window для флага обработки
declare global {
  interface Window {
    authCallbackProcessing?: boolean;
  }
}

export default function AuthCallback() {
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
          window.location.href = '/';
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
          // Проверяем, это iPhone фиктивный токен
          if (tokenHash.startsWith('iphone_')) {
            console.log('🍎 iPhone mock token detected, creating session...');
            
            // Для iPhone создаем простую сессию
            const mockUser = {
              id: 'f10774ae-754d-4b44-92a4-a57a2ece733c',
              email: 'doirp.sns777@gmail.com',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {},
              aud: 'authenticated',
              confirmation_sent_at: new Date().toISOString(),
              recovery_sent_at: null,
              email_change_sent_at: null,
              new_email: null,
              new_phone: null,
              invited_at: null,
              action_link: null,
              email_confirmed_at: new Date().toISOString(),
              phone_confirmed_at: null,
              confirmed_at: new Date().toISOString(),
              email_change_confirm_status: 0,
              banned_until: null,
              reauthentication_sent_at: null,
              is_sso_user: false,
              deleted_at: null,
              is_anonymous: false,
              phone: null,
              factors: null,
              identities: [],
              last_sign_in_at: new Date().toISOString()
            };
            
            const mockSession = {
              access_token: `iphone_${tokenHash}`,
              refresh_token: `iphone_refresh_${tokenHash}`,
              expires_in: 3600,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              token_type: 'bearer',
              user: mockUser
            };
            
            // Устанавливаем сессию
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: mockSession.access_token,
              refresh_token: mockSession.refresh_token
            });
            
            if (!sessionError) {
              console.log('✅ iPhone: Mock session created successfully');
              cleanupUrl();
              return softHome();
            } else {
              console.error('❌ iPhone: Failed to create mock session:', sessionError);
              return hardHome();
            }
          }
          
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
      console.log('🔄 AuthCallback: Flag cleared, about to reload');
      // Простая перезагрузка страницы вместо navigate()
      window.location.href = '/';
      console.log('🔄 AuthCallback: location.href set');
    }

    function hardHome() {
      console.log('🔄 AuthCallback: hardHome() called');
      // Снимаем флаг обработки
      window.authCallbackProcessing = false;
      console.log('🔄 AuthCallback: Flag cleared, about to replace location');
      // аварийно разруливаем возможные «полупроводы»
      window.location.replace('/');
      console.log('🔄 AuthCallback: location.replace() called');
    }
  }, []); // Убираем navigate из зависимостей, так как используем window.location

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center bg-white/95 backdrop-blur-xl px-8 py-6 rounded-3xl shadow-lg border border-white/60">
        <Spinner
          size={32}
          className="mx-auto mb-4"
          label="Подтверждаем вход"
          labelClassName="text-slate-600"
          iconClassName="text-blue-600"
        />
        <p className="text-gray-600 text-sm">Обработка авторизации...</p>
      </div>
    </div>
  );
}