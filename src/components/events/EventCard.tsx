import React, { useState } from 'react';
import { 
  CalendarDays,
  Users2,
  CheckCircle2,
  Play,
  ChevronRight,
  PencilLine,
  Trash2,
  Info,
  Pause,
  XCircle,
  Loader2,
  Video,
  Clock,
} from 'lucide-react';
import { SiZoom } from 'react-icons/si';
import { TestsPendingReview } from '../admin/TestsPendingReview';
import './EventCard.css';

export type EventStatus = 'draft' | 'published' | 'active' | 'ongoing' | 'completed' | 'cancelled';

export interface EventWithStats {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  type?: string | null;
  status: EventStatus;
  start_date?: string | null;   // дата начала (ISO)
  date_time?: string | null;    // альтернативная дата-время (ISO)
  created_at?: string | null;
  participants_count?: number;
  test_completed_count?: number;
  test_not_passed_count?: number;
  test_pending_review_count?: number;  // тесты на проверке
  test_pass_percent?: number;   // 0..100
  event_types?: { id: string; name: string; name_ru: string } | null;
}

const TYPE_LABELS: Record<string, { label: string; icon: React.ComponentType<any> }> = {
  training: { label: 'Онлайн тренинг', icon: Video },
  webinar: { label: 'Вебинар', icon: CalendarDays },
  workshop: { label: 'Мастер-класс', icon: Users2 },
  exam: { label: 'Экзамен', icon: CheckCircle2 },
  other: { label: 'Другое', icon: Info },
};

const STATUS_MAP: Record<
  EventStatus,
  { label: string; tone: string; ring: string; dot: string; Icon: React.ComponentType<any> }
> = {
  draft:      { label: '',   tone: 'text-white bg-slate-500',   ring: 'ring-slate-500',   dot: 'bg-slate-500',   Icon: Pause },
  published:  { label: '', tone: 'text-white bg-emerald-500', ring: 'ring-emerald-500', dot: 'bg-emerald-500', Icon: Play },
  active:     { label: 'Активно',    tone: 'text-emerald-700 bg-emerald-50', ring: 'ring-emerald-200', dot: 'bg-emerald-500', Icon: () => <div className="h-3.5 w-3.5 rounded-full bg-emerald-500" /> },
  ongoing:    { label: 'Идёт',       tone: 'text-indigo-700 bg-indigo-50',  ring: 'ring-indigo-200',  dot: 'bg-indigo-500',  Icon: Loader2 },
  completed:  { label: '',  tone: 'text-white bg-blue-500',      ring: 'ring-blue-500',    dot: 'bg-blue-500',    Icon: CheckCircle2 },
  cancelled:  { label: '',   tone: 'text-white bg-rose-500',      ring: 'ring-rose-500',    dot: 'bg-rose-500',    Icon: XCircle },
};

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function parseDate(event: EventWithStats) {
  const base = event.start_date || event.date_time || event.created_at || '';
  const d = new Date(base);
  return isNaN(d.getTime()) ? null : d;
}

// Хелперы дат
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(d: Date) { 
  const x = new Date(d); 
  x.setHours(0,0,0,0); 
  return x; 
}

function endOfDay(d: Date) { 
  const x = new Date(d); 
  x.setHours(23,59,59,999); 
  return x; 
}

function dateBadges(d?: Date | null) {
  if (!d) return { badge: null as string | null, now: false };
  const now = new Date();
  const nowStart = startOfDay(now);
  const nowEnd = endOfDay(now);
  const tomorrow = new Date(nowStart.getTime() + 24*3600*1000);
  const isToday = d >= nowStart && d <= nowEnd;
  const isTomorrow = isSameDay(d, tomorrow);
  // "Идёт сейчас" — если время попадает в +/- 1 час от текущего
  const diffMin = Math.abs((d.getTime() - now.getTime()) / 60000);
  const nowish = isToday && diffMin <= 60;
  return { badge: nowish ? 'Сейчас идёт' : isToday ? 'Сегодня' : isTomorrow ? 'Завтра' : null, now: nowish };
}


// Мини-компонент акцента даты
function DateAccent({
  date,
  tone = 'slate',
}: { date: Date | null; tone?: ToneKey }) {
  if (!date) {
    return (
      <div className="rounded-xl bg-slate-50 px-4 py-3 text-center ring-1 ring-slate-200">
        <div className="text-[11px] text-slate-500">Дата</div>
        <div className="text-sm font-semibold text-slate-700">Не указана</div>
      </div>
    );
  }

  const day = date.toLocaleDateString('ru-RU', { day: '2-digit' });
  const month = date.toLocaleDateString('ru-RU', { month: 'long' });
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);
  const { badge, now } = dateBadges(date);
  
  // Исправляем окончания месяцев (10 сентября, а не 10 сентябрь)
  const monthWithCorrectEnding = month.endsWith('ь') ? month.slice(0, -1) + 'я' : month;

  // Цветовые классы под тон
  const toneBox = tone === 'mint' ? 'from-emerald-50 to-emerald-100 ring-emerald-200'
    : tone === 'ocean' ? 'from-sky-50 to-indigo-100 ring-sky-200'
    : tone === 'lavender' ? 'from-indigo-50 to-fuchsia-100 ring-indigo-200'
    : tone === 'sunset' ? 'from-amber-50 to-rose-100 ring-amber-200'
    : tone === 'sand' ? 'from-amber-50 to-yellow-100 ring-amber-200'
    : tone === 'emerald' ? 'from-emerald-50 to-emerald-100 ring-emerald-200'
    : tone === 'rose' ? 'from-rose-50 to-rose-100 ring-rose-200'
    : tone === 'amber' ? 'from-amber-50 to-amber-100 ring-amber-200'
    : tone === 'indigo' ? 'from-indigo-50 to-indigo-100 ring-indigo-200'
    : tone === 'teal' ? 'from-teal-50 to-teal-100 ring-teal-200'
    : tone === 'purple' ? 'from-purple-50 to-purple-100 ring-purple-200'
    : 'from-slate-50 to-slate-100 ring-slate-200';


  return (
    <div className={`rounded-2xl ring-1 px-4 py-3 bg-gradient-to-br ${toneBox} shadow-sm text-center relative`}>
      {badge && (
        <div className={`absolute -top-1 -right-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold text-white shadow-lg
          ${now ? 'bg-rose-600' : 'bg-slate-600'}`}>
          {badge}
        </div>
      )}
      
      <div className="flex items-end justify-center gap-1 leading-none">
        <span className="text-3xl md:text-4xl font-extrabold text-slate-900">{day}</span>
      </div>
      <div className="mt-1 text-[14px] font-medium text-slate-500">{monthWithCorrectEnding}</div>

      <div className="mt-2 text-[12px] font-semibold text-slate-900">
        {time}
      </div>
    </div>
  );
}

// Тоны карточек (перелив)
type ToneKey = 'ocean' | 'mint' | 'lavender' | 'sunset' | 'sand' | 'slate' | 'emerald' | 'rose' | 'amber' | 'indigo' | 'teal' | 'purple';
const TYPE_TONE: Record<string, ToneKey> = {
  training: 'emerald',    // Зеленый для онлайн-тренингов
  webinar: 'ocean',       // Синий для вебинаров
  workshop: 'purple',     // Фиолетовый для мастер-классов
  exam: 'rose',           // Розовый для экзаменов
  other: 'amber',         // Янтарный для других
};
const STATUS_TONE: Record<EventStatus, ToneKey> = {
  draft: 'slate',
  published: 'mint',
  active: 'mint',
  ongoing: 'lavender',
  completed: 'ocean',
  cancelled: 'sunset',
};
function toneForEvent(ev: EventWithStats): ToneKey {
  return STATUS_TONE[ev.status] ?? (ev.type ? TYPE_TONE[ev.type] : 'slate');
}
function toneClass(tone: ToneKey): string {
  return {
    ocean: 'ir-ocean', mint: 'ir-mint', lavender: 'ir-lavender',
    sunset: 'ir-sunset', sand: 'ir-sand', slate: 'ir-slate',
    emerald: 'ir-emerald', rose: 'ir-rose', amber: 'ir-amber',
    indigo: 'ir-indigo', teal: 'ir-teal', purple: 'ir-purple',
  }[tone];
}

// Цветовые классы для чипов типов мероприятий
function getTypeChipClasses(type: string, eventTypes?: { name_ru: string }) {
  // Определяем тип по event.type или event.event_types.name_ru
  let actualType = type;
  
  // Если event.type пустой или "other", используем event.event_types.name_ru
  if ((!actualType || actualType === 'other') && eventTypes?.name_ru) {
    // Маппинг русских названий на английские ключи
    const nameMapping: Record<string, string> = {
      'Онлайн-тренинг': 'training',
      'Вебинар': 'webinar',
      'Мастер-класс': 'workshop',
      'Экзамен': 'exam',
    };
    actualType = nameMapping[eventTypes.name_ru] || 'other';
  }
  
  const typeColors = {
    training: 'bg-blue-500 text-white ring-blue-500',
    webinar: 'bg-blue-100 text-blue-700 ring-blue-200',
    workshop: 'bg-purple-100 text-purple-700 ring-purple-200',
    exam: 'bg-rose-100 text-rose-700 ring-rose-200',
    other: 'bg-amber-100 text-amber-700 ring-amber-200',
  };
  
  return typeColors[actualType as keyof typeof typeColors] || 'bg-slate-100 text-slate-700 ring-slate-200';
}

// Цветовые классы для буллитов по типу мероприятия
function getTypeBulletClasses(type: string) {
  const typeBullets = {
    training: 'text-white bg-blue-500 ring-blue-500',
    webinar: 'text-blue-700 bg-blue-50 ring-blue-200',
    workshop: 'text-purple-700 bg-purple-50 ring-purple-200',
    exam: 'text-rose-700 bg-rose-50 ring-rose-200',
    other: 'text-amber-700 bg-amber-50 ring-amber-200',
  };
  
  return typeBullets[type as keyof typeof typeBullets] || 'text-slate-700 bg-slate-50 ring-slate-200';
}



/* ----------------- Основная карточка ----------------- */
export function EventCard({ 
  event, 
  index = 0,
  canCreateEvents, 
  onNavigateToEvent, 
  onEditEvent, 
  onDeleteEvent,
}: {
  event: EventWithStats;
  index?: number;
  canCreateEvents?: boolean; // трактуем как тренер/модератор/админ
  onNavigateToEvent?: (id: string) => void;
  onEditEvent?: (id: string) => void;
  onDeleteEvent?: (id: string) => void;
}) {
  const [showTestReview, setShowTestReview] = useState(false);
  const d = parseDate(event);
  const status = STATUS_MAP[event.status] || STATUS_MAP.draft;
  const { label, tone: statusTone, ring, Icon: StatusIcon } = status;
  const typeInfo = event.type
    ? TYPE_LABELS[event.type] || { label: event.event_types?.name_ru || 'Мероприятие', icon: Info }
    : { label: event.event_types?.name_ru || 'Мероприятие', icon: Info };
  const irTone = toneForEvent(event);

  return (
    <article
      className={cx(
        'ir-card ir-ring', toneClass(irTone),
        'group relative overflow-hidden rounded-2xl bg-white',
        'border border-white/60 p-4 shadow-[0_1px_2px_rgba(2,8,23,0.06)]',
        'hover:shadow-[0_10px_30px_rgba(2,8,23,0.08)] transition-all',
        'flex flex-col h-full'
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Верх: дата-время + статус/тип */}
      <header className="mb-3 flex items-start justify-between gap-3 flex-shrink-0">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex flex-col gap-2">
            {/* Первая строка: статус + ZOOM + время */}
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const isIconOnly = !label;
                const badgeClass = cx(
                  'inline-flex items-center gap-1 text-[10px] font-semibold ring-1 shadow-sm',
                  isIconOnly ? 'h-7 w-7 justify-center rounded-lg p-0' : 'rounded-full px-2 py-0.5',
                  label ? statusTone : (event.type === 'training' ? getTypeBulletClasses(event.type) : statusTone),
                  label ? ring : (event.type === 'training' ? '' : ring)
                );
                const iconSize = isIconOnly ? 'h-4 w-4' : 'h-3.5 w-3.5';

                return (
                  <span className={badgeClass}>
                    <StatusIcon className={cx(iconSize, event.status === 'ongoing' && 'animate-spin')} />
                    {!isIconOnly && <span>{label}</span>}
                  </span>
                );
              })()}
              {event.location && event.location.toLowerCase().includes('zoom') && (
                <SiZoom className="h-10 w-10 text-blue-600 ml-2" />
              )}
            </div>
            
            {/* Вторая строка: тип мероприятия */}
            <div className="flex items-center gap-2">
              <span className={cx(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-semibold ring-1 shadow-sm',
                getTypeChipClasses(event.type || 'other', event.event_types || undefined)
              )}>
                {typeInfo.label}
              </span>
            </div>
          </div>

          {/* Название */}
          <h3 className="line-clamp-2 text-lg font-bold leading-tight text-slate-900">
              {event.title}
            </h3>
          </div>

        {/* Правый – акцент на дате/времени */}
        <div className="shrink-0 w-[112px]">
          <DateAccent date={d} tone={irTone} />
        </div>
      </header>

      {/* Описание — коротко и безопасно */}
      <div className="flex-1">
        {event.description && (
        <div className="mb-4 rounded-xl bg-slate-50/70 p-3 ring-1 ring-slate-200">
          <p className="line-clamp-3 text-sm leading-relaxed text-slate-700">
            {event.description}
          </p>
          </div>
      )}

        {/* Статистика тестов */}
        {(event.test_completed_count !== undefined || event.test_pending_review_count !== undefined) && (
          <div className="mb-4 rounded-xl bg-slate-50/70 p-3 ring-1 ring-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-slate-700">Статистика тестов</h4>
              {event.test_pass_percent !== undefined && (
                <span className="text-xs text-slate-500">
                  Проходной балл: {event.test_pass_percent}%
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {event.test_completed_count !== undefined && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs text-slate-600">
                    Пройдено: {event.test_completed_count}
                  </span>
                </div>
              )}
              {event.test_not_passed_count !== undefined && event.test_not_passed_count > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-xs text-slate-600">
                    Не пройдено: {event.test_not_passed_count}
                  </span>
                </div>
              )}
              {event.test_pending_review_count !== undefined && event.test_pending_review_count > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span className="text-xs text-slate-600">
                    На проверке: {event.test_pending_review_count}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
          </div>
          
      {/* Низ: действия и сервисная инфа */}
      <footer className="mt-auto flex-shrink-0">
        {canCreateEvents ? (
          <div className="flex items-center justify-between">
            <div className="text-[9px] text-slate-400 opacity-60">
              Создано: {event.created_at ? (() => {
                const createdDate = new Date(event.created_at);
                return `${createdDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(createdDate)}`;
              })() : 'Дата не указана'}
            </div>

            <div className="flex items-center gap-2">
              {(event.test_pending_review_count ?? 0) > 0 && (
                <button
                  onClick={() => setShowTestReview(true)}
                  className="btn-warning"
                  title="Проверка тестов"
                >
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">{event.test_pending_review_count}</span>
                </button>
              )}
              <button
                onClick={() => onEditEvent?.(event.id)}
                className="btn-neutral"
                title="Редактировать"
              >
                <PencilLine className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDeleteEvent?.(event.id)}
                className="btn-danger"
                title="Удалить"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button 
                onClick={() => onNavigateToEvent?.(event.id)}
                className="btn-primary"
                title="Открыть"
              >
                <span className="text-sm font-medium">Открыть</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => onNavigateToEvent?.(event.id)}
            className="w-full justify-center relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:via-teal-600 hover:to-emerald-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-300 shadow-sm hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            title="Открыть"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]"></div>
            <span className="text-sm font-medium relative z-10">Открыть</span>
          </button>
        )}
      </footer>

      {/* Модальное окно проверки тестов */}
      {showTestReview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Проверка тестов - {event.title}
              </h2>
              <button
                onClick={() => setShowTestReview(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <TestsPendingReview
                eventId={event.id}
                onReviewComplete={() => setShowTestReview(false)}
              />
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default EventCard;
  