import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import EventTestPrompts from './EventTestPrompts';
import AdminTestSection from './AdminTestSection';
import { Plus, Users, RefreshCw } from 'lucide-react';

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
      className="focus:outline-none hover:scale-110 transition-transform duration-200 touch-manipulation"
      title={ok ? 'Отметить как отсутствующего' : 'Отметить как присутствующего'}
    >
      {ok ? (
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  const [isExpanded, setIsExpanded] = useState(false); // По умолчанию свёрнуто, разворачивается для тренеров/админов
  
  // Определяем, является ли пользователь администратором
  const isAdmin = userProfile?.role && ['administrator', 'moderator', 'trainer', 'expert'].includes(userProfile.role);
  
  // Определяем, является ли пользователь участником (employee)
  const isEmployee = userProfile?.role === 'employee';
  
  // Для тренеров, администраторов и сотрудников разворачиваем секцию по умолчанию
  useEffect(() => {
    if (isAdmin || isEmployee) {
      setIsExpanded(true);
    }
  }, [isAdmin, isEmployee]);

  // Для администраторов секция всегда развернута
  const isAlwaysExpanded = isAdmin;
  
  // Если пользователь является участником, не показываем компонент
  if (isEmployee) {
    return null;
  }

  // Функция для загрузки участников
  const fetchParticipants = useCallback(async () => {
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
  }, [eventId]);

  useEffect(() => {
    if (eventId) fetchParticipants();
  }, [eventId, fetchParticipants]);

  // Обновление данных при изменении refreshKey
  useEffect(() => {
    if (refreshKey > 0 && eventId) {
      fetchParticipants();
    }
  }, [refreshKey, eventId, fetchParticipants]);

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <div className="flex items-center justify-center py-6 sm:py-8">
        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 text-sm sm:text-base">Загрузка участников...</span>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <div className="text-center py-6 sm:py-8 text-red-500">
        <div className="text-base sm:text-lg font-semibold mb-2">Ошибка загрузки</div>
        <div className="text-xs sm:text-sm">{error}</div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Заголовок */}
        <div className={`px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-gray-100 ${
          isAlwaysExpanded ? '' : 'cursor-pointer'
        }`}
        onClick={isAlwaysExpanded ? undefined : () => setIsExpanded(!isExpanded)}
        >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900">Участники мероприятия</h3>
            {/* Подзаголовок для администраторов */}
            {isAdmin && (
              <p className="text-xs sm:text-sm text-gray-400">Отслеживайте участников тренинга и отмечайте присутствие сотрудников</p>
            )}
          </div>
          
          {/* Кнопка скрытия/раскрытия только для не-администраторов */}
          {!isAlwaysExpanded && (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs text-gray-400 hidden sm:inline">
                {isExpanded ? 'Скрыть список' : 'Раскрыть список'}
              </span>
              <div className="relative">
                <button 
                  className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                >
                  <svg 
                    className={`w-4 h-4 text-white transition-transform duration-200 ${
                      isExpanded ? 'rotate-45' : 'rotate-0'
                    }`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
                {/* Индикатор состояния */}
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full transition-all duration-200 ${
                  isExpanded ? 'bg-green-400' : 'bg-gray-300'
                }`}></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Содержимое таблицы */}
      {(isExpanded || isAlwaysExpanded) && (
        <div className="p-3 sm:p-4 lg:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider rounded-l-lg">Участник</th>
                  <th className={`px-2 sm:px-3 py-2 sm:py-3 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider ${!isAdmin ? 'rounded-r-lg' : ''}`}>Должность</th>
                  
                  {isAdmin && (
                    <>
                      <th className="px-1 sm:px-2 py-2 sm:py-3 text-center font-semibold text-gray-700 text-xs uppercase tracking-wider w-[80px] sm:w-[100px]">Статус</th>
                      <th className="px-1 sm:px-2 py-2 sm:py-3 text-center font-semibold text-gray-700 text-xs uppercase tracking-wider w-[100px] sm:w-[120px]">Тесты</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-center font-semibold text-gray-700 text-xs uppercase tracking-wider rounded-r-lg w-[100px] sm:w-[120px]">Обратная связь</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {participants.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200 group ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    }`}
                  >
                    <td className="px-2 sm:px-3 py-2 sm:py-3 align-middle">
                      <div className="flex gap-2 sm:gap-3 items-center">
                        <div
                          className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl text-white flex items-center justify-center font-semibold shadow-sm group-hover:shadow-md transition-shadow duration-200 text-xs sm:text-sm"
                          style={{ backgroundColor: CORPORATE_GREEN }}
                        >
                          {getInitials(p.full_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 text-xs sm:text-sm leading-tight">
                            {p.full_name}
                          </div>
                          {p.phone && (
                            <a href={`tel:${p.phone}`} className="text-xs text-gray-500 hover:text-blue-600 hover:underline transition-colors flex items-center gap-1 mt-1">
                              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span className="text-xs sm:text-sm">{p.phone}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-2 sm:px-3 py-2 sm:py-3 align-middle">
                      <div className="space-y-0.5 sm:space-y-1">
                        <div className="font-medium text-gray-900 text-xs sm:text-sm">
                          {p.position_name || <span className="text-gray-400 italic text-xs">Не указана</span>}
                        </div>
                        <div className="text-xs font-medium" style={{ color: CORPORATE_GREEN }}>
                          {p.territory_name || <span className="text-gray-400 italic">Не указана</span>}
                          {p.territory_region && <span className="text-gray-400 ml-1">({p.territory_region})</span>}
                        </div>
                      </div>
                    </td>

                    {isAdmin && (
                      <>
                        <td className="px-1 sm:px-2 py-2 sm:py-3 text-center align-middle">
                          <div className="flex justify-center">
                            <button
                              onClick={() => toggleAttendance(p.id, p.attended)}
                              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 touch-manipulation ${
                                p.attended 
                                  ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                                  : 'bg-red-100 text-red-600 hover:bg-red-200'
                              }`}
                              title={p.attended ? 'Отметить как отсутствующего' : 'Отметить как присутствующего'}
                            >
                              {p.attended ? (
                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </button>
                            {updatingStatus === p.id && (
                              <svg className="animate-spin h-3 w-3 sm:h-4 sm:w-4 text-gray-500 ml-1 sm:ml-2" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                              </svg>
                            )}
                          </div>
                        </td>

                        <td className="px-1 sm:px-2 py-2 sm:py-3 text-center align-middle">
                          <div className="flex flex-col gap-0.5 sm:gap-1 items-center">
                            <div
                              className={`w-full px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-xs font-medium border transition-all duration-200 ${
                                p.entry_test_score !== null 
                                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
                                  : 'bg-gray-50 text-gray-500 border-gray-200'
                              }`}
                            >
                              {p.entry_test_score !== null ? `${p.entry_test_score}%` : '—'}
                            </div>
                            <div
                              className={`w-full px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-xs font-medium border transition-all duration-200 ${
                                p.final_test_score !== null 
                                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                  : 'bg-gray-50 text-gray-500 border-gray-200'
                              }`}
                            >
                              {p.final_test_score !== null ? `${p.final_test_score}%` : '—'}
                            </div>
                          </div>
                        </td>

                        <td className="px-2 sm:px-3 py-2 sm:py-3 text-center align-middle">
                          <div
                            className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-xs font-medium border transition-all duration-200 ${
                              p.feedback_submitted 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}
                          >
                            {p.feedback_submitted ? (
                              <>
                                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="hidden sm:inline">Да</span>
                                <span className="sm:hidden">✓</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span className="hidden sm:inline">Нет</span>
                                <span className="sm:hidden">✗</span>
                              </>
                            )}
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
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-gray-300" />
              <p className="text-sm font-medium">Участники не найдены</p>
              <p className="text-xs text-gray-400 mt-1">Добавьте участников в мероприятие</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}