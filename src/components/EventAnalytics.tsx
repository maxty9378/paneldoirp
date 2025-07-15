import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // или '../lib/supabaseClient', если используется другое имя
import { PostgrestSingleResponse, PostgrestError } from '@supabase/supabase-js';

// Типы данных
interface EventParticipant {
  id: string;
  user_id: string;
  full_name: string;
  attended: boolean;
  entry_test_score: number | null;
  final_test_score: number | null;
  feedback_score: number | null;
  feedback_submitted: boolean;
  notes: string | null;
}

interface EventStats {
  total_participants: number;
  attended_count: number;
  avg_entry_score: number | null;
  avg_final_score: number | null;
  avg_feedback_score: number | null;
  attendance_percentage: number;
}

interface TestAttempt {
  full_name: string;
  test_name: string;
  test_type: string;
  score: number | null;
  status: string;
  start_time: string;
  end_time: string | null;
}

interface FeedbackSubmission {
  full_name: string;
  overall_rating: number | null;
  comments: string | null;
  submitted_at: string;
}

const EventAnalytics = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [eventName, setEventName] = useState<string>('');
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackSubmission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showTestDetails, setShowTestDetails] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    const fetchEventData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Название мероприятия
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('title')
          .eq('id', eventId)
          .single();
        if (eventError) throw new Error(`Ошибка при загрузке информации о мероприятии: ${eventError.message}`);
        if (eventData) setEventName(eventData.title);

        // Участники
        const { data: participantsData, error: participantsError } = await supabase
          .from('event_participants')
          .select(`
            id,
            event_id,
            user_id,
            users:user_id (full_name),
            attended,
            entry_test_score,
            final_test_score,
            feedback_score,
            feedback_submitted,
            notes
          `)
          .eq('event_id', eventId);
        if (participantsError) throw new Error(`Ошибка при загрузке участников: ${participantsError.message}`);
        const formattedParticipants: EventParticipant[] = (participantsData || []).map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          full_name: p.users?.full_name || 'Неизвестный пользователь',
          attended: !!p.attended,
          entry_test_score: p.entry_test_score,
          final_test_score: p.final_test_score,
          feedback_score: p.feedback_score,
          feedback_submitted: !!p.feedback_submitted,
          notes: p.notes
        }));
        setParticipants(formattedParticipants);

        // Статистика (на клиенте)
        const totalParticipants = formattedParticipants.length;
        const attendedCount = formattedParticipants.filter(p => p.attended).length;
        const avgEntryScore = formattedParticipants.filter(p => p.entry_test_score !== null).length > 0
          ? formattedParticipants.filter(p => p.entry_test_score !== null).reduce((sum, p) => sum + (p.entry_test_score || 0), 0) / formattedParticipants.filter(p => p.entry_test_score !== null).length
          : null;
        const avgFinalScore = formattedParticipants.filter(p => p.final_test_score !== null).length > 0
          ? formattedParticipants.filter(p => p.final_test_score !== null).reduce((sum, p) => sum + (p.final_test_score || 0), 0) / formattedParticipants.filter(p => p.final_test_score !== null).length
          : null;
        const avgFeedbackScore = formattedParticipants.filter(p => p.feedback_score !== null).length > 0
          ? formattedParticipants.filter(p => p.feedback_score !== null).reduce((sum, p) => sum + (p.feedback_score || 0), 0) / formattedParticipants.filter(p => p.feedback_score !== null).length
          : null;
        const attendancePercentage = totalParticipants > 0 ? (attendedCount / totalParticipants) * 100 : 0;
        setStats({
          total_participants: totalParticipants,
          attended_count: attendedCount,
          avg_entry_score: avgEntryScore !== null ? Number(avgEntryScore.toFixed(2)) : null,
          avg_final_score: avgFinalScore !== null ? Number(avgFinalScore.toFixed(2)) : null,
          avg_feedback_score: avgFeedbackScore !== null ? Number(avgFeedbackScore.toFixed(2)) : null,
          attendance_percentage: Number(attendancePercentage.toFixed(2))
        });

        // Тесты
        const { data: testsData, error: testsError } = await supabase
          .from('user_test_attempts')
          .select(`
            users:user_id (full_name),
            tests:test_id (title, type),
            score,
            status,
            start_time,
            end_time
          `)
          .eq('event_id', eventId);
        if (testsError) throw new Error(`Ошибка при загрузке данных о тестах: ${testsError.message}`);
        const formattedTests: TestAttempt[] = (testsData || []).map((t: any) => ({
          full_name: t.users?.full_name || 'Неизвестный пользователь',
          test_name: t.tests?.title || 'Неизвестный тест',
          test_type: t.tests?.type || 'Неизвестный тип',
          score: t.score,
          status: t.status,
          start_time: t.start_time,
          end_time: t.end_time
        }));
        setTestAttempts(formattedTests);

        // Обратная связь
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('feedback_submissions')
          .select(`
            users:user_id (full_name),
            overall_rating,
            comments,
            submitted_at
          `)
          .eq('event_id', eventId);
        if (feedbackError) throw new Error(`Ошибка при загрузке обратной связи: ${feedbackError.message}`);
        const formattedFeedback: FeedbackSubmission[] = (feedbackData || []).map((f: any) => ({
          full_name: f.users?.full_name || 'Неизвестный пользователь',
          overall_rating: f.overall_rating,
          comments: f.comments,
          submitted_at: f.submitted_at
        }));
        setFeedbacks(formattedFeedback);
      } catch (err) {
        console.error('Ошибка при загрузке данных:', err);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };
    fetchEventData();
  }, [eventId]);

  // Компонент для отображения статистики
  const StatsCard = ({ title, value, suffix = '' }: { title: string, value: any, suffix?: string }) => (
    <div className="bg-white rounded-lg shadow p-4 text-center">
      <h3 className="text-lg font-medium text-gray-500">{title}</h3>
      <p className="text-3xl font-bold mt-2">
        {value !== null && value !== undefined ? `${value}${suffix}` : 'Нет данных'}
      </p>
    </div>
  );

  if (loading) return <div className="flex justify-center p-8"><div className="loader">Загрузка...</div></div>;
  if (error) return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4" role="alert">
      <p className="font-bold">Ошибка</p>
      <p>{error}</p>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Аналитика мероприятия: {eventName || 'Загрузка...'}
      </h1>
      {/* Общая статистика */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Общая статистика</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard title="Всего участников" value={stats?.total_participants} />
          <StatsCard title="Присутствовало" value={stats?.attended_count} />
          <StatsCard title="Посещаемость" value={stats?.attendance_percentage} suffix="%" />
          <StatsCard title="Средний балл (вход. тест)" value={stats?.avg_entry_score} />
          <StatsCard title="Средний балл (фин. тест)" value={stats?.avg_final_score} />
          <StatsCard title="Средняя оценка (обр. связь)" value={stats?.avg_feedback_score} />
        </div>
      </section>
      {/* Детальная информация о тестах (сворачиваемая) */}
      <section className="mb-10">
        <button
          className="mb-4 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          onClick={() => setShowTestDetails(v => !v)}
        >
          {showTestDetails ? 'Скрыть детальную информацию о тестах' : 'Показать детальную информацию о тестах'}
        </button>
        {showTestDetails && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border-b text-left">Участник</th>
                  <th className="py-2 px-4 border-b text-left">Тест</th>
                  <th className="py-2 px-4 border-b text-left">Тип</th>
                  <th className="py-2 px-4 border-b text-center">Балл</th>
                  <th className="py-2 px-4 border-b text-center">Статус</th>
                  <th className="py-2 px-4 border-b text-left">Начало</th>
                  <th className="py-2 px-4 border-b text-left">Окончание</th>
                </tr>
              </thead>
              <tbody>
                {testAttempts.length > 0 ? (
                  testAttempts.map((attempt, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b">{attempt.full_name}</td>
                      <td className="py-2 px-4 border-b">{attempt.test_name}</td>
                      <td className="py-2 px-4 border-b">
                        {attempt.test_type === 'entry' ? 'Входной' : 
                         attempt.test_type === 'final' ? 'Финальный' : 
                         attempt.test_type}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {attempt.score !== null ? attempt.score : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          attempt.status === 'completed' ? 'bg-green-100 text-green-800' :
                          attempt.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          attempt.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {attempt.status === 'completed' ? 'Завершен' :
                           attempt.status === 'in_progress' ? 'В процессе' :
                           attempt.status === 'failed' ? 'Не пройден' :
                           attempt.status}
                        </span>
                      </td>
                      <td className="py-2 px-4 border-b">
                        {attempt.start_time ? new Date(attempt.start_time).toLocaleString() : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="py-2 px-4 border-b">
                        {attempt.end_time ? new Date(attempt.end_time).toLocaleString() : <span className="text-gray-400">-</span>}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-4 px-4 text-center text-gray-500">
                      Нет данных о тестах
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {/* Обратная связь */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Обратная связь от участников</h2>
        {feedbacks.filter(f => f.comments && f.comments.trim() !== '').length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feedbacks.filter(f => f.comments && f.comments.trim() !== '').map((feedback, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">{feedback.full_name}</h3>
                  <div className="flex items-center">
                    <span className="text-yellow-500 mr-1">★</span>
                    <span>{feedback.overall_rating !== null ? feedback.overall_rating : 'Нет оценки'}</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-2">
                  {new Date(feedback.submitted_at).toLocaleString()}
                </p>
                <p className="text-gray-800">
                  {feedback.comments}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            Нет данных об обратной связи с комментариями
          </div>
        )}
      </section>
    </div>
  );
};

export default EventAnalytics; 