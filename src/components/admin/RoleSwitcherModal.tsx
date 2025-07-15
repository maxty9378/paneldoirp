import React, { useState } from 'react';
import { X, RotateCcw, Shield } from 'lucide-react';
import { USER_ROLE_LABELS } from '../../types';

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onRoleChange: () => void;
}

export function RoleSwitcherModal({ isOpen, onClose, currentUser, onRoleChange }: RoleSwitcherModalProps) {
  const [selectedRole, setSelectedRole] = useState(currentUser?.role || 'employee');
  const [switching, setSwitching] = useState(false);

  if (!isOpen) return null;

  const handleRoleSwitch = async () => {
    setSwitching(true);
    try {
      // Здесь будет логика переключения роли
      await new Promise(resolve => setTimeout(resolve, 1000));
      onRoleChange();
      onClose();
    } catch (error) {
      console.error('Error switching role:', error);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <RotateCcw size={20} className="text-sns-green" />
            <h2 className="text-xl font-semibold text-gray-900">Переключение роли</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Shield size={16} className="text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Режим тестирования ролей для администраторов
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Выберите роль для тестирования:
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
            >
              {Object.entries(USER_ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-gray-600">
            <p>Текущая роль: <span className="font-medium">{USER_ROLE_LABELS[currentUser?.role] || 'Неизвестно'}</span></p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleRoleSwitch}
            disabled={switching || selectedRole === currentUser?.role}
            className="px-4 py-2 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {switching ? 'Переключение...' : 'Переключить роль'}
          </button>
        </div>
      </div>
    </div>
  );
}