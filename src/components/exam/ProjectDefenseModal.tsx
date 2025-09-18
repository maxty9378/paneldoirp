import React, { useState, useEffect, useMemo } from 'react';
import { X, Target, CheckCircle, Presentation, FileText, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { EvaluationSuccessModal } from './EvaluationSuccessModal';
import { ChangeEvaluationConfirmModal } from './ChangeEvaluationConfirmModal';

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
  const [showChangeConfirmModal, setShowChangeConfirmModal] = useState(false);
  const [hasExistingEvaluation, setHasExistingEvaluation] = useState(false);
  const [assignedPresentationNumber, setAssignedPresentationNumber] = useState<number | null>(null);

  // Загрузка данных при открытии модала
  useEffect(() => {
    if (isOpen && participantId && examId && user?.id) {
      (async () => {
        await loadAssignedPresentationNumber();
        await loadExistingEvaluation(); // теперь увидит актуальный assignedPresentationNumber
      })();
    }
  }, [isOpen, participantId, examId, user?.id]);

  // Блокировка прокрутки фона при открытом модальном окне
  // Сообщаем родителю об ОТКРЫТОСТИ модала с учётом дочерних окон
  useEffect(() => {
    const anyOpen = isOpen || showSuccessModal;
    if (onModalStateChange) {
      onModalStateChange(anyOpen);
    }
    
    // Также отправляем событие для глобального слушателя
    const event = new CustomEvent('modalStateChange', {
      detail: { isOpen: anyOpen }
    });
    window.dispatchEvent(event);
  }, [isOpen, showSuccessModal, onModalStateChange]);
  

  const loadAssignedPresentationNumber = async () => {
    try {
      console.log('🔍 Загружаем номер выступления для:', { examId, participantId });
      
      const { data, error } = await supabase
        .from('presentation_assignments')
        .select('presentation_number')
        .eq('exam_event_id', examId)
        .eq('participant_id', participantId)
        .single();

      console.log('📊 Результат загрузки номера выступления:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Ошибка загрузки номера выступления:', error);
        return;
      }

      if (data) {
        console.log('✅ Назначенный номер выступления:', data.presentation_number);
        setAssignedPresentationNumber(data.presentation_number);
      } else {
        console.log('ℹ️ Номер выступления не назначен для участника');
        setAssignedPresentationNumber(null);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки номера выступления:', error);
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
        setEvaluation({
          id: data.id,
          exam_event_id: data.exam_event_id,
          reservist_id: data.reservist_id,
          evaluator_id: data.evaluator_id,
          presentation_number: data.presentation_number,
          criteria_scores: data.criteria_scores
        });
        setSaved(true);
        setHasExistingEvaluation(true);
      } else {
        // Нет существующей оценки - создаем новую
        const defaultPresentationNumber = assignedPresentationNumber ?? 1;
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
        setHasExistingEvaluation(false);
      }
    } catch (error) {
      console.error('Ошибка загрузки существующей оценки:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleScoreChange = (criterion: keyof ProjectDefenseEvaluation['criteria_scores'], score: number) => {
    console.log('ProjectDefenseModal handleScoreChange:', { criterion, score });
    setEvaluation(prev => ({
      ...prev,
      criteria_scores: {
        ...prev.criteria_scores,
        [criterion]: score
      }
    }));
    setSaved(false);
  };



  const handleSaveClick = () => {
    console.log('🔍 ProjectDefenseModal handleSaveClick вызван:', { 
      hasExistingEvaluation, 
      saved, 
      saving,
      criteriaScores: evaluation.criteria_scores
    });
    
    // Проверяем, что все критерии заполнены (больше 0)
    const allCriteriaFilled = Object.values(evaluation.criteria_scores).every(v => v > 0);
    if (!allCriteriaFilled) {
      console.log('❌ Блокируем сохранение - не все критерии заполнены:', evaluation.criteria_scores);
      alert('Пожалуйста, заполните все критерии оценки перед сохранением.');
      return;
    }
    
    if (hasExistingEvaluation && !saved) {
      console.log('🔄 Показываем подтверждение изменения существующей оценки с totalScore:', getTotalScore());
      setTimeout(() => {
        setShowChangeConfirmModal(true);
      }, 0);
    } else {
      console.log('💾 Сохраняем новую оценку');
      saveEvaluation();
    }
  };

  const saveEvaluation = async () => {
    setSaving(true);
    try {
      const evaluationData = {
        ...(evaluation.id && { id: evaluation.id }), // Добавляем id если он есть
        exam_event_id: examId,
        reservist_id: participantId,
        evaluator_id: user?.id,
        presentation_number: assignedPresentationNumber || evaluation.presentation_number,
        criteria_scores: evaluation.criteria_scores
      };


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
      console.log('🎉 Показываем модальное окно успеха с totalScore:', getTotalScore());
      setTimeout(() => {
        setShowSuccessModal(true);
      }, 0);
    } catch (error) {
      console.error('Ошибка сохранения оценки защиты проекта:', error);
      setSaved(true);
      setShowSuccessModal(true);
    } finally {
      setSaving(false);
    }
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


  // Константы для слайдера (как в CaseEvaluationModal)
  const STEPS: number[] = Array.from({ length: 9 }, (_, i) => 1 + i * 0.5); // [1..5] шаг 0.5

  const criteria = [
    {
      key: 'goal_achievement' as const,
      title: 'Степень достижения планируемой цели проекта',
      icon: Target
    },
    {
      key: 'topic_development' as const,
      title: 'Степень проработки темы проекта',
      icon: CheckCircle
    },
    {
      key: 'document_quality' as const,
      title: 'Качество оформления документов проекта',
      icon: FileText
    }
  ];

  // Функции для работы со слайдером (как в CaseEvaluationModal)
  const colorFor = (score: number) => {
    if (score >= 4) return '#059669'; // green-600
    if (score >= 3) return '#d97706'; // amber-600
    return '#dc2626'; // red-600
  };

  const getTotalScore = () => {
    const scores = Object.values(evaluation.criteria_scores) as number[];
    const validScores = scores.filter(s => s > 0);
    if (validScores.length === 0) return 0;
    const avg = validScores.reduce((s, x) => s + x, 0) / validScores.length;
    const result = Math.round(avg * 10) / 10;
    console.log('🔢 ProjectDefenseModal getTotalScore calculated:', {
      criteria_scores: evaluation.criteria_scores,
      validScores,
      average: avg,
      result
    });
    return result;
  };

  const totalScore = useMemo(() => getTotalScore(), [evaluation.criteria_scores]);

  // Проверяем, что все критерии заполнены
  const allCriteriaFilled = useMemo(
    () => Object.values(evaluation.criteria_scores).every(v => v > 0),
    [evaluation.criteria_scores]
  );
  
  const canSave = allCriteriaFilled && !saving;
  
  
  // Отладка
  console.log('ProjectDefenseModal Debug:', {
    totalScore,
    criteria_scores: evaluation.criteria_scores,
    canSave,
    saving,
    saved,
    showSuccessModal,
    isOpen
  });

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
      margin-top: -10px; /* центрируем точку относительно линии трека */
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
      margin-top: -10px; /* центрируем точку относительно линии трека */
    }
    
    /* Принудительное убирание всех отступов для модального окна */
    .case-evaluation-modal {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      z-index: 10002 !important;
      background: white !important;
    }
    
    /* Убираем отступы у body когда открыто модальное окно */
    body.modal-open {
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
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
          {/* линия фона */}
          <div className="absolute left-1 right-1 top-[9px] h-[2px] bg-gray-200 rounded-full" />
          
          {/* заполняющаяся часть слева до выбранной точки */}
          <div 
            className="absolute left-1 top-[9px] h-[2px] bg-emerald-500 rounded-full"
            style={{ width: `${(STEPS.indexOf(value) / (STEPS.length - 1)) * 100}%` }}
          />
          {/* риски */}
          <div className="absolute left-1 right-1 top-[6px] h-5 pointer-events-none">
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
            value={Math.max(0, STEPS.indexOf(value))}
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
      <div 
        className="case-evaluation-modal fixed inset-0 z-[10002] overflow-y-auto bg-white" 
        style={{ 
          pointerEvents: 'auto'
        }}
      >
        {/* Шапка (sticky top) */}
        <header 
          className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur-sm"
          style={{ paddingTop: '0px' }}
        >
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
                  style={{ color: colorFor(getTotalScore()) }}
                >
                  {getTotalScore().toFixed(1)}
                </div>
                <div className="text-[11px] text-gray-400">средний балл</div>
              </div>
              <button
                onPointerUp={onClose}
                className="p-2 rounded-lg hover:bg-gray-50 active:bg-gray-100"
                aria-label="Закрыть"
                style={{
                  minWidth: '44px',
                  minHeight: '44px',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  userSelect: 'none'
                }}
              >
                <X className="w-6 h-6 text-gray-700 pointer-events-none" />
              </button>
            </div>
          </div>
        </header>

        {/* Контент */}
        <main className="px-4 pt-3">
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
                      {(() => {
                        const displayNumber = assignedPresentationNumber || evaluation.presentation_number;
                        console.log('🎯 Отображаем номер выступления:', {
                          assignedPresentationNumber,
                          evaluationPresentationNumber: evaluation.presentation_number,
                          displayNumber
                        });
                        return displayNumber;
                      })()}
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
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold" style={{ color: col }}>
                            {val ? val.toFixed(1) : '—'}
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

                {/* Кнопки действий */}
                <div className="mt-6 px-4 pb-6">
                  <div className="flex gap-2">
                    <button
                      onPointerUp={onClose}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                      style={{ minHeight: '48px', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    >
                      ← Назад
                    </button>
                    <button
                      onPointerUp={() => { 
                        console.log('🔘 ProjectDefenseModal Submit button clicked:', { canSave, hasAnyScore: Object.values(evaluation.criteria_scores).some(v => v > 0), saving });
                        if (canSave) {
                          console.log('✅ Вызываем handleSaveClick');
                          handleSaveClick(); 
                        } else {
                          console.log('❌ Кнопка заблокирована');
                        }
                      }}
                      disabled={!canSave}
                      className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm ${
                        !canSave
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg hover:shadow-xl'
                      }`}
                      style={{ minHeight: '48px', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
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
                          <Save className="w-4 h-4" />
                          Отправить
                        </div>
                      )}
                    </button>
                  </div>
                </div>

              </>
            )}
          </div>
        </main>
      </div>

      {/* Модальное окно успешной отправки */}
      <EvaluationSuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        participantName={participantName}
        caseNumber={null} // Для защиты проекта кейс не используется
        totalScore={getTotalScore()}
        evaluationType="Защита проекта"
        detailedScores={evaluation.criteria_scores}
        onRemoveEvaluation={async () => {
          await onRemoveEvaluation?.(participantId);
        }}
      />

      {/* Change confirmation modal */}
      <ChangeEvaluationConfirmModal
        isOpen={showChangeConfirmModal}
        onClose={() => setShowChangeConfirmModal(false)}
        onConfirm={() => {
          setShowChangeConfirmModal(false);
          saveEvaluation();
        }}
        participantName={participantName}
        evaluationType="Защита проекта"
        totalScore={getTotalScore()}
      />
    </>
  );
};
