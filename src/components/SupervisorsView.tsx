import React from 'react';
import { Shield, Users, TrendingUp, Award, Target, BookOpen } from 'lucide-react';

export function SupervisorsView() {
  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Супервайзеры</h1>
        <p className="text-gray-600 mt-2">
          Управление обучением и развитием супервайзеров и руководителей среднего звена
        </p>
      </div>

      {/* Основная заглушка */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border border-blue-100">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-200 to-blue-200 rounded-full blur-2xl opacity-30"></div>
        
        <div className="relative p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Shield size={40} className="text-white" />
          </div>
          
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Модуль для супервайзеров
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Специализированные инструменты для развития лидерских навыков, 
              управления командой и повышения эффективности супервайзеров.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Users size={24} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Управление командой</h3>
                <p className="text-sm text-gray-600">
                  Инструменты для эффективного руководства и мотивации сотрудников
                </p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <BookOpen size={24} className="text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Развитие навыков</h3>
                <p className="text-sm text-gray-600">
                  Программы развития лидерских и управленческих компетенций
                </p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Target size={24} className="text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Достижение целей</h3>
                <p className="text-sm text-gray-600">
                  Постановка задач, контроль выполнения и анализ результатов
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
            <TrendingUp size={20} className="mr-2 text-blue-600" />
            Панель управления
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Дашборд с ключевыми метриками команды
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Отчеты по эффективности сотрудников
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Планирование ресурсов и нагрузки
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Award size={20} className="mr-2 text-indigo-600" />
            Программы развития
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Курсы лидерства и управления
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Менторские программы
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Аттестация управленческих навыков
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}