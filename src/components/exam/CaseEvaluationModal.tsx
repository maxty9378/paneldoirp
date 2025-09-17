
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, FileText, Save, CheckCircle, MessageSquare, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { EvaluationSuccessModal } from './EvaluationSuccessModal';
import { LegacyCaseEvaluation } from '../../types/evaluation';

/* ========= Типы ========= */
interface CaseEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantId: string;
  participantName: string;
  caseNumber: number;
  examId: string;
  onEvaluationComplete?: () => Promise<void>;
  onRemoveEvaluation?: (participantId: string, caseNumber: number) => Promise<void>;
  existingEvaluation?: LegacyCaseEvaluation;
  onModalStateChange?: (isOpen: boolean) => void;
}

/* ========= Константы ========= */
// разрешённые значения: 1, 1.5, 2, 2.5, ... 5
const STEPS: number[] = Array.from({ length: 9 }, (_, i) => 1 + i * 0.5); // [1..5] шаг 0.5

const CRITERIA = [
  { key: 'correctness' as const, title: 'Правильность', icon: CheckCircle },
  { key: 'clarity' as const,     title: 'Чёткость',     icon: MessageSquare },
  { key: 'independence' as const,title: 'Самостоятельность', icon: User }
];

function colorFor(score: number) {
  if (score >= 4) return '#10B981';   // зелёный
  if (score >= 3) return '#F59E0B';   // янтарный
  if (score > 0)  return '#EF4444';   // красный
  return '#6B7280';                   // серый
}

/* ========= Рейл со слайдером и рисками ========= */
function ScoreRail({
  value,
  onChange,
  ariaLabel,
  color
}: {
  value: number;
  onChange: (v: number) => void;
  ariaLabel: string;
  color: string;
}) {
  const idx = Math.max(0, STEPS.indexOf(value));
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const i = parseInt(e.target.value, 10);
    onChange(STEPS[i]);
  };

  return (
    <div className="mt-2">
      {/* Чипы для быстрого выбора целых значений */}
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

      {/* Трек с рисками (мажорные и минорные) */}
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
          step={1}
          value={idx}
          onChange={handle}
          aria-label={ariaLabel}
          className="relative z-10 w-full h-3 bg-transparent appearance-none slider-thumb"
          style={{ '--thumb-color': color } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

/* ========= Основной компонент ========= */
export const CaseEvaluationModal: React.FC<CaseEvaluationModalProps> = ({
  isOpen,
  onClose,
  participantId,
  participantName,
  caseNumber,
  examId,
  onEvaluationComplete,
  onRemoveEvaluation,
  existingEvaluation,
  onModalStateChange
}) => {
  const { user } = useAuth();

  const [evaluation, setEvaluation] = useState<{
    id?: string;
    exam_event_id: string;
    reservist_id: string;
    evaluator_id: string;
    case_number: number;
    criteria_scores: { correctness: number; clarity: number; independence: number };
    comments?: string;
  }>({
    exam_event_id: examId,
    reservist_id: participantId,
    evaluator_id: user?.id || '',
    case_number: caseNumber,
    criteria_scores: { correctness: 0, clarity: 0, independence: 0 },
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const scrollRootRef = useRef<HTMLDivElement>(null);

  /* Уведомляем родительский компонент о состоянии модального окна */
  useEffect(() => {
    onModalStateChange?.(isOpen);
  }, [isOpen, onModalStateChange, participantName, caseNumber]);

  /* Загрузка данных при открытии модала */
  useEffect(() => {
    if (isOpen && participantId && examId && user?.id) {
      loadExistingEvaluation();
    }
  }, [isOpen, participantId, examId, user?.id, caseNumber]);

  /* Загрузка существующих оценок */
  const loadExistingEvaluation = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('case_evaluations')
        .select('*')
        .eq('exam_event_id', examId)
        .eq('reservist_id', participantId)
        .eq('evaluator_id', user.id)
        .eq('case_number', caseNumber)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Ошибка загрузки существующей оценки:', error);
        // Создаем новую оценку при ошибке
        setEvaluation({
          exam_event_id: examId,
          reservist_id: participantId,
          evaluator_id: user.id,
          case_number: caseNumber,
          criteria_scores: { correctness: 0, clarity: 0, independence: 0 },
        });
        setSaved(false);
        return;
      }

      if (data) {
        // Загружаем данные из новой структуры
        setEvaluation({
          id: data.id,
          exam_event_id: data.exam_event_id,
          reservist_id: data.reservist_id,
          evaluator_id: data.evaluator_id,
          case_number: data.case_number,
          criteria_scores: data.criteria_scores,
          comments: data.comments || '',
        });
        setSaved(true);
      } else if (existingEvaluation) {
        // Fallback: используем данные из props (старая структура)
        setEvaluation({
          id: existingEvaluation.id,
          exam_event_id: examId,
          reservist_id: participantId,
          evaluator_id: existingEvaluation.evaluator_id || user.id,
          case_number: caseNumber,
          criteria_scores: {
            correctness: existingEvaluation.correctness_score || 0,
            clarity: existingEvaluation.clarity_score || 0,
            independence: existingEvaluation.independence_score || 0,
          },
          comments: existingEvaluation.overall_comment || '',
        });
        setSaved(true);
      } else {
        // Нет существующей оценки - создаем новую
        setEvaluation({
          exam_event_id: examId,
          reservist_id: participantId,
          evaluator_id: user.id,
          case_number: caseNumber,
          criteria_scores: { correctness: 0, clarity: 0, independence: 0 },
        });
        setSaved(false);
      }
    } catch (error) {
      console.error('Ошибка загрузки существующей оценки:', error);
      // Создаем новую оценку при ошибке
      setEvaluation({
        exam_event_id: examId,
        reservist_id: participantId,
        evaluator_id: user.id,
        case_number: caseNumber,
        criteria_scores: { correctness: 0, clarity: 0, independence: 0 },
      });
      setSaved(false);
    } finally {
      setLoading(false);
    }
  };

  /* Фулл-скрин модал: блокируем скролл боди, используем свой скролл внутри */
  useEffect(() => {
    if (!isOpen) return;
    const y = window.scrollY;
    document.body.classList.add('modal-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${y}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => scrollRootRef.current && (scrollRootRef.current.scrollTop = 0));
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, y);
    };
  }, [isOpen]);

  /* Вспомогалки */
  const setScore = (k: keyof typeof evaluation.criteria_scores, v: number) => {
    setEvaluation(p => ({ ...p, criteria_scores: { ...p.criteria_scores, [k]: v } }));
    setSaved(false);
  };

  const totalScore = useMemo(() => {
    const vals = Object.values(evaluation.criteria_scores).filter(v => v > 0);
    if (!vals.length) return 0;
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    return Math.round(avg * 10) / 10;
  }, [evaluation.criteria_scores]);

  const canSave = totalScore > 0 && !saving;
  

  const saveEvaluation = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const evaluationData = {
        exam_event_id: examId,
        reservist_id: participantId,
        evaluator_id: user?.id,
        case_number: caseNumber,
        criteria_scores: evaluation.criteria_scores,
        comments: evaluation.comments || null
      };

      const { data, error } = await supabase
        .from('case_evaluations')
        .upsert(evaluationData, {
          onConflict: 'exam_event_id,reservist_id,evaluator_id,case_number'
        })
        .select()
        .single();

      if (error) {
        console.error('Ошибка сохранения оценки кейса:', error);
        alert(`Ошибка сохранения оценки: ${error.message}`);
        return;
      }

      // Обновляем состояние с полученными данными
      if (data) {
        setEvaluation(prev => ({ ...prev, id: data.id }));
      }

      setSaved(true);
      setShowSuccessModal(true);
    } catch (e) {
      console.error('Ошибка сохранения:', e);
      alert(`Ошибка сохранения: ${e instanceof Error ? e.message : 'Неизвестная ошибка'}`);
    } finally {
      setSaving(false);
    }
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

  if (!isOpen) return null;

  /* ========= Стили слайдера ========= */
  const sliderStyles = `
    .slider-thumb::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none;
      width: 20px; height: 20px; border-radius: 9999px;
      background: var(--thumb-color, #10B981);
      border: 3px solid #fff; box-shadow: 0 0 5px rgba(0,0,0,.15);
      margin-top: -9px; /* выравниваем по тонкой линии трека */
    }
    .slider-thumb::-moz-range-thumb {
      width: 20px; height: 20px; border-radius: 9999px;
      background: var(--thumb-color, #10B981);
      border: 3px solid #fff; box-shadow: 0 0 5px rgba(0,0,0,.15);
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
      z-index: 9998 !important;
      background: white !important;
    }
    
    /* Упрощенные стили для модального окна */
    .case-evaluation-modal {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      z-index: 9998 !important;
      background: white !important;
    }
    
    /* Стили для футера с кнопками */
    .case-evaluation-modal footer {
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      z-index: 9999 !important;
      pointer-events: auto !important;
    }
    
    .case-evaluation-modal footer button {
      pointer-events: auto !important;
      position: relative !important;
      z-index: 10000 !important;
    }
    
    /* Убираем отступы у body когда открыто модальное окно */
    body.modal-open {
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
    
    /* iPhone-специфичные стили */
    @supports (-webkit-touch-callout: none) {
      .case-evaluation-modal {
        -webkit-overflow-scrolling: touch !important;
        -webkit-transform: translate3d(0, 0, 0) !important;
        transform: translate3d(0, 0, 0) !important;
        backface-visibility: hidden !important;
        will-change: transform !important;
      }
      
      .case-evaluation-modal footer button {
        -webkit-tap-highlight-color: transparent !important;
        user-select: none !important;
        touch-action: manipulation !important;
        min-height: 44px !important;
      }
    }
  `;

  return (
    <>
      <style>{sliderStyles}</style>

      {/* Фуллскрин слой */}
      <div 
        className="case-evaluation-modal fixed inset-0 z-[10002] flex flex-col bg-white" 
        style={{ 
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          margin: 0,
          padding: '0px',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          transform: 'translate3d(0, 0, 0)',
          backfaceVisibility: 'hidden',
          willChange: 'transform',
          WebkitTransform: 'translate3d(0, 0, 0)',
          WebkitBackfaceVisibility: 'hidden',
          WebkitOverflowScrolling: 'touch',
          pointerEvents: 'auto'
        }}
      >
        {/* Шапка (sticky top) */}
        <header className="sticky top-0 z-10 border-b border-gray-100 bg-white">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-500">Кейс #{caseNumber}</div>
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
                onClick={onClose}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                className="p-2 rounded-lg hover:bg-gray-50 active:bg-gray-100 touch-manipulation"
                aria-label="Закрыть"
                style={{
                  minWidth: '44px',
                  minHeight: '44px',
                  zIndex: 1000,
                  position: 'relative',
                  WebkitTapHighlightColor: 'transparent',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none'
                }}
              >
                <X className="w-6 h-6 text-gray-700 pointer-events-none" />
              </button>
            </div>
          </div>
        </header>

        {/* Контент (скролл) */}
        <main ref={scrollRootRef} className="flex-1 overflow-y-auto px-4 pt-3 pb-24">
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : (
              CRITERIA.map(c => {
                const Icon = c.icon;
                const val = evaluation.criteria_scores[c.key];
                const col = colorFor(val);
                return (
                  <div key={c.key} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="text-sm font-medium text-gray-900">{c.title}</div>
                      </div>
                      <div className="text-lg font-bold" style={{ color: col }}>
                        {val ? val.toFixed(1) : '—'}
                      </div>
                    </div>

                    <ScoreRail
                      value={val}
                      onChange={(v) => setScore(c.key, v)}
                      ariaLabel={`Оценка: ${c.title}`}
                      color={col}
                    />
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>

      {/* Футер (отдельный от основного контейнера) */}
      <footer 
        className="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white"
        style={{ 
          zIndex: 10010,
          pointerEvents: 'auto',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
          paddingTop: '0px',
          paddingLeft: '0px',
          paddingRight: '0px'
        }}
      >
        <div className="px-4 py-3">
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              onTouchEnd={(e) => { e.preventDefault(); onClose(); }}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              style={{
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
                touchAction: 'manipulation',
                minHeight: '44px'
              }}
            >
              ← Назад
            </button>
            <button
              onClick={saveEvaluation}
              onTouchEnd={(e) => { if (canSave) { e.preventDefault(); saveEvaluation(); } }}
              disabled={!canSave}
              className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                !canSave
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg hover:shadow-xl'
              }`}
              style={{
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
                touchAction: 'manipulation',
                minHeight: '44px'
              }}
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
      </footer>

      {/* Success modal */}
      <EvaluationSuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        onEdit={handleEditEvaluation}
        participantName={participantName}
        caseNumber={caseNumber}
        totalScore={totalScore}
        evaluationType="Решение кейса"
        onRemoveEvaluation={async () => {
          await onRemoveEvaluation?.(participantId, caseNumber);
        }}
      />
      
    </>
  );
};
