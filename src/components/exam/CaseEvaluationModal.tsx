import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, FileText, Save, CheckCircle, MessageSquare, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { EvaluationSuccessModal } from './EvaluationSuccessModal';

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
  existingEvaluation?: CaseEvaluation;
}
interface CaseEvaluation {
  id?: string;
  exam_event_id: string;
  reservist_id: string;
  evaluator_id: string;
  case_number: number;
  criteria_scores: {
    correctness: number;
    clarity: number;
    independence: number;
  };
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
  existingEvaluation
}) => {
  const { user } = useAuth();

  const [evaluation, setEvaluation] = useState<CaseEvaluation>({
    exam_event_id: examId,
    reservist_id: participantId,
    evaluator_id: user?.id || '',
    case_number: caseNumber,
    criteria_scores: { correctness: 0, clarity: 0, independence: 0 },
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const scrollRootRef = useRef<HTMLDivElement>(null);

  /* Инициализация из props */
  useEffect(() => {
    if (!isOpen) return;
    if (existingEvaluation) {
      setEvaluation({
        ...existingEvaluation,
        evaluator_id: existingEvaluation.evaluator_id || user?.id || '',
      });
      setSaved(true);
    } else {
      setEvaluation({
        exam_event_id: examId,
        reservist_id: participantId,
        evaluator_id: user?.id || '',
        case_number: caseNumber,
        criteria_scores: { correctness: 0, clarity: 0, independence: 0 },
      });
      setSaved(false);
    }
  }, [isOpen, existingEvaluation, examId, participantId, user?.id, caseNumber]);

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
  const setScore = (k: keyof CaseEvaluation['criteria_scores'], v: number) => {
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
      const payload = {
        exam_event_id: examId,
        reservist_id: participantId,
        evaluator_id: user?.id,
        case_number: caseNumber,
        criteria_scores: evaluation.criteria_scores
      };

      const { error } = await supabase
        .from('case_evaluations')
        .upsert(payload, { onConflict: 'exam_event_id,reservist_id,evaluator_id,case_number' });

      if (error) {
        console.error('Ошибка сохранения оценки:', error);
        alert('Таблица case_evaluations недоступна. Оценка не сохранена в БД.');
      }

      setSaved(true);
      setShowSuccessModal(true);
    } catch (e) {
      console.error('Ошибка сохранения:', e);
      setSaved(true);
      setShowSuccessModal(true);
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
      padding-top: env(safe-area-inset-top, 0px) !important;
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
      
      /* Убираем возможные конфликты с safe area */
      .case-evaluation-modal {
        padding-top: env(safe-area-inset-top, 0px) !important;
        padding-left: env(safe-area-inset-left, 0px) !important;
        padding-right: env(safe-area-inset-right, 0px) !important;
        padding-bottom: env(safe-area-inset-bottom, 0px) !important;
      }
    }
    
    /* Стабилизация для мобильных устройств */
    .fixed-bottom-menu {
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      z-index: 10003 !important;
      transform: translateZ(0) !important;
      backface-visibility: hidden !important;
      will-change: transform !important;
      -webkit-transform: translateZ(0) !important;
      -webkit-backface-visibility: hidden !important;
    }
    
    /* Дополнительная стабилизация для мобильных */
    @media (max-width: 768px) {
      .fixed-bottom-menu {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 10003 !important;
        transform: translate3d(0, 0, 0) !important;
        backface-visibility: hidden !important;
        will-change: transform !important;
        -webkit-transform: translate3d(0, 0, 0) !important;
        -webkit-backface-visibility: hidden !important;
        -webkit-perspective: 1000px !important;
        perspective: 1000px !important;
      }
    }
  `;

  return (
    <>
      <style>{sliderStyles}</style>

      {/* Фуллскрин слой */}
      <div className="case-evaluation-modal fixed inset-0 z-[10002] flex flex-col bg-white" style={{ 
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        margin: 0,
        padding: 0,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        transform: 'translate3d(0, 0, 0)',
        backfaceVisibility: 'hidden',
        willChange: 'transform',
        WebkitTransform: 'translate3d(0, 0, 0)',
        WebkitBackfaceVisibility: 'hidden',
        WebkitOverflowScrolling: 'touch'
      }}>
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
        <main ref={scrollRootRef} className="flex-1 overflow-y-auto px-4 pt-3 pb-32">
          <div className="space-y-3">
            {CRITERIA.map(c => {
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
            })}
          </div>
        </main>

      </div>

      {/* Футер (полностью независимый, зафиксированный) */}
      <footer
        className="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white z-[10003] fixed-bottom-menu"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      >
        <div className="px-4 py-3">
          <button
            onClick={saveEvaluation}
            disabled={!canSave}
            className={
              'w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 ' +
              (canSave
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow'
                : 'bg-gray-200 text-gray-500')
            }
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Сохраняю…
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Сохранено
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Отправить
              </>
            )}
          </button>
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
