import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Обработка авторизации...');

  // Если пользователь уже авторизован, сразу перенаправляем
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('✅ User already authenticated on callback page, redirecting...');
        navigate('/');
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Processing auth callback...');
        
        // Получаем URL параметры для проверки ошибок
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
          console.error('❌ Auth error in URL:', error, errorDescription);
          setStatus('error');
          setMessage(errorDescription || 'Ошибка авторизации');
          return;
        }

        // Проверяем, есть ли уже активная сессия
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('Current session:', session?.user?.email || 'No session');
        
        // Если пользователь уже авторизован, сразу перенаправляем
        if (session?.user) {
          console.log('✅ User already authenticated, redirecting...');
          setStatus('success');
          setMessage('Авторизация успешна! Перенаправление...');
          setTimeout(() => navigate('/'), 1000);
          return;
        }
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          throw sessionError;
        }

        if (session?.user) {
          console.log('✅ User authenticated:', session.user.email);
          console.log('User confirmed:', session.user.email_confirmed_at);
          setStatus('success');
          setMessage('Авторизация успешна! Перенаправление...');
          
          // Перенаправляем на главную страницу через 2 секунды
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          console.log('ℹ️ No active session found, waiting for auth state change...');
          
          // Даем время Supabase обработать magic link
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Проверяем сессию еще раз после задержки
          const { data: { session: delayedSession } } = await supabase.auth.getSession();
          if (delayedSession?.user) {
            console.log('✅ User authenticated after delay:', delayedSession.user.email);
            setStatus('success');
            setMessage('Авторизация успешна! Перенаправление...');
            setTimeout(() => navigate('/'), 2000);
            return;
          }
          
          // Если все еще нет сессии, ждем изменения состояния авторизации
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔄 Auth state change in callback:', event, session?.user?.email);
            
            if ((event === 'SIGNED_IN' || event === 'SIGNED_UP') && session?.user) {
              console.log('✅ User signed in/up via magic link:', event);
              setStatus('success');
              setMessage('Авторизация успешна! Перенаправление...');
              
              // Перенаправляем на главную страницу через 2 секунды
              setTimeout(() => {
                navigate('/');
              }, 2000);
            } else if (event === 'SIGNED_OUT') {
              console.log('❌ User signed out');
              setStatus('error');
              setMessage('Сессия завершена');
            }
          });

          // Очищаем подписку через 10 секунд, если ничего не произошло
          setTimeout(() => {
            subscription.unsubscribe();
            if (status === 'loading') {
              setStatus('error');
              setMessage('Время ожидания авторизации истекло');
            }
          }, 10000);
        }
      } catch (error: any) {
        console.error('❌ Auth callback error:', error);
        setStatus('error');
        setMessage(error.message || 'Произошла ошибка при авторизации');
      }
    };

    handleAuthCallback();
  }, [navigate, status]);

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

