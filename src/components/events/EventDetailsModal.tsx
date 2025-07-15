import React from 'react';
import { X, Calendar, Clock, MapPin, Users, Star, LinkIcon, Edit } from 'lucide-react';

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any;
  onEdit?: () => void;
}

export function EventDetailsModal({ isOpen, onClose, event, onEdit }: EventDetailsModalProps) {
  if (!isOpen || !event) return null;

  // Безопасная обработка даты
  const getEventDate = () => {
    try {
      if (event.start_date) return new Date(event.start_date);
      return new Date();
    } catch (e) {
      console.error('Ошибка при парсинге даты:', e);
      return new Date();
    }
  };
  
  const getEndDate = () => {
    try {
      if (event.end_date) return new Date(event.end_date);
      return null;
    } catch (e) {
      console.error('Ошибка при парсинге даты окончания:', e);
      return null;
    }
  };
  
  const eventDate = getEventDate();
  const endDate = getEndDate();
  
  const formatDate = (date: Date) => {
    if (isNaN(date.getTime())) {
      return 'Дата не указана';
    }
    
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    if (isNaN(date.getTime())) {
      return '--:--';
    }
    
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Активно';
      case 'completed': return 'Завершено';
      case 'cancelled': return 'Отменено';
      case 'draft': return 'Черновик';
      default: return status;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Детали мероприятия
            </h2>
            <div className="flex items-center space-x-2">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center space-x-1"
                  className="px-3 py-1 bg-sns-600 text-white rounded-lg hover:bg-sns-700 transition-colors text-sm flex items-center space-x-1"
                >
                  <Edit size={14} />
                  <span>Редактировать</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Заголовок и статус */}
          <div>
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex-1">
                {event.title}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                {getStatusText(event.status)}
              </span>
            </div>
            {event.description && (
              <p className="text-gray-600">{event.description}</p>
            )}
          </div>

          {/* Информация о мероприятии */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Дата начала</p>
                <p className="text-sm text-gray-600">
                  {formatDate(eventDate)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Время начала</p>
                <p className="text-sm text-gray-600">
                  {formatTime(eventDate)}
                </p>
              </div>
            </div>

            {endDate && (
              <>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Дата окончания</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(endDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Время окончания</p>
                    <p className="text-sm text-gray-600">
                      {formatTime(endDate)}
                    </p>
                  </div>
                </div>
              </>
            )}

            {event.location && (
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Место проведения</p>
                  <p className="text-sm text-gray-600">{event.location}</p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Участники</p>
                <p className="text-sm text-gray-600">
                  {event.participants_count || 0} участников
                  {event.max_participants && ` из ${event.max_participants}`}
                </p>
              </div>
            </div>

            {event.points > 0 && (
              <div className="flex items-center space-x-3">
                <Star className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Баллы</p>
                  <p className="text-sm text-gray-600">{event.points} баллов</p>
                </div>
              </div>
            )}
          </div>

          {/* Ссылка на встречу */}
          {event.meeting_link && (
            <div className="border-t pt-4">
              <div className="flex items-center space-x-3">
                <LinkIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Ссылка на встречу</p>
                  <a
                    href={event.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm break-all"
                    className="text-sns-600 hover:underline text-sm break-all"
                  >
                    {event.meeting_link}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Дополнительная информация */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
              <div>
                <span className="font-medium">Создано:</span>{' '}
                {new Date(event.created_at).toLocaleDateString('ru-RU')}
              </div>
              <div>
                <span className="font-medium">Обновлено:</span>{' '}
                {new Date(event.updated_at).toLocaleDateString('ru-RU')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}