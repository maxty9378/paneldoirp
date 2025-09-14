import React from 'react';
import { Calendar, Clock, MapPin, Users, Star, Eye } from 'lucide-react';
import { clsx } from 'clsx';

interface Event {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  date_time?: string;
  status: string;
  type?: string;
  location?: string;
  points?: number;
  max_participants?: number;
  participants_count?: number;
}

interface EventCardProps {
  event: Event;
  onView: () => void;
}

const typeColors = {
  online_training: 'bg-blue-100 text-blue-800',
  offline_training: 'bg-red-100 text-red-800',
  webinar: 'bg-green-100 text-green-800',
  conference: 'bg-purple-100 text-purple-800',
  default: 'bg-gray-100 text-gray-800',
};

const statusColors = {
  active: 'bg-green-100 text-green-800',
  published: 'bg-blue-100 text-blue-800',
  ongoing: 'bg-purple-100 text-purple-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  draft: 'bg-yellow-100 text-yellow-800',
  default: 'bg-gray-100 text-gray-800',
};

export function EventCard({ event, onView }: EventCardProps) {
  // Цветовая схема по типу и статусу
  const typeColors = {
    online_training: 'bg-blue-100 text-blue-800',
    offline_training: 'bg-red-100 text-red-800',
    webinar: 'bg-green-100 text-green-800',
    conference: 'bg-purple-100 text-purple-800',
    default: 'bg-gray-100 text-gray-800',
  };
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    published: 'bg-blue-100 text-blue-800',
    ongoing: 'bg-purple-100 text-purple-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    draft: 'bg-yellow-100 text-yellow-800',
    default: 'bg-gray-100 text-gray-800',
  };
  const typeColor = (event.type && typeColors[event.type as keyof typeof typeColors]) || typeColors.default;
  const statusColor = (event.status && statusColors[event.status as keyof typeof statusColors]) || statusColors.default;

  // Безопасная обработка даты
  const getEventDate = () => {
    try {
      if (event.date_time) return new Date(event.date_time);
      if (event.start_date) return new Date(event.start_date);
      return new Date();
    } catch (e) {
      console.error('Ошибка при парсинге даты:', e);
      return new Date();
    }
  };
  const eventDate = getEventDate();

  const formatDate = (date: Date) => {
    if (isNaN(date.getTime())) {
      return 'Дата не указана';
    }
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const month = months[date.getMonth()];
    return `${day} ${month}`;
  };

  const formatTime = (date: Date) => {
    if (isNaN(date.getTime())) {
      return '--:--';
    }
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Активно';
      case 'published': return 'Опубликовано';
      case 'ongoing': return 'Проходит';
      case 'completed': return 'Завершено';
      case 'cancelled': return 'Отменено';
      case 'draft': return 'Черновик';
      default: return status;
    }
  };

  const getTypeLabel = (type: string | undefined) => {
    switch (type) {
      case 'online_training': return 'Онлайн-тренинг';
      case 'offline_training': return 'Очный тренинг';
      case 'webinar': return 'Вебинар';
      case 'conference': return 'Конференция';
      default: return type || 'Мероприятие';
    }
  };

  return (
    <div
      className="relative overflow-hidden bg-white/90 shadow-2xl rounded-3xl p-7 cursor-pointer group transition-transform duration-200 hover:scale-[1.025] hover:-translate-y-1"
      onClick={onView}
    >
      {/* Цветная полоса слева по типу */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-3xl ${typeColor.split(' ')[0]}`} />
      {/* Бейдж статуса */}
      <div className={`absolute right-4 top-4 z-10 px-3 py-1 rounded-full text-xs font-semibold shadow ${statusColor}`}>{getStatusText(event.status ?? '')}</div>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm text-primary font-medium mb-2 mobile-text">
            {getTypeLabel(event.type)}
          </p>
          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-sns-500 transition-colors mobile-text">{event.title}</h3>
        </div>
        <div className="flex items-center space-x-2">
          {event.points != null && event.points > 0 && (
            <div className="flex items-center space-x-1 bg-sns-100 text-sns-500 px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
              <Star className="h-4 w-4" />
              <span>{event.points}</span>
            </div>
          )}
        </div>
      </div>
      {event.description && (
        <p className="text-gray-500 text-base mb-4 line-clamp-2 mobile-text">{event.description}</p>
      )}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-500 mobile-text">
          <Calendar className="h-5 w-5 mr-2 flex-shrink-0 text-sns-500/80" />
          <span>{formatDate(eventDate)}</span>
        </div>
        <div className="flex items-center text-sm text-gray-500 mobile-text">
          <Clock className="h-5 w-5 mr-2 flex-shrink-0 text-sns-500/80" />
          <span>{formatTime(eventDate)}</span>
        </div>
        {event.location && (
          <div className="flex items-center text-sm text-gray-500 mobile-text">
            <MapPin className="h-5 w-5 mr-2 flex-shrink-0 text-sns-500/80" />
            <span className="truncate">{event.location}</span>
          </div>
        )}
        {(event.participants_count !== undefined || event.max_participants) && (
          <div className="flex items-center text-sm text-gray-500 mobile-text">
            <Users className="h-5 w-5 mr-2 flex-shrink-0 text-sns-500/80" />
            <span>
              {event.participants_count !== undefined ? event.participants_count : 0} участников
              {event.max_participants && ` из ${event.max_participants}`}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between pt-5 border-t border-gray-100 mt-4">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-sns-400 to-sns-600 text-white shadow">
          {getStatusText(event.status ?? '')}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          className="flex items-center px-4 py-2 rounded-xl bg-sns-500 text-white font-semibold text-sm hover:bg-sns-600 transition-all duration-300"
        >
          <Eye className="h-4 w-4 mr-2" />
          Подробнее
        </button>
      </div>
    </div>
  );
}