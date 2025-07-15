import React from 'react';
import { X, BarChart3, TrendingUp, Award, Calendar } from 'lucide-react';

interface EmployeeStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
}

export function EmployeeStatsModal({ isOpen, onClose, employee }: EmployeeStatsModalProps) {
  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Статистика обучения
              </h2>
              <p className="text-gray-600">{employee.full_name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Основные показатели */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Всего мероприятий</p>
                  <p className="text-2xl font-bold text-blue-900">{employee.stats?.total_events || 0}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Calendar size={20} className="text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-6 border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Посещаемость</p>
                  <p className="text-2xl font-bold text-green-900">{employee.stats?.attendance_rate || 0}%</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp size={20} className="text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Средний балл</p>
                  <p className="text-2xl font-bold text-purple-900">{employee.stats?.average_test_score || 0}%</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Award size={20} className="text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">Ожидают тестов</p>
                  <p className="text-2xl font-bold text-orange-900">{employee.stats?.pending_tests || 0}</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <BarChart3 size={20} className="text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* График прогресса (заглушка) */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Прогресс обучения</h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">График прогресса будет доступен в следующих версиях</p>
              </div>
            </div>
          </div>

          {/* Последние мероприятия (заглушка) */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Последние мероприятия</h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Мероприятие {i}</p>
                    <p className="text-sm text-gray-600">Дата проведения</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">Присутствовал</p>
                    <p className="text-xs text-gray-500">Балл: 85%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
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