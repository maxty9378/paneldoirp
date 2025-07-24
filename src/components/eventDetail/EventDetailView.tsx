import { Users, FileText, Star, AlertCircle } from 'lucide-react';
import { FeedbackTab } from '../feedback/FeedbackTab';
import { useAuth } from '../../hooks/useAuth';
import { useEffect } from 'react';

// Типы данных
interface Participant {
  id: string;
  name: string;
  attended: boolean;
}

interface TestAttempt {
  id: string;
  score: number;
  test: {
    type: 'entry' | 'final';
  };
}

interface EventStatistics {
  participants: Participant[];
  userTestAttempts: TestAttempt[];
}

interface EventDetailViewProps {
  eventId: string;
  onStartTest: (eventId: string) => void;
  onBack: () => void;
}

// Константы для ролей
const ADMIN_ROLES = ['administrator', 'moderator', 'trainer', 'expert'] as const;

export default function EventDetailView({ eventId, onStartTest, onBack }: EventDetailViewProps) {
  const { user, userProfile } = useAuth();
  // Удалить все типы, переменные, useEffect, функции, связанные с EventStatistics, useEventStatistics, statistics, loading, error, calculateAverageScore, StatisticCard, chartData, аналитика, а также все блоки разметки, где есть аналитика или статистика. Оставить только отображение участников и остальной информации о мероприятии.

  // Отладочный вывод для проверки структуры данных
  useEffect(() => {
    console.log('EventDetailView statistics:', statistics);
    console.log('EventDetailView loading:', loading);
    console.log('EventDetailView error:', error);
    console.log('EventDetailView userProfile:', userProfile);
  }, [statistics, loading, error, userProfile]);

  // Проверка прав доступа
  const canViewFullDetails = (): boolean => {
    if (!userProfile?.role) return false;
    return ADMIN_ROLES.includes(userProfile.role as typeof ADMIN_ROLES[number]);
  };

  // Компонент для отображения участников
  const ParticipantsList = ({ participants }: { participants: Participant[] }) => {
    // Определяем, является ли пользователь участником (employee)
    const isEmployee = userProfile?.role === 'employee';
    
    // Если пользователь является участником, не показываем компонент
    if (isEmployee) {
      return null;
    }
    
    const attendedCount = participants.filter(p => p.attended).length;
    
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Участники ({participants.length})
          </h3>
          <span className="text-sm font-medium text-green-600">
            {attendedCount} присутствовало
          </span>
        </div>
        
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {participants.map((participant) => (
            <div 
              key={participant.id} 
              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
            >
              <span className="font-medium text-gray-900">{participant.name}</span>
              <span className={`text-sm px-2 py-1 rounded-full ${
                participant.attended 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {participant.attended ? 'Присутствовал' : 'Не присутствовал'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Состояния загрузки и ошибки
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Загрузка статистики...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-800">Ошибка загрузки статистики: {error.message}</span>
        </div>
      </div>
    );
  }

  // Проверка доступа к полной информации
  if (!canViewFullDetails()) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
          <span className="text-yellow-800">У вас нет прав для просмотра детальной статистики</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Список участников */}
      {statistics?.participants?.length > 0 && (
        <ParticipantsList participants={statistics.participants} />
      )}

      {/* Остальной функционал мероприятия */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Информация о мероприятии
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
            <Users className="h-6 w-6 text-blue-500 mb-2" />
            <span className="text-xs text-gray-500 mt-1 text-center">
              Участников
            </span>
          </div>
          
          <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
            <FileText className="h-6 w-6 text-green-500 mb-2" />
            <span className="text-xs text-gray-500 mt-1 text-center">
              Входной тест
            </span>
          </div>
          
          <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
            <FileText className="h-6 w-6 text-purple-500 mb-2" />
            <span className="text-xs text-gray-500 mt-1 text-center">
              Итоговый тест
            </span>
          </div>
          
          <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
            <Star className="h-6 w-6 text-yellow-500 mb-2" />
            <FeedbackTab eventId={eventId} adminStatOnly />
            <span className="text-xs text-gray-500 mt-1 text-center">
              Средняя оценка тренера
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}