import React from 'react';
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
} from 'lucide-react';
import { SiZoom } from 'react-icons/si';
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
  test_pass_percent?: number;   // 0..100
  event_types?: { id: string; name: string; name_ru: string } | null;
}

const TYPE_LABELS: Record<string, { label: string; icon: React.ComponentType<any> }> = {
  training: { label: 'Онлайн тренинг', icon: Play },
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

function ruWeekday(d: Date) {
  return d.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', ''); // пн, вт...
}

// Мини-компонент акцента даты
function DateAccent({
  date,
  tone = 'slate',
}: { date: Date | null; tone?: 'ocean'|'mint'|'lavender'|'sunset'|'sand'|'slate' }) {
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
    : 'from-slate-50 to-slate-100 ring-slate-200';

  const timePill = tone === 'mint' ? 'bg-emerald-600'
    : tone === 'ocean' ? 'bg-indigo-600'
    : tone === 'lavender' ? 'bg-indigo-600'
    : tone === 'sunset' ? 'bg-rose-600'
    : tone === 'sand' ? 'bg-amber-600'
    : 'bg-slate-700';

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
type ToneKey = 'ocean' | 'mint' | 'lavender' | 'sunset' | 'sand' | 'slate';
const TYPE_TONE: Record<string, ToneKey> = {
  training: 'mint',
  webinar: 'ocean',
  workshop: 'lavender',
  exam: 'sunset',
  other: 'sand',
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
  }[tone];
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
  const d = parseDate(event);
  const status = STATUS_MAP[event.status] || STATUS_MAP.draft;
  const { label, tone: statusTone, ring, Icon: StatusIcon } = status;
  const typeInfo = event.type
    ? TYPE_LABELS[event.type] || { label: event.event_types?.name_ru || 'Мероприятие', icon: Info }
    : { label: event.event_types?.name_ru || 'Мероприятие', icon: Info };
  const irTone = toneForEvent(event);
  const { badge, now } = dateBadges(d);

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
              <span className={cx(
                'inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold ring-1 shadow-sm',
                label ? 'rounded-full' : 'rounded-lg h-8 w-8 justify-center',
                statusTone, ring
              )}>
                <StatusIcon className={
                label === 'Активно' ? "h-4 w-4" : 
                label === 'Идёт' ? "h-3.5 w-3.5" : 
                label ? "h-3.5 w-3.5" : "h-12 w-12 text-white"
              } />
                {label && <span>{label}</span>}
              </span>
              {event.location && event.location.toLowerCase().includes('zoom') && (
                <SiZoom className="h-10 w-10 text-blue-600 ml-2" />
              )}
            </div>
            
            {/* Вторая строка: тип мероприятия */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 shadow-sm">
                <typeInfo.icon className="h-3.5 w-3.5" />
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
          </div>
          
      {/* Низ: действия и сервисная инфа */}
      <footer className="mt-auto flex items-center justify-between flex-shrink-0">
        <div className="text-[9px] text-slate-400 opacity-60">
          Создано: {d ? `${d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(d)}` : 'Дата не указана'}
        </div>

        <div className="flex items-center gap-2">
          {canCreateEvents && (
            <>
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
            </>
          )}
          <button 
            onClick={() => onNavigateToEvent?.(event.id)}
            className="btn-primary"
            title="Открыть"
          >
            <span className="text-sm font-medium">Открыть</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </article>
  );
}

export default EventCard;
  