import React, { useState } from 'react';
import { UserQRLogin } from '../components/admin/UserQRLogin';

export default function TestQRLogin() {
  const [showQR, setShowQR] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Тестирование QR-кода авторизации
          </h1>
          
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">
                Инструкция по тестированию
              </h2>
              <ol className="list-decimal list-inside space-y-2 text-blue-800">
                <li>Нажмите кнопку "Генерировать QR-код" ниже</li>
                <li>Отсканируйте QR-код камерой телефона</li>
                <li>Перейдите по открывшейся ссылке</li>
                <li>Проверьте, что авторизация прошла успешно</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                Тестовые пользователи
              </h3>
              <div className="space-y-2 text-yellow-800">
                <div>
                  <strong>Администратор:</strong> doirp@sns.ru (пароль: 123456)
                </div>
                <div>
                  <strong>Сотрудник:</strong> max22@max.ru (пароль: 123456)
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowQR(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                QR для doirp@sns.ru
              </button>
              <button
                onClick={() => setShowQR(true)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                QR для max22@max.ru
              </button>
            </div>

            {showQR && (
              <UserQRLogin
                userEmail="doirp@sns.ru"
                userName="Администратор"
                onClose={() => setShowQR(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
