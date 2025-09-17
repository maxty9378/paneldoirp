import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Users, Trophy, ArrowRight, Loader2, User, MousePointer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { CaseEvaluationModal } from './CaseEvaluationModal';
// Убираем @reactour/tour, создаем собственное решение

// Компонент портала для модалок
const ModalPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const elRef = useRef<HTMLElement | null>(null);
  
  if (!elRef.current) {
    elRef.current = document.createElement('div');
  }
  
  useEffect(() => {
    const el = elRef.current!;
    document.body.appendChild(el);
    return () => { 
      if (document.body.contains(el)) {
        document.body.removeChild(el); 
      }
    };
  }, []);
  
  return createPortal(children, elRef.current!);
};

// Собственный компонент тултипа для мобильных устройств
const MobileTooltip: React.FC<{
  isVisible: boolean;
  targetRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}> = ({ isVisible, targetRef, onClose }) => {
  const [position, setPosition] = useState({ top: 0, left: 0, arrowPosition: 'left' });
  const [rect, setRect] = useState<DOMRect | null>(null);
  const gap = 8; // отступ вокруг «дырки»

  useEffect(() => {
    if (!isVisible || !targetRef.current) return;

    let raf = 0;
    const update = () => {
      const r = targetRef.current!.getBoundingClientRect();
      setRect(r);
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Определяем, мобильное ли устройство
      const isMobile = viewportWidth <= 768;
      
      // Размеры тултипа
      const tooltipWidth = isMobile ? 240 : 280; // Уменьшаем для мобильных
      const tooltipHeight = 80;
      const padding = 16;
      const arrowSize = 8;
      
      let top, left, arrowPosition;

      if (isMobile) {
        // Для мобильных устройств размещаем тултип справа от карточки, опускаем ниже
        left = r.right + padding;
        top = r.top + r.height * 0.7 - tooltipHeight / 2; // Опускаем на 70% высоты карточки
        arrowPosition = 'left';
        
        // Если не помещается справа, пробуем слева
        if (left + tooltipWidth > viewportWidth - padding) {
          left = r.left - tooltipWidth - padding;
          top = r.top + r.height * 0.7 - tooltipHeight / 2; // Опускаем на 70% высоты карточки
          arrowPosition = 'right';
          
          // Если не помещается слева, размещаем снизу по центру
          if (left < padding) {
            left = Math.max(padding, r.left + r.width / 2 - tooltipWidth / 2);
            top = r.bottom + padding + arrowSize;
            arrowPosition = 'top';
          }
        }
      } else {
        // Для десктопа размещаем справа от карточки, опускаем ниже
        left = r.right + padding;
        top = r.top + r.height * 0.7 - tooltipHeight / 2; // Опускаем на 70% высоты карточки
        arrowPosition = 'left';

        // Проверяем, помещается ли справа
        if (left + tooltipWidth > viewportWidth - padding) {
          // Пробуем слева
          left = r.left - tooltipWidth - padding;
          top = r.top + r.height * 0.7 - tooltipHeight / 2; // Опускаем на 70% высоты карточки
          arrowPosition = 'right';
          
          // Если не помещается слева, размещаем снизу
          if (left < padding) {
            left = Math.max(padding, r.left + r.width / 2 - tooltipWidth / 2);
            top = r.bottom + padding + arrowSize;
            arrowPosition = 'top';
          }
        }
      }

      // Проверяем вертикальные границы
      if (top < padding) {
        top = padding;
      } else if (top + tooltipHeight > viewportHeight - padding) {
        // Если не помещается снизу, пробуем сверху
        if (arrowPosition === 'top') {
          top = r.top - tooltipHeight - padding - arrowSize;
          arrowPosition = 'bottom';
        } else {
          top = viewportHeight - tooltipHeight - padding;
        }
      }

      // Проверяем горизонтальные границы
      if (left < padding) {
        left = padding;
      } else if (left + tooltipWidth > viewportWidth - padding) {
        left = viewportWidth - tooltipWidth - padding;
      }

      setPosition({ top, left, arrowPosition });
    };

    const onScrollOrResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      cancelAnimationFrame(raf);
    };
  }, [isVisible, targetRef]);

  if (!isVisible || !rect) return null;

  return (
    <ModalPortal>
      {/* СПОТЛАЙТ: четыре панели вокруг цели — клики по ним закрывают подсказку.
          «Окно» над карточкой пустое, поэтому блок не затемняется и кликается. */}
      <div className="fixed inset-0 z-[10000] pointer-events-none">
        {/* Верхняя панель */}
        <div
          className="fixed left-0 bg-black/20 pointer-events-auto"
          style={{ top: 0, width: '100vw', height: Math.max(0, rect.top - gap) }}
          onClick={onClose}
        />
        {/* Нижняя панель */}
        <div
          className="fixed left-0 bg-black/20 pointer-events-auto"
          style={{ top: rect.bottom + gap, width: '100vw', bottom: 0 }}
          onClick={onClose}
        />
        {/* Левая панель */}
        <div
          className="fixed bg-black/20 pointer-events-auto"
          style={{
            top: Math.max(0, rect.top - gap),
            left: 0,
            width: Math.max(0, rect.left - gap),
            height: rect.height + gap * 2
          }}
          onClick={onClose}
        />
        {/* Правая панель */}
        <div
          className="fixed bg-black/20 pointer-events-auto"
          style={{
            top: Math.max(0, rect.top - gap),
            left: rect.right + gap,
            right: 0,
            height: rect.height + gap * 2
          }}
          onClick={onClose}
        />
      </div>

      {/* Сам тултип */}
      <div
        className="fixed z-[10001] bg-white rounded-xl shadow-2xl p-4 sm:max-w-[280px] max-w-[240px]"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          fontFamily: 'Mabry, sans-serif'
        }}
        role="tooltip"
      >
      <div className="flex items-start gap-2">
        <MousePointer className="w-4 h-4 mt-0.5 text-emerald-600" />
          <div className="flex-1">
            <div className="font-semibold text-gray-900 text-sm">Начните здесь</div>
            <div className="text-xs text-gray-600 mt-1">
            Нажмите «Решение кейсов», чтобы выбрать и оценить кейс.
          </div>
        </div>
      </div>
        
        {/* Стрелка - для мобилки сверху, для ПК по сторонам */}
        <div
          className={`absolute w-0 h-0 ${
            position.arrowPosition === 'left' 
              ? 'border-t-[8px] border-b-[8px] border-r-[8px] border-t-transparent border-b-transparent border-r-white -right-2 top-1/2 -translate-y-1/2'
              : position.arrowPosition === 'right'
              ? 'border-t-[8px] border-b-[8px] border-l-[8px] border-t-transparent border-b-transparent border-l-white -left-2 top-1/2 -translate-y-1/2'
              : position.arrowPosition === 'bottom'
              ? 'border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-white -bottom-2 left-1/2 -translate-x-1/2'
              : 'border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-white -top-2 left-1/2 -translate-x-1/2'
          }`}
        />
      </div>
    </ModalPortal>
  );
};

interface EvaluationStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStageSelect?: (stage: string, caseNumber?: number) => void;
  participantName: string;
  participantPhoto?: string;
  examId: string;
  participantId: string;
  onCaseEvaluationOpen?: (caseNumber: number) => void;
  onCaseEvaluationComplete?: (caseNumber: number) => Promise<void>;
  onRemoveEvaluation?: (participantId: string, caseNumber: number) => Promise<void>;
  evaluations?: any[]; // Загруженные оценки для определения статуса завершенности
  onModalStateChange?: (isOpen: boolean) => void; // Новый пропс для уведомления о состоянии модальных окон
}

// Внутренний компонент, который использует хук useTour
const EvaluationStageModalContent: React.FC<EvaluationStageModalProps> = ({
  isOpen,
  onClose,
  onStageSelect,
  participantName,
  participantPhoto,
  examId,
  participantId,
  onCaseEvaluationComplete,
  onRemoveEvaluation,
  evaluations: _evaluations = [],
  onModalStateChange
}) => {
  const { user } = useAuth();
  const [showTooltip, setShowTooltip] = useState(false);
  const targetRef = React.useRef<HTMLElement>(null);
  const [showCaseSelection, setShowCaseSelection] = useState(false);
  const [assignedCases, setAssignedCases] = useState<number[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [showCaseEvaluation, setShowCaseEvaluation] = useState(false);
  const [selectedCaseNumber, setSelectedCaseNumber] = useState<number>(1);
  const [highlightCaseSolving, setHighlightCaseSolving] = useState(false);
  const [currentEvaluations, setCurrentEvaluations] = useState<any[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  
  // Уведомляем родительский компонент о состоянии модальных окон
  useEffect(() => {
    const anyModalOpen = showCaseEvaluation || showCaseSelection;
    onModalStateChange?.(anyModalOpen);
  }, [showCaseEvaluation, showCaseSelection, onModalStateChange]);

  // Загрузка актуальных оценок при открытии модального окна
  const fetchCurrentEvaluations = async () => {
    if (!examId || !user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('case_evaluations')
        .select('*')
        .eq('exam_event_id', examId)
        .eq('evaluator_id', user.id);

      if (error) throw error;
      setCurrentEvaluations(data || []);
    } catch (err) {
      console.error('Ошибка загрузки актуальных оценок:', err);
    }
  };

  // Загружаем актуальные оценки при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      fetchCurrentEvaluations();
    }
  }, [isOpen, examId, user?.id]);

  // Оптимизированный индекс оценок для O(1) доступа
  const evalIndex = useMemo(() => {
    const m = new Map<string, { avg: number | null; raw: any }>();
    for (const e of currentEvaluations ?? []) {
      const k = `${e.reservist_id}:${e.case_number}`;
      const scores = Object.values(e.criteria_scores ?? {}) as number[];
      const avg = scores.length ? Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 10) / 10 : null;
      m.set(k, { avg, raw: e });
    }
    return m;
  }, [currentEvaluations, participantId]);

  const getEval = useCallback((caseNumber: number) => {
    return evalIndex.get(`${participantId}:${caseNumber}`);
  }, [evalIndex, participantId]);

  // Загрузка назначенных кейсов
  const fetchAssignedCases = async () => {
    if (!examId || !participantId) return;

    setLoadingCases(true);
    try {
      const { data, error } = await supabase
        .from('case_assignments')
        .select('case_numbers')
        .eq('exam_event_id', examId)
        .eq('participant_id', participantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Ошибка загрузки назначенных кейсов:', error);
        // По умолчанию показываем стандартные кейсы если ошибка
        setAssignedCases([1, 2]);
        return;
      }

      if (data && data.case_numbers) {
        setAssignedCases(data.case_numbers);
      } else {
        // Если назначений нет, показываем стандартные кейсы
        setAssignedCases([1, 2]);
      }
    } catch (err) {
      console.error('Ошибка загрузки назначенных кейсов:', err);
      setAssignedCases([1, 2]);
    } finally {
      setLoadingCases(false);
    }
  };

  // Автофокус на кнопку закрытия при открытии модалки
  useEffect(() => {
    if (isOpen) {
      closeBtnRef.current?.focus();
    }
  }, [isOpen]);

  // Запуск тура при открытии модалки
  useEffect(() => {
    if (isOpen && !hasInitialized) {
      // Сбрасываем состояние только при первом открытии
      setShowCaseSelection(false);
      setShowCaseEvaluation(false);
      setSelectedCaseNumber(1);
      setHasInitialized(true);

      // Сначала выравниваем модалку, затем показываем подсказку
      const isMobile = window.innerWidth <= 768;
      const initialDelay = isMobile ? 800 : 500; // Уменьшены задержки
      const tourDelay = isMobile ? 300 : 200; // Уменьшены задержки
      
      const t1 = setTimeout(() => {
        // Даем время модалке выровняться перед показом тултипа
        setTimeout(() => {
          // Проверяем, что элемент существует и видим
          if (targetRef.current) {
            // Принудительно прокручиваем к элементу
            targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Небольшая задержка для завершения прокрутки
            setTimeout(() => {
              setShowTooltip(true);
              setHighlightCaseSolving(true); // Выделяем карточку
            }, isMobile ? 200 : 100);
          }
        }, tourDelay);
      }, initialDelay);

      return () => {
        clearTimeout(t1);
      };
    } else if (!isOpen) {
      // Сбрасываем флаг инициализации при закрытии
      setHasInitialized(false);
    } else {
      setShowTooltip(false);
      setHighlightCaseSolving(false);
    }
  }, [isOpen, hasInitialized]);

  // Обработчик закрытия тултипа
  const handleTooltipClose = () => {
    setShowTooltip(false);
    setHighlightCaseSolving(false); // Убираем выделение
  };

  // Обработчик клика по любой карточке - закрываем тултип
  const handleStageClick = (stageId: string) => {
    setShowTooltip(false); // Закрываем тултип
    setHighlightCaseSolving(false); // Убираем выделение
    
    if (stageId === 'case-solving') {
      setShowCaseSelection(true);
    } else {
      onStageSelect?.(stageId);
    }
  };

  // Блокировка прокрутки фона при открытом модальном окне
  useEffect(() => {
    if (isOpen) {
      // Блокируем прокрутку
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      return () => {
        // Восстанавливаем прокрутку при закрытии
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
      };
    } else {
      // Восстанавливаем прокрутку если модальное окно закрыто
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
  }, [isOpen]);

  // Загружаем кейсы при переключении на выбор кейсов
  useEffect(() => {
    if (showCaseSelection && isOpen) {
      fetchAssignedCases();
    }
  }, [showCaseSelection, isOpen, examId, participantId]);

  // Функция для проверки, завершена ли оценка кейса
  // Оптимизированные функции через индекс
  const isCaseEvaluationCompleted = useCallback((caseNumber: number): boolean => {
    return !!getEval(caseNumber);
  }, [getEval]);

  const getCaseAverageScore = useCallback((caseNumber: number): number | null => {
    return getEval(caseNumber)?.avg ?? null;
  }, [getEval]);

  if (!isOpen) return null;

  const stages = [
    {
      id: 'case-solving',
      title: 'Решение кейсов',
      description: 'Решение резервистами прикладных кейсов',
      icon: FileText,
      color: 'emerald',
      bgGradient: 'from-emerald-50 to-teal-50',
      borderColor: 'border-emerald-100',
      iconBg: 'bg-emerald-500'
    },
    {
      id: 'project-defense',
      title: 'Защита проектов',
      description: 'Презентация и защита проектных решений',
      icon: Users,
      color: 'blue',
      bgGradient: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-100',
      iconBg: 'bg-blue-500'
    },
    {
      id: 'diagnostic-game',
      title: 'Диагностическая игра',
      description: 'Проведение диагностической игры "Командное решение"',
      icon: Trophy,
      color: 'cyan',
      bgGradient: 'from-cyan-50 to-blue-50',
      borderColor: 'border-cyan-100',
      iconBg: 'bg-cyan-500'
    }
  ];

  console.log('EvaluationStageModal render:', { 
    isOpen, 
    showCaseEvaluation, 
    showCaseSelection,
    selectedCaseNumber,
    participantId,
    participantName 
  });
  
  return (
    <>
      <style>
        {`
          /* Стили для выделения карточки "Решение кейсов" */
          .case-solving-highlight {
            border: 3px solid #06A478 !important;
            background: linear-gradient(135deg, rgba(6,164,120,0.08), rgba(6,164,120,0.03)) !important;
            animation: gentleGlow 2s ease-in-out infinite;
            transform: scale(1.02) !important;
          }
          
          /* Отключаем hover эффекты для выделенной карточки */
          .case-solving-highlight:hover {
            transform: scale(1.02) !important;
          }
          
          @keyframes gentleGlow {
            0% { 
              transform: scale(1.02);
            }
            50% { 
              transform: scale(1.03);
            }
            100% { 
              transform: scale(1.02);
            }
          }
          
          /* Адаптивные стили для мобильных устройств */
          @media (max-width: 768px) {
            [data-tour="case-solving-card"] {
              position: relative !important;
              z-index: 1000 !important;
              transform: translateZ(0) !important; /* Принудительное создание слоя для GPU */
              will-change: transform !important;
            }
            
            /* Дополнительная стабилизация для тултипа на мобильных */
            .reactour__popover {
              position: fixed !important;
              transform: translateZ(0) !important;
              backface-visibility: hidden !important;
            }
          }
          
          /* Стили для Joyride */
          .react-joyride__tooltip {
            font-family: 'Mabry', sans-serif !important;
          }
          .react-joyride__tooltip h4 {
            font-family: 'Mabry', sans-serif !important;
          }
          .react-joyride__tooltip p {
            font-family: 'Mabry', sans-serif !important;
          }
          .react-joyride__tooltip button {
            font-family: 'Mabry', sans-serif !important;
          }
        `}
      </style>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 xs:p-4">
      <div 
        className={`relative max-w-lg w-full max-h-[70vh] overflow-hidden rounded-2xl bg-white shadow-2xl transform transition-all duration-500 ease-out ${
        isOpen && !showCaseEvaluation ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full opacity-0 scale-95'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="evaluation-stage-title"
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        tabIndex={-1}
      >
        {/* Заголовок */}
        <div className="relative bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 p-3 text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 pr-2">
              {/* Круглое фото */}
              <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/30 overflow-hidden flex-shrink-0">
                {participantPhoto ? (
                  <img
                    src={participantPhoto}
                    alt={participantName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/10">
                    <User className="w-6 h-6 text-white/80" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h2 id="evaluation-stage-title" className="text-base font-bold mb-1 leading-tight" style={{ fontFamily: 'SNS, sans-serif' }}>
                  Выбор этапа оценки
                </h2>
                <p className="text-emerald-100 text-xs truncate">
                  {participantName}
                </p>
              </div>
            </div>
            <button
              ref={closeBtnRef}
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors duration-200 touch-target"
              aria-label="Закрыть модальное окно"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Основной контент с прокруткой */}
        <div className="p-3 overflow-y-auto max-h-[calc(70vh-120px)]">
          {!showCaseSelection ? (
            // Выбор этапа оценки
            <div className="grid grid-cols-1 gap-3 relative">
              {stages.map((stage) => {
                const Icon = stage.icon;
                const isFirst = stage.id === 'case-solving';
                return (
                  <div
                    key={stage.id}
                    ref={isFirst ? (targetRef as React.RefObject<HTMLDivElement>) : undefined}
                    className={`
                      group cursor-pointer rounded-xl p-3 border transition-all duration-300
                      bg-gradient-to-br ${stage.bgGradient} ${stage.borderColor}
                      hover:scale-[1.02] hover:shadow-lg
                      ${isFirst && highlightCaseSolving ? 'case-solving-highlight' : ''}
                    `}
                    onClick={() => handleStageClick(stage.id)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Иконка */}
                      <div className={`w-10 h-10 ${stage.iconBg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      
                      {/* Контент */}
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: 'SNS, sans-serif' }}>
                          {stage.title}
                        </h3>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {stage.description}
                        </p>
                      </div>

                      {/* Стрелка */}
                      <div className="w-6 h-6 rounded-full bg-white/50 flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all duration-300">
                        <svg className="w-3 h-3 text-gray-600 group-hover:translate-x-0.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Выбор номера кейса
            <div className="space-y-6">
              <div className="text-center">
                {(() => {
                  const completedCases = assignedCases.filter(caseNumber => isCaseEvaluationCompleted(caseNumber));
                  const allCompleted = completedCases.length === assignedCases.length && assignedCases.length > 0;
                  
                  if (allCompleted) {
                    return (
                      <>
                        <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'SNS, sans-serif' }}>
                          Оценки выставлены
                        </h3>
                        <p className="text-gray-600">
                          Все кейсы оценены. Вы можете изменить оценки, нажав на нужный кейс.
                        </p>
                      </>
                    );
                  } else if (completedCases.length > 0) {
                    return (
                      <>
                        <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'SNS, sans-serif' }}>
                          Выберите номер кейса
                        </h3>
                        <p className="text-gray-600">
                          Оценено {completedCases.length} из {assignedCases.length} кейсов
                        </p>
                      </>
                    );
                  } else {
                    return (
                      <>
                        <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'SNS, sans-serif' }}>
                          Выберите номер кейса
                        </h3>
                        <p className="text-gray-600">
                          Обычно резервист решает два кейса
                        </p>
                      </>
                    );
                  }
                })()}
              </div>
              
              {loadingCases ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  <span className="ml-3 text-gray-600">Загрузка назначенных кейсов...</span>
                </div>
              ) : assignedCases.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Нет назначенных кейсов</h4>
                  <p className="text-gray-600">
                    Администратор ещё не назначил кейсы для этого участника
                  </p>
                </div>
              ) : (
                <div className={`grid gap-3 ${assignedCases.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : assignedCases.length === 2 ? 'grid-cols-1 xs:grid-cols-2' : 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-3'}`}>
                  {assignedCases.map((caseNumber) => {
                    const isCompleted = isCaseEvaluationCompleted(caseNumber);
                    const averageScore = getCaseAverageScore(caseNumber);
                    return (
                      <div
                        key={caseNumber}
                        className={`group cursor-pointer rounded-2xl p-4 border transition-all duration-300 relative ${
                          isCompleted 
                            ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 hover:scale-[1.02] hover:shadow-lg' 
                            : 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 hover:scale-[1.02] hover:shadow-lg'
                        }`}
                        onClick={() => {
                          console.log('Клик по кейсу:', caseNumber);
                          setSelectedCaseNumber(caseNumber);
                          setShowCaseEvaluation(true);
                          console.log('Состояние после клика:', { selectedCaseNumber: caseNumber, showCaseEvaluation: true });
                        }}
                      >
                        {/* Индикатор завершения */}
                        {isCompleted && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        
                        <div className="text-center">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 ${
                            isCompleted ? 'bg-green-500' : 'bg-emerald-500'
                          }`}>
                            <span className="text-xl font-bold text-white">
                              {caseNumber}
                            </span>
                          </div>
                          <h4 className={`text-base font-bold mb-1 ${
                            isCompleted ? 'text-green-700' : 'text-gray-900'
                          }`}>
                            Кейс #{caseNumber}
                          </h4>
                          
                          {/* Средний балл */}
                          {isCompleted && averageScore !== null && (
                            <div className="mb-2">
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                                averageScore >= 4 ? 'bg-green-100 text-green-700' :
                                averageScore >= 3 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {averageScore}/5
                              </div>
                            </div>
                          )}
                          
                          <p className={`text-xs ${
                            isCompleted ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {isCompleted ? 'Оценка выставлена' : 'Оценить решение кейса'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setShowCaseSelection(false)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Назад к выбору этапа
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="border-t border-gray-100 p-2 bg-gray-50 rounded-b-2xl">
        </div>

      </div>

      {/* Модальное окно оценки кейса */}
      <CaseEvaluationModal
        isOpen={showCaseEvaluation}
        onClose={() => {
          setShowCaseEvaluation(false);
          setShowCaseSelection(false);
        }}
        participantId={participantId}
        participantName={participantName}
        caseNumber={selectedCaseNumber}
        examId={examId}
        onEvaluationComplete={async () => {
          await onCaseEvaluationComplete?.(selectedCaseNumber);
          setShowCaseEvaluation(false);
          setShowCaseSelection(false);
        }}
        onRemoveEvaluation={onRemoveEvaluation}
        // Передаем существующую оценку для загрузки (используем актуальные оценки)
        existingEvaluation={currentEvaluations.find(evaluation => 
          evaluation.reservist_id === participantId && 
          evaluation.case_number === selectedCaseNumber
        )}
      />
      
      {/* Наш собственный тултип */}
      <MobileTooltip 
        isVisible={showTooltip}
        targetRef={targetRef}
        onClose={handleTooltipClose}
      />
    </div>
    </>
  );
};

// Основной компонент - просто экспортируем наш компонент
export const EvaluationStageModal: React.FC<EvaluationStageModalProps> = (props) => {
  return <EvaluationStageModalContent {...props} />;
};

