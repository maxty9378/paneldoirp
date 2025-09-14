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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-300">
      <div className="w-[min(92vw,420px)] rounded-2xl bg-white/95 backdrop-blur-xl p-8 shadow-2xl border border-white/20 animate-scale-in">
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-emerald-200 rounded-full animate-spin border-t-emerald-500"></div>
            <div className="absolute inset-0 w-12 h-12 border-4 border-transparent rounded-full animate-ping border-t-emerald-400"></div>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 text-center mb-2">{title}</h3>
        <p className="text-sm text-gray-600 text-center">{subtitle}</p>
        
        {/* Progress dots */}
        <div className="flex justify-center mt-6 space-x-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse delay-150"></div>
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse delay-300"></div>
        </div>
      </div>
    </div>
  );
}
