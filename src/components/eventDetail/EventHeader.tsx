import React from 'react';
import { Calendar, Clock, Users, Award, MapPin } from 'lucide-react';

const DEFAULT_BANNER = 'https://static.tildacdn.com/tild6637-3134-4435-b966-396135393739/Frame_3.png';

interface EventType {
  name_ru?: string;
  name?: string;
  color?: string;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  image?: string;
  banner_url?: string;
  points?: number;
  event_type?: EventType;
  start_date?: string;
  end_date?: string;
  duration?: number;
  location?: string;
  max_participants?: number;
  current_participants?: number;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  is_featured?: boolean;
}

interface EventHeaderProps {
  event: Event;
  className?: string;
}

export function EventHeader({ event, className = '' }: EventHeaderProps) {
  const image = event.image || event.banner_url || DEFAULT_BANNER;
  const typeLabel = event.event_type?.name_ru || event.event_type?.name || '';
  const points = event.points || 0;
  const description = event.description || '';

  // Форматирование даты
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Получение цвета для уровня сложности
  const getDifficultyColor = (level?: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Получение текста для уровня сложности
  const getDifficultyText = (level?: string) => {
    switch (level) {
      case 'beginner': return 'Начальный';
      case 'intermediate': return 'Средний';
      case 'advanced': return 'Продвинутый';
      default: return 'Базовый';
    }
  };

  return (
    <div className={`w-full rounded-2xl shadow-lg overflow-hidden relative mb-6 font-mabry ${className}`}>
      {/* Hero секция с фоновым изображением */}
      <div
        className="relative min-h-[320px] md:min-h-[380px] flex items-end"
        style={{ background: `url('${image}') center/cover no-repeat` }}
      >
        {/* Градиентное затемнение для лучшей читаемости */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Featured badge */}
        {event.is_featured && (
          <div className="absolute top-4 left-4 z-20">
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold text-sm shadow-lg">
              <Award className="h-4 w-4" />
              <span>Рекомендуем</span>
            </div>
          </div>
        )}

        {/* Основной контент */}
        <div className="relative z-10 w-full p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            {/* Текстовая информация */}
            <div className="flex-1 max-w-3xl">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
                {event.title}
              </h1>
              {description && (
                <p className="text-white/90 text-base md:text-lg leading-relaxed max-w-2xl drop-shadow mb-4">
                  {description}
                </p>
              )}
            </div>

            {/* Бейджи и метрики */}
            <div className="flex flex-col items-start lg:items-end gap-3 lg:min-w-[200px]">
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {/* Баллы */}
                <div className="flex items-center gap-1 px-4 py-2 rounded-full bg-white/95 text-green-600 font-bold text-sm shadow-lg backdrop-blur-sm">
                  <Award className="h-4 w-4" />
                  <span>{points} баллов</span>
                </div>

                {/* Тип мероприятия */}
                {typeLabel && (
                  <div className="px-4 py-2 rounded-full bg-blue-500/90 text-white font-medium text-sm shadow-lg backdrop-blur-sm">
                    {typeLabel}
                  </div>
                )}

                {/* Уровень сложности */}
                {event.difficulty_level && (
                  <div className={`px-4 py-2 rounded-full ${getDifficultyColor(event.difficulty_level)} text-white font-medium text-sm shadow-lg`}>
                    {getDifficultyText(event.difficulty_level)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Информационная панель */}
      <div className="bg-white border-t border-gray-100">
        <div className="px-6 md:px-8 py-4">
          <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-gray-600">
            {/* Дата */}
            {event.start_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="font-medium">
                  {formatDate(event.start_date)}
                  {event.end_date && event.end_date !== event.start_date && 
                    ` - ${formatDate(event.end_date)}`
                  }
                </span>
              </div>
            )}

            {/* Продолжительность */}
            {event.duration && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" />
                <span className="font-medium">
                  {event.duration} {event.duration === 1 ? 'час' : 'часа'}
                </span>
              </div>
            )}

            {/* Участники */}
            {event.max_participants && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                <span className="font-medium">
                  {event.current_participants || 0} / {event.max_participants} участников
                </span>
              </div>
            )}

            {/* Локация */}
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-500" />
                <span className="font-medium">{event.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Прогресс бар для заполненности */}
        {event.max_participants && event.current_participants && (
          <div className="px-6 md:px-8 pb-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min((event.current_participants / event.max_participants) * 100, 100)}%` 
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Заполнено {Math.round((event.current_participants / event.max_participants) * 100)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}