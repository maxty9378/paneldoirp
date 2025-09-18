import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface AuthTransitionProps {
  isVisible: boolean;
  status: 'loading' | 'success' | 'error';
  message: string;
  onComplete?: () => void;
}

export function AuthTransition({ isVisible, status, message, onComplete }: AuthTransitionProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  useEffect(() => {
    if (status === 'success' && onComplete) {
      const timer = setTimeout(onComplete, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, onComplete]);

  if (!show) return null;

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600 animate-bounce-gentle" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-600" />;
      default:
        return null;
    }
  };

  const getBgColor = () => {
    switch (status) {
      case 'loading':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-[4998] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300">
      <div className={`w-[min(90vw,400px)] rounded-2xl border p-8 shadow-xl animate-scale-in ${getBgColor()}`}>
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            {getIcon()}
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {status === 'loading' && 'Обработка...'}
            {status === 'success' && 'Успешно!'}
            {status === 'error' && 'Ошибка'}
          </h3>
          <p className="text-sm text-gray-600">{message}</p>
          
          {status === 'loading' && (
            <div className="mt-4 flex space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-150"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-300"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
