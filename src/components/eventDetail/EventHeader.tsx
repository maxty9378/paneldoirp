import React from 'react';
import { Calendar, Clock, Award, MapPin, ArrowLeft } from 'lucide-react';

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
  onBack?: () => void;
}

export function EventHeader({ event, className = '', onBack }: EventHeaderProps) {
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
      month: 'long',
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
        className="relative min-h-[240px] md:min-h-[280px] flex items-end"
        style={{ background: `url('${image}') center/cover no-repeat` }}
      >
        {/* Градиентное затемнение для лучшей читаемости */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Кнопка "Назад к мероприятиям" - слева вверху */}
        {onBack && (
          <div className="absolute top-4 sm:top-4 left-4 z-20">
            <button
              onClick={onBack}
              className="group flex items-center gap-2 text-white font-normal rounded-xl px-3 py-2 bg-black/30 hover:bg-black/50 backdrop-blur-sm border border-white/20 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 transition-all duration-200 text-sm shadow-lg hover:shadow-xl active:scale-95"
              aria-label="Назад к мероприятиям"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200 flex-shrink-0" strokeWidth={2.5} />
              <span className="hidden sm:inline">Назад к мероприятиям</span>
              <span className="inline sm:hidden">Назад</span>
            </button>
          </div>
        )}
        
        {/* Featured badge */}
        {event.is_featured && (
          <div className="absolute top-4 right-4 z-20">
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold text-sm shadow-lg">
              <Award className="h-4 w-4" />
              <span>Рекомендуем</span>
            </div>
          </div>
        )}

        {/* Основной контент */}
        <div className="relative z-10 w-full p-6 md:p-8 pt-16 sm:pt-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            {/* Текстовая информация */}
            <div className="flex-1 max-w-3xl">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight drop-shadow-lg">
                {event.title}
              </h1>
              {description && (
                <p className="text-white/90 text-sm md:text-base leading-relaxed max-w-2xl drop-shadow mb-3">
                  {description}
                </p>
              )}
              
              {/* Дата и место проведения */}
              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-white/90 drop-shadow">
                {/* Дата */}
                {event.start_date && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="h-4 w-4 text-white/80 flex-shrink-0" />
                    <span className="font-medium truncate">
                      {formatDate(event.start_date)}
                      {event.end_date && event.end_date !== event.start_date && 
                        ` - ${formatDate(event.end_date)}`
                      }
                    </span>
                  </div>
                )}

                {/* Локация */}
                {event.location && (
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-4 w-4 text-white/80 flex-shrink-0" />
                    <span className="font-medium truncate">{event.location}</span>
                  </div>
                )}

                {/* Продолжительность */}
                {event.duration && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="h-4 w-4 text-white/80 flex-shrink-0" />
                    <span className="font-medium">
                      {event.duration} {event.duration === 1 ? 'час' : 'часа'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Бейджи и метрики */}
            <div className="flex flex-col items-start lg:items-end gap-3 lg:min-w-[200px]">
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {/* Тип мероприятия */}
                {typeLabel && (
                  <div className="px-4 py-2.5 rounded-xl bg-blue-500/90 text-white font-medium text-sm shadow-lg backdrop-blur-sm border border-blue-400/30">
                    {typeLabel}
                  </div>
                )}

                {/* Уровень сложности */}
                {event.difficulty_level && (
                  <div className={`px-4 py-2.5 rounded-xl ${getDifficultyColor(event.difficulty_level)} text-white font-medium text-sm shadow-lg border border-white/20`}>
                    {getDifficultyText(event.difficulty_level)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}