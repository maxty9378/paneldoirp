import React, { useState, useEffect } from 'react';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthBFF } from '../hooks/useAuthBFF';
import { EventHeader } from './eventDetail/EventHeader';
import { EventDetailsCard } from './eventDetail/EventDetailsCard';
// @ts-ignore
import EventParticipantsList from './eventDetail/EventParticipantsList.jsx';
// @ts-ignore
import EventTestsContainer from './eventDetail/EventTestsContainer.jsx';
import { TPEvaluationSection } from './eventDetail/TPEvaluationSection';
import { FeedbackTab } from './feedback/FeedbackTab';
import { TrainerActionNotifications } from './notifications/TrainerActionNotifications';
import { useNavigate } from 'react-router-dom';



interface EventDetailViewProps {
  eventId: string;
  onStartTest?: (testId: string, eventId: string, attemptId: string) => void;
  onBack?: () => void;
}

export default function EventDetailView({ eventId, onStartTest, onBack }: EventDetailViewProps) {
  const { userProfile } = useAuthBFF();
  const navigate = useNavigate();
  const [organizerPosition, setOrganizerPosition] = useState<string>('Организатор');
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    async function fetchEvent() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            creator:creator_id(
              id,
              full_name,
              email,
              phone,
              avatar_url,
              position:position_id(name),
              territory:territory_id(name)
            )
          `)
          .eq('id', eventId)
          .single();
        if (error) throw error;
        setEvent(data);
      } catch (err: any) {
        setError('Мероприятие не найдено или произошла ошибка загрузки');
        setEvent(null);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [eventId]);

  useEffect(() => {
    if (event?.creator?.position?.name) {
      setOrganizerPosition(event.creator.position.name);
    } else {
      setOrganizerPosition('Организатор');
    }
  }, [event]);

  const organizerName = event?.creator?.full_name || '';

  // Функция для принудительного обновления данных
  const handleRefreshData = () => {
    try {
      console.log('🔄 Обновление данных мероприятия');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('❌ Ошибка при обновлении данных:', error);
    }
  };

  // Загрузка участников мероприятия
  useEffect(() => {
    async function fetchParticipants() {
      if (!eventId) return;
      
      try {
        const { data, error } = await supabase
          .from('event_participants')
          .select(`
            *,
            user:user_id(
              id,
              full_name,
              email,
              position:position_id(name),
              territory:territory_id(name)
            )
          `)
          .eq('event_id', eventId);

        if (error) throw error;
        setParticipants(data || []);
      } catch (err) {
        console.error('Ошибка загрузки участников:', err);
      }
    }

    fetchParticipants();
  }, [eventId, refreshKey]);

  // Обработчики действий для уведомлений
  const handleMarkAttendance = () => {
    // Прокручиваем к секции участников
    const participantsSection = document.querySelector('[data-section="participants"]');
    if (participantsSection) {
      participantsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCompleteEvent = async () => {
    if (!event || !userProfile) {
      console.error('❌ Нет данных о мероприятии или пользователе');
      return;
    }
    
    // Подтверждение действия
    const confirmMessage = event.status === 'completed' 
      ? 'Вы уверены, что хотите отменить завершение мероприятия?'
      : 'Вы уверены, что хотите завершить мероприятие?';
    
    if (!confirm(confirmMessage)) return;
    
    try {
      const newStatus = event.status === 'completed' ? 'published' : 'completed';
      
      console.log(`🔄 Обновление статуса мероприятия с "${event.status}" на "${newStatus}"`);
      
      // Обновляем статус мероприятия
      const { error } = await supabase
        .from('events')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);

      if (error) {
        console.error('❌ Ошибка Supabase:', error);
        throw error;
      }

      console.log('✅ Статус обновлен в базе данных');

      // Обновляем локальное состояние - ИСПРАВЛЕНО: не устанавливаем null
      setEvent(prev => {
        if (!prev) {
          console.error('❌ Предыдущее состояние мероприятия отсутствует');
          return prev;
        }
        return { ...prev, status: newStatus };
      });
      
      console.log('✅ Локальное состояние обновлено');
      
      // Обновляем данные (временно отключено для отладки)
      // handleRefreshData();
      
      const successMessage = newStatus === 'completed' 
        ? '✅ Мероприятие успешно завершено'
        : '✅ Завершение мероприятия отменено';
      
      console.log(successMessage);
      
      // Показываем уведомление пользователю
      alert(successMessage);
      
    } catch (error) {
      console.error('❌ Ошибка изменения статуса мероприятия:', error);
      alert('❌ Произошла ошибка при изменении статуса мероприятия. Попробуйте еще раз.');
    }
  };

  const handleViewParticipants = () => {
    // Прокручиваем к секции участников
    const participantsSection = document.querySelector('[data-section="participants"]');
    if (participantsSection) {
      participantsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleStartEvent = () => {
    // Здесь можно добавить логику начала мероприятия
    console.log('Начало мероприятия');
  };

  const handleViewTests = () => {
    // Прокручиваем к секции тестов
    const testsSection = document.querySelector('[data-section="tests"]');
    if (testsSection) {
      testsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleViewFeedback = () => {
    // Прокручиваем к секции обратной связи
    const feedbackSection = document.querySelector('[data-section="feedback"]');
    if (feedbackSection) {
      feedbackSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleViewStats = () => {
    // Здесь можно добавить логику просмотра статистики
    console.log('Просмотр статистики мероприятия');
  };

  // Функция для обновления данных организатора
  const handleUpdateOrganizerData = (newAvatarUrl: string) => {
    if (event) {
      setEvent(prevEvent => ({
        ...prevEvent,
        creator: {
          ...prevEvent.creator,
          avatar_url: newAvatarUrl
        }
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="space-y-8">
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-sns-green border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Загрузка мероприятия...</p>
        </div>
      )}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Ошибка загрузки</h3>
          <p className="text-gray-600 text-center max-w-md">{error}</p>
        </div>
      )}
      {!loading && !error && !event && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Мероприятие не найдено</h3>
          <p className="text-gray-600 text-center max-w-md">Запрашиваемое мероприятие не существует или было удалено</p>
        </div>
      )}
      {event && !loading && !error && event.id && (
        <>
          <EventHeader event={event} onBack={onBack} />
          
          {/* Основной контент */}
          <div className="space-y-4 mt-8 sm:mt-4">
            <EventDetailsCard 
              event={event} 
              isCreator={event.creator_id === userProfile?.id}
              onUpdateOrganizerData={handleUpdateOrganizerData}
              onCompleteEvent={handleCompleteEvent}
            />
            <div data-section="participants">
              <EventParticipantsList eventId={eventId} refreshKey={refreshKey} hasOpenEndedQuestions={true} />
            </div>
            <div data-section="tests">
              <EventTestsContainer 
                eventId={eventId} 
                userProfile={userProfile} 
                isAdmin={false} 
                onStartTest={onStartTest}
                refreshKey={refreshKey}
                onRefreshData={handleRefreshData}
              />
            </div>
            <div data-section="tp-evaluation">
              <TPEvaluationSection 
                eventId={eventId} 
                userProfile={userProfile} 
              />
            </div>
            <div data-section="feedback">
              <FeedbackTab eventId={eventId} />
            </div>
          </div>

          {/* Уведомления для тренеров */}
          <TrainerActionNotifications
            event={event}
            userProfile={userProfile}
            participants={participants}
            onMarkAttendance={handleMarkAttendance}
            onViewParticipants={handleViewParticipants}
            onStartEvent={handleStartEvent}
            onCompleteEvent={handleCompleteEvent}
            onViewTests={handleViewTests}
            onViewFeedback={handleViewFeedback}
            onViewStats={handleViewStats}
          />
        </>
        )}
      </div>
    </div>
  );
}