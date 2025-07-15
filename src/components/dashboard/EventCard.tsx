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

export function EventCard({ event, onView }: EventCardProps) {
  // Безопасная обработка даты
  const getEventDate = () => {
    try {
      // Приоритетное использование даты
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'published': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  const getTypeLabel = (type: string) => {
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
      className="card mobile-card hover:scale-[1.02] cursor-pointer group"
      onClick={onView}
    >
      <div className="p-6 mobile-card">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm text-primary font-medium mb-2 mobile-text">
              {getTypeLabel(event.type)}
            </p>
            <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-primary transition-colors mobile-text">{event.title}</h3>
          </div>
          <div className="flex items-center space-x-2">
            {event.points && event.points > 0 && (
              <div className="flex items-center space-x-1 bg-primary-light text-primary px-2 py-1 rounded-full text-xs font-medium">
                <Star className="h-3 w-3" />
                <span>{event.points}</span>
              </div>
            )}
          </div>
        </div>

        {event.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2 mobile-text">{event.description}</p>
        )}

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500 mobile-text">
            <Calendar className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
            <span>{formatDate(eventDate)}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500 mobile-text">
            <Clock className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
            <span>{formatTime(eventDate)}</span>
          </div>

          {event.location && (
            <div className="flex items-center text-sm text-gray-500 mobile-text">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
          
          {(event.participants_count !== undefined || event.max_participants) && (
            <div className="flex items-center text-sm text-gray-500 mobile-text">
              <Users className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
              <span>
                {event.participants_count !== undefined ? event.participants_count : 0} участников
                {event.max_participants && ` из ${event.max_participants}`}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-light text-primary`}>
            {getStatusText(event.status)}
          </span>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="btn-outline flex items-center mobile-text"
          >
            <Eye className="h-4 w-4 mr-1" />
            Подробнее
          </button>
        </div>
      </div>
    </div>
  );
}