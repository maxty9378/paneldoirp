import React from 'react';
import { LoginForm } from './LoginForm';

interface LoginPageProps {
  onSuccess?: () => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Фон в корпоративных тонах SNS */}
      <div className="absolute inset-0">
        {/* Базовый градиент */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#f4fff9] via-white to-[#e6f7f1]" />

        {/* Размытые пятна с фирменным зеленым */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div
            className="absolute top-[-20%] right-[-15%] w-[620px] h-[620px] rounded-full bg-gradient-to-br from-[#06A478]/25 via-[#0fbf89]/20 to-[#22d3a0]/20 blur-3xl animate-pulse"
            style={{ animationDuration: '8s' }}
          />
          <div
            className="absolute bottom-[-22%] left-[-15%] w-[760px] h-[760px] rounded-full bg-gradient-to-tr from-[#0fbf89]/20 via-[#06A478]/25 to-[#c8f5e2]/30 blur-3xl animate-pulse"
            style={{ animationDuration: '11s', animationDelay: '2s' }}
          />
          <div
            className="absolute top-[18%] left-[12%] w-[420px] h-[420px] rounded-full bg-gradient-to-bl from-[#bbf7d0]/25 via-[#86efac]/20 to-transparent blur-3xl animate-pulse"
            style={{ animationDuration: '13s', animationDelay: '4s' }}
          />
        </div>

        {/* Легкая текстура */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(6,164,120,0.12),transparent_55%)]" />
      </div>

      {/* Основной контент */}
      <div className="relative z-10 w-full max-w-md">
        <LoginForm onSuccess={onSuccess} />
      </div>

      {/* Версия приложения - в углу экрана */}
      <div className="absolute bottom-4 right-4 z-20">
        <p className="text-[10px] text-gray-500/60 font-mono">
          {import.meta.env.VITE_FULL_VERSION || `v${import.meta.env.VITE_APP_VERSION || 'dev'} · ${new Date(import.meta.env.VITE_BUILD_TIMESTAMP || Date.now()).toLocaleDateString('ru-RU')}`}
        </p>
      </div>
    </div>
  );
}
