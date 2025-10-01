import React from 'react';
import { LoginForm } from './LoginForm';

interface LoginPageProps {
  onSuccess?: () => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Фон в стиле Apple 2025 */}
      <div className="absolute inset-0">
        {/* Градиентный базовый слой */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50" />

        {/* Размытые цветные пятна */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-400/20 via-cyan-300/20 to-teal-400/20 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-emerald-300/20 via-green-400/20 to-lime-300/20 blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
          <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] rounded-full bg-gradient-to-bl from-sky-300/15 to-indigo-200/15 blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
        </div>

        {/* Тонкая текстура */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.8),transparent_50%)]" />
      </div>

      {/* Основной контент */}
      <div className="relative z-10 w-full max-w-md">
        <LoginForm onSuccess={onSuccess} />
      </div>
    </div>
  );
}
