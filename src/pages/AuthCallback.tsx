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
    console.log('🚀 AuthCallback component mounted!');
    
    if (executedRef.current) {
      console.log('⚠️ Already executed, skipping...');
      return;
    }

    // Устанавливаем флаг обработки
    window.authCallbackProcessing = true;

    const handleAuthCallback = async () => {
      try {
        executedRef.current = true;
        console.log('🔄 Processing auth callback...');
        console.log('Current URL:', window.location.href);
        console.log('Search params:', window.location.search);
        console.log('Hash params:', window.location.hash);
        
        // Добавляем общий таймаут для всего процесса
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth callback timeout after 15 seconds')), 15000)
        );
        
        const authPromise = (async () => {
          // Проверяем параметры в URL для ошибок
          const urlParams = new URLSearchParams(window.location.search);
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          
          // Проверяем наличие ошибок в URL
          const error = urlParams.get('error') || hashParams.get('error');
          const errorCode = urlParams.get('error_code') || hashParams.get('error_code');
          const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
          
          if (error) {
            console.error('❌ Auth error from URL:', { error, errorCode, errorDescription });
            
            if (error === 'server_error' && errorCode === 'unexpected_failure') {
              throw new Error(`Ошибка подтверждения пользователя: ${decodeURIComponent(errorDescription || 'Unknown error')}`);
            }
            
            throw new Error(`Ошибка авторизации: ${error} - ${errorDescription || 'Unknown error'}`);
          }

          // Сначала проверяем access_token и refresh_token (основной способ для magic link)
          const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
          const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
          const type = urlParams.get('type') || hashParams.get('type');
          
          // Устанавливаем флаг что авторизация обрабатывается
          window.authCallbackProcessing = true;
          
          console.log('Access token present:', !!accessToken);
          console.log('Refresh token present:', !!refreshToken);
          console.log('Token type:', type);

          if (accessToken && refreshToken && type === 'magiclink') {
            console.log('✅ Magic link tokens found, setting session...');
            
            try {
              const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
                refresh_token: refreshToken
              });

              if (error) {
                console.error('❌ Error setting session:', error);
                throw error;
              }

              console.log('🔍 setSession result:', { user: !!data.user, session: !!data.session });
              
              if (data.user) {
                console.log('✅ Magic link session set successfully:', data.user.email);
                
                // Ждем немного чтобы сессия сохранилась
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Проверяем сохранение сессии
                const { data: { session: s } } = await supabase.auth.getSession();
                console.log('🧩 getSession says:', !!s?.user);
                
                if (s?.user) {
                  try {
                    window.history.replaceState({}, '', '/');
                  } catch {}
                  
                  window.authCallbackProcessing = false; // сбросить флаг до ухода
                  
                  console.log('🚀 Redirecting to home...');
                  window.location.replace('/');
                  return;
                } else {
                  throw new Error('Сессия не была установлена корректно');
                }
              } else {
                console.log('⚠️ setSession successful but no user in response, checking session...');
              
                // Даже если data.user пустой, проверим сессию
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                if (currentSession?.user) {
                  console.log('✅ User found in current session:', currentSession.user.email);
                  
                  try {
                    window.history.replaceState({}, '', '/');
                  } catch {}
                  
                  window.authCallbackProcessing = false; // сбросить флаг до ухода
                  
                  console.log('🚀 Redirecting to home...');
                  window.location.replace('/');
                  return;
                } else {
                  throw new Error('Не удалось установить сессию пользователя');
                }
              }
            } catch (sessionError) {
              console.error('❌ Session setup failed:', sessionError);
              throw sessionError;
            }
          }

          // Проверяем verification токен (основной способ для magic link с URL параметрами)
          const token = urlParams.get('token') || hashParams.get('token');

          if (token && (type === 'magiclink' || urlParams.get('type') === 'magiclink')) {
            console.log('✅ Magic link token found in URL params, verifying...');
            
            // Используем verifyOtp для magic link из URL параметров
            const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
              type: 'magiclink'
            });

            if (error) {
              console.error('❌ Error verifying magic link token:', error);
              throw error;
            }

            if (data.user) {
              console.log('✅ Magic link token verified successfully:', data.user.email);
              
              try {
                window.history.replaceState({}, '', '/');
              } catch {}
              
              window.authCallbackProcessing = false; // сбросить флаг до ухода
              
              console.log('🚀 Redirecting to home...');
              window.location.replace('/');
              return;
            }
          }

          // Проверяем hash токены (для OAuth и других методов)
          const hashToken = hashParams.get('access_token');
          const hashType = hashParams.get('type');
          
          if (hashToken && hashType) {
            console.log('✅ Hash tokens found, processing...');
            
            // Устанавливаем сессию из hash токенов
            const { data, error } = await supabase.auth.setSession({
              access_token: hashToken,
              refresh_token: hashParams.get('refresh_token') || ''
            });

            if (error) {
              console.error('❌ Error setting session from hash:', error);
              throw error;
            }

            if (data.user) {
              console.log('✅ Hash session set successfully:', data.user.email);
              
              try {
                window.history.replaceState({}, '', '/');
              } catch {}
              
              window.authCallbackProcessing = false; // сбросить флаг до ухода
              
              console.log('🚀 Redirecting to home...');
              window.location.replace('/');
              return;
            }
          }

          // Если дошли до сюда и ничего не сработало
          console.log('❌ No suitable authentication method found');
          setTimeout(() => {
            window.location.replace('/');
          }, 1000);
        })(); // Закрываем authPromise
        
        // Ждем либо завершения авторизации, либо таймаута
        await Promise.race([authPromise, timeoutPromise]);

      } catch (error: any) {
        console.error('❌ Auth callback error:', error);
        setTimeout(() => {
          window.location.replace('/');
        }, 1000);
      } finally {
        // Очищаем флаг обработки
        window.authCallbackProcessing = false;
      }
    };

    handleAuthCallback();
  }, [navigate]);

  // Не показываем отдельную страницу - глобальный оверлей в App.tsx
  return null;
}