import React, { useState, useEffect } from 'react';
import { X, Save, FileText, User, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CaseAssignment {
  id?: string;
  exam_event_id: string;
  participant_id: string;
  case_numbers: number[];
  assigned_by: string;
  created_at?: string;
  updated_at?: string;
}

interface Participant {
  id: string;
  user: {
    id: string;
    full_name: string;
    position?: { name: string };
    territory?: { name: string };
  };
}

interface CaseAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string;
  participants: Participant[];
  onAssignmentSaved: () => void;
}

export const CaseAssignmentModal: React.FC<CaseAssignmentModalProps> = ({
  isOpen,
  onClose,
  examId,
  participants,
  onAssignmentSaved
}) => {
  const [assignments, setAssignments] = useState<CaseAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && examId) {
      fetchAssignments();
    }
  }, [isOpen, examId]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('case_assignments')
        .select('*')
        .eq('exam_event_id', examId);

      if (error) throw error;

      // Создаем назначения для всех участников, если их нет
      const existingAssignments = data || [];
      const newAssignments: CaseAssignment[] = [];

      participants.forEach(participant => {
        const existing = existingAssignments.find(a => a.participant_id === participant.user.id);
        if (existing) {
          newAssignments.push(existing);
        } else {
          // Создаем пустое назначение для нового участника
          newAssignments.push({
            exam_event_id: examId,
            participant_id: participant.user.id,
            case_numbers: [],
            assigned_by: ''
          });
        }
      });

      setAssignments(newAssignments);
    } catch (err) {
      console.error('Ошибка загрузки назначений кейсов:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateAssignment = (participantId: string, caseNumbers: number[]) => {
    setAssignments(prev => 
      prev.map(assignment => 
        assignment.participant_id === participantId
          ? { ...assignment, case_numbers: caseNumbers }
          : assignment
      )
    );
  };

  const addCaseNumber = (participantId: string, caseNumber: number) => {
    const assignment = assignments.find(a => a.participant_id === participantId);
    if (assignment && !assignment.case_numbers.includes(caseNumber)) {
      const newCaseNumbers = [...assignment.case_numbers, caseNumber].sort();
      updateAssignment(participantId, newCaseNumbers);
    }
  };

  const removeCaseNumber = (participantId: string, caseNumber: number) => {
    const assignment = assignments.find(a => a.participant_id === participantId);
    if (assignment) {
      const newCaseNumbers = assignment.case_numbers.filter(n => n !== caseNumber);
      updateAssignment(participantId, newCaseNumbers);
    }
  };

  const saveAssignments = async () => {
    setSaving(true);
    try {
      // Получаем ID текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');

      const assignmentsToSave = assignments
        .filter(assignment => assignment.case_numbers.length > 0)
        .map(assignment => ({
          exam_event_id: examId,
          participant_id: assignment.participant_id,
          case_numbers: assignment.case_numbers,
          assigned_by: user.id,
          updated_at: new Date().toISOString()
        }));

      // Удаляем старые назначения для этого экзамена
      const { error: deleteError } = await supabase
        .from('case_assignments')
        .delete()
        .eq('exam_event_id', examId);

      if (deleteError) throw deleteError;

      // Вставляем новые назначения
      if (assignmentsToSave.length > 0) {
        const { error: insertError } = await supabase
          .from('case_assignments')
          .insert(assignmentsToSave);

        if (insertError) throw insertError;
      }

      onAssignmentSaved();
      onClose();
    } catch (err) {
      console.error('Ошибка сохранения назначений:', err);
      alert('Ошибка сохранения назначений кейсов');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Заголовок */}
        <div className="relative bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'SNS, sans-serif' }}>
                Назначение кейсов
              </h2>
              <p className="text-emerald-100 text-sm">
                Назначьте номера кейсов участникам экзамена
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Контент */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка назначений...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {participants.map(participant => {
                const assignment = assignments.find(a => a.participant_id === participant.user.id);
                const caseNumbers = assignment?.case_numbers || [];

                return (
                  <div key={participant.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <User className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {participant.user.full_name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {participant.user.position?.name}
                            {participant.user.territory?.name && ` • ${participant.user.territory.name}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Назначенные кейсы */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Назначенные кейсы:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {caseNumbers.map(caseNumber => (
                          <div
                            key={caseNumber}
                            className="flex items-center gap-2 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium"
                          >
                            <FileText className="w-4 h-4" />
                            Кейс #{caseNumber}
                            <button
                              onClick={() => removeCaseNumber(participant.user.id, caseNumber)}
                              className="hover:text-emerald-900 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {caseNumbers.length === 0 && (
                          <p className="text-gray-500 text-sm">Кейсы не назначены</p>
                        )}
                      </div>
                    </div>

                    {/* Добавление кейсов */}
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        placeholder="№ кейса"
                        className="w-24 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement;
                            const caseNumber = parseInt(input.value);
                            if (caseNumber && !caseNumbers.includes(caseNumber)) {
                              addCaseNumber(participant.user.id, caseNumber);
                              input.value = '';
                            }
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement;
                          const caseNumber = parseInt(input.value);
                          if (caseNumber && !caseNumbers.includes(caseNumber)) {
                            addCaseNumber(participant.user.id, caseNumber);
                            input.value = '';
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        Добавить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="border-t border-gray-100 p-6 bg-gray-50">
          <div className="flex justify-end gap-4">
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
    </div>
  );
};


