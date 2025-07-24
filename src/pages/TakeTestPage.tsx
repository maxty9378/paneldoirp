import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { TestTakingView } from '../components/admin/TestTakingView';

function Loader() {
  return <div style={{ textAlign: 'center', marginTop: 40 }}>Загрузка...</div>;
}

// Функция создания или получения существующей попытки
async function createAttempt({ eventId, testId, userId }: { eventId: string, testId: string, userId: string }) {
  // Сначала проверяем, есть ли уже попытка для этого пользователя, теста и мероприятия
  const { data: existingAttempt, error: checkError } = await supabase
    .from('user_test_attempts')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('test_id', testId)
    .eq('user_id', userId)
    .maybeSingle();

  if (checkError) throw checkError;

  // Если попытка уже существует, возвращаем её ID
  if (existingAttempt) {
    console.log('Найдена существующая попытка:', existingAttempt.id, 'статус:', existingAttempt.status);
    return existingAttempt.id;
  }

  // Если попытки нет, создаём новую
  const { data, error } = await supabase
    .from('user_test_attempts')
    .insert({ event_id: eventId, test_id: testId, user_id: userId, status: 'in_progress' })
    .select()
    .single();
  
  if (error) throw error;
  console.log('Создана новая попытка:', data.id);
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