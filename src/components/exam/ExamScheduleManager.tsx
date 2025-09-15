import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, Edit, Trash2, Plus, Save, X } from 'lucide-react';
import { ExamSchedule, ExamStage, EXAM_STAGES } from '../../types/exam';
import { supabase } from '../../lib/supabase';

interface ExamScheduleManagerProps {
  examEventId: string;
  onScheduleChange?: () => void;
}

export function ExamScheduleManager({ examEventId, onScheduleChange }: ExamScheduleManagerProps) {
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<ExamSchedule | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Загрузка расписания
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exam_schedules')
        .select('*')
        .eq('exam_event_id', examEventId)
        .order('start_time');

      if (error) throw error;
      setSchedules(data || []);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Ошибка загрузки расписания');
    } finally {
      setLoading(false);
    }
  };

  // Сохранение расписания
  const saveSchedule = async (schedule: Partial<ExamSchedule>) => {
    try {
      if (editingSchedule?.id) {
        // Обновление существующего
        const { error } = await supabase
          .from('exam_schedules')
          .update(schedule)
          .eq('id', editingSchedule.id);

        if (error) throw error;
      } else {
        // Создание нового
        const { error } = await supabase
          .from('exam_schedules')
          .insert([{ ...schedule, exam_event_id: examEventId }]);

        if (error) throw error;
      }

      setEditingSchedule(null);
      setIsAddingNew(false);
      fetchSchedules();
      onScheduleChange?.();
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError('Ошибка сохранения расписания');
    }
  };

  // Удаление расписания
  const deleteSchedule = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот этап?')) return;

    try {
      const { error } = await supabase
        .from('exam_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchSchedules();
      onScheduleChange?.();
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError('Ошибка удаления расписания');
    }
  };

  // Получение информации об этапе
  const getStageInfo = (stageId: string): ExamStage | undefined => {
    return EXAM_STAGES.find(stage => stage.id === stageId);
  };

  // Форматирование времени
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Форматирование длительности
  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}ч ${diffMinutes}м`;
  };

  useEffect(() => {
    fetchSchedules();
  }, [examEventId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок с кнопкой добавления */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Расписание экзамена</h3>
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Добавить этап
        </button>
      </div>

      {/* Список этапов */}
      <div className="space-y-4">
        {schedules.map((schedule) => {
          const stageInfo = getStageInfo(schedule.stage);
          return (
            <div
              key={schedule.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {stageInfo?.name_ru || schedule.stage}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {stageInfo?.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(schedule.start_time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(schedule.end_time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{formatDuration(schedule.start_time, schedule.end_time)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{schedule.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{schedule.evaluators.length} экспертов</span>
                    </div>
                  </div>

                  {schedule.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{schedule.notes}</p>
                    </div>
                  )}

                  <div className="mt-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      schedule.status === 'completed' ? 'bg-green-100 text-green-800' :
                      schedule.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      schedule.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {schedule.status === 'completed' ? 'Завершен' :
                       schedule.status === 'in_progress' ? 'В процессе' :
                       schedule.status === 'cancelled' ? 'Отменен' :
                       'Запланирован'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setEditingSchedule(schedule)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteSchedule(schedule.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Форма редактирования/добавления */}
      {(editingSchedule || isAddingNew) && (
        <ScheduleEditForm
          schedule={editingSchedule}
          onSave={saveSchedule}
          onCancel={() => {
            setEditingSchedule(null);
            setIsAddingNew(false);
          }}
        />
      )}

      {/* Сообщение об ошибке */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

// Компонент формы редактирования
interface ScheduleEditFormProps {
  schedule?: ExamSchedule | null;
  onSave: (schedule: Partial<ExamSchedule>) => void;
  onCancel: () => void;
}

function ScheduleEditForm({ schedule, onSave, onCancel }: ScheduleEditFormProps) {
  const [formData, setFormData] = useState({
    stage: schedule?.stage || 'case_defense',
    start_time: schedule?.start_time ? new Date(schedule.start_time).toISOString().slice(0, 16) : '',
    end_time: schedule?.end_time ? new Date(schedule.end_time).toISOString().slice(0, 16) : '',
    location: schedule?.location || '',
    evaluators: schedule?.evaluators || [],
    status: schedule?.status || 'scheduled',
    notes: schedule?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация
    if (!formData.start_time || !formData.end_time || !formData.location) {
      alert('Заполните все обязательные поля');
      return;
    }

    if (new Date(formData.start_time) >= new Date(formData.end_time)) {
      alert('Время окончания должно быть позже времени начала');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        {schedule ? 'Редактировать этап' : 'Добавить этап'}
      </h4>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Этап экзамена *
            </label>
            <select
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              {EXAM_STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name_ru}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Статус
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="scheduled">Запланирован</option>
              <option value="in_progress">В процессе</option>
              <option value="completed">Завершен</option>
              <option value="cancelled">Отменен</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Время начала *
            </label>
            <input
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Время окончания *
            </label>
            <input
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Место проведения *
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Например: Конференц-зал №1"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Примечания
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="Дополнительная информация об этапе..."
          />
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Save className="h-4 w-4" />
            Сохранить
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}

