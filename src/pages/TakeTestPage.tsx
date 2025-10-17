import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthBFF } from '../hooks/useAuthBFF';
import { supabase } from '../lib/supabase';
import { TestTakingView } from '../components/admin/TestTakingView';
import { EnhancedMobileTestTakingView } from '../components/admin/EnhancedMobileTestTakingView';
import { useMobile } from '../hooks/use-mobile';

function Loader() {
  return <div style={{ textAlign: 'center', marginTop: 40 }}>Загрузка...</div>;
}

// Функция создания или получения существующей попытки
async function createAttempt({ eventId, testId, userId }: { eventId: string, testId: string, userId: string }) {
  console.log('🔍 createAttempt вызвана с параметрами:', { eventId, testId, userId });
  
  // Сначала проверяем, есть ли уже попытка для этого пользователя, теста и мероприятия
  const { data: existingAttempt, error: checkError } = await supabase
    .from('user_test_attempts')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('test_id', testId)
    .eq('user_id', userId)
    .maybeSingle();

  if (checkError) {
    console.error('❌ Ошибка при проверке существующих попыток:', checkError);
    throw checkError;
  }

  // Если попытка уже существует, возвращаем её ID
  if (existingAttempt) {
    console.log('✅ Найдена существующая попытка:', existingAttempt.id, 'статус:', existingAttempt.status);
    return existingAttempt.id;
  }

  // Если попытки нет, создаём новую
  console.log('🆕 Создаем новую попытку в createAttempt');
  const { data, error } = await supabase
    .from('user_test_attempts')
    .insert({ event_id: eventId, test_id: testId, user_id: userId, status: 'in_progress' })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Ошибка при создании попытки:', error);
    throw error;
  }
  
  console.log('✅ Создана новая попытка в createAttempt:', data.id);
  return data.id;
}

export default function TakeTestPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userProfile } = useAuthBFF();
  const isMobile = useMobile();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const eventId = searchParams.get('eventId');
  const testId = searchParams.get('testId');
  const urlAttemptId = searchParams.get('attemptId');

  useEffect(() => {
    console.log('🎯 TakeTestPage useEffect вызван с параметрами:', { eventId, testId, urlAttemptId, userId: userProfile?.id });
    
    if (!eventId || !testId || !userProfile?.id) {
      console.log('❌ Отсутствуют обязательные параметры');
      setLoading(false);
      return;
    }
    
    if (urlAttemptId) {
      console.log('✅ Используем переданный attemptId:', urlAttemptId);
      setAttemptId(urlAttemptId);
      setLoading(false);
      return;
    }
    
    // Создаём новую попытку
    console.log('🆕 Создаем новую попытку в TakeTestPage');
    setLoading(true);
    createAttempt({ eventId, testId, userId: userProfile.id })
      .then((newAttemptId) => {
        console.log('✅ Создана новая попытка:', newAttemptId);
        setSearchParams({ eventId, testId, attemptId: newAttemptId });
        setAttemptId(newAttemptId);
      })
      .catch((error) => {
        console.error('❌ Ошибка создания попытки в TakeTestPage:', error);
        setLoading(false);
      });
  }, [eventId, testId, urlAttemptId, userProfile?.id, setSearchParams]);

  if (loading || !eventId || !testId || !attemptId) return <Loader />;

  const TestComponent = isMobile ? EnhancedMobileTestTakingView : TestTakingView;

  return (
    <TestComponent
      eventId={eventId}
      testId={testId}
      attemptId={attemptId}
      onComplete={() => {
        // Переходим на страницу мероприятия
        navigate(`/event/${eventId}`);
        // Обновляем данные после перехода
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }}
      onCancel={() => navigate(`/event/${eventId}`)}
    />
  );
} 