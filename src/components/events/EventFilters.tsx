import React from 'react';
import { Search, Filter, Calendar, Star, RotateCcw } from 'lucide-react';

interface EventFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  pointsFilter: { min: string; max: string };
  onPointsFilterChange: (points: { min: string; max: string }) => void;
  dateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  onClearFilters: () => void;
}

export function EventFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  sortOrder,
  onSortOrderChange,
  pointsFilter,
  onPointsFilterChange,
  dateRange,
  onDateRangeChange,
  showAdvanced,
  onToggleAdvanced,
  onClearFilters,
}: EventFiltersProps) {
  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 space-y-4">
      {/* Основные фильтры */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Поиск */}
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по названию или описанию..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sns-500 focus:border-transparent transition-all duration-200"
          />
        </div>
        
        {/* Быстрые фильтры */}
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sns-500 focus:border-transparent min-w-[140px] transition-all duration-200"
          >
            <option value="all">Все статусы</option>
            <option value="draft">Черновики</option>
            <option value="published">Опубликованные</option>
            <option value="ongoing">В процессе</option>
            <option value="completed">Завершенные</option>
            <option value="cancelled">Отмененные</option>
          </select>
          
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split('-');
              onSortChange(sort);
              onSortOrderChange(order as 'asc' | 'desc');
            }}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sns-500 focus:border-transparent min-w-[160px] transition-all duration-200"
          >
            <option value="date-desc">Сначала новые</option>
            <option value="date-asc">Сначала старые</option>
            <option value="title-asc">По названию А-Я</option>
            <option value="title-desc">По названию Я-А</option>
            <option value="points-desc">По баллам ↓</option>
            <option value="points-asc">По баллам ↑</option>
            <option value="participants-desc">По участникам ↓</option>
            <option value="participants-asc">По участникам ↑</option>
          </select>
          
          <button
            onClick={onToggleAdvanced}
            className={`px-4 py-3 border rounded-xl transition-all duration-200 flex items-center space-x-2 ${
              showAdvanced 
                ? 'border-sns-500 bg-sns-50 text-sns-700' 
                : 'border-gray-300 hover:bg-gray-50 text-gray-700'
            }`}
          >
            <Filter size={20} />
            <span className="hidden sm:inline">Фильтры</span>
          </button>
        </div>
      </div>
      
      {/* Расширенные фильтры */}
      {showAdvanced && (
        <div className="pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Диапазон дат */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Дата начала
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Дата окончания
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            
            {/* Диапазон баллов */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Мин. баллы
              </label>
              <div className="relative">
                <Star size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  value={pointsFilter.min}
                  onChange={(e) => onPointsFilterChange({ ...pointsFilter, min: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent text-sm"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Макс. баллы
              </label>
              <div className="relative">
                <Star size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  value={pointsFilter.max}
                  onChange={(e) => onPointsFilterChange({ ...pointsFilter, max: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent text-sm"
                  placeholder="∞"
                  min="0"
                />
              </div>
            </div>
          </div>
          
          {/* Кнопка сброса */}
          <div className="flex justify-end mt-4">
            <button
              onClick={onClearFilters}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <RotateCcw size={16} />
              <span>Сбросить фильтры</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}