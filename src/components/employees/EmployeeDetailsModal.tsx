import React from 'react';
import { X, Mail, Phone, MapPin, Building2, Calendar, User } from 'lucide-react';
import { formatExperienceDays } from '../../utils/textUtils';

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
}

export function EmployeeDetailsModal({ isOpen, onClose, employee }: EmployeeDetailsModalProps) {
  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Профиль сотрудника
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
          {/* Основная информация */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-sns-green/10 rounded-xl flex items-center justify-center text-sns-green font-bold text-lg">
              {employee.avatar_url ? (
                <img 
                  src={employee.avatar_url} 
                  alt={employee.full_name} 
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                employee.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{employee.full_name}</h3>
              <p className="text-gray-600">{employee.position?.name || 'Должность не указана'}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  employee.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {employee.is_active ? 'Активен' : 'Неактивен'}
                </span>
                {employee.is_leaving && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Увольняется
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Контактная информация */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Контактная информация</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <a href={`mailto:${employee.email}`} className="text-sm text-blue-600 hover:underline">
                    {employee.email}
                  </a>
                </div>
              </div>

              {employee.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Телефон</p>
                    <a href={`tel:${employee.phone}`} className="text-sm text-blue-600 hover:underline">
                      {employee.phone}
                    </a>
                  </div>
                </div>
              )}

              {employee.sap_number && (
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">SAP номер</p>
                    <p className="text-sm text-gray-600">{employee.sap_number}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Рабочая информация */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Рабочая информация</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Building2 className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Должность</p>
                  <p className="text-sm text-gray-600">{employee.position?.name || 'Не указана'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Территория</p>
                  <p className="text-sm text-gray-600">{employee.territory?.name || 'Не указана'}</p>
                </div>
              </div>

              {employee.experience !== undefined && (
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Стаж работы</p>
                    <p className="text-sm text-gray-600">{formatExperienceDays(employee.experience)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Дата создания</p>
                  <p className="text-sm text-gray-600">
                    {new Date(employee.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Статистика обучения */}
          {employee.stats && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Статистика обучения</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{employee.stats.total_events}</p>
                  <p className="text-sm text-gray-600">Мероприятий</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{employee.stats.attendance_rate}%</p>
                  <p className="text-sm text-gray-600">Посещаемость</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{employee.stats.average_test_score}%</p>
                  <p className="text-sm text-gray-600">Средний балл</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{employee.stats.pending_tests}</p>
                  <p className="text-sm text-gray-600">Ожидают тестов</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}