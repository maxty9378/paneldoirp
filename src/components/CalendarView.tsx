import React from 'react';
import { Calendar, Clock, ArrowRight, Sparkles, Zap } from 'lucide-react';

export function CalendarView() {
  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Календарь мероприятий</h1>
        <p className="text-gray-600 mt-2">
          Удобный календарь для планирования и отслеживания всех обучающих мероприятий
        </p>
      </div>

      {/* Основная заглушка */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl border border-purple-100">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200 to-blue-200 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-200 to-purple-200 rounded-full blur-2xl opacity-30"></div>
        
        <div className="relative p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Calendar size={40} className="text-white" />
          </div>
          
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Календарь в разработке
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Мы работаем над созданием интерактивного календаря, который поможет вам 
              планировать мероприятия, отслеживать дедлайны и управлять расписанием команды.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Clock size={24} className="text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Планирование</h3>
                <p className="text-sm text-gray-600">
                  Удобное планирование мероприятий с автоматическими напоминаниями
                </p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={24} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Интеграция</h3>
                <p className="text-sm text-gray-600">
                  Синхронизация с другими календарями и системами планирования
                </p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Zap size={24} className="text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Уведомления</h3>
                <p className="text-sm text-gray-600">
                  Умные уведомления о предстоящих событиях и важных датах
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Временная линия разработки */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ArrowRight size={20} className="mr-2 text-purple-600" />
          Планы разработки
        </h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-gray-700">Интерактивный календарь с месячным и недельным видом</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-700">Создание и редактирование мероприятий прямо в календаре</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-700">Фильтрация по типам мероприятий и участникам</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-700">Экспорт в популярные календарные приложения</span>
          </div>
        </div>
      </div>
    </div>
  );
}