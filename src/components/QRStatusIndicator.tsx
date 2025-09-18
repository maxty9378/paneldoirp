import React from 'react';
import { Loader2, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { getConnectionQuality } from '../utils/mobileOptimization';

interface QRStatusIndicatorProps {
  status: 'loading' | 'success' | 'error';
  step: 'qr' | 'auth' | 'profile';
  message: string;
  isIOS?: boolean;
}

export function QRStatusIndicator({ status, step, message, isIOS = false }: QRStatusIndicatorProps) {
  const connectionQuality = getConnectionQuality();
  const isSlowConnection = connectionQuality === 'slow';

  const getStatusIcon = () => {
    if (status === 'error') return <AlertCircle className="mx-auto text-red-500" size={48} />;
    if (status === 'success') return <CheckCircle className="mx-auto text-emerald-400" size={48} />;
    return <Loader2 className="mx-auto animate-spin text-emerald-400" size={40} />;
  };

  const getStatusTitle = () => {
    if (status === 'error') return 'Не удалось войти';
    if (status === 'success') return 'Авторизация успешна';
    if (step === 'qr') return isIOS ? 'Проверяем QR-код' : 'Проверяем QR-токен';
    if (step === 'auth') return isIOS ? 'Входим в систему' : 'Подтверждаем вход';
    return 'Загружаем профиль';
  };

  const getStatusSubtitle = () => {
    if (status === 'success') return 'Почти готово…';
    if (status === 'error') return 'Возврат на главную';
    
    if (isSlowConnection) {
      return 'Медленное соединение, подождите…';
    }
    
    if (isIOS) {
      return 'Это может занять немного больше времени на iPhone';
    }
    
    return message;
  };

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center">
        {getStatusIcon()}
      </div>

      <div className="text-center">
        <h2 className="text-xl font-medium">{getStatusTitle()}</h2>
        <p className="mt-1 text-white/70 text-sm">{getStatusSubtitle()}</p>
        
        {/* Индикатор качества соединения */}
        {status === 'loading' && (
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-white/50">
            {isSlowConnection ? (
              <>
                <WifiOff size={14} />
                <span>Медленное соединение</span>
              </>
            ) : (
              <>
                <Wifi size={14} />
                <span>Хорошее соединение</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Дополнительные подсказки для iOS */}
      {isIOS && status === 'loading' && step === 'qr' && (
        <div className="mt-2 text-center text-xs text-white/50 max-w-sm">
          <p>💡 Совет: Убедитесь, что QR-код четкий и хорошо освещен</p>
        </div>
      )}

      {isIOS && status === 'loading' && step === 'auth' && (
        <div className="mt-2 text-center text-xs text-white/50 max-w-sm">
          <p>⏱️ На iPhone это может занять до 30 секунд</p>
        </div>
      )}
    </div>
  );
}
