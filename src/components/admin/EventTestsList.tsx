import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, XCircle, AlertTriangle, Play, User, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import { AssignTestModal } from './AssignTestModal'; 

interface EventTestsListProps {
  eventId: string;
  onSuccess?: () => void;
}

interface Participant {
  id: string;
  user_id: string;
  full_name: string;
  entry_test_score: number | null;
  final_test_score: number | null;
  attended: boolean;
}

interface Test {
  id: string;
  title: string;
  type: string;
  status: string;
  passing_score: number;
  time_limit: number;
  questions_count: number;
  attempts_count: number;
  average_score: number;
}

export function EventTestsList({ eventId, onSuccess }: EventTestsListProps) {
  const { userProfile } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [selectedTestType, setSelectedTestType] = useState<'entry' | 'final' | 'annual'>('entry');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [eventType, setEventType] = useState<any>(null);

  useEffect(() => {
    if (eventId) {
      loadEventData();
    }
  }, [eventId]);

  const loadEventData = async () => {
    setLoading(true);
    try {
      // Загружаем тип мероприятия
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          id,
          event_type:event_type_id(
            id,
            name,
            name_ru,
            has_entry_test,
            has_final_test
          )
        `)
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEventType(eventData.event_type);

      // Загружаем участников мероприятия
      const { data: participantsData, error: participantsError } = await supabase
        .from('event_participants')
        .select(`
          id,
          user_id,
          attended,
          entry_test_score,
          final_test_score,
          user:user_id(
            id,
            full_name
          )
        `)
        .eq('event_id', eventId);

      if (participantsError) throw participantsError;
      
      // Преобразуем данные в нужный формат
      const formattedParticipants = participantsData?.map(p => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.user?.full_name || 'Неизвестный пользователь',
        entry_test_score: p.entry_test_score,
        final_test_score: p.final_test_score,
        attended: p.attended
      })) || [];
      
      setParticipants(formattedParticipants);

      // Загружаем доступные тесты для этого типа мероприятия
      if (eventData.event_type?.id) {
        const { data: testsData, error: testsError } = await supabase
          .from('tests')
          .select('*')
          .eq('event_type_id', eventData.event_type.id)
          .eq('status', 'active')
          .in('type', ['entry', 'final', 'annual']);

        if (testsError) throw testsError;
        
        // Получаем статистику по каждому тесту
        const testsWithStats = await Promise.all((testsData || []).map(async (test) => {
          // Получаем количество вопросов
          const { count: questionsCount } = await supabase
            .from('test_questions')
            .select('*', { count: 'exact', head: true })
            .eq('test_id', test.id);
            
          // Получаем статистику попыток
          const { data: attempts, error: attemptsError } = await supabase
            .from('user_test_attempts')
            .select('score')
            .eq('test_id', test.id)
            .eq('event_id', eventId);
            
          const attemptsCount = attempts?.length || 0;
          const averageScore = attempts?.reduce((sum, att) => sum + (att.score || 0), 0) / (attemptsCount || 1);
          
          return {
            ...test,
            questions_count: questionsCount || 0,
            attempts_count: attemptsCount,
            average_score: Math.round(averageScore || 0)
          };
        }));
        
        setTests(testsWithStats);
      }

    } catch (error: any) {
      console.error('Ошибка загрузки данных мероприятия:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTest = (participant: Participant, testType: 'entry' | 'final' | 'annual') => {
    setSelectedParticipant(participant);
    setSelectedTestType(testType);
    setShowAssignModal(true);
  };

  const handleAssignSuccess = () => {
    loadEventData();
    if (onSuccess) onSuccess();
  };

  const getTestStatusElement = (score: number | null, testType: 'entry' | 'final', passing_score: number = 70) => {
    if (score === null) {
      return (
        <div className="flex items-center">
          <AlertTriangle size={16} className="text-yellow-500 mr-1" />
          <span className="text-sm text-yellow-600">Не пройден</span>
        </div>
      );
    } else if (score >= passing_score) {
      return (
        <div className="flex items-center">
          <CheckCircle size={16} className="text-green-500 mr-1" />
          <span className="text-sm text-green-600">{score}%</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center">
          <XCircle size={16} className="text-red-500 mr-1" />
          <span className="text-sm text-red-600">{score}%</span>
          <div className="flex justify-center mt-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Обновить
            </button>
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow text-center">
        <div className="animate-spin w-8 h-8 border-4 border-sns-green border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-gray-600">Загрузка тестов...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="flex items-center text-red-600 mb-2">
          <AlertTriangle size={20} className="mr-2" />
          <h3 className="font-semibold">Ошибка загрузки</h3>
        </div>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  // Определяем тесты для этого мероприятия
  const entryTest = tests.find(t => t.type === 'entry');
  const finalTest = tests.find(t => t.type === 'final');
  const annualTest = tests.find(t => t.type === 'annual');

  // Если нет тестов для этого типа мероприятия
  if (!eventType?.has_entry_test && !eventType?.has_final_test) {
    return (
      <div className="p-6 bg-white rounded-lg shadow text-center">
        <FileText size={40} className="mx-auto text-gray-300 mb-3" />
        <h3 className="font-medium text-lg text-gray-800 mb-2">Тесты не предусмотрены</h3>
        <p className="text-gray-600">Для этого типа мероприятия не предусмотрены тесты.</p>
        
        {userProfile?.role === 'administrator' && (
          <div className="mt-4">
            <button 
              onClick={() => alert('Переход к созданию теста')} 
              className="px-4 py-2 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors"
            >
              Создать тест для этого типа мероприятия
            </button>
          </div>
        )}
      </div>
    );
  }

  // Если нет участников
  if (participants.length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg shadow text-center">
        <Users size={40} className="mx-auto text-gray-300 mb-3" />
        <h3 className="font-medium text-lg text-gray-800 mb-2">Нет участников</h3>
        <p className="text-gray-600">Добавьте участников в мероприятие, чтобы назначить тесты.</p>
      </div>
    );
  }

  // Если никто не отмечен как присутствовавший
  const attendedParticipants = participants.filter(p => p.attended);
  if (attendedParticipants.length === 0) {
    // Определяем тесты для этого мероприятия
    const entryTest = tests.find(t => t.type === 'entry');
    const finalTest = tests.find(t => t.type === 'final');
    const annualTest = tests.find(t => t.type === 'annual');
    
    return (
      <div className="p-6 bg-white rounded-lg shadow text-center">
        <h3 className="font-medium text-lg text-gray-800 mb-4 text-blue-700">Доступные тесты для мероприятия</h3>
        
        {/* Показываем доступные тесты, даже если нет присутствовавших */}
        {(entryTest || finalTest || annualTest) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {entryTest && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h4 className="font-medium text-blue-800">Входной тест: {entryTest.title}</h4>
                <div className="text-sm text-blue-700 mt-2">
                  <div className="flex items-center mb-1">
                    <Clock size={14} className="mr-2" />
                    Время: {entryTest.time_limit === 0 ? 'Без ограничений' : `${entryTest.time_limit} мин.`}
                  </div>
                  <div className="flex items-center">
                    <CheckCircle size={14} className="mr-2" />
                    Проходной балл: {entryTest.passing_score}%
                  </div>
                </div>
              </div>
            )}
            {finalTest && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-left">
                <h4 className="font-medium text-purple-800">Финальный тест: {finalTest.title}</h4>
                <div className="text-sm text-purple-700 mt-2">
                  <div className="flex items-center mb-1">
                    <Clock size={14} className="mr-2" />
                    Время: {finalTest.time_limit === 0 ? 'Без ограничений' : `${finalTest.time_limit} мин.`}
                  </div>
                  <div className="flex items-center">
                    <CheckCircle size={14} className="mr-2" />
                    Проходной балл: {finalTest.passing_score}%
                  </div>
                </div>
              </div>
            )}
            {annualTest && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
                <h4 className="font-medium text-amber-800">Годовой тест: {annualTest.title}</h4>
                <div className="text-sm text-amber-700 mt-2">
                  <div className="flex items-center mb-1">
                    <Clock size={14} className="mr-2" />
                    Время: {annualTest.time_limit === 0 ? 'Без ограничений' : `${annualTest.time_limit} мин.`}
                  </div>
                  <div className="flex items-center">
                    <CheckCircle size={14} className="mr-2" />
                    Проходной балл: {annualTest.passing_score}%
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertTriangle size={20} className="text-amber-600 mr-2 flex-shrink-0" />
            <h3 className="font-medium text-amber-800">Нет присутствовавших участников</h3>
          </div>
          <p className="text-amber-700">Отметьте участников как присутствовавших, чтобы назначить тесты.</p>
        </div>
        
        {userProfile?.role === 'trainer' || userProfile?.role === 'administrator' ? (
          <div className="mt-5 text-sm text-blue-800 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="font-medium">Подсказка:</p>
            <p className="mt-1">Вы можете присоединиться к мероприятию как участник и отметить себя как присутствовавшего, чтобы пройти тесты.</p>
          </div>
        ) : null}
        
        {/* Показываем доступные тесты, даже если нет присутствовавших */}
        {(entryTest || finalTest || annualTest) && (
          <div className="mt-6 text-left">
            <h4 className="text-md font-medium text-gray-800 mb-3">Доступные тесты для этого мероприятия:</h4>
            <div className="space-y-3">
              {entryTest && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="font-medium text-blue-800">Входной тест: {entryTest.title}</p>
                  <div className="text-sm text-blue-700 mt-1">
                    Время: {entryTest.time_limit} мин. • Проходной балл: {entryTest.passing_score}%
                  </div>
                </div>
              )}
              {finalTest && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="font-medium text-purple-800">Финальный тест: {finalTest.title}</p>
                  <div className="text-sm text-purple-700 mt-1">
                    Время: {finalTest.time_limit} мин. • Проходной балл: {finalTest.passing_score}%
                  </div>
                </div>
              )}
              {annualTest && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="font-medium text-amber-800">Годовой тест: {annualTest.title}</p>
                  <div className="text-sm text-amber-700 mt-1">
                    Время: {annualTest.time_limit} мин. • Проходной балл: {annualTest.passing_score}%
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {userProfile?.role === 'trainer' || userProfile?.role === 'administrator' ? (
          <div className="mt-5 text-sm text-blue-800 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="font-medium">Подсказка:</p>
            <p className="mt-1">Вы можете присоединиться к мероприятию как участник и отметить себя как присутствовавшего, чтобы пройти тесты.</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Статистика тестирования */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {entryTest && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 hover:shadow-md transition-all cursor-pointer" 
               onClick={() => alert(`Просмотр деталей теста ${entryTest.id}`)}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-blue-800">Входной тест</h3>
              {entryTest.time_limit === 0 ? (
                <div className="px-2 py-1 bg-blue-100 rounded-lg text-xs text-blue-800">
                  <Clock size={12} className="inline mr-1" />
                  Без ограничений
                </div>
              ) : (
                <div className="px-2 py-1 bg-blue-100 rounded-lg text-xs text-blue-800">
                  <Clock size={12} className="inline mr-1" />
                  {entryTest.time_limit} мин
                </div>
              )}
            </div>
            <p className="text-sm text-blue-600 mb-1">{entryTest.title}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <div className="bg-white rounded p-2">
                <div className="text-lg font-semibold text-blue-900">
                  {entryTest.attempts_count}
                </div>
                <div className="text-xs text-blue-600">Попыток</div>
              </div>
              <div className="bg-white rounded p-2">
                <div className="text-lg font-semibold text-blue-900">
                  {entryTest.average_score}%
                </div>
                <div className="text-xs text-blue-600">Средний балл</div>
              </div>
            </div>
          </div>
        )}

        {finalTest && (
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100 hover:shadow-md transition-all cursor-pointer"
               onClick={() => alert(`Просмотр деталей теста ${finalTest.id}`)}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-purple-800">Финальный тест</h3>
              {finalTest.time_limit === 0 ? (
                <div className="px-2 py-1 bg-purple-100 rounded-lg text-xs text-purple-800">
                  <Clock size={12} className="inline mr-1" />
                  Без ограничений
                </div>
              ) : (
                <div className="px-2 py-1 bg-purple-100 rounded-lg text-xs text-purple-800">
                  <Clock size={12} className="inline mr-1" />
                  {finalTest.time_limit} мин
                </div>
              )}
            </div>
            <p className="text-sm text-purple-600 mb-1">{finalTest.title}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <div className="bg-white rounded p-2">
                <div className="text-lg font-semibold text-purple-900">
                  {finalTest.attempts_count}
                </div>
                <div className="text-xs text-purple-600">Попыток</div>
              </div>
              <div className="bg-white rounded p-2">
                <div className="text-lg font-semibold text-purple-900">
                  {finalTest.average_score}%
                </div>
                <div className="text-xs text-purple-600">Средний балл</div>
              </div>
            </div>
          </div>
        )}

        {annualTest && (
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 hover:shadow-md transition-all cursor-pointer"
               onClick={() => alert(`Просмотр деталей теста ${annualTest.id}`)}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-amber-800">Годовой тест</h3>
              {annualTest.time_limit === 0 ? (
                <div className="px-2 py-1 bg-amber-100 rounded-lg text-xs text-amber-800">
                  <Clock size={12} className="inline mr-1" />
                  Без ограничений
                </div>
              ) : (
                <div className="px-2 py-1 bg-amber-100 rounded-lg text-xs text-amber-800">
                  <Clock size={12} className="inline mr-1" />
                  {annualTest.time_limit} мин
                </div>
              )}
            </div>
            <p className="text-sm text-amber-600 mb-1">{annualTest.title}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <div className="bg-white rounded p-2">
                <div className="text-lg font-semibold text-amber-900">
                  {annualTest.attempts_count}
                </div>
                <div className="text-xs text-amber-600">Попыток</div>
              </div>
              <div className="bg-white rounded p-2">
                <div className="text-lg font-semibold text-amber-900">
                  {annualTest.average_score}%
                </div>
                <div className="text-xs text-amber-600">Средний балл</div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-green-800">Участники</h3>
            <div className="px-2 py-1 bg-green-100 rounded-lg text-xs text-green-800">
              <Users size={12} className="inline mr-1" />
              Прошли тесты
            </div>
          </div>
          <p className="text-sm text-green-600 mb-1">Статистика прохождения</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center">
            <div className="bg-white rounded p-2">
              <div className="text-xl font-semibold text-green-900">
                {attendedParticipants.filter(p => p.entry_test_score !== null).length} / {attendedParticipants.length}
              </div>
              <div className="text-xs text-green-600">Входной тест</div>
            </div>
            <div className="bg-white rounded p-2">
              <div className="text-xl font-semibold text-green-900">
                {attendedParticipants.filter(p => p.final_test_score !== null).length} / {attendedParticipants.length}
              </div>
              <div className="text-xs text-green-600">Финальный тест</div>
            </div>
          </div>
        </div>
      </div>

      {/* Описание последовательности тестов */}
      <div className="p-4 mb-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">Последовательность тестов</h4>
        <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
          <li>Сначала участники проходят <b>Входной тест</b> для оценки начальных знаний</li>
          <li><b>Финальный тест</b> становится доступен только после успешного прохождения входного теста</li>
          <li><b>Годовой тест</b> автоматически назначается через 3 месяца после мероприятия</li>
        </ul>
      </div>

      {/* Таблица участников и их статусы тестов */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-lg">Статус тестов участников</h3>
          <p className="text-sm text-gray-500 mt-1">
            Управляйте назначением тестов для участников, присутствовавших на мероприятии
            {!entryTest && !finalTest && (
              <span className="ml-1 text-red-600 font-medium">
                Не найдены тесты для автоматического назначения.
              </span>
            )}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Участник
                </th>
                {eventType?.has_entry_test && (
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Входной тест
                  </th>
                )}
                {eventType?.has_final_test && (
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Финальный тест
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {participants.map(participant => (
                <tr key={participant.id} className={!participant.attended ? "bg-gray-50" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className={clsx(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          participant.attended ? "bg-green-100" : "bg-gray-200"
                        )}
                      >
                        <User className={clsx(
                          "h-4 w-4",
                          participant.attended ? "text-green-600" : "text-gray-500"
                        )} />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {participant.full_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  {eventType?.has_entry_test && (
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {participant.attended ? (
                        <>
                          <div>
                            {getTestStatusElement(participant.entry_test_score, 'entry', entryTest?.passing_score || 70)}
                            {participant.entry_test_score === null && (
                              <span className="mt-1 text-xs text-gray-500">
                                {entryTest ? 'Автоназначен' : 'Тест не найден'}
                              </span>
                            )}
                          </div>
                          
                          {/* Кнопка для переназначения теста */}
                          {participant.attended && participant.entry_test_score === null && (
                            <button
                              onClick={() => handleAssignTest(participant, 'entry')}
                              className="mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200"
                            >
                              Назначить заново
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-500">Участник не присутствовал</span>
                      )}
                    </td>
                  )}
                  
                  {eventType?.has_final_test && (
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {participant.attended ? (
                        <>
                          <div>
                            {getTestStatusElement(participant.final_test_score, 'final', finalTest?.passing_score || 70)}
                            {participant.final_test_score === null && (
                              <span className="mt-1 text-xs text-gray-500">
                                {finalTest ? 'Автоназначен' : 'Тест не найден'}
                              </span>
                            )}
                            
                            {participant.entry_test_score === null && (
                              <div className="mt-1 px-1.5 py-0.5 bg-gray-100 text-gray-800 text-xs rounded">
                                Требуется входной тест
                              </div>
                            )}
                          </div>
                          
                          {/* Кнопка для переназначения теста */}
                          {participant.attended && participant.final_test_score === null && (
                            <button
                              onClick={() => handleAssignTest(participant, 'final')}
                              className="mt-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200"
                            >
                              Назначить заново
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-500">Участник не присутствовал</span>
                      )}
                    </td>
                  )}

                  {/* Годовой тест (если доступен) */}
                  {annualTest && (
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {participant.attended ? (
                        <>
                          <span className="text-xs text-gray-500">
                            Будет доступен через 3 месяца
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500">Участник не присутствовал</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно назначения теста */}
      {selectedParticipant && (
        <AssignTestModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          eventId={eventId}
          participantId={selectedParticipant.user_id}
          participantName={selectedParticipant.full_name}
          testType={selectedTestType}
          onSuccess={handleAssignSuccess}
        />
      )}
    </div>
  );
}