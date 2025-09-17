import React, { useState, useEffect, useMemo } from 'react';
import { X, Target, CheckCircle, Presentation, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { EvaluationSuccessModal } from './EvaluationSuccessModal';

interface ProjectDefenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantId: string;
  participantName: string;
  examId: string;
  onEvaluationComplete?: () => Promise<void>;
  onRemoveEvaluation?: (participantId: string) => Promise<void>;
  existingEvaluation?: ProjectDefenseEvaluation;
  onModalStateChange?: (isOpen: boolean) => void; // Новый пропс для уведомления о состоянии модальных окон
}

interface ProjectDefenseEvaluation {
  id?: string;
  exam_event_id: string;
  reservist_id: string;
  evaluator_id: string;
  presentation_number: number;
  criteria_scores: {
    goal_achievement: number;
    topic_development: number;
    document_quality: number;
  };
}

export const ProjectDefenseModal: React.FC<ProjectDefenseModalProps> = ({
  isOpen,
  onClose,
  participantId,
  participantName,
  examId,
  onEvaluationComplete,
  onRemoveEvaluation,
  existingEvaluation,
  onModalStateChange
}) => {
  const { user } = useAuth();
  const [evaluation, setEvaluation] = useState<ProjectDefenseEvaluation>({
    exam_event_id: examId,
    reservist_id: participantId,
    evaluator_id: user?.id || '',
    presentation_number: 1,
    criteria_scores: {
      goal_achievement: 0,
      topic_development: 0,
      document_quality: 0,
    }
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [assignedPresentationNumber, setAssignedPresentationNumber] = useState<number | null>(null);

  // Загрузка данных при открытии модала
  useEffect(() => {
    if (isOpen && participantId && examId && user?.id) {
      loadAssignedPresentationNumber();
      loadExistingEvaluation();
    }
  }, [isOpen, participantId, examId, user?.id]);

  // Блокировка прокрутки фона при открытом модальном окне
  useEffect(() => {
    if (isOpen && !showSuccessModal) {
      // Блокируем прокрутку
      document.body.style.overflow = 'hidden';
      return () => {
        // Восстанавливаем прокрутку при закрытии
        document.body.style.overflow = '';
      };
    } else {
      // Восстанавливаем прокрутку если модальное окно закрыто или показывается SuccessModal
      document.body.style.overflow = '';
    }
  }, [isOpen, showSuccessModal]);
  
  // Уведомляем родительский компонент о состоянии модального окна
  useEffect(() => {
    onModalStateChange?.(isOpen);
  }, [isOpen, onModalStateChange]);

  const loadAssignedPresentationNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('presentation_assignments')
        .select('presentation_number')
        .eq('exam_event_id', examId)
        .eq('participant_id', participantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Ошибка загрузки номера выступления:', error);
        return;
      }

      if (data) {
        setAssignedPresentationNumber(data.presentation_number);
      }
    } catch (error) {
      console.error('Ошибка загрузки номера выступления:', error);
    }
  };

  const loadExistingEvaluation = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_defense_evaluations')
        .select('*')
        .eq('exam_event_id', examId)
        .eq('reservist_id', participantId)
        .eq('evaluator_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Ошибка загрузки существующей оценки:', error);
        return;
      }

      if (data) {
        console.log('🔄 Загружена существующая оценка защиты проекта:', data);
        setEvaluation({
          id: data.id,
          exam_event_id: data.exam_event_id,
          reservist_id: data.reservist_id,
          evaluator_id: data.evaluator_id,
          presentation_number: data.presentation_number,
          criteria_scores: data.criteria_scores
        });
        setSaved(true);
      } else {
        // Нет существующей оценки - создаем новую
        const defaultPresentationNumber = assignedPresentationNumber || 1;
        setEvaluation({
          exam_event_id: examId,
          reservist_id: participantId,
          evaluator_id: user.id,
          presentation_number: defaultPresentationNumber,
          criteria_scores: {
            goal_achievement: 0,
            topic_development: 0,
            document_quality: 0,
          }
        });
        setSaved(false);
      }
    } catch (error) {
      console.error('Ошибка загрузки существующей оценки:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleScoreChange = (criterion: keyof ProjectDefenseEvaluation['criteria_scores'], score: number) => {
    setEvaluation(prev => ({
      ...prev,
      criteria_scores: {
        ...prev.criteria_scores,
        [criterion]: score
      }
    }));
    setSaved(false);
  };



  const saveEvaluation = async () => {
    setSaving(true);
    try {
      const evaluationData = {
        exam_event_id: examId,
        reservist_id: participantId,
        evaluator_id: user?.id,
        presentation_number: assignedPresentationNumber || evaluation.presentation_number,
        criteria_scores: evaluation.criteria_scores
      };

      console.log('💾 Сохраняем оценку защиты проекта:', evaluationData);

      const { error } = await supabase
        .from('project_defense_evaluations')
        .upsert(evaluationData, {
          onConflict: 'exam_event_id,reservist_id,evaluator_id'
        });

      if (error) {
        console.error('Ошибка сохранения оценки защиты проекта:', error);
        alert('Таблица project_defense_evaluations не существует. Оценка не сохранена в базу данных.');
      }

      setSaved(true);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Ошибка сохранения оценки защиты проекта:', error);
      setSaved(true);
      setShowSuccessModal(true);
    } finally {
      setSaving(false);
    }
  };

  const getTotalScore = () => {
    const { goal_achievement, topic_development, document_quality } = evaluation.criteria_scores;
    const validScores = [goal_achievement, topic_development, document_quality].filter(score => score > 0);
    if (validScores.length === 0) return 0;
    const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    return Math.round(average * 10) / 10;
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleSuccessClose = async () => {
    setShowSuccessModal(false);
    await onEvaluationComplete?.();
    onClose();
  };

  const handleEditEvaluation = () => {
    setShowSuccessModal(false);
    setSaved(false);
  };

  // Константы для слайдера (как в CaseEvaluationModal)
  const STEPS: number[] = Array.from({ length: 9 }, (_, i) => 1 + i * 0.5); // [1..5] шаг 0.5

  const criteria = [
    {
      key: 'goal_achievement' as const,
      title: 'Степень достижения планируемой цели проекта',
      description: 'Насколько полно достигнута цель проекта',
      icon: Target
    },
    {
      key: 'topic_development' as const,
      title: 'Степень проработки темы проекта',
      description: 'Глубина анализа и проработки темы',
      icon: CheckCircle
    },
    {
      key: 'document_quality' as const,
      title: 'Качество оформления документов проекта',
      description: 'Структура, оформление и презентация материалов',
      icon: FileText
    }
  ];

  // Функции для работы со слайдером (как в CaseEvaluationModal)
  const colorFor = (score: number) => {
    if (score >= 4) return '#059669'; // green-600
    if (score >= 3) return '#d97706'; // amber-600
    return '#dc2626'; // red-600
  };

  const totalScore = useMemo(() => {
    const scores = Object.values(evaluation.criteria_scores) as number[];
    const validScores = scores.filter(s => s > 0);
    if (validScores.length === 0) return 0;
    const avg = validScores.reduce((s, x) => s + x, 0) / validScores.length;
    return Math.round(avg * 10) / 10;
  }, [evaluation.criteria_scores]);

  const canSave = totalScore > 0 && !saving;

  // Стили для слайдера (как в CaseEvaluationModal)
  const sliderStyles = `
    input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      cursor: pointer;
      width: 100%;
    }

    input[type="range"]::-webkit-slider-track {
      background: transparent;
      height: 20px;
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      background: #10b981;
      height: 20px;
      width: 20px;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    input[type="range"]::-moz-range-track {
      background: transparent;
      height: 20px;
    }

    input[type="range"]::-moz-range-thumb {
      background: #10b981;
      height: 20px;
      width: 20px;
      border-radius: 50%;
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
  `;

  // Компонент слайдера (как в CaseEvaluationModal)
  const SliderComponent = ({ 
    value, 
    onChange 
  }: { 
    value: number; 
    onChange: (value: number) => void; 
  }) => {
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const i = parseInt(e.target.value);
      onChange(STEPS[i]);
    };

    return (
      <div className="mt-2">
        {/* Чипы для быстрого выбора значений */}
        <div className="mb-2 grid grid-cols-9 gap-1">
          {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(n => {
            const active = value === n;
            return (
              <button
                key={n}
                className={
                  'h-7 w-full rounded-full text-[10px] font-semibold border transition ' +
                  (active
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50')
                }
                onClick={() => onChange(n)}
                aria-label={`Выбрать ${n}`}
              >
                {n}
              </button>
            );
          })}
        </div>

        {/* Трек с рисками */}
        <div className="relative pt-3">
          {/* линия */}
          <div className="absolute left-1 right-1 top-[9px] h-[2px] bg-gray-200 rounded-full" />
          {/* риски */}
          <div className="absolute left-1 right-1 top-0 h-5 pointer-events-none">
            {STEPS.map((s, i) => {
              const left = `${(i / (STEPS.length - 1)) * 100}%`;
              const isInteger = Number.isInteger(s);
              return (
                <div
                  key={s}
                  className="absolute"
                  style={{ left, transform: 'translateX(-50%)' }}
                >
                  <div className={isInteger ? 'w-[2px] h-5 bg-gray-300' : 'w-[1px] h-3 bg-gray-300'} />
                  {isInteger && (
                    <div className="text-[10px] text-gray-500 text-center mt-1 translate-x-[-50%]">
                      {s}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* сам слайдер поверх трека */}
          <input
            type="range"
            min={0}
            max={STEPS.length - 1}
            value={STEPS.findIndex(s => s === value)}
            onChange={handleSliderChange}
            className="w-full h-5 relative z-10"
          />
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <style>{sliderStyles}</style>

      {/* Фуллскрин слой */}
      <div className="fixed inset-0 z-[10002] flex flex-col bg-white">
        {/* Шапка (sticky top) */}
        <header className="sticky top-0 z-10 border-b border-gray-100 bg-white">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Presentation className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-500">Защита проекта</div>
                <div className="text-base font-semibold truncate">{participantName}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div
                  className="text-2xl font-bold"
                  style={{ color: getScoreColor(getTotalScore()) }}
                >
                  {getTotalScore().toFixed(1)}
                </div>
                <div className="text-[11px] text-gray-400">средний балл</div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-50"
                aria-label="Закрыть"
              >
                <X className="w-6 h-6 text-gray-700" />
              </button>
            </div>
          </div>
        </header>

        {/* Контент (скролл) */}
        <main className="flex-1 overflow-y-auto px-4 pt-3 pb-24">
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : (
              <>
                {/* Номер выступления */}
                <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Presentation className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900">Номер выступления</div>
                        <div className="text-xs text-gray-500">
                          {assignedPresentationNumber ? 'Назначен администратором' : 'Номер не назначен (по умолчанию: 1)'}
                        </div>
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-lg border-2 border-emerald-500 bg-emerald-500 text-white shadow-lg flex items-center justify-center font-semibold text-lg">
                      {assignedPresentationNumber || evaluation.presentation_number}
                    </div>
                  </div>
                </div>

                {/* Критерии оценки */}
                {criteria.map(c => {
                  const Icon = c.icon;
                  const val = evaluation.criteria_scores[c.key];
                  const col = colorFor(val);
                  return (
                    <div key={c.key} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-emerald-700" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900">{c.title}</div>
                            <div className="text-xs text-gray-500">{c.description}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold" style={{ color: col }}>
                            {val.toFixed(1)}
                          </div>
                        </div>
                      </div>
                      <SliderComponent
                        value={val}
                        onChange={(score) => handleScoreChange(c.key, score)}
                      />
                    </div>
                  );
                })}

              </>
            )}
          </div>
        </main>

        {/* Футер (sticky bottom) */}
        <footer className="sticky bottom-0 z-10 border-t border-gray-100 bg-white px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              ← Назад
            </button>
            <button
              onClick={saveEvaluation}
              disabled={!canSave}
              className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                !canSave
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg hover:shadow-xl'
              }`}
            >
              {saving ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Сохранение...
                </div>
              ) : saved ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Сохранено
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Target className="w-4 h-4" />
                  Отправить
                </div>
              )}
            </button>
          </div>
        </footer>
      </div>

      {/* Модальное окно успешной отправки */}
      <EvaluationSuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        onEdit={handleEditEvaluation}
        participantName={participantName}
        caseNumber={null} // Для защиты проекта кейс не используется
        totalScore={getTotalScore()}
        evaluationType="Защита проекта"
        onRemoveEvaluation={async () => {
          await onRemoveEvaluation?.(participantId);
        }}
      />
    </>
  );
};
