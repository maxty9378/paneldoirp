import React from 'react';
import { LoginForm } from './LoginForm';

interface LoginPageProps {
  onSuccess?: () => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-4">
      {/* Простые декоративные элементы без анимации */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 h-96 w-96 rounded-full bg-gradient-to-br from-[#06A478]/10 to-[#4ade80]/10" />
        <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-gradient-to-br from-[#4ade80]/10 to-[#86efac]/10" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-gradient-to-br from-[#06A478]/5 to-[#22c55e]/5" />
      </div>

      {/* Основной контент */}
      <div className="relative z-10 w-full max-w-md">
        <LoginForm onSuccess={onSuccess} />
      </div>
    </div>
  );
}
