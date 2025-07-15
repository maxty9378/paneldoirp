import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

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

const ICONS = {
  entry: { color: 'blue', label: 'Входной тест' },
  final: { color: 'purple', label: 'Финальный тест' },
  annual: { color: 'amber', label: 'Годовой тест' },
};

function StatusBadge({ score }) {
  const isZero = score === 0;
  return (
    <div className={`p-3 rounded-lg text-center font-medium ${isZero ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
      Результат: {score}%
      <span className="block text-xs mt-1">Тест пройден</span>
    </div>
  );
}

function TestCard({ type, testData, onStart }) {
  const icon = ICONS[type];
  const test = testData.test;
  const available = testData.available;
  const completed = testData.completed;
  const score = testData.score;
  const passingScore = test?.passing_score || 70;
  const timeLimit = test?.time_limit ? `${test.time_limit} мин` : 'Без ограничения времени';

  // Цвета для разных типов тестов
  const bgColor = type === 'entry' ? 'bg-blue-50' : type === 'final' ? 'bg-purple-50' : 'bg-amber-50';
  const borderColor = type === 'entry' ? 'border-blue-200' : type === 'final' ? 'border-purple-200' : 'border-amber-200';
  const titleColor = type === 'entry' ? 'text-blue-700' : type === 'final' ? 'text-purple-700' : 'text-amber-700';
  const buttonColor = type === 'entry' ? 'bg-blue-500 hover:bg-blue-600' : type === 'final' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-amber-500 hover:bg-amber-600';
  const iconColor = type === 'entry' ? 'text-blue-400' : type === 'final' ? 'text-purple-400' : 'text-amber-400';

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
        <div className="flex items-center text-xs text-gray-500 mb-1">
          <ClockIcon className="h-4 w-4 mr-1" />
          {timeLimit}
        </div>
        {/* Удалить/не показывать "Проходной балл: 70%" в карточках теста */}
      </div>
      <div className="mt-2">
        {available ? (
          completed ? (
            <StatusBadge score={score} />
          ) : (
            <button
              onClick={() => onStart(type)}
              className={`w-full ${buttonColor} text-white py-2 px-4 rounded transition-colors font-semibold flex items-center justify-center`}
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Пройти тест
            </button>
          )
        ) : (
          <div className="text-center mt-2">
            {type === 'annual' ? (
              <button
                disabled
                className="w-full bg-amber-100 text-amber-700 text-base py-2 px-4 rounded flex items-center justify-center opacity-60 cursor-not-allowed"
                title="Будет доступен через 3 месяца после мероприятия"
              >
                <LockIcon className="h-5 w-5 mr-2 text-amber-400" />
                Будет доступен через 3 месяца
              </button>
            ) : (
              <>
                <LockIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">
                  {type === 'final'
                    ? 'Сначала пройдите входной тест'
                    : 'Тест недоступен'}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventTestPrompts({ eventId, onStartTest }) {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventDetails, setEventDetails] = useState(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [hasAttended, setHasAttended] = useState(false);
  const [tests, setTests] = useState({
    entry: { available: false, completed: false, score: null, attemptId: null, test: null },
    final: { available: false, completed: false, score: null, attemptId: null, test: null },
    annual: { available: false, completed: false, score: null, attemptId: null, test: null }
  });

  useEffect(() => {
    const fetchEventAndTestStatus = async () => {
      if (!eventId || !userProfile?.id) return;
      setLoading(true);
      setError(null);
      try {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select(`id, title, event_type:event_type_id(id, name, name_ru, has_entry_test, has_final_test)`)
          .eq('id', eventId)
          .single();

        if (eventError) throw eventError;
        setEventDetails(eventData);

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

        if (!userIsParticipant || !userHasAttended) {
          setLoading(false);
          return;
        }

        const { data: testsData, error: testsError } = await supabase
          .from('tests')
          .select('*')
          .eq('event_type_id', eventData.event_type.id)
          .eq('status', 'active');

        if (testsError) throw testsError;

        const { data: attemptsData, error: attemptsError } = await supabase
          .from('user_test_attempts')
          .select(`id, test_id, status, score, test:tests(id, title, type, description, time_limit, passing_score)`)
          .eq('event_id', eventId)
          .eq('user_id', userProfile.id);

        if (attemptsError) throw attemptsError;

        const updatedTests = { ...tests };

        // Новый способ: ищем завершённую попытку, иначе берём последнюю
        ['entry', 'final', 'annual'].forEach(type => {
          const attempts = attemptsData?.filter(a => a.test?.type === type) || [];
          const completedAttempt = attempts.find(a => a.status === 'completed');
          const lastAttempt = attempts[0];

          if (completedAttempt) {
            updatedTests[type] = {
              available: true,
              completed: true,
              score: completedAttempt.score,
              attemptId: completedAttempt.id,
              test: completedAttempt.test
            };
          } else if (lastAttempt) {
            updatedTests[type] = {
              available: true,
              completed: false,
              score: lastAttempt.score,
              attemptId: lastAttempt.id,
              test: lastAttempt.test
            };
          } else {
            updatedTests[type] = {
              ...updatedTests[type],
              available: false,
              completed: false,
              score: null,
              attemptId: null,
              test: null
            };
          }
        });

        testsData?.forEach(test => {
          const testType = test.type;
          if (testType && ['entry', 'final', 'annual'].includes(testType) && !updatedTests[testType].test) {
            let isAvailable = false;
            if (testType === 'entry') {
              isAvailable = true;
            } else if (testType === 'final') {
              isAvailable = updatedTests.entry.completed;
            } else if (testType === 'annual') {
              isAvailable = false;
            }

            if (isAvailable) {
              updatedTests[testType] = {
                ...updatedTests[testType],
                available: true,
                test: test
              };
            }
          }
        });

        setTests(updatedTests);
      } catch (err) {
        console.error('Ошибка при загрузке тестов:', err);
        setError('Не удалось загрузить информацию о тестах');
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndTestStatus();
  }, [eventId, userProfile?.id]);

  const handleStartTest = async (testType) => {
    const testInfo = tests[testType];
    if (testInfo.completed) {
      alert(`Вы уже прошли этот тест. Ваш результат: ${testInfo.score}%`);
      return;
    }
    if (testInfo.attemptId) {
      onStartTest(testType);
      return;
    }

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

      setTests(prev => ({
        ...prev,
        [testType]: {
          ...prev[testType],
          attemptId: newAttempt.id
        }
      }));

      onStartTest(testType);
    } catch (err) {
      console.error('Ошибка при создании попытки теста:', err);
      alert('Не удалось создать попытку теста. Пожалуйста, попробуйте еще раз.');
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

  if (!loading && !isParticipant) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
        <AlertCircleIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-blue-800 mb-2">Вы не являетесь участником</h3>
        <p className="text-blue-700">Чтобы получить доступ к тестам, необходимо зарегистрироваться на мероприятие.</p>
      </div>
    );
  }

  if (!loading && isParticipant && !hasAttended) {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <TestCard type="entry" testData={tests.entry} onStart={handleStartTest} />
      <TestCard type="final" testData={tests.final} onStart={handleStartTest} />
      {tests.annual && <TestCard type="annual" testData={tests.annual} onStart={handleStartTest} />}
    </div>
  );
}
