import React, { useState } from 'react';
import { X, Send, Mail } from 'lucide-react';
import { useAdminActions } from '../../hooks/useAdminActions';

interface SendCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export function SendCredentialsModal({ isOpen, onClose, user }: SendCredentialsModalProps) {
  const { resetUserPassword, loading } = useAdminActions();
  
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const handleSend = async () => {
    if (!user?.email) {
      setError('У пользователя нет email адреса');
      return;
    }
    
    setError('');
    setSending(true);
    
    try {
      const password = await resetUserPassword(user.id, user.email);
      // Обновляем состояние после успешного сброса пароля
      setNewPassword(password);
      setSent(true);
      // Не закрываем окно автоматически, чтобы пользователь успел увидеть пароль
      // и смог скопировать его при необходимости
    } catch (error) {
      console.error('Error resetting password:', error);
      setError(error instanceof Error ? error.message : 'Ошибка сброса пароля');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Отправить учетные данные
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {!sent ? (
            <>
              {!user?.email && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    У пользователя нет email адреса. Невозможно отправить учетные данные.
                  </p>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Mail size={24} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{user.full_name}</h3>
                  <p className="text-sm text-gray-600">{user.email || 'Email не указан'}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Что будет сделано:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Будет сгенерирован новый временный пароль</li>
                  <li>• Пароль будет сброшен на "123456"</li>
                  <li>• Новый пароль будет показан для передачи пользователю</li>
                </ul>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              
              {user?.email && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Внимание! Это действие сбросит текущий пароль пользователя. 
                    Новый временный пароль нужно будет передать пользователю.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send size={32} className="text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Пароль сброшен!
              </h3>
              <p className="text-gray-600 mb-4">
                Новый временный пароль создан.
              </p>
              {newPassword && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">Новый пароль:</p>
                  <p className="text-lg font-mono text-blue-800 bg-white px-4 py-2 rounded border border-blue-200 text-center select-all cursor-pointer" 
                     onClick={() => {
                       navigator.clipboard.writeText('123456');
                       alert('Пароль скопирован в буфер обмена');
                     }}
                     title="Нажмите, чтобы скопировать пароль">
                    123456
                  </p>
                  <p className="text-sm text-blue-700 mt-2">
                    <span className="font-medium">Стандартный пароль:</span> Все пользователи в системе имеют стандартный пароль <span className="font-mono font-medium">123456</span>. Обязательно передайте этот пароль пользователю.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {!sent && (
          <div className="p-6 border-t border-gray-200">
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !user?.email}
                className="px-4 py-2 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send size={16} />
                <span>{sending ? 'Сброс пароля...' : 'Сбросить пароль'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}