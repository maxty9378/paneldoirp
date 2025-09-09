import React from 'react';

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[min(92vw,420px)] rounded-2xl bg-neutral-900 p-6 shadow-2xl border border-white/10">
        <div className="flex items-center gap-3">
          <span className="inline-block h-3 w-3 animate-ping rounded-full bg-emerald-400" />
          <span className="inline-block h-3 w-3 animate-ping rounded-full bg-emerald-400 delay-150" />
          <span className="inline-block h-3 w-3 animate-ping rounded-full bg-emerald-400 delay-300" />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-white/70">{subtitle}</p>
      </div>
    </div>
  );
}
