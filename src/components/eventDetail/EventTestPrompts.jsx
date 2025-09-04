import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// Утилиты для премиум-дизайна карточек тестов
export const TYPE_STYLES = {
  entry: {
    ring: 'from-blue-400/30 to-blue-600/30',
    bg: 'bg-gradient-to-b from-white/80 to-white/60',
    border: 'border-blue-200/60',
    icon: 'text-blue-600',
    title: 'text-blue-700',
    accent: 'bg-blue-600',
    chip: 'bg-blue-50 text-blue-700 border-blue-200',
    glow: 'shadow-[0_8px_30px_rgba(37,99,235,0.15)]',
  },
  final: {
    ring: 'from-purple-400/30 to-purple-600/30',
    bg: 'bg-gradient-to-b from-white/80 to-white/60',
    border: 'border-purple-200/60',
    icon: 'text-purple-600',
    title: 'text-purple-700',
    accent: 'bg-purple-600',
    chip: 'bg-purple-50 text-purple-700 border-purple-200',
    glow: 'shadow-[0_8px_30px_rgba(147,51,234,0.15)]',
  },
  annual: {
    ring: 'from-emerald-400/30 to-emerald-600/30',
    bg: 'bg-gradient-to-b from-white/80 to-white/60',
    border: 'border-emerald-200/60',
    icon: 'text-emerald-600',
    title: 'text-emerald-700',
    accent: 'bg-[#06A478]',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    glow: 'shadow-[0_8px_30px_rgba(16,185,129,0.15)]',
  },
};

export const cx = (...cls) =>
  cls.filter(Boolean).join(' ');

// Кольцо прогресса (результат %)
export function ProgressRing({ value, size = 88, stroke = 8 }) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;

  return (
    <svg width={size} height={size} className="block">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopOpacity="1" />
          <stop offset="100%" stopOpacity="1" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(0,0,0,0.06)"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 600ms ease' }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="fill-gray-900 font-bold"
        fontSize={size * 0.24}
      >
        {Math.round(value)}%
      </text>
    </svg>
  );
}

// Маленький чип
export function Chip({ className, children }) {
  return (
    <span className={cx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium', className)}>
      {children}
    </span>
  );
}

// Иконки
const FileTextIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const ClockIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const CheckCircleIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const AlertCircleIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const PlayIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
const LockIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const XCircle = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
const CheckCircle = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ICONS = {
  entry: { color: 'blue', label: 'Входной тест' },
  final: { color: 'purple', label: 'Финальный тест' },
  annual: { color: 'amber', label: 'Годовой тест' },
};

// Компонент скелетона для карточки теста
function TestCardSkeleton({ type }) {
  const s = TYPE_STYLES[type] ?? TYPE_STYLES.entry;

  return (
    <div
      className={cx(
        'relative rounded-2xl border p-5 backdrop-blur overflow-hidden',
        s.bg,
        s.border
      )}
    >
      {/* мягкое кольцо-подсветка */}
      <div className={cx('absolute -top-12 -right-12 w-40 h-40 rounded-full blur-2xl opacity-60 bg-gradient-to-br', s.ring)} />
      <div className="animate-pulse space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gray-200/70" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-36 bg-gray-200/70 rounded" />
            <div className="h-3 w-24 bg-gray-200/60 rounded" />
          </div>
        </div>
        <div className="h-4 w-full bg-gray-200/70 rounded" />
        <div className="h-4 w-3/5 bg-gray-200/60 rounded" />
        <div className="flex items-center gap-4">
          <div className="h-3 w-24 bg-gray-200/60 rounded" />
          <div className="h-3 w-28 bg-gray-200/60 rounded" />
        </div>
        <div className="h-10 w-full bg-gray-200/70 rounded-lg" />
      </div>
    </div>
  );
}

function StatusBadge({ score, passingScore }) {
  const isZero = score === 0;
  const isPassed = passingScore && passingScore > 0 ? score >= passingScore : score > 0; // Если проходной балл не указан или равен 0, считаем пройденным любой положительный результат
  
  return (
    <div className={`p-4 rounded-xl text-center font-medium transition-all duration-300 ${
      isZero 
        ? 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-800' 
        : isPassed
        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-800'
        : 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 text-yellow-800'
    }`}>
      <div className="flex items-center justify-center mb-2">
        {isZero ? (
          <XCircle className="h-5 w-5 text-red-500 mr-2" />
        ) : isPassed ? (
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
        ) : (
          <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
        )}
        <span className="text-lg font-bold">Результат: {score}%</span>
      </div>
      <span className="text-sm font-medium">
        {isZero ? 'Тест не пройден' : isPassed ? 'Тест пройден' : 'Требует повторной сдачи'}
      </span>
    </div>
  );
}

function AdminTestCard({ type, testData, eventId }) {
  const { userProfile } = useAuth();
  const s = TYPE_STYLES[type] ?? TYPE_STYLES.entry;
  const test = testData.test;
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadParticipantsData = async () => {
      if (!test?.id || !eventId) return;
      try {
        const { data: participantsData, error: participantsError } = await supabase
          .from('event_participants')
          .select(`user_id, user:users(id, full_name, email)`)
          .eq('event_id', eventId)
          .eq('attended', true);

        if (participantsError) throw participantsError;

        const participantIds = (participantsData ?? []).map(p => p.user_id);

        const { data: attemptsData, error } = await supabase
          .from('user_test_attempts')
          .select(`id, score, status, created_at, user:users(id, full_name, email)`)
          .eq('test_id', test.id)
          .eq('event_id', eventId)
          .in('user_id', participantIds)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const map = new Map();
        (participantsData ?? []).forEach(p => {
          map.set(p.user_id, { user: p.user, score: null, status: null, attemptId: null });
        });
        (attemptsData ?? []).forEach(a => {
          if (a.status === 'completed' && a.score != null) {
            const prev = map.get(a.user.id);
            if (!prev || a.score > (prev.score ?? -1)) {
              map.set(a.user.id, { user: a.user, score: a.score, status: a.status, attemptId: a.id });
            }
          }
        });
        setParticipants(Array.from(map.values()));
      } catch (e) {
        console.error('loadParticipantsData error', e);
      } finally {
        setLoading(false);
      }
    };
    loadParticipantsData();
  }, [test?.id, eventId]);

  const withScores = participants.filter(p => p.score != null);
  const total = participants.length;
  const done = withScores.length;
  const average = done ? Math.round(withScores.reduce((s, p) => s + (p.score ?? 0), 0) / done) : 0;
  const passed = withScores.filter(p => test?.passing_score ? p.score >= test.passing_score : (p.score ?? 0) > 0).length;
  const passPct = done ? Math.round((passed / done) * 100) : 0;

  if (!test) {
    return (
      <div className={cx('rounded-2xl border p-5', s.bg, s.border)}>
        <div className="text-sm text-gray-500">Тест не найден</div>
      </div>
    );
  }

  return (
    <div className={cx('relative rounded-2xl border p-5 backdrop-blur overflow-hidden', s.bg, s.border, s.glow)}>
      <div className={cx('absolute -top-12 -right-12 w-44 h-44 rounded-full blur-2xl opacity-70 bg-gradient-to-br', s.ring)} />
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cx('p-2 rounded-xl bg-white/70 border', s.border)}>
            <FileTextIcon className={cx('h-5 w-5', s.icon)} />
          </div>
          <div>
            <div className={cx('font-semibold text-sm', s.title)}>
              {type === 'entry' ? 'Входной тест' : type === 'final' ? 'Финальный тест' : 'Годовой тест'}
            </div>
            <div className="text-[11px] text-gray-500">{test?.title}</div>
          </div>
        </div>
        <Chip className={s.chip}>Участников: {total}</Chip>
      </div>

      {loading ? (
        <div className="text-center py-6 text-sm text-gray-500">Загрузка…</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg border bg-white/70 p-3">
              <div className="text-[11px] text-gray-500">Прошли</div>
              <div className="text-base font-semibold text-gray-900">{done}/{total}</div>
            </div>
            <div className="rounded-lg border bg-white/70 p-3">
              <div className="text-[11px] text-gray-500">Средний балл</div>
              <div className="text-base font-semibold text-gray-900">{done ? `${average}%` : '—'}</div>
            </div>
            <div className="rounded-lg border bg-white/70 p-3">
              <div className="text-[11px] text-gray-500">Порог пройден</div>
              <div className="text-base font-semibold text-gray-900">{done ? `${passPct}%` : '—'}</div>
            </div>
          </div>

          {participants.length > 0 && (
            <div className="max-h-32 overflow-auto rounded-lg border bg-white/70">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[240px]">
                  <thead className="sticky top-0 bg-white/80 backdrop-blur">
                    <tr className="text-gray-500">
                      <th className="text-left font-medium px-1 sm:px-2 py-1 min-w-[160px]">Участник</th>
                      <th className="text-right font-medium px-1 sm:px-2 py-1 w-[60px]">Балл</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p) => {
                      const has = p.score != null;
                      const ok = has && (test?.passing_score ? p.score >= test.passing_score : p.score > 0);
                      return (
                        <tr key={p.attemptId ?? p.user.id} className="border-t">
                          <td className="px-1 sm:px-2 py-1">
                            <div className="truncate text-gray-800 text-xs">{p.user.full_name || p.user.email}</div>
                          </td>
                          <td className="px-1 sm:px-2 py-1 text-right">
                            {has ? (
                              <span className={cx('font-semibold text-xs', ok ? 'text-green-700' : 'text-rose-700')}>
                                {p.score}%
                              </span>
                            ) : (
                              <span className="text-gray-600 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {participants.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-500">Нет участников</div>
          )}
        </>
      )}
    </div>
  );
}

function TestCard({ type, testData, onStart, eventEndDate }) {
  const s = TYPE_STYLES[type] ?? TYPE_STYLES.entry;
  const test = testData.test;
  const available = testData.available;
  const completed = testData.completed;
  const score = testData.score ?? 0;
  const passingScore = test?.passing_score;

  // Состояние для таймера обратного отсчета
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Обновляем время каждую минуту для годового теста
  useEffect(() => {
    if (type === 'annual' && !available) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 60000); // Обновляем каждую минуту
      
      return () => clearInterval(interval);
    }
  }, [type, available]);

  // Функция для расчета времени до доступности годового теста
  const formatTimeUntilAvailable = (eventEndDate) => {
    if (!eventEndDate) return 'Дата не указана';
    
    const endDate = new Date(eventEndDate);
    const threeMonthsLater = new Date(endDate);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    const currentDate = currentTime; // Используем состояние вместо new Date()

    if (currentDate >= threeMonthsLater) {
      return 'Доступен';
    }

    // Точный расчет месяцев и дней
    let years = threeMonthsLater.getFullYear() - currentDate.getFullYear();
    let months = threeMonthsLater.getMonth() - currentDate.getMonth();
    let days = threeMonthsLater.getDate() - currentDate.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(threeMonthsLater.getFullYear(), threeMonthsLater.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    if (years > 0) {
      return `Доступен через ${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`;
    } else if (months > 0) {
      return `Доступен через ${months} ${months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев'}${days > 0 ? ` и ${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}` : ''}`;
    } else {
      return `Доступен через ${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
    }
  };

  const statusChip = (() => {
    if (!available) {
      return type === 'annual'
        ? <Chip className="bg-rose-50 text-rose-700 border-rose-200">Не пройден</Chip>
        : <Chip className="bg-gray-100 text-gray-700 border-gray-200">Недоступен</Chip>;
    }
    if (completed) {
      const ok = passingScore && passingScore > 0 ? score >= passingScore : score > 0;
      return ok
        ? <Chip className="bg-green-50 text-green-700 border-green-200">Пройден</Chip>
        : <Chip className="bg-rose-50 text-rose-700 border-rose-200">Не пройден</Chip>;
    }
    return <Chip className={s.chip}>Готов к прохождению</Chip>;
  })();

  return (
    <div
      className={cx(
        'relative rounded-2xl border p-5 backdrop-blur transition-all duration-300 overflow-hidden',
        'hover:-translate-y-1 hover:shadow-xl',
        s.bg, s.border, s.glow
      )}
    >
      {/* кольцо-подсветка */}
      <div className={cx('pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full blur-2xl opacity-70 bg-gradient-to-br', s.ring)} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cx('p-2 rounded-xl bg-white/70 border', s.border)}>
            <FileTextIcon className={cx('h-5 w-5', s.icon)} />
          </div>
          <div>
            <h3 className={cx('font-semibold text-sm', s.title)}>
              {type === 'entry' ? 'Входной тест' : type === 'final' ? 'Финальный тест' : 'Годовой тест'}
            </h3>
            <div className="text-[11px] text-gray-500">Тест мероприятия</div>
          </div>
        </div>
        {statusChip}
      </div>

      {/* Title + description */}
      <div className="mb-4">
        <h4 className="font-semibold text-gray-900 text-base leading-tight line-clamp-2">{test?.title}</h4>
        <p className="text-sm text-gray-600 line-clamp-2">{test?.description || 'Описание теста'}</p>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-gray-600 mb-5">
        <div className="flex items-center gap-1.5">
          <ClockIcon className="h-3.5 w-3.5" />
          <span>{test?.time_limit === 0 ? 'Без ограничений' : `${test?.time_limit} мин`}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircleIcon className="h-3.5 w-3.5" />
          <span>{passingScore && passingScore > 0 ? `Проходной: ${passingScore}%` : 'Без ограничений'}</span>
        </div>
      </div>

      {/* Footer: CTA / Progress */}
      {available && completed ? (
        <div className="flex items-center gap-4 mt-4">
          <div className={cx('text-emerald-600', s.icon)}>
            <ProgressRing value={score} />
          </div>
          <div className="text-sm">
            <div className="font-semibold text-gray-900">Результат</div>
            <div className="text-gray-600">
              {passingScore && passingScore > 0
                ? score >= passingScore ? 'Порог достигнут' : 'Ниже проходного'
                : 'Тест завершен'}
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full mt-4">
          {!available ? (
            <button
              disabled
              className={cx(
                'h-10 w-full rounded-lg text-sm font-medium',
                type === 'annual' 
                  ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-500 cursor-not-allowed'
              )}
            >
              {type === 'annual' ? formatTimeUntilAvailable(eventEndDate) : 'Недоступно'}
            </button>
          ) : (
            <button
              onClick={() => onStart(type)}
              className={cx(
                'h-10 w-full rounded-lg text-white font-medium transition-all',
                'hover:shadow-md active:scale-[0.99]',
                s.accent
              )}
            >
              Пройти тест
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function EventTestPrompts({ eventId, onStartTest, testStatus, refreshKey = 0 }) {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [hasAttended, setHasAttended] = useState(false);
  const [eventEndDate, setEventEndDate] = useState(null);

  const checkUserAccess = React.useCallback(async () => {
    if (!eventId || !userProfile?.id) return;
    setLoading(true);
    setError(null);
    try {
      // Получаем информацию о мероприятии
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('end_date, start_date')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      
      // Используем end_date или start_date как fallback
      const endDate = eventData.end_date || eventData.start_date;
      setEventEndDate(endDate);

      const { data: participantData, error: participantError } = await supabase
        .from('event_participants')
        .select('id, attended')
        .eq('event_id', eventId)
        .eq('user_id', userProfile.id)
        .maybeSingle();

      if (participantError) throw participantError;

      const userIsParticipant = !!participantData;
      const userHasAttended = participantData?.attended || false;

      setIsParticipant(userIsParticipant);
      setHasAttended(userHasAttended);
    } catch (err) {
      console.error('Ошибка при проверке прав доступа:', err);
      setError('Не удалось проверить права доступа');
    } finally {
      setLoading(false);
    }
  }, [eventId, userProfile?.id]);

  useEffect(() => { checkUserAccess(); }, [checkUserAccess]);
  useEffect(() => { if (refreshKey > 0) checkUserAccess(); }, [refreshKey, checkUserAccess]);

  // Обновляем компонент каждую минуту для актуального таймера
  useEffect(() => {
    if (!eventEndDate) return;
    
    const interval = setInterval(() => {
      // Принудительно обновляем компонент для пересчета таймера
      setEventEndDate(prev => prev);
    }, 60000); // каждую минуту

    return () => clearInterval(interval);
  }, [eventEndDate]);

  const handleStartTest = async (testType) => {
    // Проверяем, имеет ли пользователь административные права
    const hasAdminAccess = userProfile?.role === 'administrator' || userProfile?.role === 'moderator' || userProfile?.role === 'trainer' || userProfile?.role === 'expert';
    
    // Если администратор не является участником, не позволяем проходить тесты
    if (hasAdminAccess && !isParticipant) {
      alert('Для прохождения тестов необходимо зарегистрироваться на мероприятие как участник.');
      return;
    }

    const testInfo = testStatus[testType];
    if (!testInfo || !testInfo.test) {
      alert('Тест не найден');
      return;
    }
    
    if (testInfo.completed) {
      alert(`Вы уже прошли этот тест. Ваш результат: ${testInfo.score}%`);
      return;
    }
    
    if (testInfo.attemptId) {
      onStartTest(testType, testInfo.attemptId);
      return;
    }

    // Если нет attemptId, создаем новую попытку
    try {
      const { data: newAttempt, error } = await supabase
        .from('user_test_attempts')
        .insert({
          user_id: userProfile.id,
          test_id: testInfo.test.id,
          event_id: eventId,
          status: 'in_progress',
          start_time: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      onStartTest(testType, newAttempt.id);
    } catch (err) {
      console.error('Ошибка при создании попытки теста:', err);
      
      // Проверяем, является ли это ошибкой от триггера о дублировании
      if (err.message && err.message.includes('Тест уже пройден')) {
        alert(err.message);
      } else {
        alert('Не удалось создать попытку теста. Пожалуйста, попробуйте еще раз.');
      }
    }
  };

  if (!userProfile) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <AlertCircleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-yellow-800 mb-2">Требуется авторизация</h3>
        <p className="text-yellow-700">Пожалуйста, войдите в систему, чтобы получить доступ к тестам.</p>
      </div>
    );
  }

  // Проверяем, имеет ли пользователь административные права
  const hasAdminAccess = userProfile?.role === 'administrator' || userProfile?.role === 'moderator' || userProfile?.role === 'trainer' || userProfile?.role === 'expert';

  if (!loading && !isParticipant && !hasAdminAccess) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
        <AlertCircleIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-blue-800 mb-2">Вы не являетесь участником</h3>
        <p className="text-blue-700">Чтобы получить доступ к тестам, необходимо зарегистрироваться на мероприятие.</p>
      </div>
    );
  }

  // Показываем информационное сообщение для администраторов, которые не являются участниками
  if (!loading && !isParticipant && hasAdminAccess) {
    console.log('Rendering admin view with testStatus:', testStatus);
    
    // Проверяем, есть ли тесты для отображения
    const hasTests = testStatus.entry.test || testStatus.final.test || testStatus.annual?.test;
    
    if (!hasTests) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <AlertCircleIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-blue-800 mb-2">Тесты не найдены</h3>
          <p className="text-blue-700">Для этого мероприятия не настроены тесты.</p>
        </div>
      );
    }
    
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testStatus.entry.test && <AdminTestCard type="entry" testData={testStatus.entry} eventId={eventId} />}
          {testStatus.final.test && <AdminTestCard type="final" testData={testStatus.final} eventId={eventId} />}
          {testStatus.annual?.test && <AdminTestCard type="annual" testData={testStatus.annual} eventId={eventId} />}
        </div>
        
        {/* Кнопка детальной статистики для администраторов */}
        <div className="mt-4">
          <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-gray-200 mr-3">
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-gray-800">Детальная статистика</h3>
                <p className="text-xs sm:text-sm text-gray-400">Каждый ответ участника, время прохождения, правильность решений</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/event-test-results/${eventId}`)}
              className="px-6 py-2 bg-[#06A478] text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-[#059669]"
            >
              Открыть
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!loading && isParticipant && !hasAttended && !hasAdminAccess) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
        <AlertCircleIcon className="h-12 w-12 text-orange-500 mx-auto mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-orange-800 mb-2">Отметка о присутствии отсутствует</h3>
        <p className="text-orange-700">Доступ к тестам открывается после подтверждения вашего присутствия на мероприятии.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Сетка скелетонов карточек тестов */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TestCardSkeleton type="entry" />
          <TestCardSkeleton type="final" />
          <TestCardSkeleton type="annual" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-red-800 mb-2">Ошибка загрузки</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  // Проверяем, есть ли тесты для отображения
  const hasTests = testStatus.entry.test || testStatus.final.test || testStatus.annual?.test;
  
  if (!hasTests) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <AlertCircleIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-2">Тесты не найдены</h3>
        <p className="text-gray-700">Для этого мероприятия не настроены тесты.</p>
      </div>
    );
  }

      return (
    <div className="space-y-6">
      {/* Сетка карточек тестов */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {testStatus.entry.test && <TestCard type="entry" testData={testStatus.entry} onStart={handleStartTest} eventEndDate={eventEndDate} />}
        {testStatus.final.test && <TestCard type="final" testData={testStatus.final} onStart={handleStartTest} eventEndDate={eventEndDate} />}
        {testStatus.annual?.test && <TestCard type="annual" testData={testStatus.annual} onStart={handleStartTest} eventEndDate={eventEndDate} />}
      </div>
      
              {/* Кнопка детальной статистики (только для администраторов) */}
        {userProfile?.role && ['administrator', 'moderator', 'trainer', 'expert'].includes(userProfile.role) && (
          <div className="mt-4">
            <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-gray-200 mr-3">
                  <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-gray-800">Детальная статистика</h3>
                  <p className="text-xs sm:text-sm text-gray-400">Каждый ответ участника, время прохождения, правильность решений</p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/event-test-results/${eventId}`)}
                className="px-6 py-2 bg-[#06A478] text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-[#059669]"
              >
                Открыть
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
