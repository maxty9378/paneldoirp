import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import EventTestPrompts from './EventTestPrompts';
import AdminTestSection from './AdminTestSection';

const CORPORATE_GREEN = '#06A478';

function getInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function StatusIcon({ ok, onClick }) {
  return (
    <button
      onClick={onClick}
      className="focus:outline-none hover:scale-110 transition-transform"
      title={ok ? 'Отметить как отсутствующего' : 'Отметить как присутствующего'}
    >
      {ok ? (
        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
    </button>
  );
}

// Функция для красивого переноса ФИО
function splitFullName(fullName) {
  if (!fullName) return { main: '', extra: '' };
  const parts = fullName.trim().split(' ');
  if (parts.length < 3) return { main: fullName, extra: '' };
  return { main: parts.slice(0, 2).join(' '), extra: parts.slice(2).join(' ') };
}

export default function EventParticipantsList({ eventId }) {
  const { userProfile } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  
  // Определяем, является ли пользователь администратором
  const isAdmin = userProfile?.role && ['administrator', 'moderator', 'trainer', 'expert'].includes(userProfile.role);

  useEffect(() => {
    const fetchParticipants = async () => {
      setLoading(true);
      setError(null);
      try {
        // Выбираем представление в зависимости от роли пользователя
        const { data, error } = await supabase
          .from('event_participants_view')
          .select('*')
          .eq('event_id', eventId);

        if (error) throw error;
        setParticipants(data || []);
      } catch (err) {
        console.error('Ошибка при загрузке данных:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) fetchParticipants();
  }, [eventId]);

  const toggleAttendance = async (participantId, currentStatus) => {
    if (!isAdmin || updatingStatus === participantId) return;
    setUpdatingStatus(participantId);
    try {
      const { error } = await supabase
        .from('event_participants')
        .update({ attended: !currentStatus })
        .eq('id', participantId);

      if (error) throw error;

      setParticipants(prev =>
        prev.map(p =>
          p.id === participantId ? { ...p, attended: !currentStatus } : p
        )
      );
    } catch (err) {
      alert('Ошибка при обновлении статуса');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const toggleFeedbackSubmitted = async (participantId, currentStatus) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from('event_participants')
        .update({ feedback_submitted: !currentStatus })
        .eq('id', participantId);

      if (error) throw error;

      setParticipants(prev =>
        prev.map(p =>
          p.id === participantId ? { ...p, feedback_submitted: !currentStatus } : p
        )
      );
    } catch (err) {
      alert('Ошибка при обновлении статуса обратной связи');
    }
  };

  const refreshParticipants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_participants_view')
        .select('*')
        .eq('event_id', eventId);

      if (error) throw error;
      setParticipants(data || []);
    } catch {
      alert('Ошибка при обновлении данных');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="py-8 text-center text-gray-500">Загрузка участников...</div>;
  if (error) return <div className="py-8 text-center text-red-500">Ошибка: {error}</div>;

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg p-4 overflow-x-auto font-mabry">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Участники мероприятия</h2>
          <button
            onClick={refreshParticipants}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
            title="Обновить данные"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <table className="min-w-full text-sm border-separate border-spacing-y-1">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-700 rounded-tl-xl">Участник</th>
              <th className={`px-3 py-2 text-left font-semibold text-gray-700 ${!isAdmin ? 'rounded-tr-xl' : ''}`}>Должность</th>
              
              {isAdmin && (
                <>
                  <th className="px-2 py-2 text-center font-semibold text-gray-700">Статус</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Тесты</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 rounded-tr-xl">Обратная связь</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {participants.map((p, idx) => (
              <tr
                key={p.id}
                className={`hover:bg-green-50 ${idx % 2 ? 'bg-gray-50' : 'bg-white'} rounded-xl overflow-hidden`}
              >
                <td className="px-3 py-3 align-top whitespace-nowrap rounded-l-xl">
                  <div className="flex gap-3 items-start">
                    <div
                      className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-semibold"
                      style={{ backgroundColor: CORPORATE_GREEN }}
                    >
                      {getInitials(p.full_name)}
                    </div>
                    <div className="min-w-0">
                      {(() => {
                        const { main, extra } = splitFullName(p.full_name);
                        return (
                          <div className="font-medium text-gray-900 text-sm max-w-[200px] leading-snug">
                            <span className="block sm:inline">{main}</span>
                            {extra && (
                              <span className="block sm:inline"> {extra}</span>
                            )}
                          </div>
                        );
                      })()}
                      {p.phone && (
                        <a href={`tel:${p.phone}`} className="text-xs text-gray-500 hover:underline">
                          {p.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </td>

                <td className={`px-3 py-3 align-top text-xs text-gray-700 ${!isAdmin ? 'rounded-r-xl' : ''}`}>
                  <div>{p.position_name || <span className="text-gray-400">Не указана</span>}</div>
                  <div className="text-xs font-semibold" style={{ color: CORPORATE_GREEN }}>
                    {p.territory_name || <span className="text-gray-400">Не указана</span>}
                    {p.territory_region && <span className="text-gray-400 ml-1">({p.territory_region})</span>}
                  </div>
                </td>

                {isAdmin && (
                  <>
                    <td className="px-2 py-3 text-center align-top">
                      <StatusIcon ok={p.attended} onClick={() => toggleAttendance(p.id, p.attended)} />
                      {updatingStatus === p.id && (
                        <svg className="animate-spin h-4 w-4 text-gray-500 inline-block ml-1" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                        </svg>
                      )}
                    </td>

                    <td className="px-3 py-3 text-center align-top">
                      <div className="flex flex-col gap-1 items-center">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium border min-w-[100px] text-center ${
                            p.entry_test_score !== null ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}
                        >
                          Входной: {p.entry_test_score !== null ? `${p.entry_test_score}%` : 'нет'}
                        </span>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium border min-w-[100px] text-center ${
                            p.final_test_score !== null ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}
                        >
                          Итоговый: {p.final_test_score !== null ? `${p.final_test_score}%` : 'нет'}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-3 text-center align-top rounded-r-xl">
                      <div
                        className={`inline-block px-2 py-1 rounded text-xs font-medium border min-w-[100px] text-center ${
                          p.feedback_submitted ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'
                        }`}
                      >
                        {p.feedback_submitted ? 'Получена' : 'Ожидается'}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {participants.length === 0 && (
          <div className="text-center py-4 text-gray-500">Участники не найдены</div>
        )}
      </div>
    </>
  );
}