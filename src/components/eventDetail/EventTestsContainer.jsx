import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import EventTestPrompts from './EventTestPrompts';
import AdminTestSection from './AdminTestSection';
import { TestTakingView } from '../admin/TestTakingView';
import TestResults from './TestResults';
import { useNavigate } from 'react-router-dom';
import { FileText, BarChart3 } from 'lucide-react';

export default function EventTestsContainer({ eventId, userProfile, isAdmin, onStartTest, refreshKey = 0, onRefreshData }) {
  const [activeView, setActiveView] = useState('list'); // 'list', 'test', 'results'
  const [activeTestType, setActiveTestType] = useState(null); // 'entry', 'final', 'annual'
  const [activeTestId, setActiveTestId] = useState(null);
  const [activeAttemptId, setActiveAttemptId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tests, setTests] = useState([]); // все тесты для типа мероприятия
  const [testStatus, setTestStatus] = useState({
    entry: { available: false, completed: false, score: null, attemptId: null, testId: null, test: null },
    final: { available: false, completed: false, score: null, attemptId: null, testId: null, test: null },
    annual: { available: false, completed: false, score: null, attemptId: null, testId: null, test: null }
  });
  const [isTestsExpanded, setIsTestsExpanded] = useState(true); // состояние сворачивания секции тестирования
  const navigate = useNavigate();
  
  // Определяем, является ли пользователь участником (employee)
  const isEmployee = userProfile?.role === 'employee';
  
  // Для сотрудников разворачиваем секцию по умолчанию
  useEffect(() => {
    if (isEmployee) {
      setIsTestsExpanded(true);
    }
  }, [isEmployee]);

  // Функция для получения описания в зависимости от роли пользователя
  const getTestDescription = () => {
    const hasAdminAccess = userProfile?.role === 'administrator' || userProfile?.role === 'moderator' || userProfile?.role === 'trainer' || userProfile?.role === 'expert';
    
    if (hasAdminAccess) {
      return 'Контролируйте результаты тестирования и анализируйте эффективность обучения';
    } else {
      return 'Проверьте свои знания и получите сертификат о прохождении обучения';
    }
  };
  
  // Функция для загрузки тестов и попыток
  const fetchTestsAndAttempts = async () => {
    if (!eventId || !userProfile?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Получаем event_type_id по eventId
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('event_type_id')
        .eq('id', eventId)
        .single();
        
      if (eventError) {
        console.error('Ошибка при получении типа мероприятия:', eventError);
        throw new Error('Не удалось получить информацию о мероприятии');
      }
      
      if (!eventData) {
        throw new Error('Мероприятие не найдено');
      }
      
      const eventTypeId = eventData.event_type_id;
      console.log('eventTypeId:', eventTypeId);
      
      // Получаем все тесты для типа мероприятия
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .eq('event_type_id', eventTypeId)
        .eq('status', 'active');
        
      if (testsError) {
        console.error('Ошибка при получении тестов:', testsError);
        throw new Error('Не удалось загрузить тесты');
      }
      
      setTests(testsData || []);
      console.log('tests:', testsData);

      // Создаем новый объект статуса
      const statusObj = {
        entry: { available: false, completed: false, score: null, attemptId: null, testId: null, test: null },
        final: { available: false, completed: false, score: null, attemptId: null, testId: null, test: null },
        annual: { available: false, completed: false, score: null, attemptId: null, testId: null, test: null }
      };
      
      // Новый способ: ищем завершённую попытку, иначе берём последнюю
      for (const test of testsData || []) {
        if (!['entry', 'final', 'annual'].includes(test.type)) {
          console.warn(`Неизвестный тип теста: ${test.type}`);
          continue;
        }
        
        // Пропускаем, если уже есть данные для этого типа теста
        if (statusObj[test.type].testId) {
          console.log(`Skipping duplicate ${test.type} test:`, test.id);
          continue;
        }
        
        // Ищем все попытки для текущего мероприятия
        const { data: attempts, error: attemptError } = await supabase
          .from('user_test_attempts')
          .select('id, status, score, created_at')
          .eq('test_id', test.id)
          .eq('user_id', userProfile.id)
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });
        if (attemptError) {
          console.error(`Ошибка при получении попытки для теста ${test.type}:`, attemptError);
        }
        
        let completedAttempt = null;
        let lastAttempt = null;
        
        if (attempts && attempts.length > 0) {
          // Ищем завершенную попытку среди попыток для данного мероприятия
          completedAttempt = attempts.find(a => a.status === 'completed');
          // Последняя попытка (самая свежая)
          lastAttempt = attempts[0];
        }
        // Проверяем, есть ли открытые вопросы в тесте
        const { data: questionsData, error: questionsError } = await supabase
          .from('test_questions')
          .select('question_type')
          .eq('test_id', test.id);

        if (questionsError) {
          console.error(`Ошибка при получении вопросов для теста ${test.type}:`, questionsError);
        }
        
        const hasOpenEndedQuestions = questionsData?.some(q => q.question_type === 'text') || false;

        console.log(`Test ${test.type}:`, {
          testId: test.id,
          attemptsCount: attempts?.length || 0,
          completedAttempt: completedAttempt?.id,
          lastAttempt: lastAttempt?.id,
          lastAttemptStatus: lastAttempt?.status,
          hasOpenEndedQuestions
        });

        if (completedAttempt) {
          // Если есть завершенная попытка для данного мероприятия, показываем результат
          // Но если тест имеет открытые вопросы и балл 0, считаем его на проверке
          let finalStatus = completedAttempt.status;
          if (hasOpenEndedQuestions && completedAttempt.score === 0 && completedAttempt.status === 'completed') {
            finalStatus = 'pending_review';
          }
          
          statusObj[test.type] = {
            available: true,
            completed: true,
            score: completedAttempt.score,
            attemptId: completedAttempt.id,
            testId: test.id,
            test: test,
            status: finalStatus // Добавляем статус для проверки
          };
        } else if (lastAttempt) {
          // Если есть попытка для текущего мероприятия, показываем её статус
          // Но если тест имеет открытые вопросы и балл 0, считаем его на проверке
          let finalStatus = lastAttempt.status;
          if (hasOpenEndedQuestions && lastAttempt.score === 0 && lastAttempt.status === 'completed') {
            finalStatus = 'pending_review';
          }
          
          statusObj[test.type] = {
            available: true,
            completed: lastAttempt.status === 'completed',
            score: lastAttempt.score,
            attemptId: lastAttempt.id,
            testId: test.id,
            test: test,
            status: finalStatus // Добавляем статус для проверки
          };
        } else {
          // Если нет попыток для данного мероприятия, тест недоступен
          statusObj[test.type] = {
            ...statusObj[test.type],
            available: false,
            completed: false,
            score: null,
            attemptId: null,
            testId: test.id,
            test: test
          };
        }
      }
      
      // Создаем попытки для всех тестов, если их нет
      for (const test of testsData || []) {
        if (!['entry', 'final', 'annual'].includes(test.type)) continue;
        
        const currentStatus = statusObj[test.type];
        if (!currentStatus.attemptId) {
          console.log(`Creating ${test.type} test attempt:`, { testId: test.id });
          
          const { data: newAttempt, error: createError } = await supabase
            .from('user_test_attempts')
            .insert({
              user_id: userProfile.id,
              test_id: test.id,
              event_id: eventId,
              status: 'in_progress',
              start_time: new Date().toISOString()
            })
            .select()
            .single();
            
          if (createError) {
            console.error(`Ошибка при создании попытки для ${test.type} теста:`, createError);
          } else if (newAttempt) {
            statusObj[test.type] = {
              available: true,
              completed: false,
              score: null,
              attemptId: newAttempt.id,
              testId: test.id,
              test: test
            };
          }
        }
      }
      
      // Для финального теста (если входной пройден)
      const finalTest = testsData?.find(t => t.type === 'final');
      if (finalTest && !statusObj.final.attemptId && 
          statusObj.entry.completed) {
        const { data: newAttempt, error: createError } = await supabase
          .from('user_test_attempts')
          .insert({
            user_id: userProfile.id,
            test_id: finalTest.id,
            event_id: eventId,
            status: 'in_progress',
            start_time: new Date().toISOString()
          })
          .select()
          .single();
          
        if (createError) {
          console.error('Ошибка при создании попытки для финального теста:', createError);
        } else if (newAttempt) {
          statusObj.final = {
            available: true,
            completed: false,
            score: null,
            attemptId: newAttempt.id,
            testId: finalTest.id,
            test: finalTest
          };
        }
      }
      
      console.log('Final statusObj:', statusObj);
      setTestStatus(statusObj);
      
    } catch (err) {
      console.error('Ошибка при загрузке тестов:', err);
      setError(err.message || 'Ошибка загрузки тестов');
    } finally {
      setLoading(false);
    }
  };
  
  // Загрузка тестов при монтировании компонента
  useEffect(() => {
    fetchTestsAndAttempts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, userProfile?.id]);

  // Обновление данных при изменении refreshKey
  useEffect(() => {
    if (refreshKey > 0) {
      fetchTestsAndAttempts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);
  
  // Запуск теста (создаёт attempt если нужно)
  const handleStartTest = async (testType) => {
    console.log('🎯 EventTestsContainer handleStartTest вызвана с testType:', testType);
    console.log('📚 Доступные тесты:', tests);
    console.log('📊 Текущий testStatus:', testStatus);
    
    const test = tests.find(t => t.type === testType);
    if (!test) {
      console.log('❌ Тест не найден для типа:', testType);
      alert('Тест не найден');
      return;
    }
    console.log('✅ Найден тест:', test);
    
    let attemptId = testStatus[testType]?.attemptId;
    console.log('🆔 Существующий attemptId:', attemptId);
    if (!attemptId) {
      try {
        // Сначала проверяем, есть ли уже попытка
        const { data: existingAttempt, error: checkError } = await supabase
          .from('user_test_attempts')
          .select('id, status')
          .eq('user_id', userProfile.id)
          .eq('test_id', test.id)
          .eq('event_id', eventId)
          .maybeSingle();

        if (checkError) {
          console.error('Ошибка при проверке существующих попыток:', checkError);
          alert('Ошибка проверки попыток теста');
          return;
        }

        if (existingAttempt) {
          console.log('✅ Найдена существующая попытка:', existingAttempt.id, 'статус:', existingAttempt.status);
          attemptId = existingAttempt.id;
          setTestStatus(prev => ({
            ...prev,
            [testType]: {
              ...prev[testType],
              attemptId: existingAttempt.id
            }
          }));
        } else {
          // Создаём новую попытку только если её нет
          console.log('🆕 Создаем новую попытку для теста:', test.id);
          const { data: newAttempt, error } = await supabase
            .from('user_test_attempts')
            .insert({
              user_id: userProfile.id,
              test_id: test.id,
              event_id: eventId,
              status: 'in_progress',
              start_time: new Date().toISOString()
            })
            .select()
            .single();
          if (error) {
            console.error('❌ Ошибка при создании попытки теста:', error);
            alert('Ошибка создания попытки теста');
            return;
          }
          if (!newAttempt) {
            console.error('❌ Не удалось создать попытку теста');
            alert('Не удалось создать попытку теста');
            return;
          }
          console.log('✅ Создана новая попытка:', newAttempt);
          attemptId = newAttempt.id;
          setTestStatus(prev => ({
            ...prev,
            [testType]: {
              ...prev[testType],
              attemptId: newAttempt.id
            }
          }));
        }
      } catch (err) {
        console.error('Ошибка при создании попытки теста:', err);
        alert('Произошла ошибка при создании попытки теста');
        return;
      }
    }
    // Устанавливаем активные параметры теста
    console.log('🎬 Устанавливаем активные параметры теста:', { testType, testId: test.id, attemptId });
    setActiveTestType(testType);
    setActiveTestId(test.id);
    setActiveAttemptId(attemptId);
    setActiveView('test');
    
    // Вызываем внешний обработчик, если он предоставлен
    if (onStartTest) {
      console.log('📞 Вызываем внешний onStartTest с параметрами:', { testId: test.id, eventId, attemptId });
      onStartTest(test.id, eventId, attemptId);
    } else {
      console.log('⚠️ onStartTest не предоставлен');
    }
  };
  
  // После завершения теста — обновить статусы
  const handleCompleteTest = () => {
    setActiveView('results');
    // Перезагрузить статусы тестов
    fetchTestsAndAttempts(); // Используем нашу функцию вместо перезагрузки страницы
    
    // Уведомляем родительский компонент о необходимости обновления данных
    if (onRefreshData) {
      onRefreshData();
    }
  };
  
  // Обработчик возврата к списку тестов
  const handleBackToList = () => {
    setActiveView('list');
    setActiveTestType(null);
    setActiveTestId(null);
    setActiveAttemptId(null);
    fetchTestsAndAttempts(); // Обновляем данные при возврате к списку
  };
  
  // Обработчик просмотра результатов теста
  const handleViewResults = (testType, attemptId) => {
    setActiveTestType(testType);
    setActiveAttemptId(attemptId);
    setActiveView('results');
  };
  
  // Удаляю внешний контейнер, возвращаю только содержимое
  return (
    <>
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="bg-gray-100 border border-gray-200 rounded-xl p-3 sm:p-4 animate-pulse flex flex-col justify-between h-full min-h-[160px] sm:min-h-[180px]">
                  <div>
                    <div className="h-4 sm:h-5 w-24 sm:w-32 bg-gray-200 rounded mb-2" />
                    <div className="h-3 sm:h-4 w-32 sm:w-40 bg-gray-200 rounded mb-1" />
                    <div className="h-3 w-20 sm:w-24 bg-gray-200 rounded mb-1" />
                    <div className="h-3 w-24 sm:w-28 bg-gray-200 rounded mb-2" />
                  </div>
                  <div className="mt-2">
                    <div className="h-8 sm:h-10 w-full bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 text-center">
          <p className="text-red-600 text-sm sm:text-base">{error}</p>
          <button 
            onClick={fetchTestsAndAttempts}
            className="mt-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm sm:text-base"
          >
            Попробовать снова
          </button>
        </div>
      ) : (
        <>
          {activeView === 'list' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Заголовок с возможностью сворачивания */}
              <div 
                className="px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-gray-100 cursor-pointer"
                onClick={() => setIsTestsExpanded(!isTestsExpanded)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900">Тестирование</h3>
                    <p className="text-xs sm:text-sm text-gray-400">{getTestDescription()}</p>
                  </div>
                  
                </div>
              </div>

              {/* Содержимое секции */}
              {isTestsExpanded && (
                <div className="p-4 sm:p-6">
                  <EventTestPrompts 
                    eventId={eventId} 
                    userProfile={userProfile} 
                    onStartTest={(testId, eventId, attemptId) => {
                      console.log('🔄 EventTestPrompts вызывает onStartTest с:', { testId, eventId, attemptId });
                      // Находим тип теста по ID
                      const test = tests.find(t => t.id === testId);
                      if (test) {
                        console.log('🎯 Найден тест для запуска:', test);
                        handleStartTest(test.type);
                      } else {
                        console.error('❌ Тест не найден по ID:', testId);
                      }
                    }}
                    testStatus={testStatus}
                    refreshKey={refreshKey}
                  />
                  
                  {isAdmin && (
                    <AdminTestSection 
                      eventId={eventId} 
                      userProfile={userProfile} 
                      onStartTest={(testId, eventId, attemptId) => {
                        console.log('🔄 AdminTestSection вызывает onStartTest с:', { testId, eventId, attemptId });
                        // Находим тип теста по ID
                        const test = tests.find(t => t.id === testId);
                        if (test) {
                          console.log('🎯 Найден тест для запуска:', test);
                          handleStartTest(test.type);
                        } else {
                          console.error('❌ Тест не найден по ID:', testId);
                        }
                      }}
                      testStatus={testStatus}
                    />
                  )}
                </div>
              )}
            </div>
          )}
          {activeView === 'test' && activeTestId && activeAttemptId && (
            <TestTakingView
              testId={activeTestId}
              eventId={eventId}
              attemptId={activeAttemptId}
              onComplete={handleCompleteTest}
              onCancel={handleBackToList}
            />
          )}
          {activeView === 'results' && activeAttemptId && (
            <TestResults 
              attemptId={activeAttemptId}
              onClose={handleBackToList}
            />
          )}
        </>
      )}
    </>
  );
}