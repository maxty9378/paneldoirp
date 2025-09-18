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
  const executedRef = useRef(false);

  useEffect(() => {
    if (executedRef.current) return;
    executedRef.current = true;

    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Processing auth callback...');
        
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Проверяем ошибки
        const error = urlParams.get('error') || hashParams.get('error');
        if (error) {
          console.error('❌ Auth error:', error);
          window.location.replace('/');
          return;
        }

        // Ищем токены в URL параметрах
        const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          console.log('✅ Tokens found, setting session...');
          
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            console.error('❌ Session error:', sessionError);
            window.location.replace('/');
            return;
          }

          console.log('✅ Session set successfully');
          window.history.replaceState({}, '', '/');
          window.location.replace('/');
          return;
        }

        // Проверяем verification токен
        const token = urlParams.get('token') || hashParams.get('token');
        if (token) {
          console.log('✅ Verification token found...');
          
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'magiclink'
          });

          if (verifyError) {
            console.error('❌ Verification error:', verifyError);
            window.location.replace('/');
            return;
          }

          console.log('✅ Token verified successfully');
          window.history.replaceState({}, '', '/');
          window.location.replace('/');
          return;
        }

        // Проверяем magic link токен в hash
        const hashToken = window.location.hash.substring(1);
        if (hashToken && hashToken.includes('access_token=')) {
          console.log('✅ Magic link token found in hash...');
          
          const hashParams = new URLSearchParams(hashToken);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken && refreshToken) {
            console.log('✅ Tokens found in hash, setting session...');
            
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (sessionError) {
              console.error('❌ Session error:', sessionError);
              window.location.replace('/');
              return;
            }

            console.log('✅ Session set successfully from hash');
            window.history.replaceState({}, '', '/');
            window.location.replace('/');
            return;
          }
        }

        // Если ничего не найдено
        console.log('❌ No auth tokens found');
        window.location.replace('/');

      } catch (error: any) {
        console.error('❌ Auth callback error:', error);
        window.location.replace('/');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  // Не показываем отдельную страницу - глобальный оверлей в App.tsx
  return null;
}