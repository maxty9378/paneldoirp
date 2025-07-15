import React from 'react';
import { Star, Users, BookOpen, Award, Lightbulb, Zap } from 'lucide-react';

export function ExpertEventsView() {
  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Экспертные мероприятия</h1>
        <p className="text-gray-600 mt-2">
          Специальные мероприятия с участием экспертов и ведущих специалистов отрасли
        </p>
      </div>

      {/* Основная заглушка */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-100">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-200 to-amber-200 rounded-full blur-2xl opacity-30"></div>
        
        <div className="relative p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Star size={40} className="text-white" />
          </div>
          
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Экспертные мероприятия
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Эксклюзивные образовательные события с участием топ-экспертов: 
              мастер-классы, воркшопы и семинары от лучших специалистов индустрии.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Lightbulb size={24} className="text-amber-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Мастер-классы</h3>
                <p className="text-sm text-gray-600">
                  Практические занятия от ведущих экспертов отрасли
                </p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <BookOpen size={24} className="text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Воркшопы</h3>
                <p className="text-sm text-gray-600">
                  Интерактивные обучающие сессии с практическими заданиями
                </p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Zap size={24} className="text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Интенсивы</h3>
                <p className="text-sm text-gray-600">
                  Краткосрочные интенсивные курсы по актуальным темам
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
            <Users size={20} className="mr-2 text-amber-600" />
            Эксперты и спикеры
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              База экспертов с рейтингами и отзывами
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Система поиска и бронирования экспертов
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Интеграция с внешними экспертными платформами
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Award size={20} className="mr-2 text-orange-600" />
            Премиум функции
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Эксклюзивные мероприятия для VIP-участников
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Записи мероприятий в HD качестве
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              Персональные консультации с экспертами
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}