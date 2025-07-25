import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Users, Clock, Award, FileText, Link as LinkIcon, User, UserCheck, CheckCircle2, XCircle, BadgeCheck, AlertCircle, BarChart4, Building, Landmark, Map, Briefcase, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { clsx } from 'clsx';
import { EventDetailsCard } from './eventDetail/EventDetailsCard';

interface EventDetailModalProps {
  isOpen: boolean;
  eventId: string | null;
  onClose: () => void;
}

export function EventDetailModal({ isOpen, eventId, onClose }: EventDetailModalProps) {
  const { userProfile } = useAuth();
  const [event, setEvent] = useState<any | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState({
    entry: { available: false, completed: false, score: null, attemptId: null },
    final: { available: false, completed: false, score: null, attemptId: null }
  });

  const isEmployee = userProfile?.role === 'employee';

  useEffect(() => {
    if (isOpen && eventId) {
      fetchEventDetails();
    } else if (!isOpen) {
      // Reset state when modal closes
      setEvent(null);
      setParticipants([]);
      setActiveTab('details');
      setError(null);
      setTestStatus({
        entry: { available: false, completed: false, score: null, attemptId: null },
        final: { available: false, completed: false, score: null, attemptId: null }
      });
    }
  }, [isOpen, eventId, userProfile?.id]);

  const fetchEventDetails = async () => {
    if (!eventId || !isOpen) return;

    setLoading(true);
    setError(null);
    
    try {      
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          event_type:event_type_id(
            id,
            name,
            name_ru,
            is_online,
            has_entry_test,
            has_final_test,
            has_feedback_form
          ),
          creator:creator_id(
            id,
            full_name,
            email,
            phone,
            position:position_id(name),
            territory:territory_id(name)
          )
        `)
        .eq('id', eventId)
        .single();

      if (eventError) {
        throw eventError;
      }
      
      setEvent(eventData);

      // Проверяем, является ли пользователь участником этого мероприятия
      if (userProfile?.id) {
        const { data: participantData } = await supabase
          .from('event_participants')
          .select('id, attended')
          .eq('event_id', eventId)
          .eq('user_id', userProfile.id)
          .maybeSingle();

        const isParticipant = !!participantData;
        const hasAttended = participantData?.attended || false;

        // Если пользователь участник и присутствовал, проверяем тесты
        if (isParticipant && hasAttended) {
          // Поиск тестов по типу мероприятия
          if (eventData.event_type?.has_entry_test) {
            const { data: entryTestData } = await supabase
              .from('tests')
              .select('id')
              .eq('event_type_id', eventData.event_type_id)
              .eq('type', 'entry')
              .eq('status', 'active')
              .maybeSingle();

            if (entryTestData?.id) {
              // Проверяем попытку прохождения
              const { data: attemptData } = await supabase
                .from('user_test_attempts')
                .select('id, status, score')
                .eq('test_id', entryTestData.id)
                .eq('user_id', userProfile.id)
                .eq('event_id', eventId)
                .maybeSingle();

              if (attemptData) {
                setTestStatus(prev => ({
                  ...prev,
                  entry: {
                    available: true,
                    completed: attemptData.status === 'completed',
                    score: attemptData.score,
                    attemptId: attemptData.id
                  }
                }));
              } else {
                // Проверяем, есть ли уже попытка для этого теста
                const { data: existingAttempt } = await supabase
                  .from('user_test_attempts')
                  .select('id, status, score')
                  .eq('test_id', entryTestData.id)
                  .eq('user_id', userProfile.id)
                  .eq('event_id', eventId)
                  .maybeSingle();

                if (existingAttempt) {
                  setTestStatus(prev => ({
                    ...prev,
                    entry: {
                      available: true,
                      completed: existingAttempt.status === 'completed',
                      score: existingAttempt.score,
                      attemptId: existingAttempt.id
                    }
                  }));
                } else {
                  // Создаем новую попытку только если её нет
                  const { data: newAttempt } = await supabase
                    .from('user_test_attempts')
                    .insert({
                      user_id: userProfile.id,
                      test_id: entryTestData.id,
                      event_id: eventId,
                      status: 'in_progress',
                      start_time: new Date().toISOString()
                    })
                    .select()
                    .single();

                  if (newAttempt) {
                    setTestStatus(prev => ({
                      ...prev,
                      entry: {
                        available: true,
                        completed: false,
                        score: null,
                        attemptId: newAttempt.id
                      }
                    }));
                  }
                }
              }
            }
          }

          // То же самое для финального теста
          if (eventData.event_type?.has_final_test) {
            const { data: finalTestData } = await supabase
              .from('tests')
              .select('id')
              .eq('event_type_id', eventData.event_type_id)
              .eq('type', 'final')
              .eq('status', 'active')
              .maybeSingle();

            if (finalTestData?.id) {
              const { data: attemptData } = await supabase
                .from('user_test_attempts')
                .select('id, status, score')
                .eq('test_id', finalTestData.id)
                .eq('user_id', userProfile.id)
                .eq('event_id', eventId)
                .maybeSingle();

              if (attemptData) {
                setTestStatus(prev => ({
                  ...prev,
                  final: {
                    available: true,
                    completed: attemptData.status === 'completed',
                    score: attemptData.score,
                    attemptId: attemptData.id
                  }
                }));
              } else {
                // Проверяем, есть ли уже попытка для этого теста
                const { data: existingAttempt } = await supabase
                  .from('user_test_attempts')
                  .select('id, status, score')
                  .eq('test_id', finalTestData.id)
                  .eq('user_id', userProfile.id)
                  .eq('event_id', eventId)
                  .maybeSingle();

                if (existingAttempt) {
                  setTestStatus(prev => ({
                    ...prev,
                    final: {
                      available: true,
                      completed: existingAttempt.status === 'completed',
                      score: existingAttempt.score,
                      attemptId: existingAttempt.id
                    }
                  }));
                } else {
                  // Создаем новую попытку только если её нет
                  const { data: newAttempt } = await supabase
                    .from('user_test_attempts')
                    .insert({
                      user_id: userProfile.id,
                      test_id: finalTestData.id,
                      event_id: eventId,
                      status: 'in_progress',
                      start_time: new Date().toISOString()
                    })
                    .select()
                    .single();

                  if (newAttempt) {
                    setTestStatus(prev => ({
                      ...prev,
                      final: {
                        available: true,
                        completed: false,
                        score: null,
                        attemptId: newAttempt.id
                      }
                    }));
                  }
                }
              }
            }
          }
        }
      }

      // Fetch participants with detailed information (if not employee)
      if (!isEmployee) {
        const { data: participantsData, error: participantsError } = await supabase
          .from('event_participants')
          .select(`
            id,
            user:user_id(
              id, 
              full_name,
              email,
              phone,
              sap_number,
              work_experience_days,
              is_leaving,
              position:position_id(name),
              territory:territory_id(name)
            ),
            attended,
            entry_test_score,
            final_test_score,
            feedback_score,
            notes
          `)
          .eq('event_id', eventId);

        if (participantsError) {
          throw participantsError;
        }
        
        setParticipants(participantsData || []);
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных мероприятия:', error);
      setError('Не удалось загрузить данные мероприятия. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const startTest = (testType: 'entry' | 'final', attemptId: string | null) => {
    if (!attemptId) {
      alert(`Не удалось найти попытку прохождения теста. Обратитесь к администратору.`);
      return; 
    }
    
    // В реальном приложении здесь будет логика запуска теста
    alert(`Переход к ${testType === 'entry' ? 'входному' : 'финальному'} тесту (ID: ${attemptId})`);
    // window.location.href = `/tests/take/${attemptId}`;
  };

  const formatEventDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'd MMMM yyyy', { locale: ru });
    } catch (e) {
      return 'Дата не указана';
    }
  };

  const formatEventTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'HH:mm', { locale: ru });
    } catch (e) {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl pb-safe-bottom">
        {loading ? (
          <div className="p-10 flex flex-col justify-center items-center">
            <div className="w-10 h-10 border-4 border-sns-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Загрузка информации о мероприятии...</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Ошибка</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Закрыть
            </button>
          </div>
        ) : event ? (
          <>
            {/* Заголовок с градиентом */}
            <div className="bg-gradient-to-r from-sns-600 to-sns-700 p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <BadgeCheck className="h-5 w-5" />
                    <span className="text-sm font-medium">{event.event_type?.name_ru || 'Мероприятие'}</span>
                  </div>
                  <h2 className="text-2xl font-bold">{event.title}</h2>
                  <div className="flex items-center mt-2 text-white/80 text-sm">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{formatEventDate(event.start_date)} в {formatEventTime(event.start_date)}</span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Вкладки для обычных пользователей */}
            {isEmployee ? (
              <div className="p-6">
                {/* Описание */}
                {event.description && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6">
                    <h3 className="text-md font-medium text-gray-900 mb-2">Описание</h3>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{event.description}</p>
                  </div>
                )}

                {/* Детали мероприятия */}
                <div className="mb-6">
                  <EventDetailsCard 
                    event={event} 
                    isCreator={event.creator_id === userProfile?.id}
                    onUpdateOrganizerData={(newAvatarUrl) => {
                      setEvent(prevEvent => prevEvent ? {
                        ...prevEvent,
                        creator: {
                          ...prevEvent.creator,
                          avatar_url: newAvatarUrl
                        }
                      } : null);
                    }}
                  />
                </div>

                {/* Тесты для сотрудника */}
                {(event.event_type?.has_entry_test || event.event_type?.has_final_test) && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Тесты</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Входной тест */}
                      {event.event_type?.has_entry_test && testStatus.entry.available && (
                        <div className={clsx(
                          "p-4 rounded-lg border",
                          testStatus.entry.completed ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"
                        )}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                                <FileText className={testStatus.entry.completed ? "text-green-600" : "text-blue-600"} />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">Входной тест</h4>
                                {testStatus.entry.completed ? (
                                  <div className="flex items-center text-sm text-green-700 mt-1">
                                    <CheckCircle2 className="h-4 w-4 mr-1" 
                                    />
                                    <span>Пройден: {testStatus.entry.score}%</span>
                                  </div>
                                ) : (
                                  <p className="text-sm text-blue-700">Проверка базовых знаний</p>
                                )}
                              </div>
                            </div>
                            {!testStatus.entry.completed && testStatus.entry.attemptId && (
                              <button
                                onClick={() => window.alert(`ID попытки: ${testStatus.entry.attemptId}. В реальном приложении здесь будет переход к тесту.`)}
                                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center space-x-1"
                              >
                                <ArrowRight className="h-4 w-4" />
                                <span>Начать</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Финальный тест */}
                      {event.event_type?.has_final_test && testStatus.final.available && (
                        <div className={clsx(
                          "p-4 rounded-lg border",
                          testStatus.final.completed ? "bg-green-50 border-green-200" : "bg-purple-50 border-purple-200"
                        )}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                                <CheckCircle2 className={testStatus.final.completed ? "text-green-600" : "text-purple-600"} />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">Финальный тест</h4>
                                {testStatus.final.completed ? (
                                  <div className="flex items-center text-sm text-green-700 mt-1">
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    <span>Пройден: {testStatus.final.score}%</span>
                                  </div>
                                ) : (
                                  <p className="text-sm text-purple-700">Проверка полученных знаний</p>
                                )}
                              </div>
                            </div>
                            {!testStatus.final.completed && testStatus.final.attemptId && (
                              <button
                                onClick={() => window.alert(`ID попытки: ${testStatus.final.attemptId}. В реальном приложении здесь будет переход к тесту.`)}
                                className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 flex items-center space-x-1"
                              >
                                <ArrowRight className="h-4 w-4" />
                                <span>Начать</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Вкладки для администраторов и тренеров */}
                <div className="border-b border-gray-200">
                  <nav className="flex px-6">
                    <button
                      onClick={() => setActiveTab('details')}
                      className={clsx(
                        "py-4 px-3 border-b-2 font-medium text-sm transition-colors",
                        activeTab === 'details' 
                          ? 'border-sns-600 text-sns-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      )}
                    >
                      Детали мероприятия
                    </button>
                    {!isEmployee && (
                      <button
                        onClick={() => setActiveTab('participants')}
                        className={clsx(
                          "py-4 px-3 border-b-2 font-medium text-sm transition-colors",
                          activeTab === 'participants' 
                            ? 'border-sns-600 text-sns-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        )}
                      >
                        Участники ({participants.length})
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab('tests')}
                      className={clsx(
                        "py-4 px-3 border-b-2 font-medium text-sm transition-colors",
                        activeTab === 'tests' 
                          ? 'border-sns-600 text-sns-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      )}
                    >
                      Тесты
                    </button>
                  </nav>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
                  {/* Вкладка с деталями */}
                  {activeTab === 'details' && (
                    <div className="space-y-6">
                      {/* Описание */}
                      {event.description && (
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <h3 className="text-md font-medium text-gray-900 mb-2">Описание</h3>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">{event.description}</p>
                        </div>
                      )}
                      
                      {/* Основная информация */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Дата</p>
                              <p className="font-medium text-gray-900">{formatEventDate(event.start_date)}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                              <Clock className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Время</p>
                              <p className="font-medium text-gray-900">{formatEventTime(event.start_date)}</p>
                            </div>
                          </div>

                          {event.location && (
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <MapPin className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Место проведения</p>
                                <p className="font-medium text-gray-900">{event.location}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                              <User className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Организатор</p>
                              <div className="font-medium text-gray-900">{event.creator?.full_name}</div>
                              {event.creator?.email && (
                                <div className="text-xs text-gray-500 mt-0.5">{event.creator.email}</div>
                              )}
                              {event.creator?.position?.name && (
                                <div className="text-xs text-gray-500">{event.creator.position.name}</div>
                              )}
                            </div>
                          </div>

                          {event.meeting_link && (
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <LinkIcon className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Ссылка на встречу</p>
                                <a 
                                  href={event.meeting_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="font-medium text-blue-600 hover:underline"
                                >
                                  Присоединиться к встрече
                                </a>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                              <Award className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Баллы за участие</p>
                              <p className="font-medium text-gray-900">{event.points || 0} баллов</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Вкладка с участниками */}
                  {activeTab === 'participants' && !isEmployee && (
                    <div>
                      {participants.length === 0 ? (
                        <div className="text-center py-8">
                          <Users size={48} className="mx-auto text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Нет участников</h3>
                          <p className="text-gray-600">В этом мероприятии пока нет участников</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {participants.map((participant) => (
                            <div key={participant.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                                    participant.attended ? "bg-green-100" : "bg-red-100"
                                  )}>
                                    {participant.attended ? (
                                      <UserCheck className="h-5 w-5 text-green-600" />
                                    ) : (
                                      <XCircle className="h-5 w-5 text-red-600" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 truncate">{participant.user?.full_name}</h4>
                                    <div className="flex items-center text-sm text-gray-600 mt-0.5">
                                      {participant.user?.position?.name || 'Должность не указана'} 
                                      {participant.user?.territory?.name && (
                                        <span className="flex items-center ml-2">
                                          <MapPin className="h-3 w-3 mx-1 text-gray-400" />
                                          {participant.user.territory.name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center">
                                  <span className={clsx(
                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                    participant.attended 
                                      ? "bg-green-100 text-green-800" 
                                      : "bg-red-100 text-red-800"
                                  )}>
                                    {participant.attended ? 'Присутствовал' : 'Отсутствовал'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Тесты участника */}
                              {participant.attended && event.event_type && 
                               (event.event_type.has_entry_test || event.event_type.has_final_test) && (
                                <div className="mt-3 flex flex-wrap gap-3">
                                  {event.event_type.has_entry_test && (
                                    <div className={clsx(
                                      "px-2.5 py-1 rounded text-xs font-medium flex items-center",
                                      participant.entry_test_score !== null 
                                        ? "bg-green-50 text-green-800" 
                                        : "bg-gray-100 text-gray-800"
                                    )}>
                                      <FileText className="h-3.5 w-3.5 mr-1" />
                                      {participant.entry_test_score !== null 
                                        ? `Входной тест: ${participant.entry_test_score}%` 
                                        : "Нет входного теста"}
                                    </div>
                                  )}
                                  
                                  {event.event_type.has_final_test && (
                                    <div className={clsx(
                                      "px-2.5 py-1 rounded text-xs font-medium flex items-center",
                                      participant.final_test_score !== null 
                                        ? "bg-green-50 text-green-800" 
                                        : "bg-gray-100 text-gray-800"
                                    )}>
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                      {participant.final_test_score !== null 
                                        ? `Финальный тест: ${participant.final_test_score}%` 
                                        : "Нет финального теста"}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Вкладка с тестами */}
                  {activeTab === 'tests' && (
                    <div className="space-y-6">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h3 className="font-medium text-gray-900 mb-3">Тесты для этого мероприятия</h3>
                        <p className="text-sm text-gray-700">
                          {event.event_type?.name === 'online_training' && event.title.includes("Технология эффективных продаж")
                            ? 'К этому мероприятию автоматически подключены стандартные тесты:'
                            : 'Тесты для этого типа мероприятия:'}
                        </p>
                        <ul className="mt-2 space-y-2">
                          {event.event_type?.has_entry_test && (
                            <li className="flex items-center text-sm">
                              <div className="w-4 h-4 rounded-full bg-blue-200 mr-2 flex-shrink-0"></div>
                              <span className="text-gray-800">
                                Входной тест - проверка начальных знаний перед мероприятием
                              </span>
                            </li>
                          )}
                          {event.event_type?.has_final_test && (
                            <li className="flex items-center text-sm">
                              <div className="w-4 h-4 rounded-full bg-purple-200 mr-2 flex-shrink-0"></div>
                              <span className="text-gray-800">
                                Финальный тест - проверка полученных знаний после мероприятия
                              </span>
                            </li>
                          )}
                          {event.event_type?.name === 'online_training' && event.title.includes("Технология эффективных продаж") && (
                            <li className="flex items-center text-sm">
                              <div className="w-4 h-4 rounded-full bg-green-200 mr-2 flex-shrink-0"></div>
                              <span className="text-gray-800">
                                Годовой тест - проверка знаний через 3 месяца после обучения
                              </span>
                            </li>
                          )}
                        </ul>
                      </div>


                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Нижняя панель */}
            <div className="border-t border-gray-200 p-4 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-white bg-sns-600 rounded-lg hover:bg-sns-700 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </>
        ) : (
          <div className="p-10 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Мероприятие не найдено</h3>
            <p className="text-gray-500 mb-6">Запрошенное мероприятие не существует или у вас нет доступа к нему.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  );
}