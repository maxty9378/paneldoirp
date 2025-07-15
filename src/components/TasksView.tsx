import React from 'react';
import { AlertTriangle, Clock, Target, Zap, Bell, CheckCircle } from 'lucide-react';

export function TasksView() {
  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Горящие задачи</h1>
        <p className="text-gray-600 mt-2">
          Центр уведомлений и критически важных задач, требующих немедленного внимания
        </p>
      </div>

      {/* Основная заглушка */}
      <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl border border-red-100">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-200 to-orange-200 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-200 to-red-200 rounded-full blur-2xl opacity-30"></div>
        
        <div className="relative p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
            <AlertTriangle size={40} className="text-white" />
          </div>
          
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Центр уведомлений
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Система мониторинга критических задач и уведомлений. 
              Здесь собираются все важные события, требующие вашего внимания.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Clock size={24} className="text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Срочные дедлайны</h3>
                <p className="text-sm text-gray-600">
                  Уведомления о приближающихся сроках и критических датах
                </p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Bell size={24} className="text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Автоуведомления</h3>
                <p className="text-sm text-gray-600">
                  Умные уведомления на основе правил и приоритетов
                </p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Zap size={24} className="text-yellow-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Быстрые действия</h3>
                <p className="text-sm text-gray-600">
                  Возможность быстро реагировать и принимать решения
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Функциональность в разработке */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Target size={20} className="mr-2 text-red-600" />
            Типы уведомлений
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Просроченные отчеты и документы
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Незавершенные тесты и аттестации
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Критические проблемы с участниками
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircle size={20} className="mr-2 text-orange-600" />
            Управление задачами
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Приоритизация задач по важности
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Делегирование и назначение ответственных
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Отслеживание статуса выполнения
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}