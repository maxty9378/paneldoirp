import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Play, 
  CheckCircle, 
  Clock, 
  Calendar, 
  Award, 
  AlertCircle, 
  Users, 
  BarChart3,
  Eye,
  ArrowRight,
  Loader2,
  Lock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

interface TestAttempt {
  id: string;
  test_id: string;
  event_id: string;
  status: 'in_progress' | 'completed' | 'failed';
  score: number | null;
  start_time: string;
  end_time: string | null;
  test: {
    id: string;
    title: string;
    description?: string;
    type: 'entry' | 'final' | 'annual';
    passing_score: number;
    time_limit: number;
  };
  event: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
  };
}

interface FutureTest {
  test: {
    id: string;
    title: string;
    description?: string;
    type: 'entry' | 'final' | 'annual';
    passing_score: number;
    time_limit: number;
  };
  event: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
  };
  scheduled_date?: string;
  isAvailable?: boolean;
}

export function ParticipantTestsView() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [completedTests, setCompletedTests] = useState<TestAttempt[]>([]);
  const [futureTests, setFutureTests] = useState<FutureTest[]>([]);
  const [activeTests, setActiveTests] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'completed' | 'future' | 'active'>('active');

  useEffect(() => {
    if (userProfile?.id) {
      fetchParticipantTests();
    }
  }, [userProfile?.id]);

  const fetchParticipantTests = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Загружаем пройденные тесты (тесты с результатом)
      const { data: completedData, error: completedError } = await supabase
        .from('user_test_attempts')
        .select(`
          id,
          test_id,
          event_id,
          status,
          score,
          start_time,
          end_time,
          test:tests(
            id,
            title,
            description,
            type,
            passing_score,
            time_limit
          ),
          event:events(
            id,
            title,
            start_date,
            end_date
          )
        `)
        .eq('user_id', userProfile.id)
        .not('score', 'is', null)
        .order('end_time', { ascending: false });

      console.log('Completed tests raw data:', completedData);
      console.log('Completed tests details:', completedData?.map(attempt => ({
        id: attempt.id,
        test_id: attempt.test_id,
        test_title: attempt.test.title,
        test_type: attempt.test.type,
        status: attempt.status,
        score: attempt.score,
        start_time: attempt.start_time
      })));
      if (completedError) throw completedError;
      setCompletedTests(completedData || []);

      // Загружаем активные тесты (в процессе прохождения)
      // Исключаем тесты, которые уже имеют результат
      let { data: activeData, error: activeError } = await supabase
        .from('user_test_attempts')
        .select(`
          id,
          test_id,
          event_id,
          status,
          score,
          start_time,
          end_time,
          test:tests(
            id,
            title,
            description,
            type,
            passing_score,
            time_limit
          ),
          event:events(
            id,
            title,
            start_date,
            end_date
          )
        `)
        .eq('user_id', userProfile.id)
        .in('status', ['in_progress', 'failed'])
        .is('score', null)
        .order('start_time', { ascending: false });

      // Дополнительно фильтруем тесты, для которых есть завершенная попытка
      if (activeData && activeData.length > 0) {
        const testIdsWithCompletedAttempts = new Set();
        
        // Получаем все завершенные попытки для этих тестов
        const { data: completedAttempts } = await supabase
          .from('user_test_attempts')
          .select('test_id, event_id')
          .eq('user_id', userProfile.id)
          .eq('status', 'completed')
          .not('score', 'is', null);

        // Создаем множество тестов с завершенными попытками
        completedAttempts?.forEach(attempt => {
          testIdsWithCompletedAttempts.add(`${attempt.test_id}-${attempt.event_id}`);
        });

        // Фильтруем активные тесты, исключая те, для которых есть завершенная попытка
        const filteredActiveData = activeData.filter(attempt => {
          const key = `${attempt.test_id}-${attempt.event_id}`;
          return !testIdsWithCompletedAttempts.has(key);
        });

        console.log('Active tests after filtering completed:', filteredActiveData);
        
        // Передаем отфильтрованные данные дальше
        activeData = filteredActiveData;
      }

            console.log('Active tests raw data:', activeData);
      console.log('Active tests details:', activeData?.map(attempt => ({
        id: attempt.id,
        test_id: attempt.test_id,
        test_title: attempt.test.title,
        test_type: attempt.test.type,
        status: attempt.status,
        score: attempt.score,
        start_time: attempt.start_time
      })));
      if (activeError) throw activeError;

      // Загружаем будущие тесты (участие в мероприятиях с тестами)
      console.log('Fetching future tests for user:', userProfile.id);
      
      const { data: futureData, error: futureError } = await supabase
        .from('event_participants')
        .select(`
          event_id,
          attended,
          event:events(
            id,
            title,
            start_date,
            end_date,
            event_type:event_type_id(
              id,
              has_entry_test,
              has_final_test,
              has_annual_test
            )
          )
        `)
        .eq('user_id', userProfile.id);

      console.log('Event participants data:', futureData);
      console.log('Event participants error:', futureError);

      if (futureError) throw futureError;

      // Получаем тесты для мероприятий, где участник зарегистрирован
      const futureTestsData: FutureTest[] = [];
      
      for (const participant of futureData || []) {
        const event = participant.event;
        if (!event?.event_type) {
          console.log('Skipping event without event_type:', event);
          continue;
        }
        
        console.log('Processing event:', event.title, 'attended:', participant.attended);

        // Проверяем входные тесты
        if (event.event_type.has_entry_test) {
          console.log('Checking for entry test in event type:', event.event_type.id);
          const { data: entryTest, error: entryTestError } = await supabase
            .from('tests')
            .select('*')
            .eq('event_type_id', event.event_type.id)
            .eq('type', 'entry')
            .eq('status', 'active')
            .maybeSingle();
            
          console.log('Entry test query result:', entryTest, 'error:', entryTestError);

          if (entryTest) {
            // Проверяем, не проходил ли уже этот тест (любой статус)
            const { data: existingAttempts, count } = await supabase
              .from('user_test_attempts')
              .select('id', { count: 'exact' })
              .eq('user_id', userProfile.id)
              .eq('test_id', entryTest.id)
              .eq('event_id', event.id);

            console.log(`Checking entry test ${entryTest.id} for event ${event.id}:`, count > 0 ? `Already attempted (${count} attempts)` : 'Not attempted');

            if (count === 0) {
              // Автоматически создаем попытку для входного теста
              console.log(`Creating automatic attempt for entry test ${entryTest.id}`);
              const { data: newAttempt, error: createError } = await supabase
                .from('user_test_attempts')
                .insert({
                  user_id: userProfile.id,
                  test_id: entryTest.id,
                  event_id: event.id,
                  status: 'in_progress',
                  start_time: new Date().toISOString()
                })
                .select()
                .single();

              if (createError) {
                console.error('Error creating entry test attempt:', createError);
              } else {
                console.log(`Created entry test attempt:`, newAttempt);
              }
            } else {
              // Проверяем статус существующей попытки
              const { data: existingAttempt } = await supabase
                .from('user_test_attempts')
                .select('status, score')
                .eq('user_id', userProfile.id)
                .eq('test_id', entryTest.id)
                .eq('event_id', event.id)
                .order('start_time', { ascending: false })
                .limit(1)
                .single();

              console.log(`Existing entry test attempt: status=${existingAttempt?.status}, score=${existingAttempt?.score}`);
              
              // Если попытка завершена, не добавляем в будущие тесты
              if (existingAttempt && existingAttempt.status === 'completed' && existingAttempt.score !== null) {
                console.log(`Entry test already completed, skipping`);
              }
            }
          } else {
            console.log(`Entry test not found for event type ${event.event_type.id}`);
          }
        }

        // Проверяем финальные тесты (только если входной тест пройден)
        if (event.event_type.has_final_test) {
          console.log('Checking for final test in event type:', event.event_type.id);
          const { data: finalTest, error: finalTestError } = await supabase
            .from('tests')
            .select('*')
            .eq('event_type_id', event.event_type.id)
            .eq('type', 'final')
            .eq('status', 'active')
            .maybeSingle();
            
          console.log('Final test query result:', finalTest, 'error:', finalTestError);

          if (finalTest) {
            // Проверяем, не проходил ли уже этот тест (любой статус)
            const { data: existingAttempts, count } = await supabase
              .from('user_test_attempts')
              .select('id', { count: 'exact' })
              .eq('user_id', userProfile.id)
              .eq('test_id', finalTest.id)
              .eq('event_id', event.id);

            console.log(`Checking final test ${finalTest.id} for event ${event.id}:`, count > 0 ? `Already attempted (${count} attempts)` : 'Not attempted');

            if (count === 0) {
              // Проверяем, пройден ли входной тест
              const { data: entryTest } = await supabase
                .from('tests')
                .select('id, passing_score')
                .eq('event_type_id', event.event_type.id)
                .eq('type', 'entry')
                .eq('status', 'active')
                .maybeSingle();

              if (entryTest) {
                const { data: entryAttempts } = await supabase
                  .from('user_test_attempts')
                  .select('status, score')
                  .eq('user_id', userProfile.id)
                  .eq('test_id', entryTest.id)
                  .eq('event_id', event.id)
                  .eq('status', 'completed')
                  .order('created_at', { ascending: false })
                  .limit(1);

                const entryAttempt = entryAttempts?.[0];
                console.log(`Entry test attempt: score=${entryAttempt?.score}, passing_score=${entryTest?.passing_score}`);

                if (entryAttempt && entryAttempt.score !== null && entryAttempt.score !== undefined && (entryTest.passing_score > 0 ? entryAttempt.score >= entryTest.passing_score : entryAttempt.score > 0)) {
                  console.log(`Adding final test ${finalTest.id} to future tests`);
                  futureTestsData.push({
                    test: finalTest,
                    event: event,
                    scheduled_date: event.end_date
                  });
                } else {
                  console.log(`Entry test not passed, skipping final test`);
                }
              } else {
                // Если входного теста нет, но есть финальный тест, показываем его
                console.log(`No entry test found, but adding final test ${finalTest.id} to future tests`);
                futureTestsData.push({
                  test: finalTest,
                  event: event,
                  scheduled_date: event.end_date
                });
              }
            } else {
              console.log(`Final test already attempted, skipping`);
            }
          } else {
            console.log(`Final test not found for event type ${event.event_type.id}`);
          }
        }

        // Проверяем годовые тесты (через 3 месяца после мероприятия)
        if (event.event_type.has_annual_test) {
          console.log('Checking for annual test in event type:', event.event_type.id);
          const { data: annualTest, error: annualTestError } = await supabase
            .from('tests')
            .select('*')
            .eq('event_type_id', event.event_type.id)
            .eq('type', 'annual')
            .eq('status', 'active')
            .maybeSingle();
            
          console.log('Annual test query result:', annualTest, 'error:', annualTestError);

          if (annualTest) {
            // Проверяем, не проходил ли уже этот тест (любой статус)
            const { data: existingAttempts, count } = await supabase
              .from('user_test_attempts')
              .select('id', { count: 'exact' })
              .eq('user_id', userProfile.id)
              .eq('test_id', annualTest.id)
              .eq('event_id', event.id);

            console.log(`Checking annual test ${annualTest.id} for event ${event.id}:`, count > 0 ? `Already attempted (${count} attempts)` : 'Not attempted');

            if (count === 0) {
              // Проверяем, прошло ли 3 месяца с даты мероприятия
              // Используем end_date, если он есть, иначе start_date
              const eventDate = event.end_date ? new Date(event.end_date) : new Date(event.start_date);
              const threeMonthsLater = new Date(eventDate);
              threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
              const currentDate = new Date();

              console.log(`Event start date: ${event.start_date}`);
              console.log(`Event end date: ${event.end_date}`);
              console.log(`Event date used: ${eventDate.toISOString()}`);
              console.log(`Three months later: ${threeMonthsLater.toISOString()}`);
              console.log(`Current date: ${currentDate.toISOString()}`);
              console.log(`Is current date >= three months later: ${currentDate >= threeMonthsLater}`);
              console.log(`Time difference in days: ${Math.floor((currentDate.getTime() - threeMonthsLater.getTime()) / (1000 * 60 * 60 * 24))}`);

              // Всегда добавляем годовой тест в будущие тесты, но с флагом доступности
              console.log(`Adding annual test ${annualTest.id} to future tests`);
              futureTestsData.push({
                test: annualTest,
                event: event,
                scheduled_date: threeMonthsLater.toISOString(),
                isAvailable: currentDate >= threeMonthsLater
              });
            }
          } else {
            console.log(`Annual test not found for event type ${event.event_type.id}`);
          }
        }
      }

      console.log('Final future tests data:', futureTestsData);
      console.log('Setting future tests state with length:', futureTestsData.length);
      setFutureTests(futureTestsData);
      
      // Дедуплицируем активные тесты, оставляя только последнюю попытку для каждого теста
      const uniqueActiveTests = activeData?.reduce((acc, attempt) => {
        const key = `${attempt.test_id}-${attempt.event_id}`;
        if (!acc[key] || new Date(attempt.start_time) > new Date(acc[key].start_time)) {
          acc[key] = attempt;
        }
        return acc;
      }, {});

      const uniqueActiveTestsArray = Object.values(uniqueActiveTests || {});
      console.log('Active tests after deduplication:', uniqueActiveTestsArray.length);

      // Теперь фильтруем активные тесты, используя данные о мероприятиях
      const availableActiveTests = uniqueActiveTestsArray.filter(attempt => {
        // Проверяем, что пользователь является участником мероприятия
        const isParticipant = futureData?.some(p => p.event_id === attempt.event_id);
        
        // Для годовых тестов проверяем доступность по времени
        if (attempt.test.type === 'annual') {
          const eventDate = attempt.event.end_date ? new Date(attempt.event.end_date) : new Date(attempt.event.start_date);
          const threeMonthsLater = new Date(eventDate);
          threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
          const currentDate = new Date();
          return isParticipant && currentDate >= threeMonthsLater;
        }
        
        return isParticipant;
      });
      
      console.log('Available active tests after filtering:', availableActiveTests.length);
      setActiveTests(availableActiveTests);

    } catch (err: any) {
      console.error('Ошибка загрузки тестов участника:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTestTypeLabel = (type: string) => {
    switch (type) {
      case 'entry': return 'Входной тест';
      case 'final': return 'Итоговый тест';
      case 'annual': return 'Годовой тест';
      default: return 'Тест';
    }
  };

  const getCardStyles = (type: string) => {
    const baseStyles = {
      entry: {
        bg: 'bg-blue-50',
        bgHover: 'hover:bg-blue-100',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        title: 'text-blue-700',
        accent: 'bg-blue-600',
        badge: 'bg-blue-100 text-blue-800'
      },
      final: {
        bg: 'bg-purple-50',
        bgHover: 'hover:bg-purple-100',
        border: 'border-purple-200',
        icon: 'text-purple-600',
        title: 'text-purple-700',
        accent: 'bg-purple-600',
        badge: 'bg-purple-100 text-purple-800'
      },
      annual: {
        bg: 'bg-[#06A478]/10',
        bgHover: 'hover:bg-[#06A478]/20',
        border: 'border-[#06A478]/30',
        icon: 'text-[#06A478]',
        title: 'text-[#06A478]',
        accent: 'bg-[#06A478]',
        badge: 'bg-[#06A478]/20 text-[#06A478]'
      }
    };
    return baseStyles[type] || baseStyles.entry;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTimeUntilAvailable = (eventEndDate: string | null, eventStartDate: string) => {
    const eventDate = eventEndDate ? new Date(eventEndDate) : new Date(eventStartDate);
    const threeMonthsLater = new Date(eventDate);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    const currentDate = new Date();

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

  const handleStartTest = async (testId: string, eventId: string) => {
    console.log('handleStartTest called with:', { testId, eventId, userProfileId: userProfile?.id });
    try {
      // Получаем информацию о тесте и мероприятии для проверки годовых тестов
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('type')
        .eq('id', testId)
        .single();

      if (testError) throw testError;

      // Если это годовой тест, проверяем доступность
      if (testData.type === 'annual') {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('end_date, start_date')
          .eq('id', eventId)
          .single();

        if (eventError) throw eventError;

        const eventDate = eventData.end_date ? new Date(eventData.end_date) : new Date(eventData.start_date);
        const threeMonthsLater = new Date(eventDate);
        threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
        const currentDate = new Date();

        if (currentDate < threeMonthsLater) {
          alert('Годовой тест будет доступен через 3 месяца после окончания мероприятия');
          return;
        }
      }

      // Проверяем, есть ли уже попытка для этого теста и мероприятия
      console.log('Checking for existing attempts with:', { userId: userProfile.id, testId, eventId });
      const { data: existingAttempts, error: checkError } = await supabase
        .from('user_test_attempts')
        .select('id, status, score')
        .eq('user_id', userProfile.id)
        .eq('test_id', testId)
        .eq('event_id', eventId)
        .order('start_time', { ascending: false });

      console.log('Existing attempts check result:', { existingAttempts, checkError });
      if (checkError) throw checkError;

      // Берем самую последнюю попытку
      const existingAttempt = existingAttempts?.[0];

      // Если есть завершенная попытка, не позволяем создавать новую
      if (existingAttempt && existingAttempt.score !== null) {
        alert('Вы уже прошли этот тест. Результат: ' + existingAttempt.score + '%');
        return;
      }

      let attemptId: string;

      if (existingAttempt) {
        // Если попытка уже существует, используем её
        console.log(`Using existing attempt ${existingAttempt.id} with status ${existingAttempt.status}`);
        attemptId = existingAttempt.id;
      } else {
        // Создаем новую попытку только если её нет
        const { data: newAttempt, error: insertError } = await supabase
          .from('user_test_attempts')
          .insert({
            user_id: userProfile.id,
            test_id: testId,
            event_id: eventId,
            status: 'in_progress',
            start_time: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating attempt:', insertError);
          throw insertError;
        }
        
        if (!newAttempt) {
          throw new Error('Failed to create attempt - no data returned');
        }
        
        attemptId = newAttempt.id;
        console.log(`Created new attempt ${attemptId}`);
      }

      // Переходим на страницу прохождения теста
      navigate(`/take-test?eventId=${eventId}&testId=${testId}&attemptId=${attemptId}`);

      // Переходим на страницу прохождения теста
      navigate(`/take-test?eventId=${eventId}&testId=${testId}&attemptId=${attemptId}`);
    } catch (err: any) {
      console.error('Ошибка при создании попытки теста:', err);
      
      // Проверяем, является ли это ошибкой от триггера о дублировании
      if (err.message && err.message.includes('Тест уже пройден')) {
        alert(err.message);
      } else {
        alert('Произошла ошибка при создании попытки теста. Попробуйте еще раз.');
      }
    }
  };

  const handleViewResults = (attemptId: string) => {
    console.log('Navigating to test results with attemptId:', attemptId);
    console.log('Current location:', window.location.href);
    // Переходим на страницу результатов теста
    navigate(`/test-results/${attemptId}`);
    console.log('Navigation called');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-sns-green" />
          <span className="text-gray-600">Загрузка тестов...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-800 mb-2">Ошибка загрузки</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  console.log('ParticipantTestsView render - completedTests:', completedTests.length, 'activeTests:', activeTests.length, 'futureTests:', futureTests.length, 'activeTab:', activeTab);
  
  return (
    <div className="space-y-4 md:space-y-6 pb-safe-bottom">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Мои тесты</h1>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-4 transition-all duration-200 hover:-translate-y-0.5">
          <div className="text-center">
            <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Пройдено тестов</p>
            <p className="text-xl md:text-2xl font-bold text-green-600">{completedTests.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-4 transition-all duration-200 hover:-translate-y-0.5">
          <div className="text-center">
            <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Активные тесты</p>
            <p className="text-xl md:text-2xl font-bold text-orange-600">{activeTests.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-4 transition-all duration-200 hover:-translate-y-0.5">
          <div className="text-center">
            <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Ожидают прохождения</p>
            <p className="text-xl md:text-2xl font-bold text-blue-600">{futureTests.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-4 transition-all duration-200 hover:-translate-y-0.5">
          <div className="text-center">
            <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Средний балл</p>
            <p className="text-xl md:text-2xl font-bold text-purple-600">
              {completedTests.length > 0 
                ? Math.round(completedTests.reduce((sum, test) => sum + (test.score || 0), 0) / completedTests.length)
                : 0}%
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-4 transition-all duration-200 hover:-translate-y-0.5 col-span-2 md:col-span-1">
          <div className="text-center">
            <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Успешных тестов</p>
            <p className="text-xl md:text-2xl font-bold text-emerald-600">
              {completedTests.filter(test => 
                test.test.passing_score && test.test.passing_score > 0 
                  ? test.score >= test.test.passing_score 
                  : test.score > 0
              ).length}
            </p>
          </div>
        </div>
      </div>

      {/* Табы */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap md:flex-nowrap space-x-0 md:space-x-8 px-2 md:px-6">
            <button
              onClick={() => setActiveTab('active')}
              className={clsx(
                "py-2.5 md:py-4 px-1 md:px-1 border-b-2 font-medium text-xs md:text-sm flex-1 md:flex-none transition-all duration-200",
                activeTab === 'active'
                  ? "border-[#06A478] text-[#06A478]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <div className="flex items-center justify-center md:justify-start space-x-1 md:space-x-2">
                <span className="hidden md:inline">Активные тесты</span>
                <span className="md:hidden text-xs">Активные</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 md:px-2 py-0.5 rounded-full">({activeTests.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={clsx(
                "py-2.5 md:py-4 px-1 md:px-1 border-b-2 font-medium text-xs md:text-sm flex-1 md:flex-none transition-all duration-200",
                activeTab === 'completed'
                  ? "border-[#06A478] text-[#06A478]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <div className="flex items-center justify-center md:justify-start space-x-1 md:space-x-2">
                <span className="hidden md:inline">Пройденные тесты</span>
                <span className="md:hidden text-xs">Пройденные</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 md:px-2 py-0.5 rounded-full">({completedTests.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('future')}
              className={clsx(
                "py-2.5 md:py-4 px-1 md:px-1 border-b-2 font-medium text-xs md:text-sm flex-1 md:flex-none transition-all duration-200",
                activeTab === 'future'
                  ? "border-[#06A478] text-[#06A478]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <div className="flex items-center justify-center md:justify-start space-x-1 md:space-x-2">
                <span className="hidden md:inline">Будущие тесты</span>
                <span className="md:hidden text-xs">Будущие</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 md:px-2 py-0.5 rounded-full">({futureTests.length})</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="p-4 md:p-6">
          {activeTab === 'active' ? (
            <div className="space-y-3 md:space-y-4">
              {activeTests.length === 0 ? (
                <div className="text-center py-8 md:py-12">
                  <Play className="h-10 w-10 md:h-12 md:w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">Нет активных тестов</h3>
                  <p className="text-sm md:text-base text-gray-600">У вас нет тестов в процессе прохождения</p>
                </div>
              ) : (
                activeTests.map((attempt) => {
                  const styles = getCardStyles(attempt.test.type);
                  return (
                    <div key={attempt.id} className={`${styles.bg} ${styles.bgHover} ${styles.border} rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5 group`}>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                        {/* Левая часть с информацией */}
                        <div className="flex-1">
                          {/* Заголовок с иконкой и бейджем */}
                          <div className="flex items-center mb-3">
                            <div className={`p-1.5 rounded-lg ${styles.accent} bg-opacity-20 mr-2 group-hover:scale-105 transition-transform duration-200 flex-shrink-0 h-6 w-6 flex items-center justify-center`}>
                              <Play className={`h-4 w-4 ${styles.icon}`} />
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge} h-6`}>
                              {getTestTypeLabel(attempt.test.type)}
                            </span>
                          </div>

                          {/* Информация о мероприятии */}
                          <div>
                            <h3 className="font-semibold text-sm text-gray-900 leading-tight break-words mb-2">{attempt.test.title}</h3>
                            <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                              Мероприятие: {attempt.event.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                              <div className="flex items-center space-x-1 min-w-0">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span className="whitespace-nowrap">Начат: {formatDate(attempt.start_time)}</span>
                              </div>
                              <div className="flex items-center space-x-1 min-w-0">
                                <CheckCircle className="h-3 w-3 flex-shrink-0" />
                                <span className="whitespace-nowrap">Время: {attempt.test.time_limit === 0 ? 'Не ограничено' : `${attempt.test.time_limit} мин`}</span>
                              </div>
                              <div className="flex items-center space-x-1 min-w-0">
                                <Award className="h-3 w-3 flex-shrink-0" />
                                <span className="whitespace-nowrap">Проходной: {attempt.test.passing_score && attempt.test.passing_score > 0 ? `${attempt.test.passing_score}%` : 'Без ограничений'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Правая часть с кнопкой */}
                        <div className="md:ml-4 flex justify-center md:justify-end w-full md:w-auto">
                          <button
                            onClick={() => {
                              console.log('Button clicked for test:', attempt.test.id, 'event:', attempt.event.id);
                              handleStartTest(attempt.test.id, attempt.event.id);
                            }}
                            className={`${styles.accent} text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium flex items-center justify-center space-x-2 transform hover:scale-[1.01] w-full md:w-auto`}
                          >
                            <Play size={16} />
                            <span>Пройти тест</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : activeTab === 'completed' ? (
            <div className="space-y-3 md:space-y-4">
              {completedTests.length === 0 ? (
                <div className="text-center py-8 md:py-12">
                  <FileText className="h-10 w-10 md:h-12 md:w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">Нет пройденных тестов</h3>
                  <p className="text-sm md:text-base text-gray-600">Вы еще не проходили тесты</p>
                </div>
              ) : (
                completedTests.map((attempt) => {
                  const styles = getCardStyles(attempt.test.type);
                  const isPassed = attempt.test.passing_score && attempt.test.passing_score > 0 
                    ? attempt.score >= attempt.test.passing_score 
                    : attempt.score > 0;
                  
                  return (
                    <div key={attempt.id} className={`${styles.bg} ${styles.bgHover} ${styles.border} rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5 group`}>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                        {/* Левая часть с информацией */}
                        <div className="flex-1">
                          {/* Заголовок с иконкой и бейджем */}
                          <div className="flex items-center mb-3">
                            <div className={`p-1.5 rounded-lg ${styles.accent} bg-opacity-20 mr-2 group-hover:scale-105 transition-transform duration-200 flex-shrink-0 h-6 w-6 flex items-center justify-center`}>
                              <CheckCircle className={`h-4 w-4 ${styles.icon}`} />
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge} h-6`}>
                              {getTestTypeLabel(attempt.test.type)}
                            </span>
                          </div>

                          {/* Информация о мероприятии */}
                          <div>
                            <h3 className="font-semibold text-sm text-gray-900 leading-tight break-words mb-2">{attempt.test.title}</h3>
                            <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                              Мероприятие: {attempt.event.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                              <div className="flex items-center space-x-1 min-w-0">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span className="whitespace-nowrap">Дата: {formatDate(attempt.end_time || attempt.start_time)}</span>
                              </div>
                              <div className="flex items-center space-x-1 min-w-0">
                                <CheckCircle className="h-3 w-3 flex-shrink-0" />
                                <span className="whitespace-nowrap">Время: {attempt.test.time_limit === 0 ? 'Не ограничено' : `${attempt.test.time_limit} мин`}</span>
                              </div>
                              <div className="flex items-center space-x-1 min-w-0">
                                <Award className="h-3 w-3 flex-shrink-0" />
                                <span className="whitespace-nowrap">Проходной: {attempt.test.passing_score && attempt.test.passing_score > 0 ? `${attempt.test.passing_score}%` : 'Без ограничений'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Правая часть с результатом */}
                        <div className="md:ml-4 flex justify-center md:justify-end w-full md:w-auto">
                          <div className="text-center w-full md:w-auto">
                            <div className={`text-xl font-bold ${isPassed ? 'text-green-600' : 'text-red-600'} mb-1`}>
                              {attempt.score}%
                            </div>
                            <div className={`text-xs font-medium px-2 py-1 rounded-full ${isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} w-full md:w-auto`}>
                              {isPassed ? 'Пройден' : 'Не пройден'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {futureTests.length === 0 ? (
                <div className="text-center py-8 md:py-12">
                  <Clock className="h-10 w-10 md:h-12 md:w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">Нет будущих тестов</h3>
                  <p className="text-sm md:text-base text-gray-600">У вас нет тестов, ожидающих прохождения</p>
                </div>
              ) : (
                futureTests.map((futureTest, index) => {
                  const styles = getCardStyles(futureTest.test.type);
                  return (
                    <div key={`${futureTest.test.id}-${futureTest.event.id}`} className={`${styles.bg} ${styles.bgHover} ${styles.border} rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5 group`}>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                        {/* Левая часть с информацией */}
                        <div className="flex-1">
                          {/* Заголовок с иконкой и бейджем */}
                          <div className="flex items-center mb-3">
                            <div className={`p-1.5 rounded-lg ${styles.accent} bg-opacity-20 mr-2 group-hover:scale-105 transition-transform duration-200 flex-shrink-0 h-6 w-6 flex items-center justify-center`}>
                              {futureTest.test.type === 'annual' && !futureTest.isAvailable ? (
                                <Lock className={`h-4 w-4 ${styles.icon}`} />
                              ) : (
                                <Play className={`h-4 w-4 ${styles.icon}`} />
                              )}
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge} h-6`}>
                              {getTestTypeLabel(futureTest.test.type)}
                            </span>
                          </div>

                          {/* Информация о мероприятии */}
                          <div>
                            <h3 className="font-semibold text-sm text-gray-900 leading-tight break-words mb-2">{futureTest.test.title}</h3>
                            <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                              Мероприятие: {futureTest.event.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                              <div className="flex items-center space-x-1 min-w-0">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span className="whitespace-nowrap">Дата: {formatDate(futureTest.event.start_date)}</span>
                              </div>
                              <div className="flex items-center space-x-1 min-w-0">
                                <CheckCircle className="h-3 w-3 flex-shrink-0" />
                                <span className="whitespace-nowrap">Время: {futureTest.test.time_limit === 0 ? 'Не ограничено' : `${futureTest.test.time_limit} мин`}</span>
                              </div>
                              <div className="flex items-center space-x-1 min-w-0">
                                <Award className="h-3 w-3 flex-shrink-0" />
                                <span className="whitespace-nowrap">Проходной: {futureTest.test.passing_score && futureTest.test.passing_score > 0 ? `${futureTest.test.passing_score}%` : 'Без ограничений'}</span>
                              </div>
                            </div>
                            {futureTest.test.description && (
                              <p className="text-xs text-gray-600 mt-2 leading-relaxed">{futureTest.test.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Правая часть с кнопкой/статусом */}
                        <div className="md:ml-4 flex justify-center md:justify-end w-full md:w-auto">
                          {futureTest.test.type === 'annual' && !futureTest.isAvailable ? (
                            <div className={`${styles.accent} bg-opacity-20 px-4 py-2 rounded-lg text-sm ${styles.title} flex items-center justify-center space-x-2 w-full md:w-auto`}>
                              <Lock size={16} />
                              <span>{formatTimeUntilAvailable(futureTest.event.end_date, futureTest.event.start_date)}</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                console.log('Button clicked for future test:', futureTest.test.id, 'event:', futureTest.event.id);
                                handleStartTest(futureTest.test.id, futureTest.event.id);
                              }}
                              className={`${styles.accent} text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium flex items-center justify-center space-x-2 transform hover:scale-[1.01] w-full md:w-auto`}
                            >
                              <Play size={16} />
                              <span>Начать тест</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 