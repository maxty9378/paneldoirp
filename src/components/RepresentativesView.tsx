import React from 'react';
import { Users, Building2, MapPin, TrendingUp, Award, Target } from 'lucide-react';

export function RepresentativesView() {
  return (
    <div className="space-y-6 pb-safe-bottom">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Торговые представители</h1>
        <p className="text-gray-600 mt-2">
          Управление обучением и развитием торговых представителей
        </p>
      </div>

      {/* Основная заглушка */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-teal-50 rounded-3xl border border-green-100">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-200 to-teal-200 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-teal-200 to-green-200 rounded-full blur-2xl opacity-30"></div>
        
        <div className="relative p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Building2 size={40} className="text-white" />
          </div>
          
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Модуль торговых представителей
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Специализированная система для работы с торговыми представителями: 
              отслеживание результатов, планирование обучения и развитие навыков продаж.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp size={24} className="text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Аналитика продаж</h3>
                <p className="text-sm text-gray-600">
                  Отслеживание KPI и результативности каждого представителя
                </p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Target size={24} className="text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Планы развития</h3>
                <p className="text-sm text-gray-600">
                  Индивидуальные планы обучения и развития навыков
                </p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <MapPin size={24} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Территории</h3>
                <p className="text-sm text-gray-600">
                  Управление территориальным распределением и маршрутами
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
            <Users size={20} className="mr-2 text-green-600" />
            Управление командой
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Профили торговых представителей с полной информацией
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Система оценки навыков и компетенций
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Планирование карьерного роста
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Award size={20} className="mr-2 text-teal-600" />
            Система мотивации
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Рейтинги и достижения представителей
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Система бонусов за обучение
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Конкурсы и соревнования
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}