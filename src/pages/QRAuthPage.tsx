import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function QRAuthPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Обработка QR токена...');

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
        
        // Вызываем Edge Function для обработки токена
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-by-qr-token`, {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ token })
        });

        if (response.redirected) {
          console.log('✅ Redirecting to:', response.url);
          window.location.replace(response.url);
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Если нет редиректа, проверяем ответ
        const data = await response.text();
        console.log('📝 Response:', data);
        
        setStatus('error');
        setMessage('Неожиданный ответ от сервера');

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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto mb-4 animate-spin text-blue-600" size={48} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Обработка QR кода
            </h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto mb-4 text-green-600" size={48} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Успешно!
            </h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="mx-auto mb-4 text-red-600" size={48} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Ошибка
            </h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Вернуться на главную
            </button>
          </>
        )}
      </div>
    </div>
  );
}
