import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function QRAuthPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Обработка QR токена...');
  const [step, setStep] = useState<'qr' | 'auth' | 'profile'>('qr');

  useEffect(() => {
    console.log('🚀 QRAuthPage mounted with token:', token ? token.substring(0, 8) + '...' : 'NO TOKEN');
    
    if (!token) {
      console.error('❌ No token provided');
      setStatus('error');
      setMessage('Токен не найден');
      return;
    }

    const processQRToken = async () => {
      try {
        console.log('🔍 Processing QR token:', token.substring(0, 8) + '...');
        console.log('🌐 Calling Edge Function URL:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-by-qr-token`);
        
        // Шаг 1: Обработка QR токена
        setStep('qr');
        setMessage('Обработка QR токена...');
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-by-qr-token`, {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ token })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📝 Response:', data);
        
        if (!data.success || !data.redirectUrl) {
          throw new Error(data.error || 'Неожиданный ответ от сервера');
        }

        // Шаг 2: Авторизация через Supabase
        setStep('auth');
        setMessage('Выполнение авторизации...');
        
        // Переходим по magic link для активации
        console.log('🔗 Following magic link:', data.redirectUrl);
        window.location.href = data.redirectUrl;
        return; // Выходим, так как происходит переход

      } catch (error: any) {
        console.error('❌ Error processing QR token:', error);
        setStatus('error');
        setMessage(error.message || 'Произошла ошибка при обработке QR токена');
        
        // Перенаправляем на главную через 3 секунды
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    };

    processQRToken();
  }, [token, navigate]);

  const getStepIcon = () => {
    if (status === 'error') return <AlertCircle className="mx-auto mb-4 text-red-600" size={48} />;
    if (status === 'success') return <CheckCircle className="mx-auto mb-4 text-green-600" size={48} />;
    return <Loader2 className="mx-auto mb-4 animate-spin text-blue-600" size={48} />;
  };

  const getStepTitle = () => {
    if (status === 'error') return 'Ошибка';
    if (status === 'success') return 'Успешно!';
    
    switch (step) {
      case 'qr': return 'Обработка QR кода';
      case 'auth': return 'Выполнение авторизации';
      case 'profile': return 'Загрузка профиля';
      default: return 'Обработка QR кода';
    }
  };

  const getProgressBar = () => {
    if (status !== 'loading') return null;
    
    const progress = step === 'qr' ? 33 : step === 'auth' ? 66 : 100;
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {getStepIcon()}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {getStepTitle()}
        </h2>
        <p className="text-gray-600 mb-4">{message}</p>
        
        {getProgressBar()}
        
        {status === 'error' && (
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Вернуться на главную
          </button>
        )}
      </div>
    </div>
  );
}
