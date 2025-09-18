import React, { useState, useEffect } from 'react';
import { X, User, Hash, Save, ArrowUpDown, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface PresentationAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string;
  participants: Array<{
    id: string;
    user: {
      id: string;
      full_name: string;
      email: string;
      position?: { name: string };
      territory?: { name: string };
    };
  }>;
  onAssignmentSaved?: () => void;
}

interface PresentationAssignment {
  participant_id: string;
  presentation_number: number;
}

export const PresentationAssignmentModal: React.FC<PresentationAssignmentModalProps> = ({
  isOpen,
  onClose,
  examId,
  participants,
  onAssignmentSaved
}) => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<PresentationAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка существующих назначений
  const loadExistingAssignments = async () => {
    if (!examId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('presentation_assignments')
        .select('participant_id, presentation_number')
        .eq('exam_event_id', examId)
        .order('presentation_number');

      if (error) {
        console.error('Ошибка загрузки назначений:', error);
        // Если таблица не существует, создаем пустые назначения
        initializeEmptyAssignments();
        return;
      }

      // Создаем массив назначений для всех участников
      const participantAssignments = participants.map(participant => {
        const existing = data?.find(a => a.participant_id === participant.user.id);
        return {
          participant_id: participant.user.id,
          presentation_number: existing?.presentation_number || 0
        };
      });

      setAssignments(participantAssignments);
    } catch (err) {
      console.error('Ошибка загрузки назначений:', err);
      initializeEmptyAssignments();
    } finally {
      setLoading(false);
    }
  };

  // Инициализация пустых назначений
  const initializeEmptyAssignments = () => {
    const emptyAssignments = participants.map((participant, index) => ({
      participant_id: participant.user.id,
      presentation_number: index + 1 // По умолчанию по порядку
    }));
    setAssignments(emptyAssignments);
  };

  // Автоматическое назначение номеров по порядку
  const autoAssignNumbers = () => {
    const newAssignments = participants.map((participant, index) => ({
      participant_id: participant.user.id,
      presentation_number: index + 1
    }));
    setAssignments(newAssignments);
  };

  // Перемешивание порядка
  const shuffleAssignments = () => {
    const numbers = Array.from({ length: participants.length }, (_, i) => i + 1);
    
    // Алгоритм Фишера-Йетса для перемешивания
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    const shuffledAssignments = participants.map((participant, index) => ({
      participant_id: participant.user.id,
      presentation_number: numbers[index]
    }));
    
    setAssignments(shuffledAssignments);
  };

  // Изменение номера выступления
  const handleNumberChange = (participantId: string, newNumber: number) => {
    setAssignments(prev => prev.map(assignment => 
      assignment.participant_id === participantId 
        ? { ...assignment, presentation_number: newNumber }
        : assignment
    ));
  };


  // Сохранение назначений
  const saveAssignments = async () => {
    if (!user?.id) return;

    // Проверка на пустые номера
    const emptyNumbers = assignments.filter(a => a.presentation_number <= 0);
    if (emptyNumbers.length > 0) {
      setError('Все участники должны иметь номер выступления больше 0');
      return;
    }

    // Автоматически исправляем дубликаты при сохранении, сохраняя порядок администратора
    const validAssignments = assignments.filter(a => a.presentation_number > 0);
    
    // Сортируем по номеру выступления, чтобы сохранить намерение администратора
    const sortedAssignments = [...validAssignments].sort((a, b) => a.presentation_number - b.presentation_number);
    
    // Переназначаем номера последовательно, сохраняя порядок
    const uniqueAssignments = sortedAssignments.map((assignment, index) => ({
      ...assignment,
      presentation_number: index + 1
    }));

    setSaving(true);
    setError(null);

    try {
      console.log('💾 Сохраняем назначения:', {
        examId,
        assignments: uniqueAssignments,
        assignedBy: user.id
      });

      // Используем функцию batch assignment с исправленными номерами
      const { data, error } = await supabase.rpc('assign_presentation_numbers_batch', {
        p_exam_event_id: examId,
        p_assignments: JSON.stringify(uniqueAssignments),
        p_assigned_by: user.id
      });

      console.log('📊 Результат сохранения:', { data, error });

      if (error) {
        console.error('❌ Ошибка сохранения назначений:', error);
        setError(`Ошибка сохранения назначений: ${error.message}`);
        return;
      }

      // Проверяем результат функции
      if (data && data.length > 0 && !data[0].success) {
        console.error('❌ Функция вернула ошибку:', data[0].message);
        setError(data[0].message);
        return;
      }

      console.log('✅ Назначения успешно сохранены');
      onAssignmentSaved?.();
      onClose();
    } catch (err) {
      console.error('❌ Ошибка сохранения назначений:', err);
      setError(`Произошла ошибка при сохранении назначений: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (isOpen && participants.length > 0) {
      loadExistingAssignments();
    }
  }, [isOpen, examId, participants]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[5002] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
        {/* Заголовок */}
        <div className="bg-emerald-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Hash className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Назначение номеров выступлений</h2>
                <p className="text-emerald-100">Управление порядком защиты проектов</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Панель инструментов */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={autoAssignNumbers}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Hash className="w-4 h-4" />
              По порядку
            </button>
            <button
              onClick={shuffleAssignments}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
              Перемешать
            </button>
            <div className="flex-1"></div>
            <div className="text-sm text-gray-600">
              Участников: {participants.length}
            </div>
          </div>
        </div>

        {/* Ошибки */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Список участников */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 240px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              <span className="ml-3 text-gray-600">Загрузка назначений...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments
                .sort((a, b) => a.presentation_number - b.presentation_number)
                .map((assignment) => {
                  const participant = participants.find(p => p.user.id === assignment.participant_id);
                  if (!participant) return null;

                  return (
                    <div
                      key={assignment.participant_id}
                      className="flex items-center gap-4 p-4 border border-gray-200 bg-white hover:border-emerald-300 rounded-xl transition-all"
                    >
                      {/* Номер выступления */}
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-600 min-w-0">№</label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={assignment.presentation_number || ''}
                          onChange={(e) => handleNumberChange(
                            assignment.participant_id, 
                            parseInt(e.target.value) || 0
                          )}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>

                      {/* Информация об участнике */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <User className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {participant.user.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {participant.user.position?.name || 'Должность не указана'}
                            {participant.user.territory?.name && ` • ${participant.user.territory.name}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="sticky bottom-0 bg-white p-6 border-t border-gray-100 flex gap-3 justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={saveAssignments}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              saving
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg hover:shadow-xl'
            }`}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Сохранение...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Сохранить назначения
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
