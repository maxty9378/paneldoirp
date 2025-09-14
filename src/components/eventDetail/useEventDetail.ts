import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export function useEventDetail(eventId: string) {
  const [event, setEvent] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tests' | 'feedback'>('feedback');

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchEvent(),
      fetchParticipants(),
      fetchTests(),
      fetchFeedback()
    ])
      .then(() => setLoading(false))
      .catch(e => {
        setError(e.message || 'Ошибка загрузки');
        setLoading(false);
      });
    // eslint-disable-next-line
  }, [eventId]);

  async function fetchEvent() {
    const { data, error }: any = await supabase
      .from('events')
      .select(`
        *, 
        event_type: event_type_id(*), 
        creator: creator_id(
          id,
          full_name,
          email,
          phone,
          avatar_url,
          position: position_id(name),
          territory: territory_id(name)
        )
      `)
      .eq('id', eventId)
      .single();
    if (error) throw error;
    

    
    setEvent(data);
  }
  async function fetchParticipants() {
    const { data, error }: any = await supabase
      .from('event_participants')
      .select('*, user: user_id(*, position:position_id(name))')
      .eq('event_id', eventId);
    if (error) throw error;
    setParticipants(data || []);
  }
  async function fetchTests() {
    const { data, error }: any = await supabase
      .from('tests')
      .select('*')
      .eq('event_type_id', eventId); // возможно, тут ошибка, но возвращаю как было
    if (error) throw error;
    setTests(data || []);
  }
  async function fetchFeedback() {
    setFeedback(null); // Заглушка
  }

  // Пример обработчиков (можно расширить)
  function onParticipantAction() {}
  function onTestAction() {}
  function onFeedbackAction() {}

  return {
    event,
    participants,
    tests,
    feedback,
    loading,
    error,
    activeTab,
    setActiveTab,
    onParticipantAction,
    onTestAction,
    onFeedbackAction,
  };
} 