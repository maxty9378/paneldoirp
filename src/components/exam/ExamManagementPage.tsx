import React, { useState, useEffect } from 'react';
import { Calendar, Users, Target, Settings, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { ExamEvent, ExamConfig } from '../../types/exam';
import { supabase } from '../../lib/supabase';
import { ExamScheduleManager } from './ExamScheduleManager';
import { ReservistDossierManager } from './ReservistDossierManager';
import { ExamEvaluationManager } from './ExamEvaluationManager';

export function ExamManagementPage() {
  const [examEvents, setExamEvents] = useState<ExamEvent[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'dossiers' | 'evaluations'>('schedule');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Загрузка экзаменов
  const fetchExamEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          exam_configs (*),
          event_types (id, name, name_ru)
        `)
        .eq('event_types.name', 'Экзамен кадрового резерва')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExamEvents(data || []);
    } catch (err) {
      console.error('Error fetching exam events:', err);
      setError('Ошибка загрузки экзаменов');
    } finally {
      setLoading(false);
    }
  };

  // Создание нового экзамена
  const createExamEvent = async (examData: Partial<ExamEvent>) => {
    try {
      // Сначала создаем мероприятие
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert([{
          title: examData.title,
          description: examData.description,
          event_type_id: examData.event_type_id,
          status: 'draft',
          location: examData.location,
          created_by: examData.created_by,
        }])
        .select()
        .single();

      if (eventError) throw eventError;

      // Затем создаем конфигурацию экзамена
      const { error: configError } = await supabase
        .from('exam_configs')
        .insert([{
          exam_event_id: eventData.id,
          total_duration_hours: 8,
          break_duration_minutes: 30,
          max_participants: 20,
          evaluation_criteria: {},
        }]);

      if (configError) throw configError;

      fetchExamEvents();
      setShowCreateForm(false);
    } catch (err) {
      console.error('Error creating exam event:', err);
      setError('Ошибка создания экзамена');
    }
  };

  // Удаление экзамена
  const deleteExamEvent = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот экзамен?')) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchExamEvents();
    } catch (err) {
      console.error('Error deleting exam event:', err);
      setError('Ошибка удаления экзамена');
    }
  };

  useEffect(() => {
    fetchExamEvents();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок с кнопкой создания */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Экзамен кадрового резерва</h1>
          <p className="text-gray-600">Управление экзаменами и оценкой резервистов</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Создать экзамен
        </button>
      </div>

      {/* Список экзаменов */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {examEvents.map((exam) => (
          <div
            key={exam.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                  <p className="text-sm text-gray-600">{exam.event_types?.name_ru}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedExam(exam)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteExamEvent(exam.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Создан: {new Date(exam.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>Макс. участников: {exam.exam_configs?.[0]?.max_participants || 20}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                exam.status === 'completed' ? 'bg-green-100 text-green-800' :
                exam.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                exam.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {exam.status === 'completed' ? 'Завершен' :
                 exam.status === 'in_progress' ? 'В процессе' :
                 exam.status === 'cancelled' ? 'Отменен' :
                 'Черновик'}
              </span>
              <button
                onClick={() => setSelectedExam(exam)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Управлять
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Детальное управление экзаменом */}
      {selectedExam && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{selectedExam.title}</h2>
              <p className="text-gray-600">{selectedExam.description}</p>
            </div>
            <button
              onClick={() => setSelectedExam(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {/* Вкладки */}
          <div className="flex space-x-1 mb-6">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'schedule'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="h-4 w-4 inline mr-2" />
              Расписание
            </button>
            <button
              onClick={() => setActiveTab('dossiers')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'dossiers'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Досье резервистов
            </button>
            <button
              onClick={() => setActiveTab('evaluations')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'evaluations'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Target className="h-4 w-4 inline mr-2" />
              Оценки
            </button>
          </div>

          {/* Содержимое вкладок */}
          {activeTab === 'schedule' && (
            <ExamScheduleManager
              examEventId={selectedExam.id}
              onScheduleChange={() => fetchExamEvents()}
            />
          )}
          {activeTab === 'dossiers' && (
            <ReservistDossierManager
              examEventId={selectedExam.id}
              onDossierChange={() => fetchExamEvents()}
            />
          )}
          {activeTab === 'evaluations' && (
            <ExamEvaluationManager
              examEventId={selectedExam.id}
              onEvaluationChange={() => fetchExamEvents()}
            />
          )}
        </div>
      )}

      {/* Форма создания экзамена */}
      {showCreateForm && (
        <CreateExamForm
          onSave={createExamEvent}
          onCancel={() => setShowCreateForm(false)}
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

// Компонент формы создания экзамена
interface CreateExamFormProps {
  onSave: (examData: Partial<ExamEvent>) => void;
  onCancel: () => void;
}

function CreateExamForm({ onSave, onCancel }: CreateExamFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    event_type_id: '',
  });

  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Загрузка типов мероприятий
  useEffect(() => {
    const fetchEventTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('event_types')
          .select('*')
          .eq('name', 'Экзамен кадрового резерва');

        if (error) throw error;
        setEventTypes(data || []);
      } catch (err) {
        console.error('Error fetching event types:', err);
      }
    };

    fetchEventTypes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.location) {
      alert('Заполните все обязательные поля');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        ...formData,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });
    } catch (err) {
      console.error('Error creating exam:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Создать новый экзамен</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название экзамена *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Например: Экзамен кадрового резерва 2024"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Описание *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="Описание экзамена, его цели и задачи..."
            required
          />
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
            placeholder="Например: Конференц-зал главного офиса"
            required
          />
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Создание...' : 'Создать экзамен'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
