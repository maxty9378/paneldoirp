import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import EventTestPrompts from './EventTestPrompts';
import AdminTestSection from './AdminTestSection';
import { ChevronDown, ChevronUp, Users, RefreshCw } from 'lucide-react';

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
      className="focus:outline-none hover:scale-110 transition-transform duration-200"
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

export default function EventParticipantsList({ eventId, refreshKey = 0 }) {
  const { userProfile } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false); // По умолчанию свёрнуто
  
  // Определяем, является ли пользователь администратором
  const isAdmin = userProfile?.role && ['administrator', 'moderator', 'trainer', 'expert'].includes(userProfile.role);
  
  // Определяем, является ли пользователь участником (employee)
  const isEmployee = userProfile?.role === 'employee';
  
  // Если пользователь является участником, не показываем компонент
  if (isEmployee) {
    return null;
  }

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

  // Обновление данных при изменении refreshKey
  useEffect(() => {
    if (refreshKey > 0 && eventId) {
      fetchParticipants();
    }
  }, [refreshKey, eventId]);

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

  // Подсчёт статистики
  const attendedCount = participants.filter(p => p.attended).length;
  const feedbackCount = participants.filter(p => p.feedback_submitted).length;
  const testCompletedCount = participants.filter(p => p.entry_test_score !== null || p.final_test_score !== null).length;

  if (loading) return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Загрузка участников...</span>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="text-center py-8 text-red-500">
        <div className="text-lg font-semibold mb-2">Ошибка загрузки</div>
        <div className="text-sm">{error}</div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Заголовок с возможностью сворачивания */}
        <div 
          className="px-6 py-4 bg-white border-b border-gray-100 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Участники мероприятия</h2>
                             <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                 <span className="flex items-center gap-1">
                   <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                   {attendedCount} присутствовало
                 </span>
                 <span className="flex items-center gap-1">
                   <span className="w-2 h-2" style={{ backgroundColor: CORPORATE_GREEN }}></span>
                   {testCompletedCount} прошли тест
                 </span>
                 <span className="flex items-center gap-1">
                   <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                   {feedbackCount} оставили отзыв
                 </span>
               </div>
               
               {/* Напоминание для администраторов под статистикой */}
               {isAdmin && (
                 <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                   <div className="flex items-center gap-2 text-sm text-blue-700">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                     <span className="font-semibold">Напоминание:</span>
                     <span>Не забудьте отметить, кто присутствовал на мероприятии</span>
                   </div>
                 </div>
               )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                refreshParticipants();
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              title="Обновить данные"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Содержимое таблицы */}
      {isExpanded && (
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 rounded-l-lg w-1/3">Участник</th>
                  <th className={`px-4 py-3 text-left font-semibold text-gray-700 ${!isAdmin ? 'rounded-r-lg' : ''} w-1/4`}>Должность</th>
                  
                  {isAdmin && (
                    <>
                      <th className="px-3 py-3 text-center font-semibold text-gray-700 w-[120px]">Статус</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700 w-[150px]">Тесты</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700 rounded-r-lg w-[150px]">Обратная связь</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {participants.map((p, idx) => (
                  <tr
                    key={p.id}
                    className="hover:bg-blue-50/50 transition-colors duration-200"
                  >
                    <td className="px-4 py-4 align-top">
                      <div className="flex gap-3 items-start">
                        <div
                          className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-semibold shadow-sm"
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
                            <a href={`tel:${p.phone}`} className="text-xs text-gray-500 hover:text-blue-600 hover:underline transition-colors">
                              {p.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className={`px-4 py-4 align-top text-sm text-gray-700 ${!isAdmin ? '' : ''}`}>
                      <div className="font-medium">{p.position_name || <span className="text-gray-400 italic">Не указана</span>}</div>
                      <div className="text-xs font-medium mt-1" style={{ color: CORPORATE_GREEN }}>
                        {p.territory_name || <span className="text-gray-400 italic">Не указана</span>}
                        {p.territory_region && <span className="text-gray-400 ml-1">({p.territory_region})</span>}
                      </div>
                    </td>

                    {isAdmin && (
                      <>
                        <td className="px-3 py-4 text-center align-top">
                          <div className="flex justify-center">
                            <StatusIcon ok={p.attended} onClick={() => toggleAttendance(p.id, p.attended)} />
                            {updatingStatus === p.id && (
                              <svg className="animate-spin h-4 w-4 text-gray-500 inline-block ml-1" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                              </svg>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center align-top">
                          <div className="flex flex-col gap-1.5 items-center w-[130px]">
                            <span
                              className={`block w-full h-[28px] px-2.5 py-1 rounded text-xs font-medium border text-center transition-all duration-200 flex items-center justify-center ${
                                p.entry_test_score !== null 
                                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
                                  : 'bg-gray-50 text-gray-500 border-gray-200'
                              }`}
                            >
                              Входной: {p.entry_test_score !== null ? `${p.entry_test_score}%` : 'нет'}
                            </span>
                            <span
                              className={`block w-full h-[28px] px-2.5 py-1 rounded text-xs font-medium border text-center transition-all duration-200 flex items-center justify-center ${
                                p.final_test_score !== null 
                                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                  : 'bg-gray-50 text-gray-500 border-gray-200'
                              }`}
                            >
                              Итоговый: {p.final_test_score !== null ? `${p.final_test_score}%` : 'нет'}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center align-top">
                          <div
                            className={`inline-block w-[130px] h-[28px] px-2.5 py-1 rounded text-xs font-medium border text-center transition-all duration-200 flex items-center justify-center ${
                              p.feedback_submitted 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : 'bg-orange-50 text-orange-700 border-orange-200'
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
          </div>
          
          {participants.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">Участники не найдены</p>
              <p className="text-xs text-gray-400 mt-1">Добавьте участников в мероприятие</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}