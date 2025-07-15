import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { EventHeader } from './eventDetail/EventHeader';
import { EventInfo } from './eventDetail/EventInfo';
import { EventPlace } from './eventDetail/EventPlace';
// @ts-ignore
import EventParticipantsList from './eventDetail/EventParticipantsList.jsx';
// @ts-ignore
import EventTestsContainer from './eventDetail/EventTestsContainer.jsx';
import { FeedbackTab } from './feedback/FeedbackTab';

// Добавляем импорт компонента статистики
import { EventAnalyticsPanel } from './eventDetail/EventAnalyticsPanel';
import EventAnalytics from './EventAnalytics';

interface EventDetailViewProps {
  eventId: string;
  onStartTest?: (testType: 'entry' | 'final' | 'annual', testId: string, eventId: string, attemptId: string) => void;
  onBack?: () => void;
}

export default function EventDetailView({ eventId, onStartTest, onBack }: EventDetailViewProps) {
  const { userProfile } = useAuth();
  const [organizerPosition, setOrganizerPosition] = useState<string>('Организатор');
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*, creator:creator_id(*)')
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
    let ignore = false;
    async function fetchPosition() {
      if (event?.creator?.position) {
        setOrganizerPosition(event.creator.position);
      } else if (event?.creator?.position_id) {
        const { data } = await supabase
          .from('positions')
          .select('name')
          .eq('id', event.creator.position_id)
          .single<{ name: string }>();
        if (!ignore && data?.name) {
          setOrganizerPosition(data.name);
        } else if (!ignore) {
          setOrganizerPosition('Организатор');
        }
      } else {
        setOrganizerPosition('Организатор');
      }
    }
    if (event) fetchPosition();
    return () => { ignore = true; };
  }, [event]);

  const organizerName = event?.creator?.full_name || '';

  return (
    <div className="max-w-4xl mx-auto p-2 sm:p-6 space-y-6">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-3 ml-1 flex items-center gap-2 text-sns-green font-semibold rounded-full px-3 py-1.5 bg-transparent hover:bg-sns-green/10 focus:outline-none focus:ring-2 focus:ring-sns-green transition-colors text-sm"
          aria-label="Назад к мероприятиям"
        >
          <ArrowLeft className="w-4 h-4 -ml-1" strokeWidth={2} />
          <span className="hidden sm:inline">Назад к мероприятиям</span>
          <span className="inline sm:hidden">Назад</span>
        </button>
      )}
      {loading && (
        <div className="py-12 text-center text-gray-500 text-lg">Загрузка мероприятия...</div>
      )}
      {error && !loading && (
        <div className="py-12 text-center text-red-500 text-lg">{error}</div>
      )}
      {!loading && !error && !event && (
        <div className="py-12 text-center text-gray-500 text-lg">Мероприятие не найдено</div>
      )}
      {event && !loading && !error && (
        <>
          <EventHeader event={event} />
          <EventInfo event={event} />
          <EventPlace
            organizerName={organizerName}
            organizerPosition={organizerPosition}
            location={event.location}
            meeting_link={event.meeting_link}
          />
          {/* Новый красивый блок аналитики */}
          <EventAnalyticsPanel eventId={eventId} />
          {/* Удалён старый блок статистики */}
          <EventParticipantsList eventId={eventId} />
          <EventTestsContainer eventId={eventId} userProfile={userProfile} isAdmin={false} onStartTest={onStartTest} />
          <FeedbackTab eventId={eventId} />
          {/* СТАРАЯ АНАЛИТИКА: временно для сравнения */}
          <div className="mt-10">
            <h2 className="text-2xl font-bold text-center mb-4 text-red-600">Старая аналитика (EventAnalytics.tsx)</h2>
            {/* @ts-ignore */}
            <EventAnalytics />
          </div>
        </>
      )}
    </div>
  );
}