import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// Иконки
const FileTextIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const ClockIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const CheckCircleIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const AlertCircleIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const PlayIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
const LockIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const XCircle = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
const CheckCircle = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ICONS = {
  entry: { color: 'blue', label: 'Входной тест' },
  final: { color: 'purple', label: 'Финальный тест' },
  annual: { color: 'amber', label: 'Годовой тест' },
};

function StatusBadge({ score, passingScore }) {
  const isZero = score === 0;
  const isPassed = passingScore && passingScore > 0 ? score >= passingScore : score > 0; // Если проходной балл не указан или равен 0, считаем пройденным любой положительный результат
  
  return (
    <div className={`p-4 rounded-xl text-center font-medium transition-all duration-300 ${
      isZero 
        ? 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-800' 
        : isPassed
        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-800'
        : 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 text-yellow-800'
    }`}>
      <div className="flex items-center justify-center mb-2">
        {isZero ? (
          <XCircle className="h-5 w-5 text-red-500 mr-2" />
        ) : isPassed ? (
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
        ) : (
          <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
        )}
        <span className="text-lg font-bold">Результат: {score}%</span>
      </div>
      <span className="text-sm font-medium">
        {isZero ? 'Тест не пройден' : isPassed ? 'Тест пройден' : 'Требует повторной сдачи'}
      </span>
    </div>
  );
}

function AdminTestCard({ type, testData, eventId }) {
  const { userProfile } = useAuth();
  const icon = ICONS[type];
  const test = testData.test;
  console.log('AdminTestCard props:', { type, testData, eventId, test });
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Цвета для разных типов тестов
  const bgColor = type === 'entry' ? 'bg-blue-50' : type === 'final' ? 'bg-purple-50' : 'bg-amber-50';
  const borderColor = type === 'entry' ? 'border-blue-200' : type === 'final' ? 'border-purple-200' : 'border-amber-200';
  const titleColor = type === 'entry' ? 'text-blue-700' : type === 'final' ? 'text-purple-700' : 'text-amber-700';
  const iconColor = type === 'entry' ? 'text-blue-400' : type === 'final' ? 'text-purple-400' : 'text-amber-400';

  // Загружаем данные о попытках участников
  useEffect(() => {
    const loadParticipantsData = async () => {
      console.log('loadParticipantsData called with:', { test, eventId });
      if (!test?.id || !eventId) {
        console.log('Missing test.id or eventId, returning early');
        return;
      }
      
      try {
        // Сначала получаем всех участников мероприятия, которые присутствовали
        const { data: participantsData, error: participantsError } = await supabase
          .from('event_participants')
          .select(`
            user_id,
            user:users(id, full_name, email)
          `)
          .eq('event_id', eventId)
          .eq('attended', true);

        if (participantsError) throw participantsError;
        console.log('Participants data:', participantsData);

        if (!participantsData || participantsData.length === 0) {
          console.log('No participants found');
          setParticipants([]);
          setLoading(false);
          return;
        }

        const participantIds = participantsData.map(p => p.user_id);
        console.log('Participant IDs:', participantIds);
        console.log('Test ID:', test.id);
        console.log('Event ID:', eventId);

        // Теперь получаем попытки прохождения теста для этих участников
        const { data: attemptsData, error } = await supabase
          .from('user_test_attempts')
          .select(`
            id, score, status, created_at,
            user:users(id, full_name, email)
          `)
          .eq('test_id', test.id)
          .eq('event_id', eventId)
          .in('user_id', participantIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        console.log('Attempts data:', attemptsData);

        // Создаем объект с результатами всех участников
        const userResults = {};
        
        // Сначала добавляем всех участников без результатов
        participantsData.forEach(participant => {
          userResults[participant.user_id] = {
            user: participant.user,
            score: null,
            status: null,
            attemptId: null
          };
        });

        // Затем обновляем тех, кто проходил тест
        attemptsData?.forEach(attempt => {
          const userId = attempt.user.id;
          // Учитываем только завершенные попытки с результатом
          if (attempt.status === 'completed' && attempt.score !== null && attempt.score !== undefined) {
            if (!userResults[userId] || attempt.score > userResults[userId].score) {
              userResults[userId] = {
                user: attempt.user,
                score: attempt.score,
                status: attempt.status,
                attemptId: attempt.id
              };
            }
          }
        });

        console.log('User results:', userResults);
        setParticipants(Object.values(userResults));
      } catch (err) {
        console.error('Ошибка загрузки данных участников:', err);
      } finally {
        setLoading(false);
      }
    };

    loadParticipantsData();
  }, [test?.id, eventId]);

  // Считаем только тех участников, которые действительно проходили тест
  const participantsWithScores = participants.filter(p => p.score !== null && p.score !== undefined);
  const passedWithGoodScore = participantsWithScores.filter(p => test?.passing_score && test.passing_score > 0 ? p.score >= test.passing_score : p.score > 0).length;
  const totalParticipants = participants.length; // Общее количество участников
  const totalWithScores = participantsWithScores.length; // Количество проходивших тест
  const averageScore = totalWithScores > 0 
    ? Math.round(participantsWithScores.reduce((sum, p) => sum + p.score, 0) / totalWithScores)
    : 0;

  if (!test) {
    return (
      <div className={`${bgColor} border ${borderColor} rounded-xl shadow p-4 flex flex-col justify-between h-full`}>
        <div>
          <h3 className={`font-semibold flex items-center mb-2 ${titleColor}`}>
            <FileTextIcon className={`h-5 w-5 mr-2 ${iconColor}`} />
            {icon.label}
          </h3>
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">Тест не найден</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl shadow p-4 flex flex-col justify-between h-full`}>
      <div>
        <h3 className={`font-semibold flex items-center mb-2 ${titleColor}`}>
          <FileTextIcon className={`h-5 w-5 mr-2 ${iconColor}`} />
          {icon.label}
        </h3>
        <div className="mb-2">
          <h4 className="font-medium text-gray-900 mb-1">{test?.title || icon.label}</h4>
          <p className="text-sm text-gray-600">{test?.description || 'Описание теста'}</p>
        </div>
      </div>
      
      <div className="mt-3">
        {loading ? (
          <div className="text-center py-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-gray-500 mt-1">Загрузка...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Статистика */}
            <div className="bg-white rounded-lg p-2 border">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Прошли тест:</span>
                <span className="font-medium">{totalWithScores}/{totalParticipants}</span>
              </div>
              <div className="flex justify-between items-center text-xs mt-1">
                <span className="text-gray-600">Прошли с хорошим результатом:</span>
                <span className="font-medium">{passedWithGoodScore}/{totalWithScores}</span>
              </div>
              <div className="flex justify-between items-center text-xs mt-1">
                <span className="text-gray-600">Средний балл:</span>
                <span className="font-medium">{totalWithScores > 0 ? `${averageScore}%` : 'Нет данных'}</span>
              </div>
            </div>
            
            {/* Список участников - показывается только не участникам */}
            {participants.length > 0 && userProfile?.role !== 'employee' && (
              <div className="border-t border-gray-100 pt-2">
                <div className="text-xs text-gray-600 mb-2 font-medium">Участники мероприятия:</div>
                <div className="max-h-32 overflow-y-auto">
                  {participants.map((participant, index) => {
                    const hasScore = participant.score !== null && participant.score !== undefined;
                    return (
                      <div key={participant.attemptId || participant.user.id} className="flex justify-between items-center text-xs py-1 border-b border-gray-100 last:border-b-0">
                        <span className="text-gray-700 truncate flex-1">
                          {participant.user.full_name || participant.user.email}
                        </span>
                        {hasScore ? (
                          <span className={`font-medium ml-2 ${
                            test?.passing_score && test.passing_score > 0 ? participant.score >= test.passing_score : participant.score > 0 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {participant.score}%
                          </span>
                        ) : (
                          <span className="text-gray-400 ml-2 text-xs">
                            Не проходил
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {participants.length === 0 && (
              <div className="text-center py-2">
                <p className="text-xs text-gray-500">Нет участников</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TestCard({ type, testData, onStart, eventEndDate }) {
  const icon = ICONS[type];
  const test = testData.test;
  const available = testData.available;
  const completed = testData.completed;
  const score = testData.score;
  const passingScore = test?.passing_score;

  // Функция для расчета времени до доступности годового теста
  const formatTimeUntilAvailable = (eventEndDate) => {
    if (!eventEndDate) return 'Дата не указана';
    
    const endDate = new Date(eventEndDate);
    const threeMonthsLater = new Date(endDate);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    const currentDate = new Date();

    console.log('Annual test timer calculation:', {
      eventEndDate,
      endDate: endDate.toISOString(),
      threeMonthsLater: threeMonthsLater.toISOString(),
      currentDate: currentDate.toISOString(),
      isAvailable: currentDate >= threeMonthsLater
    });

    if (currentDate >= threeMonthsLater) {
      return 'Доступен';
    }

    const diffTime = threeMonthsLater.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;

    if (diffMonths > 0) {
      return `Доступен через ${diffMonths} ${diffMonths === 1 ? 'месяц' : diffMonths < 5 ? 'месяца' : 'месяцев'}${remainingDays > 0 ? ` и ${remainingDays} ${remainingDays === 1 ? 'день' : remainingDays < 5 ? 'дня' : 'дней'}` : ''}`;
    } else {
      return `Доступен через ${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'}`;
    }
  };

  // Цвета точно как на изображении, но годовой тест в корпоративном цвете
  const getCardStyles = (type) => {
    const baseStyles = {
      entry: {
        bg: 'bg-blue-50',
        bgHover: 'hover:bg-blue-100',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        title: 'text-blue-700',
        accent: 'bg-blue-600'
      },
      final: {
        bg: 'bg-purple-50',
        bgHover: 'hover:bg-purple-100',
        border: 'border-purple-200',
        icon: 'text-purple-600',
        title: 'text-purple-700',
        accent: 'bg-purple-600'
      },
      annual: {
        bg: 'bg-[#06A478]/10',
        bgHover: 'hover:bg-[#06A478]/20',
        border: 'border-[#06A478]/30',
        icon: 'text-[#06A478]',
        title: 'text-[#06A478]',
        accent: 'bg-[#06A478]'
      }
    };
    return baseStyles[type] || baseStyles.entry;
  };

  const styles = getCardStyles(type);

    return (
    <div className={`${styles.bg} ${styles.bgHover} ${styles.border} rounded-xl p-5 flex flex-col justify-between h-full transition-all duration-300 hover:shadow-md hover:-translate-y-1 group`}>
      <div>
        {/* Заголовок с иконкой */}
        <div className="flex items-center mb-3">
          <div className={`p-2 rounded-lg ${styles.accent} bg-opacity-20 mr-3 group-hover:scale-110 transition-transform duration-300`}>
            <FileTextIcon className={`h-5 w-5 ${styles.icon}`} />
          </div>
          <div>
            <h3 className={`font-semibold text-base ${styles.title}`}>{icon.label}</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-1.5 h-1.5 ${styles.accent} rounded-full`}></div>
              <span className="text-xs text-gray-500">Тест мероприятия</span>
            </div>
          </div>
        </div>

        {/* Название и описание теста */}
        <div className="mb-4">
          <h4 className="font-semibold text-gray-900 text-base mb-2">{test?.title || icon.label}</h4>
          <p className="text-sm text-gray-600">{test?.description || 'Описание теста'}</p>
        </div>

        {/* Информация о тесте */}
        <div className="flex items-center space-x-4 text-xs text-gray-500 mb-4">
          <div className="flex items-center space-x-1">
            <ClockIcon className="h-3 w-3" />
            <span>{test?.time_limit === 0 ? 'Без ограничений' : `${test?.time_limit} мин`}</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircleIcon className="h-3 w-3" />
            <span>{passingScore && passingScore > 0 ? `Проходной: ${passingScore}%` : 'Без ограничений'}</span>
          </div>
        </div>
      </div>

      {/* Статус/действие */}
      <div className="flex flex-col items-center">
        {available ? (
          completed ? (
            <div className="text-center w-full">
              <div className={`text-2xl font-bold ${styles.title} mb-2`}>{score}%</div>
              <div className={`${styles.accent} bg-opacity-20 h-10 flex items-center justify-center rounded-lg text-sm font-medium ${styles.title} w-full`}>
                {passingScore && passingScore > 0 ? (score >= passingScore ? 'Тест пройден' : 'Тест не пройден') : 'Тест завершен'}
              </div>
            </div>
          ) : (
            <button
              onClick={() => onStart(type)}
              className={`w-full ${styles.accent} text-white h-10 rounded-lg transition-all duration-300 font-medium flex items-center justify-center hover:shadow-md transform hover:scale-[1.02] group-hover:animate-pulse`}
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              <span>Пройти тест</span>
            </button>
          )
        ) : (
          <div className="text-center w-full">
            {type === 'annual' ? (
              <div className={`${styles.accent} bg-opacity-20 h-10 flex items-center justify-center rounded-lg text-sm ${styles.title} w-full`}>
                {formatTimeUntilAvailable(eventEndDate)}
              </div>
            ) : (
              <div className="bg-gray-100 text-gray-500 h-10 flex items-center justify-center rounded-lg text-sm w-full">
                {type === 'final'
                  ? 'Сначала пройдите входной тест'
                  : 'Тест недоступен'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventTestPrompts({ eventId, onStartTest, testStatus, refreshKey = 0 }) {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [hasAttended, setHasAttended] = useState(false);
  const [eventEndDate, setEventEndDate] = useState(null);

  useEffect(() => {
    const checkUserAccess = async () => {
      if (!eventId || !userProfile?.id) return;
      setLoading(true);
      setError(null);
      try {
        // Получаем информацию о мероприятии
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('end_date, start_date')
          .eq('id', eventId)
          .single();

        if (eventError) throw eventError;
        
        // Используем end_date или start_date как fallback
        const endDate = eventData.end_date || eventData.start_date;
        setEventEndDate(endDate);

        const { data: participantData, error: participantError } = await supabase
          .from('event_participants')
          .select('id, attended')
          .eq('event_id', eventId)
          .eq('user_id', userProfile.id)
          .maybeSingle();

        if (participantError) throw participantError;

        const userIsParticipant = !!participantData;
        const userHasAttended = participantData?.attended || false;

        setIsParticipant(userIsParticipant);
        setHasAttended(userHasAttended);
      } catch (err) {
        console.error('Ошибка при проверке прав доступа:', err);
        setError('Не удалось проверить права доступа');
      } finally {
        setLoading(false);
      }
    };

    checkUserAccess();
  }, [eventId, userProfile?.id]);

  // Обновление данных при изменении refreshKey
  useEffect(() => {
    if (refreshKey > 0) {
      checkUserAccess();
    }
  }, [refreshKey]);

  // Обновляем компонент каждую минуту для актуального таймера
  useEffect(() => {
    if (!eventEndDate) return;
    
    const interval = setInterval(() => {
      // Принудительно обновляем компонент для пересчета таймера
      setEventEndDate(prev => prev);
    }, 60000); // каждую минуту

    return () => clearInterval(interval);
  }, [eventEndDate]);

  const handleStartTest = async (testType) => {
    // Проверяем, имеет ли пользователь административные права
    const hasAdminAccess = userProfile?.role === 'administrator' || userProfile?.role === 'moderator' || userProfile?.role === 'trainer' || userProfile?.role === 'expert';
    
    // Если администратор не является участником, не позволяем проходить тесты
    if (hasAdminAccess && !isParticipant) {
      alert('Для прохождения тестов необходимо зарегистрироваться на мероприятие как участник.');
      return;
    }

    const testInfo = testStatus[testType];
    if (!testInfo || !testInfo.test) {
      alert('Тест не найден');
      return;
    }
    
    if (testInfo.completed) {
      alert(`Вы уже прошли этот тест. Ваш результат: ${testInfo.score}%`);
      return;
    }
    
    if (testInfo.attemptId) {
      onStartTest(testType, testInfo.attemptId);
      return;
    }

    // Если нет attemptId, создаем новую попытку
    try {
      const { data: newAttempt, error } = await supabase
        .from('user_test_attempts')
        .insert({
          user_id: userProfile.id,
          test_id: testInfo.test.id,
          event_id: eventId,
          status: 'in_progress',
          start_time: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      onStartTest(testType, newAttempt.id);
    } catch (err) {
      console.error('Ошибка при создании попытки теста:', err);
      
      // Проверяем, является ли это ошибкой от триггера о дублировании
      if (err.message && err.message.includes('Тест уже пройден')) {
        alert(err.message);
      } else {
        alert('Не удалось создать попытку теста. Пожалуйста, попробуйте еще раз.');
      }
    }
  };

  if (!userProfile) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <AlertCircleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Требуется авторизация</h3>
        <p className="text-yellow-700">Пожалуйста, войдите в систему, чтобы получить доступ к тестам.</p>
      </div>
    );
  }

  // Проверяем, имеет ли пользователь административные права
  const hasAdminAccess = userProfile?.role === 'administrator' || userProfile?.role === 'moderator' || userProfile?.role === 'trainer' || userProfile?.role === 'expert';

  if (!loading && !isParticipant && !hasAdminAccess) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
        <AlertCircleIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-blue-800 mb-2">Вы не являетесь участником</h3>
        <p className="text-blue-700">Чтобы получить доступ к тестам, необходимо зарегистрироваться на мероприятие.</p>
      </div>
    );
  }

  // Показываем информационное сообщение для администраторов, которые не являются участниками
  if (!loading && !isParticipant && hasAdminAccess) {
    console.log('Rendering admin view with testStatus:', testStatus);
    
    // Проверяем, есть ли тесты для отображения
    const hasTests = testStatus.entry.test || testStatus.final.test || testStatus.annual?.test;
    
    if (!hasTests) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <AlertCircleIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-blue-800 mb-2">Тесты не найдены</h3>
          <p className="text-blue-700">Для этого мероприятия не настроены тесты.</p>
        </div>
      );
    }
    
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testStatus.entry.test && <AdminTestCard type="entry" testData={testStatus.entry} eventId={eventId} />}
          {testStatus.final.test && <AdminTestCard type="final" testData={testStatus.final} eventId={eventId} />}
          {testStatus.annual?.test && <AdminTestCard type="annual" testData={testStatus.annual} eventId={eventId} />}
        </div>
        
        {/* Кнопка детальной статистики для администраторов */}
        <div className="mt-4">
          <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-gray-200 mr-3">
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-base text-gray-800">Детальная статистика</h3>
                <p className="text-sm text-gray-500">Каждый ответ участника, время прохождения, правильность решений</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/event-test-results/${eventId}`)}
              className="px-6 py-2 bg-[#06A478] text-white rounded-lg font-medium hover:bg-[#059669]"
            >
              Открыть
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!loading && isParticipant && !hasAttended && !hasAdminAccess) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
        <AlertCircleIcon className="h-12 w-12 text-orange-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-orange-800 mb-2">Отметка о присутствии отсутствует</h3>
        <p className="text-orange-700">Доступ к тестам открывается после подтверждения вашего присутствия на мероприятии.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Загрузка тестов...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-800 mb-2">Ошибка загрузки</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  // Проверяем, есть ли тесты для отображения
  const hasTests = testStatus.entry.test || testStatus.final.test || testStatus.annual?.test;
  
  if (!hasTests) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <AlertCircleIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-800 mb-2">Тесты не найдены</h3>
        <p className="text-gray-700">Для этого мероприятия не настроены тесты.</p>
      </div>
    );
  }

      return (
    <div className="space-y-6">
      {/* Заголовок секции */}
      <div className="mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Тесты мероприятия</h2>
          <p className="text-sm text-gray-600">Проверьте свои знания и получите сертификат</p>
        </div>
      </div>

      {/* Сетка карточек тестов */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {testStatus.entry.test && <TestCard type="entry" testData={testStatus.entry} onStart={handleStartTest} eventEndDate={eventEndDate} />}
        {testStatus.final.test && <TestCard type="final" testData={testStatus.final} onStart={handleStartTest} eventEndDate={eventEndDate} />}
        {testStatus.annual?.test && <TestCard type="annual" testData={testStatus.annual} onStart={handleStartTest} eventEndDate={eventEndDate} />}
      </div>
      
              {/* Кнопка детальной статистики (только для администраторов) */}
        {userProfile?.role && ['administrator', 'moderator', 'trainer', 'expert'].includes(userProfile.role) && (
          <div className="mt-4">
            <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-gray-200 mr-3">
                  <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-base text-gray-800">Детальная статистика</h3>
                  <p className="text-sm text-gray-500">Каждый ответ участника, время прохождения, правильность решений</p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/event-test-results/${eventId}`)}
                className="px-6 py-2 bg-[#06A478] text-white rounded-lg font-medium hover:bg-[#059669]"
              >
                Открыть
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
