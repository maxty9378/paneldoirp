import React, { useState } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';

interface SendReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
}

export function SendReminderModal({ isOpen, onClose, employee }: SendReminderModalProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen || !employee) return null;

  const handleSend = async () => {
    setSending(true);
    try {
      // Здесь будет логика отправки напоминания
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSent(true);
      setTimeout(() => {
        onClose();
        setSent(false);
        setMessage('');
      }, 2000);
    } catch (error) {
      console.error('Error sending reminder:', error);
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
              Отправить напоминание
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
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <MessageCircle size={24} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{employee.full_name}</h3>
                  <p className="text-sm text-gray-600">{employee.phone}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сообщение
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
                  placeholder="Введите текст напоминания..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Напоминание будет отправлено по SMS на указанный номер телефона.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send size={32} className="text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Напоминание отправлено!
              </h3>
              <p className="text-gray-600">
                Сотрудник получит SMS с напоминанием.
              </p>
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
                disabled={sending || !message.trim()}
                className="px-4 py-2 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send size={16} />
                <span>{sending ? 'Отправка...' : 'Отправить'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}