import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function QRAuthSuccessPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Обработка авторизации...');

  useEffect(() => {
    const processAuth = async () => {
      try {
        // Извлекаем токены из URL
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
        const type = urlParams.get('type') || hashParams.get('type');

        if (accessToken && refreshToken && type === 'magiclink') {
          console.log('✅ Magic link tokens found, setting session...');
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            throw new Error(`Ошибка установки сессии: ${error.message}`);
          }

          if (data.session) {
            console.log('✅ Session set successfully');
            setStatus('success');
            setMessage('Авторизация успешна! Перенаправление...');
            
            // Очищаем URL
            try {
              window.history.replaceState({}, '', '/');
            } catch {}
            
            // Перенаправляем на главную
            setTimeout(() => {
              navigate('/');
            }, 1000);
          } else {
            throw new Error('Сессия не создана');
          }
        } else {
          throw new Error('Токены авторизации не найдены');
        }
      } catch (error: any) {
        console.error('❌ Auth processing error:', error);
        setStatus('error');
        setMessage(error.message || 'Ошибка авторизации');
        
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    };

    processAuth();
  }, [navigate]);

  const icon = status === 'error' ? 
    <CheckCircle className="mx-auto mb-4 text-red-600" size={48} /> :
    status === 'success' ? 
    <CheckCircle className="mx-auto mb-4 text-green-600" size={48} /> :
    <Loader2 className="mx-auto mb-4 animate-spin text-blue-600" size={48} />;

  const title = status === 'error' ? 'Ошибка' :
    status === 'success' ? 'Авторизация успешна!' :
    'Обработка авторизации...';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {icon}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {title}
        </h2>
        <p className="text-gray-600 mb-4">
          {message}
        </p>
        {status === 'loading' && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }} />
          </div>
        )}
        {status === 'success' && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }} />
          </div>
        )}
      </div>
    </div>
  );
}
