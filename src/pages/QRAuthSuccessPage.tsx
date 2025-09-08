import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function QRAuthSuccessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Автоматически перенаправляем на главную через 2 секунды
    const timer = setTimeout(() => {
      navigate('/');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <CheckCircle className="mx-auto mb-4 text-green-600" size={48} />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Авторизация успешна!
        </h2>
        <p className="text-gray-600 mb-4">
          Перенаправление на главную страницу...
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  );
}
