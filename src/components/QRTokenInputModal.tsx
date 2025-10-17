import React, { useState } from 'react';
import { X, QrCode, AlertCircle, CheckCircle } from 'lucide-react';

interface QRTokenInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (token: string) => void;
}

export function QRTokenInputModal({ isOpen, onClose, onScan }: QRTokenInputModalProps) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Проверяем формат токена
    if (!token) {
      setError('Введите токен');
      return;
    }

    if (token.length !== 64) {
      setError('Токен должен содержать 64 символа');
      return;
    }

    if (!/^[a-f0-9]+$/.test(token)) {
      setError('Токен должен содержать только буквы a-f и цифры');
      return;
    }

    // Токен валиден
    onScan(token);
    onClose();
  };

  const handleClose = () => {
    setToken('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Ввод QR-токена</h3>
              <p className="text-xs text-gray-500">Введите токен из QR-кода</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Поле ввода */}
          <div className="space-y-2">
            <label htmlFor="token" className="block text-sm font-medium text-gray-700">
              Токен QR-кода
            </label>
            <input
              id="token"
              type="text"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setError('');
              }}
              placeholder="Введите 64-символьный токен"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400 font-mono text-sm"
              autoFocus
            />
            <p className="text-xs text-gray-500">
              Токен должен содержать 64 символа (буквы a-f и цифры)
            </p>
          </div>

          {/* Ошибка */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Кнопки */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              Войти
            </button>
          </div>
        </form>

        {/* Подсказка */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-emerald-50 border-t border-gray-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Как получить токен:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700 text-xs">
                <li>Откройте QR-код эксперта</li>
                <li>Отсканируйте его любым QR-сканером</li>
                <li>Скопируйте токен из URL (после /auth/qr/)</li>
                <li>Вставьте токен в поле выше</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

