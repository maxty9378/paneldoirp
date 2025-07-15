import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface EventTestStatsProps {
  eventId: string;
  testType?: 'entry' | 'final' | 'annual';
}

export function EventTestStats({ eventId, testType = 'entry' }: EventTestStatsProps) {
  const [stats, setStats] = useState({ total: 0, completed: 0, percent: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        // Получаем участников
        const { data: participants, error: participantsError } = await supabase
          .from('event_participants')
          .select('user_id')
          .eq('event_id', eventId);
        if (participantsError) throw participantsError;
        if (!participants) return setStats({ total: 0, completed: 0, percent: 0 });

        // Получаем event_type_id
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('event_type_id')
          .eq('id', eventId)
          .single();
        if (eventError) throw eventError;
        if (!event) return setStats({ total: 0, completed: 0, percent: 0 });

        // Получаем тест для этого мероприятия и типа
        const { data: test, error: testError } = await supabase
          .from('tests')
          .select('id')
          .eq('event_type_id', event.event_type_id)
          .eq('type', testType)
          .eq('status', 'active')
          .single();
        if (testError) throw testError;
        if (!test) return setStats({ total: 0, completed: 0, percent: 0 });

        // Получаем завершённые попытки
        const { data: attempts, error: attemptsError } = await supabase
          .from('user_test_attempts')
          .select('user_id, status')
          .eq('event_id', eventId)
          .eq('test_id', test.id)
          .eq('status', 'completed');
        if (attemptsError) throw attemptsError;

        const total = participants.length;
        const completed = attempts ? new Set(attempts.map(a => a.user_id)).size : 0;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        setStats({ total, completed, percent });
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки статистики');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [eventId, testType]);

  if (loading) {
    return <div className="bg-white border border-gray-200 rounded-lg p-4 text-center text-gray-500">Загрузка статистики...</div>;
  }
  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-700">{error}</div>;
  }
  if (stats.total === 0) {
    return <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center text-yellow-700">Нет данных для статистики по тесту</div>;
  }
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center mb-4">
      <div className="text-lg font-semibold text-green-800">
        Тест пройден: {stats.completed} из {stats.total}
      </div>
      <div className="text-sm text-green-700 mt-1">
        Процент прохождения: {stats.percent}%
      </div>
      <div className="text-sm text-red-700 mt-1">
        Не прошли тест: {stats.total - stats.completed}
      </div>
    </div>
  );
} 