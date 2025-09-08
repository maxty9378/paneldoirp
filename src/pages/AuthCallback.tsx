import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Обработка авторизации...');
  const executedRef = useRef(false);

  useEffect(() => {
    console.log('🚀 AuthCallback component mounted!');
    
    if (executedRef.current) {
      console.log('⚠️ Already executed, skipping...');
      return;
    }
    
    const handleAuthCallback = async () => {
      try {
        executedRef.current = true;
        console.log('🔄 Processing auth callback...');
        console.log('Current URL:', window.location.href);
        console.log('Search params:', window.location.search);
        console.log('Hash params:', window.location.hash);
        
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
        
        console.log('Access token present:', !!accessToken);
        console.log('Refresh token present:', !!refreshToken);
        console.log('Token type:', type);

        if (accessToken && refreshToken && type === 'magiclink') {
          console.log('✅ Magic link tokens found, setting session...');
          
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
            
            // Проверяем сохранение сессии
            const saved = !!localStorage.getItem('sns-session-v1');
            console.log('🧩 saved in LS:', saved);
            const { data: { session: s } } = await supabase.auth.getSession();
            console.log('🧩 getSession says:', !!s?.user);
            
            setStatus('success');
            setMessage('Авторизация успешна! Перенаправление...');
            
            // Очищаем URL и делаем жёсткий переход
            window.history.replaceState({}, '', '/'); // убираем #params
            console.log('🚀 Redirecting to home...');
            window.location.replace('/');             // полный ребилд, чтоб корень поднял сессию
            return;
          } else {
            console.log('⚠️ setSession successful but no user in response, checking session...');
            
            // Даже если data.user пустой, проверим сессию
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (currentSession?.user) {
              console.log('✅ User found in current session:', currentSession.user.email);
              setStatus('success');
              setMessage('Авторизация успешна! Перенаправление...');
              window.history.replaceState({}, '', '/');
              console.log('🚀 Redirecting to home...');
              window.location.replace('/');
              return;
            }
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
            console.error('❌ Error verifying magic link:', error);
            throw error;
          }

          if (data.user) {
            console.log('✅ Magic link verified successfully:', data.user.email);
            setStatus('success');
            setMessage('Авторизация успешна! Перенаправление...');
            
            // Очищаем URL и делаем жёсткий переход
            window.history.replaceState({}, '', '/');
            window.location.replace('/');
            return;
          }
        }

        // Если нет type, но есть token - тоже пробуем как magic link
        if (token && !type) {
          console.log('✅ Token found without type, trying as magic link...');
          
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'magiclink'
          });

          if (error) {
            console.error('❌ Error verifying token as magic link:', error);
          } else if (data.user) {
            console.log('✅ Token verified successfully as magic link:', data.user.email);
            setStatus('success');
            setMessage('Авторизация успешна! Перенаправление...');
            
            // Очищаем URL и делаем жёсткий переход
            window.history.replaceState({}, '', '/');
            window.location.replace('/');
            return;
          }
        }

        // Если ничего не сработало, проверяем обычные токены без type
        if (accessToken && refreshToken) {
          console.log('✅ Direct tokens found, setting session...');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('❌ Error setting session:', error);
            throw error;
          }

          if (data.user) {
            console.log('✅ Session set successfully:', data.user.email);
            setStatus('success');
            setMessage('Авторизация успешна! Перенаправление...');
            
            // Очищаем URL от токенов
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            
            window.location.replace('/');
            return;
          }
        }

        // Проверяем текущую сессию
        console.log('🔍 Checking current session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('Current session:', session?.user?.email || 'No session');
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          throw sessionError;
        }

        if (session?.user) {
          console.log('✅ User already authenticated:', session.user.email);
          setStatus('success');
          setMessage('Авторизация успешна! Перенаправление...');
          
          // Очищаем URL от токенов
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          
          window.location.replace('/');
          return;
        }

        // Если дошли до сюда и ничего не сработало
        console.log('❌ No suitable authentication method found');
        setStatus('error');
        setMessage('Не удалось обработать токены авторизации');
        setTimeout(() => {
          window.location.replace('/');
        }, 3000);

      } catch (error: any) {
        console.error('❌ Auth callback error:', error);
        setStatus('error');
        setMessage(error.message || 'Произошла ошибка при авторизации');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e5f3ff] via-[#eafaf1] to-[#b6e0fe] px-4">
      <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Обработка авторизации</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Авторизация успешна!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Перейти в систему
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ошибка авторизации</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/login')}
                className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Попробовать снова
              </button>
              <button
                onClick={() => navigate('/')}
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

