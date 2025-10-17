import React, { useState, useEffect, useMemo } from 'react';
import { X, Brain, CheckCircle, Save, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { EvaluationSuccessModal } from './EvaluationSuccessModal';
import { ChangeEvaluationConfirmModal } from './ChangeEvaluationConfirmModal';

interface DiagnosticGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantId: string;
  participantName: string;
  examId: string;
  onEvaluationComplete?: () => Promise<void>;
  onRemoveEvaluation?: (participantId: string) => Promise<void>;
  existingEvaluation?: DiagnosticGameEvaluation;
  onModalStateChange?: (isOpen: boolean) => void; // Новый пропс для уведомления о состоянии модальных окон
}

interface DiagnosticGameEvaluation {
  id?: string;
  exam_event_id: string;
  reservist_id: string;
  evaluator_id: string;
  competency_scores: {
    results_orientation: number;
    effective_communication: number;
    teamwork_skills: number;
    systemic_thinking: number;
  };
}

export const DiagnosticGameModal: React.FC<DiagnosticGameModalProps> = ({
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
  const { user } = useAuthBFF();
  const [evaluation, setEvaluation] = useState<DiagnosticGameEvaluation>({
    exam_event_id: examId,
    reservist_id: participantId,
    evaluator_id: user?.id || '',
    competency_scores: {
      results_orientation: 0,
      effective_communication: 0,
      teamwork_skills: 0,
      systemic_thinking: 0,
    }
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showChangeConfirmModal, setShowChangeConfirmModal] = useState(false);
  const [hasExistingEvaluation, setHasExistingEvaluation] = useState(false);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [selectedCompetency, setSelectedCompetency] = useState<any>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Загрузка данных при открытии модала
  useEffect(() => {
    if (isOpen && participantId && examId && user?.id) {
      if (!dataLoaded) {
        // ВСЕГДА загружаем актуальные данные из Supabase
        loadExistingEvaluation();
      }
    } else if (!isOpen) {
      // Сбрасываем состояние при закрытии модального окна
      setDataLoaded(false);
    }
  }, [isOpen, participantId, examId, user?.id, dataLoaded]);

  // Блокировка прокрутки фона при открытом модальном окне
  // Сообщаем родителю об ОТКРЫТОСТИ модала с учётом дочерних окон
  useEffect(() => {
    const anyOpen = isOpen || showSuccessModal || showCriteriaModal;
    if (onModalStateChange) {
      onModalStateChange(anyOpen);
    }
    
    // Также отправляем событие для глобального слушателя
    const event = new CustomEvent('modalStateChange', {
      detail: { isOpen: anyOpen }
    });
    window.dispatchEvent(event);
  }, [isOpen, showSuccessModal, showCriteriaModal, onModalStateChange]);
  

  const loadExistingEvaluation = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      
      const { data, error } = await supabase
        .from('diagnostic_game_evaluations')
        .select('*')
        .eq('exam_event_id', examId)
        .eq('reservist_id', participantId)
        .eq('evaluator_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Ошибка загрузки существующей оценки:', error);
        // Создаем новую оценку при ошибке
        setEvaluation({
          exam_event_id: examId,
          reservist_id: participantId,
          evaluator_id: user.id,
          competency_scores: {
            results_orientation: 0,
            effective_communication: 0,
            teamwork_skills: 0,
            systemic_thinking: 0,
          }
        });
        setSaved(false);
        setHasExistingEvaluation(false);
        setDataLoaded(true);
        return;
      }

      if (data) {
        setEvaluation({
          id: data.id,
          exam_event_id: data.exam_event_id,
          reservist_id: data.reservist_id,
          evaluator_id: data.evaluator_id,
          competency_scores: data.competency_scores
        });
        setSaved(true);
        setHasExistingEvaluation(true);
      } else {
        // Нет существующей оценки - создаем новую
        setEvaluation({
          exam_event_id: examId,
          reservist_id: participantId,
          evaluator_id: user.id,
          competency_scores: {
            results_orientation: 0,
            effective_communication: 0,
            teamwork_skills: 0,
            systemic_thinking: 0,
          }
        });
        setSaved(false);
      }
      setDataLoaded(true);
    } catch (error) {
      console.error('❌ Ошибка загрузки существующей оценки:', error);
      // Создаем новую оценку при ошибке
      setEvaluation({
        exam_event_id: examId,
        reservist_id: participantId,
        evaluator_id: user.id,
        competency_scores: {
          results_orientation: 0,
          effective_communication: 0,
          teamwork_skills: 0,
          systemic_thinking: 0,
        }
        });
        setSaved(false);
        setHasExistingEvaluation(false);
        setDataLoaded(true);
      } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (competency: keyof DiagnosticGameEvaluation['competency_scores'], score: number) => {
    console.log('DiagnosticGameModal handleScoreChange:', { competency, score });
    setEvaluation(prev => ({
      ...prev,
      competency_scores: {
        ...prev.competency_scores,
        [competency]: score
      }
    }));
    setSaved(false);
  };


  const handleSaveClick = () => {
    console.log('🔍 DiagnosticGameModal handleSaveClick вызван:', { 
      hasExistingEvaluation, 
      saved, 
      saving,
      competencyScores: evaluation.competency_scores
    });
    
    // Проверяем, что все критерии заполнены (больше 0)
    const allCriteriaFilled = Object.values(evaluation.competency_scores).every(v => v > 0);
    if (!allCriteriaFilled) {
      console.log('❌ Блокируем сохранение - не все критерии заполнены:', evaluation.competency_scores);
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
        competency_scores: evaluation.competency_scores
      };


      const { error } = await supabase
        .from('diagnostic_game_evaluations')
        .upsert(evaluationData, {
          onConflict: 'exam_event_id,reservist_id,evaluator_id'
        });

      if (error) {
        console.error('Ошибка сохранения оценки диагностической игры:', error);
        alert('Таблица diagnostic_game_evaluations не существует. Оценка не сохранена в базу данных.');
      }

      setSaved(true);
      console.log('🎉 Показываем модальное окно успеха с totalScore:', getTotalScore());
      setTimeout(() => {
        setShowSuccessModal(true);
      }, 0);
    } catch (error) {
      console.error('Ошибка сохранения оценки диагностической игры:', error);
      setSaved(true);
      setShowSuccessModal(true);
    } finally {
      setSaving(false);
    }
  };

  const getTotalScore = () => {
    const { results_orientation, effective_communication, teamwork_skills, systemic_thinking } = evaluation.competency_scores;
    const validScores = [results_orientation, effective_communication, teamwork_skills, systemic_thinking].filter(score => score > 0);
    if (validScores.length === 0) return 0;
    const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    const result = Math.round(average * 10) / 10;
    console.log('🔢 DiagnosticGameModal getTotalScore calculated:', {
      competency_scores: evaluation.competency_scores,
      validScores,
      average,
      result
    });
    return result;
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


  const competencies = [
    {
      key: 'results_orientation' as const,
      title: 'Компетенция «Ориентация на результат»',
      description: 'Признает свою ответственность за результаты работы; самостоятельно ищет решения; поступается личными интересами ради достижения целей',
      details: [
        'Признает свою ответственность за результаты работы',
        'Самостоятельно ищет решения, сталкиваясь с проблемами в зоне своей ответственности',
        'В случае необходимости поступается личными интересами и комфортом ради достижения целей'
      ],
      icon: null
    },
    {
      key: 'effective_communication' as const,
      title: 'Компетенция «Эффективная коммуникация»',
      description: 'Легко инициирует контакт; общается вежливо и доброжелательно; четко излагает свою позицию; аргументирует мнение; внимательно выслушивает других',
      details: [
        'Легко инициирует контакт для решения рабочих вопросов',
        'Общается вежливо и доброжелательно',
        'Четко и ясно излагает свою позицию',
        'Аргументирует свое мнение',
        'Внимательно выслушивает мнение других',
        'Проявляет твердость в отстаивании своей позиции'
      ],
      icon: null
    },
    {
      key: 'teamwork_skills' as const,
      title: 'Компетенция «Умение работать в команде»',
      description: 'Принимает на себя роль лидера; открыто делится опытом; оказывает поддержку другим; координирует работу с коллегами; мотивирует команду',
      details: [
        'Принимает на себя роль лидера',
        'Открыто делится опытом и важной информацией в команде',
        'Оказывает поддержку и помощь другим членам команды',
        'Координирует свою работу с коллегами для решения совместных задач',
        'Мотивирует («заряжает») коллег на выполнение задач, учитывая особенности их характера и мотивации'
      ],
      icon: null
    },
    {
      key: 'systemic_thinking' as const,
      title: 'Компетенция «Системное мышление»',
      description: 'Собирает и структурирует информацию; выстраивает целостную картину ситуации; делает логичные выводы; рассматривает варианты решений; прогнозирует последствия',
      details: [
        'Собирает, структурирует и сопоставляет информацию, восполняет пробелы в информации, необходимые для выработки решения',
        'Выстраивает целостную картину ситуации, устанавливает причинно-следственные связи',
        'Делает логичные, обоснованные выводы',
        'Рассматривает несколько вариантов решения стоящих перед ним задач',
        'Прогнозирует последствия своих решений'
      ],
      icon: null
    }
  ];

  // Константы для слайдера (как в CaseEvaluationModal)
  const STEPS: number[] = Array.from({ length: 9 }, (_, i) => 1 + i * 0.5); // [1..5] шаг 0.5

  // Функции для работы со слайдером (как в CaseEvaluationModal)
  const colorFor = (score: number) => {
    if (score >= 4) return '#059669'; // green-600
    if (score >= 3) return '#d97706'; // amber-600
    return '#dc2626'; // red-600
  };

  const totalScore = useMemo(() => {
    const scores = Object.values(evaluation.competency_scores) as number[];
    const validScores = scores.filter(s => s > 0);
    if (validScores.length === 0) return 0;
    const avg = validScores.reduce((s, x) => s + x, 0) / validScores.length;
    return Math.round(avg * 10) / 10;
  }, [evaluation.competency_scores]);

  // Проверяем, что все критерии заполнены
  const allCriteriaFilled = useMemo(
    () => Object.values(evaluation.competency_scores).every(v => v > 0),
    [evaluation.competency_scores]
  );
  
  const canSave = allCriteriaFilled && !saving;
  
  
  // Отладка
  console.log('DiagnosticGameModal Debug:', {
    totalScore,
    competency_scores: evaluation.competency_scores,
    canSave,
    saving,
    saved,
    showSuccessModal,
    isOpen,
    showCriteriaModal,
    selectedCompetency: selectedCompetency?.title
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
    
    /* Специальные стили для iPhone */
    @media screen and (max-width: 768px) {
      .case-evaluation-modal {
        -webkit-overflow-scrolling: touch !important;
        -webkit-transform: translate3d(0, 0, 0) !important;
        transform: translate3d(0, 0, 0) !important;
      }
      
      .case-evaluation-modal header {
        -webkit-transform: translateZ(0) !important;
        transform: translateZ(0) !important;
        will-change: transform !important;
      }
      
      .case-evaluation-modal button {
        -webkit-tap-highlight-color: transparent !important;
        -webkit-touch-callout: none !important;
        -webkit-user-select: none !important;
        user-select: none !important;
        touch-action: manipulation !important;
      }
      
      /* Убираем safe area для полноэкранного режима */
      .case-evaluation-modal {
        padding-top: 0px !important;
        padding-left: 0px !important;
        padding-right: 0px !important;
        padding-bottom: 0px !important;
      }
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

  // Доступные значения оценок
  const scoreValues = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

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
                <Brain className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-500">Диагностическая игра</div>
                <div className="text-base font-semibold truncate">{participantName}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div
                  className="text-2xl font-bold"
                  style={{ color: colorFor(totalScore) }}
                >
                  {totalScore.toFixed(1)}
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
          {loading || !dataLoaded ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              <p className="text-sm text-gray-600">Загружаем данные диагностической игры...</p>
            </div>
          ) : (
            <>
              {/* Компетенции */}
                {competencies.map(c => {
                  const val = evaluation.competency_scores[c.key];
                  const col = colorFor(val);
                  return (
                    <div key={c.key} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 mb-1">
                            <div className="text-sm font-medium text-gray-900">{c.title}</div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('🔍 Info button clicked for:', c.title);
                                setSelectedCompetency(c);
                                setShowCriteriaModal(true);
                                console.log('🔍 showCriteriaModal set to true');
                              }}
                              className="flex items-center justify-center hover:opacity-70 active:opacity-50 transition-opacity touch-manipulation"
                              aria-label="Показать критерии оценки"
                              style={{
                                WebkitTapHighlightColor: 'transparent',
                                touchAction: 'manipulation'
                              }}
                            >
                              <Info className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                          <div className="text-xs text-gray-500">{c.description}</div>
                        </div>
                        <div className="text-right ml-3">
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
                        console.log('🔘 DiagnosticGameModal Submit button clicked:', { canSave, hasAnyScore: Object.values(evaluation.competency_scores).some(v => v > 0), saving });
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
        caseNumber={null} // Для диагностической игры кейс не используется
        totalScore={getTotalScore()}
        evaluationType="Диагностическая игра"
        detailedScores={evaluation.competency_scores}
        onRemoveEvaluation={async () => {
          await onRemoveEvaluation?.(participantId);
        }}
      />

      {/* Модал критериев оценки */}
      {showCriteriaModal && selectedCompetency && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10004] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              console.log('🔍 Overlay clicked - closing modal');
              setShowCriteriaModal(false);
              setSelectedCompetency(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Заголовок */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Критерии оценки: {selectedCompetency.title}
                  </h2>
                  <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                    {selectedCompetency.description}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔍 X button clicked - closing modal');
                    setShowCriteriaModal(false);
                    setSelectedCompetency(null);
                  }}
                  className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                  aria-label="Закрыть"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            {/* Содержание */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {selectedCompetency.details.map((detail: string, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-emerald-600 text-sm font-semibold">{index + 1}</span>
                    </div>
                    <div className="flex items-start gap-2 flex-1">
                      <p className="text-gray-700 text-sm leading-relaxed flex-1">{detail}</p>
                      <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 mt-0.5">
                        <Info className="w-3 h-3 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Кнопка */}
            <div className="p-4 sm:p-6 border-t border-gray-100">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔍 Понятно button clicked');
                  setShowCriteriaModal(false);
                  setSelectedCompetency(null);
                  console.log('🔍 showCriteriaModal set to false');
                }}
                className="w-full px-6 py-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 active:bg-emerald-700 transition-colors font-medium text-base touch-manipulation"
                style={{
                  minHeight: '48px',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change confirmation modal */}
      <ChangeEvaluationConfirmModal
        isOpen={showChangeConfirmModal}
        onClose={() => setShowChangeConfirmModal(false)}
        onConfirm={() => {
          setShowChangeConfirmModal(false);
          saveEvaluation();
        }}
        participantName={participantName}
        evaluationType="Диагностическая игра"
        totalScore={totalScore}
      />
    </>
  );
};
