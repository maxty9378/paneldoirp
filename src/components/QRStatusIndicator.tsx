import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { getConnectionQuality } from '../utils/mobileOptimization';

type Status = 'loading' | 'success' | 'error';
type Step = 'qr' | 'auth' | 'profile';

interface QRStatusIndicatorProps {
  status: Status;
  step: Step;
  message: string;
  isIOS?: boolean;
}

const statusPalette: Record<Status, { ring: string; badge: string; accent: string; text: string }> = {
  loading: {
    ring: 'ring-emerald-400/15',
    badge: 'bg-emerald-500/10 text-emerald-600',
    accent: 'from-emerald-400/15 via-emerald-300/5 to-transparent',
    text: 'text-slate-800'
  },
  success: {
    ring: 'ring-emerald-500/25',
    badge: 'bg-emerald-500/15 text-emerald-700',
    accent: 'from-emerald-400/25 via-emerald-300/10 to-transparent',
    text: 'text-emerald-700'
  },
  error: {
    ring: 'ring-rose-400/20',
    badge: 'bg-rose-500/10 text-rose-600',
    accent: 'from-rose-300/20 via-rose-200/10 to-transparent',
    text: 'text-rose-600'
  }
};

const stepTitle: Record<Step, string> = {
  qr: 'Проверка QR-токена',
  auth: 'Авторизация',
  profile: 'Загрузка профиля'
};

export function QRStatusIndicator({ status, step, message, isIOS = false }: QRStatusIndicatorProps) {
  const connectionQuality = getConnectionQuality();
  const isSlowConnection = connectionQuality === 'slow';
  const palette = statusPalette[status];

  const renderIcon = () => {
    if (status === 'error') {
      return <AlertTriangle className="h-7 w-7" aria-hidden />;
    }
    if (status === 'success') {
      return <CheckCircle2 className="h-7 w-7" aria-hidden />;
    }
    return <Loader2 className="h-7 w-7 animate-spin" aria-hidden />;
  };

  const iconTone = status === 'error' ? 'text-rose-500' : status === 'success' ? 'text-emerald-500' : 'text-emerald-500';

  const getSubtitle = () => {
    if (status === 'error') return 'Ошибка авторизации, попробуйте снова.';
    if (status === 'success') return 'Успешная авторизация, перенаправление';

    if (isSlowConnection) {
      return 'Медленное соединение, пожалуйста подождите немного дольше обычного.';
    }

    if (isIOS) {
      return 'На iPhone авторизация в среднем занимает до 30 секунд.';
    }

    return message || 'Выполняется проверка токена';
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl border border-white/60 bg-white/70 px-6 py-6 sm:py-7 ring-1 ${palette.ring} shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${palette.accent}`} aria-hidden />
      <div className="relative flex flex-col items-center gap-4 text-center">
        <span className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${palette.badge} ${iconTone}`}>
          {renderIcon()}
        </span>
        <div className="space-y-1">
          <h2 className={`text-lg font-semibold tracking-tight sm:text-xl ${palette.text}`}>
            {status === 'loading' ? stepTitle[step] : getSubtitle()}
          </h2>
          {status === 'loading' && (
            <p className="text-sm text-slate-500">{getSubtitle()}</p>
          )}
          {status !== 'loading' && (
            <p className="text-sm text-slate-500">
              {status === 'success' ? 'Все готово' : 'Переходим к следующему шагу.'}
            </p>
          )}
        </div>

        {status === 'loading' && (
          <div className="mt-1 flex items-center justify-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-xs text-slate-500">
            {isSlowConnection ? (
              <>
                <WifiOff className="h-3.5 w-3.5 text-rose-500" aria-hidden />
                <span>Медленное соединение</span>
              </>
            ) : (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                <span>Стабильное соединение</span>
              </>
            )}
          </div>
        )}

        {isIOS && status === 'loading' && (
          <p className="mt-1 max-w-xs text-xs text-slate-500">
            💡 Совет: отключите блокировщик рекламы на этом сайте или добавьте сайт в исключения Safari, чтобы ускорить авторизацию.
          </p>
        )}
      </div>
    </div>
  );
}