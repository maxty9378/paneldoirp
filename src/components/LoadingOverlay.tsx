import React from 'react';
import { Spinner } from './ui/Spinner';

export function LoadingOverlay({
  title = 'Подтверждаем вход…',
  subtitle = 'Пожалуйста, подождите пару секунд',
  visible,
}: {
  title?: string;
  subtitle?: string;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[4999] flex items-center justify-center bg-slate-900/70 backdrop-blur-xl px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white/95 backdrop-blur-xl p-8 shadow-2xl border border-white/40">
        <Spinner size={48} label="Загружаем" className="mx-auto mb-6" />
        <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">{title}</h3>
        <p className="text-sm text-gray-600 text-center leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}
