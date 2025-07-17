import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { TestTakingView } from '../components/admin/TestTakingView';

function Loader() {
  return <div style={{ textAlign: 'center', marginTop: 40 }}>Загрузка...</div>;
}

// Пример функции создания attempt (замените на свою при необходимости)
async function createAttempt({ eventId, testId, userId }: { eventId: string, testId: string, userId: string }) {
  const { data, error } = await supabase
    .from('user_test_attempts')
    .insert({ event_id: eventId, test_id: testId, user_id: userId, status: 'in_progress' })
    .select()
    .single();
  if (error) throw error;
  return data.id;
}

export default function TakeTestPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const eventId = searchParams.get('eventId');
  const testId = searchParams.get('testId');
  const urlAttemptId = searchParams.get('attemptId');

  useEffect(() => {
    if (!eventId || !testId || !userProfile?.id) {
      setLoading(false);
      return;
    }
    if (urlAttemptId) {
      setAttemptId(urlAttemptId);
      setLoading(false);
      return;
    }
    // Создаём новую попытку
    setLoading(true);
    createAttempt({ eventId, testId, userId: userProfile.id })
      .then((newAttemptId) => {
        setSearchParams({ eventId, testId, attemptId: newAttemptId });
        setAttemptId(newAttemptId);
      })
      .catch(() => setLoading(false));
  }, [eventId, testId, urlAttemptId, userProfile?.id, setSearchParams]);

  if (loading || !eventId || !testId || !attemptId) return <Loader />;

  return (
    <TestTakingView
      eventId={eventId}
      testId={testId}
      attemptId={attemptId}
      onComplete={() => navigate(`/event/${eventId}`)}
      onCancel={() => navigate(`/event/${eventId}`)}
    />
  );
} 