import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, Play, AlarmClock, Bell, CheckCircle, ListChecks, User, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';

interface Test {
  id: string;
  title: string;
  description?: string;
  type: string;
  passing_score: number;
  time_limit: number;
}

interface AssignTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  participantId: string;
  participantName: string;
  testType: 'entry' | 'final' | 'annual';
  onSuccess: () => void;
}

export function AssignTestModal({
  isOpen,
  onClose,
  eventId,
  participantId,
  participantName,
  testType,
  onSuccess
}: AssignTestModalProps) {
  const [loading, setLoading] = useState(false);
  const [test, setTest] = useState<Test | null>(null);
  const [assignmentDate, setAssignmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reminderDays, setReminderDays] = useState<number>(1);
  const [sendReminder, setSendReminder] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableTest();
    } else {
      setTest(null);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, testType]);

  const fetchAvailableTest = async () => {
    setLoading(true);
    try {
      // Найдем тип мероприятия
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('event_type_id')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      // Найдем подходящий тест для этого типа мероприятия
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .eq('event_type_id', eventData.event_type_id)
        .eq('type', testType)
        .eq('status', 'active');

      if (testsError) throw testsError;

      if (testsData && testsData.length > 0) {
        setTest(testsData[0]);
      } else {
        setError('Подходящий тест не найден');
      }
    } catch (error: any) {
      console.error('Ошибка при загрузке теста:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTest = async () => {
    if (!test) return;

    setLoading(true);
    setError(null);
    try {
      // Создаем попытку прохождения теста для участника
      const { data, error } = await supabase
        .from('user_test_attempts')
        .insert({
          user_id: participantId,
          test_id: test.id,
          event_id: eventId,
          status: 'in_progress',
          start_time: new Date().toISOString()
        })
        .select();

      if (error) throw error;

      // Если нужно отправить напоминание
      if (sendReminder) {
        // В реальном проекте здесь бы создавалось напоминание
        console.log('Создание напоминания для теста через', reminderDays, 'дней');

        // Пример создания напоминания в таблице notification_tasks
        const reminderDate = new Date();
        reminderDate.setDate(reminderDate.getDate() + reminderDays);

        const { error: reminderError } = await supabase
          .from('notification_tasks')
          .insert({
            user_id: participantId,
            title: `Напоминание: Пройдите тест "${test.title}"`,
            description: `Вам необходимо пройти тест "${test.title}" до ${new Date(reminderDate).toLocaleDateString('ru-RU')}`,
            type: 'test_reminder',
            priority: 'high',
            due_date: reminderDate.toISOString(),
            status: 'pending',
            metadata: { 
              test_id: test.id, 
              event_id: eventId,
              attempt_id: data?.[0]?.id
            }
          });

        if (reminderError) {
          console.error('Ошибка при создании напоминания:', reminderError);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Ошибка при назначении теста:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getTestTypeLabel = (type: string) => {
    switch (type) {
      case 'entry': return 'Входной тест';
      case 'final': return 'Итоговый тест';
      case 'annual': return 'Годовой тест';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Назначение теста: {getTestTypeLabel(testType)}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-4 border-sns-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка теста...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ошибка</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Закрыть
              </button>
            </div>
          ) : success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Тест назначен</h3>
              <p className="text-green-600">Тест успешно назначен участнику</p>
            </div>
          ) : test ? (
            <>
              {/* Информация о тесте */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start">
                  <div className="mr-4 mt-1">
                    <FileText size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-md font-medium text-gray-900">{test.title}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <div className="px-2 py-1 bg-blue-100 rounded-lg text-xs text-blue-800">
                        {getTestTypeLabel(test.type)}
                      </div>
                      <div className="px-2 py-1 bg-blue-100 rounded-lg text-xs text-blue-800 flex items-center">
                        <AlarmClock size={12} className="mr-1" />
                        {test.time_limit} мин
                      </div>
                      <div className="px-2 py-1 bg-blue-100 rounded-lg text-xs text-blue-800">
                        Проходной балл: {test.passing_score}%
                      </div>
                    </div>
                    {test.description && (
                      <p className="text-sm text-gray-600 mt-2">{test.description}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Информация об участнике */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center">
                  <User size={20} className="text-gray-500 mr-3" />
                  <div>
                    <h3 className="text-md font-medium text-gray-900">Участник</h3>
                    <p className="text-gray-600">{participantName}</p>
                  </div>
                </div>
              </div>

              {/* Параметры назначения */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Дата назначения
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={assignmentDate}
                      onChange={(e) => setAssignmentDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    id="sendReminder"
                    type="checkbox"
                    checked={sendReminder}
                    onChange={(e) => setSendReminder(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="sendReminder" className="ml-2 block text-sm text-gray-900">
                    Отправить напоминание
                  </label>
                </div>

                {sendReminder && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Напомнить через (дней)
                    </label>
                    <div className="relative">
                      <Bell className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        value={reminderDays}
                        onChange={(e) => setReminderDays(parseInt(e.target.value) || 1)}
                        min="1"
                        max="14"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <FileText size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Тест не найден</h3>
              <p className="text-gray-600">Не удалось найти подходящий тест для назначения</p>
            </div>
          )}
        </div>

        {test && !success && !error && (
          <div className="p-6 border-t border-gray-200">
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleAssignTest}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span>Назначение...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} className="mr-2" />
                    <span>Назначить тест</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}