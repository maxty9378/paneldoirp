import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCheck, BarChart3, Info, XCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

/* ========================== Типы ========================== */

interface Participant {
  id: string;
  full_name: string;
  territory_name?: string;
  territory_region?: string;
}

type Level = 'high' | 'medium' | 'low';

interface TPEvaluation {
  participant_id: string;
  leadership_potential: Level;
  business_communication: Level;
  learning_ability: Level;
  motivation_level: Level;
  // Старые поля (обязательные в БД)
  goal_setting: number;
  client_contact: number;
  needs_identification: number;
  presentation_demo: number;
  objection_handling: number;
  // Новые поля
  bonus_calculation: number;
  tools_usage: number;
  task_execution: number;
  weekly_planning: number;
  new_client_connection: number;
  client_connection_skill: number;
  average_skills_score: number;
}

/* ========================== UI атомы ========================== */

/** 3-позиционный сегмент-контрол (High/Med/Low) с ползунком — единый стиль */
function Segmented3({
  value,
  onChange,
  labels = { high: 'Высокий', medium: 'Средний', low: 'Низкий' },
}: {
  value: Level;
  onChange: (v: Level) => void;
  labels?: { high: string; medium: string; low: string };
}) {
  const items: { v: Level; text: string; bg: string; ring: string }[] = [
    { v: 'high', text: labels.high, bg: 'bg-emerald-600', ring: 'ring-emerald-600' },
    { v: 'medium', text: labels.medium, bg: 'bg-amber-500', ring: 'ring-amber-500' },
    { v: 'low', text: labels.low, bg: 'bg-rose-500', ring: 'ring-rose-500' },
  ];

  const idx = Math.max(0, items.findIndex(i => i.v === value));

  return (
    <div className="relative w-full select-none">
      <div
        className="grid grid-cols-3 rounded-xl border border-slate-200 bg-white p-1 gap-0"
        role="radiogroup"
        aria-label="Оценка уровня"
        onKeyDown={(e) => {
          const order: Level[] = ['low','medium','high'];
          const cur = order.indexOf(value);
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            onChange(order[Math.max(0, cur - 1)]);
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            onChange(order[Math.min(order.length - 1, cur + 1)]);
          }
        }}
        tabIndex={0}
      >
        {/* Ползунок */}
        <div
          className={`absolute top-1 h-[calc(100%-0.5rem)] rounded-lg ${items[idx]?.bg} transition-all`}
          style={{
            left: `calc(${idx} * 33.333% + 0.25rem)`,
            width: `calc(33.333% - 0.5rem)`,
          }}
          aria-hidden
        />
        {items.map(i => (
          <button
            key={i.v}
            type="button"
            role="radio"
            aria-checked={value === i.v}
            onClick={() => onChange(i.v)}
            className={`z-10 h-8 text-xs font-medium rounded-lg transition-colors whitespace-nowrap
              focus:outline-none
              ${value === i.v ? 'text-white' : 'text-slate-600 hover:text-slate-900'}
              flex items-center justify-center min-w-0`}
          >
            <span className="truncate">{i.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Числовая шкала 1..max: единый размер кликабельных таргетов */
function NumberScale({
  value,
  onChange,
  max = 5,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  const nums = useMemo(() => Array.from({ length: max }, (_, i) => i + 1), [max]);

  return (
    <div role="radiogroup" aria-label="Оценка по шкале" className="flex gap-1.5 items-center justify-start">
      {nums.map(n => {
        const active = n === value;
        return (
          <button
            key={n}
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(1, value - 1));
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(max, value + 1));
            }}
            onClick={() => onChange(n)}
            type="button"
            aria-label={`Оценка ${n}`}
            className={`h-10 w-10 rounded-full border text-sm font-medium transition-all
              ${active
                ? n === 5 ? 'bg-green-500 border-green-500 text-white shadow-sm'
                  : n === 4 ? 'bg-green-400 border-green-400 text-white shadow-sm'
                  : n === 3 ? 'bg-yellow-500 border-yellow-500 text-white shadow-sm'
                  : n === 2 ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                  : 'bg-red-500 border-red-500 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 focus:outline-none'}`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

/** Чип статуса сохранения — единый вид */
function SaveChip({ saving }: { saving: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1 text-xs font-medium border border-slate-200">
      {saving ? <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
      {saving ? 'Сохранение…' : 'Сохранено'}
    </div>
  );
}

/* ========================== Данные критериев (единый тон описаний) ========================== */

const evaluationCriteria = {
  leadership_potential: {
    title: 'Лидерский потенциал',
    description:
      'Активная позиция в тренинге: вовлекает группу, помогает другим, делится успешными практиками.',
    levels: {
      high: ' — проявляется в большинстве ситуаций, приводит к высокому результату',
      medium: ' — проявляется примерно в половине ситуаций, результат в норме',
      low: ' — проявляется редко или не приводит к нужному результату',
    },
  },
  business_communication: {
    title: 'Деловая коммуникация',
    description:
      'Речь логичная и ясная, умеет слушать, аргументирует без слов-паразитов и уменьшительных.',
    levels: {
      high: ' — коммуникация стабильно сильная, помогает достигать результата',
      medium: ' — уровень колеблется, но в целом приемлемый',
      low: ' — слабая коммуникация, мешает достигать результата',
    },
  },
  learning_ability: {
    title: 'Обучаемость',
    description:
      'Переносит знания в практику, ищет решения, отказывается от неэффективных моделей поведения.',
    levels: {
      high: ' — быстро применяет и адаптирует новое',
      medium: ' — нужна поддержка, но есть прогресс',
      low: ' — застревает на старых моделях',
    },
  },
  motivation_level: {
    title: 'Мотивация',
    description:
      'Проявляет интерес к обучению, фокус на задаче, минимальные жалобы на условия.',
    levels: {
      high: ' — заряжен, двигает процесс',
      medium: ' — средняя вовлеченность',
      low: ' — низкая вовлеченность',
    },
  },
} as const;

// Общая шкала для навыков (единый текст и порядок)
const skillLevels = {
  5: 'Очень высокий уровень: самостоятельно и безошибочно демонстрирует умение',
  4: 'Высокий уровень: самостоятельно, с редкими неточностями',
  3: 'Средний уровень: с помощью тренера, с небольшими ошибками',
  2: 'Низкий уровень: с помощью тренера, много ошибок',
  1: 'Очень низкий уровень: игнорирует/саботирует применение умения',
} as const;

const salesCriteria = {
  bonus_management: {
    categoryTitle: 'Управление бонусной системой',
    skills: {
      bonus_calculation: {
        title: 'Расчет бонуса',
        description: 'Корректно считает бонус по направлениям с учетом порогов.',
        levels: skillLevels,
      },
      tools_usage: {
        title: 'Инструменты ТП',
        description: 'Пользуется инструментами ТП для задач СПП в торговой точке.',
        levels: skillLevels,
      },
    },
  },
  task_planning: {
    categoryTitle: 'Планирование и выполнение задач',
    skills: {
      task_execution: {
        title: 'Выполнение задач СПП',
        description: 'Выполняет задачи СПП с учетом категории ТТ.',
        levels: skillLevels,
      },
      weekly_planning: {
        title: 'Недельное планирование',
        description:
          'Планирует задачи по неделям для выхода на 100% бонус с учетом развития территории.',
        levels: skillLevels,
      },
    },
  },
  client_development: {
    categoryTitle: 'Развитие клиентской базы',
    skills: {
      new_client_connection: {
        title: 'Подключение нового клиента',
        description: 'Знает и применяет процесс подключения нового клиента.',
        levels: skillLevels,
      },
      client_connection_skill: {
        title: 'Навык подключения',
        description: 'Демонстрирует высокий навык подключения нового клиента.',
        levels: skillLevels,
      },
    },
  },
  // Средняя оценка (отдельная сущность)
  average_skills_score: {
    title:
      'Средняя оценка навыков управления бонусной системой и планирования выполнения задач СПП',
    description: 'Итоговый уровень развития профессиональных навыков продаж',
    levels: skillLevels,
  },
} as const;

type PersonalKey = keyof typeof evaluationCriteria;
type SalesKey =
  | keyof typeof salesCriteria['bonus_management']['skills']
  | keyof typeof salesCriteria['task_planning']['skills']
  | keyof typeof salesCriteria['client_development']['skills'];

// Список ключей навыков для среднего балла (строго 6 штук)
const SALES_KEYS = [
  'bonus_calculation',
  'tools_usage',
  'task_execution',
  'weekly_planning',
  'new_client_connection',
  'client_connection_skill',
] as const satisfies Readonly<SalesKey[]>;

/* ========================== Утилиты ========================== */

// 1) Фабрика дефолтной оценки
function makeDefaultEval(participantId: string): TPEvaluation {
  return {
    participant_id: participantId,
    leadership_potential: 'high',
    business_communication: 'high',
    learning_ability: 'high',
    motivation_level: 'high',
    goal_setting: 1,
    client_contact: 1,
    needs_identification: 1,
    presentation_demo: 1,
    objection_handling: 1,
    bonus_calculation: 1,
    tools_usage: 1,
    task_execution: 1,
    weekly_planning: 1,
    new_client_connection: 1,
    client_connection_skill: 1,
    average_skills_score: 1,
  };
}

// Хук-дроссель
function useDebouncedCallback<T extends (...args: any[]) => void>(cb: T, delay = 500) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((...args: Parameters<T>) => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => cb(...args), delay);
  }, [cb, delay]);
}

/* ========================== Основной компонент ========================== */

export default function EventTPEvaluation() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [evaluations, setEvaluations] = useState<Map<string, TPEvaluation>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [openInfo, setOpenInfo] = useState<string | null>(null); // key критерия

  // пагинация для больших групп
  const pageSize = 20;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(participants.length / pageSize));
  const pagedParticipants = useMemo(() => {
    const start = (page - 1) * pageSize;
    return participants.slice(start, start + pageSize);
  }, [participants, page]);

  useEffect(() => {
    if (eventId) void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // 2) Гарантируем наличие оценок для всех участников
  useEffect(() => {
    if (participants.length === 0) return;
    setEvaluations(prev => {
      let changed = false;
      const next = new Map(prev);
      for (const p of participants) {
        if (!next.has(p.id)) {
          next.set(p.id, makeDefaultEval(p.id));
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [participants]);

  // 4) Стабильность пагинации
  useEffect(() => {
    setPage(p => {
      const last = Math.max(1, Math.ceil(participants.length / pageSize));
      return Math.min(p, last);
    });
  }, [participants.length, pageSize]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Участники события
      const { data: participantsData, error: participantsError } = await supabase
        .from('event_participants')
        .select('id, user_id')
        .eq('event_id', eventId)
        .eq('attended', true);

      if (participantsError) throw participantsError;

      const userIds = participantsData?.map(p => p.user_id) || [];
      let participantsList: Participant[] = [];

      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, territory_id')
          .in('id', userIds);

        if (usersError) throw usersError;

        const territoryIds = usersData?.map(u => u.territory_id).filter(Boolean) || [];
        let territoriesData: any[] = [];

        if (territoryIds.length > 0) {
          const { data: territories, error: territoriesError } = await supabase
            .from('territories')
            .select('id, name, region')
            .in('id', territoryIds);

          if (territoriesError) {
            console.warn('Ошибка загрузки территорий:', territoriesError);
          } else {
            territoriesData = territories || [];
          }
        }

        participantsList =
          participantsData?.map(p => {
            const user = usersData?.find(u => u.id === p.user_id);
            const territory = user?.territory_id ? territoriesData.find(t => t.id === user.territory_id) : null;

            return {
              id: p.user_id,
              full_name: user?.full_name || 'Неизвестно',
              territory_name: territory?.name,
              territory_region: territory?.region,
            };
          }) || [];
      }

      setParticipants(participantsList);

      // Оценки (если есть)
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from('tp_evaluations')
        .select('*')
        .eq('event_id', eventId)
        .eq('evaluator_id', userProfile?.id);

      if (evaluationsError) {
        console.warn('❌ Ошибка загрузки оценок:', evaluationsError);
      }

      const map = new Map<string, TPEvaluation>();
      evaluationsData?.forEach((e: any) => {
        map.set(e.participant_id, {
          participant_id: e.participant_id,
          leadership_potential: e.leadership_potential || 'high',
          business_communication: e.business_communication || 'high',
          learning_ability: e.learning_ability || 'high',
          motivation_level: e.motivation_level || 'high',
          // Старые поля
          goal_setting: e.goal_setting || 1,
          client_contact: e.client_contact || 1,
          needs_identification: e.needs_identification || 1,
          presentation_demo: e.presentation_demo || 1,
          objection_handling: e.objection_handling || 1,
          // Новые поля
          bonus_calculation: e.bonus_calculation || 1,
          tools_usage: e.tools_usage || 1,
          task_execution: e.task_execution || 1,
          weekly_planning: e.weekly_planning || 1,
          new_client_connection: e.new_client_connection || 1,
          client_connection_skill: e.client_connection_skill || 1,
          average_skills_score: e.average_skills_score || 1,
        });
      });
      setEvaluations(map);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  // 3) Без записи стейта в рендере
  const getEval = useCallback(
    (participantId: string): TPEvaluation =>
      evaluations.get(participantId) ?? makeDefaultEval(participantId),
    [evaluations]
  );

  // Функция сохранения в БД
  const persist = useCallback(async (updated: TPEvaluation) => {
    if (!userProfile?.id) return;
    const dataToSave = {
      event_id: eventId,
      evaluator_id: userProfile.id,
      ...updated,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('tp_evaluations')
      .upsert(dataToSave, { onConflict: 'event_id,participant_id,evaluator_id' });
    if (error) throw error;
  }, [eventId, userProfile?.id]);

  const persistDebounced = useDebouncedCallback(persist, 500);

  // 8) Типобезопасность при апдейте полей
  const updateField = <K extends keyof TPEvaluation>(participantId: string, key: K, value: TPEvaluation[K]) =>
    update(participantId, { [key]: value } as Pick<TPEvaluation, K>);

  const update = async (participantId: string, updates: Partial<TPEvaluation>) => {
    setSaving(true);

    const current = getEval(participantId);
    const updated: TPEvaluation = { ...current, ...updates };

    // Пересчет средней по 6 навыкам (без округления — форматируем в UI)
    const skillsScores = SALES_KEYS.map(k => Number(updated[k]));
    const avg =
      skillsScores.length > 0
        ? skillsScores.reduce((s, x) => s + (Number.isFinite(x) ? x : 0), 0) / skillsScores.length
        : 0;
    updated.average_skills_score = avg;

    setEvaluations(prev => new Map(prev).set(participantId, updated));

    try {
      await persistDebounced(updated);
    } catch (e) {
      console.error('Ошибка сохранения:', e);
    } finally {
      setSaving(false);
    }
  };

  /* ========================== Скелетоны/ошибки ========================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка данных…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-rose-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Ошибка загрузки</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-800 focus:outline-none"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  /* ========================== Вёрстка ========================== */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Хедер */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 focus:outline-none"
                aria-label="Назад"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight truncate">
                  Оценка уровня развития навыков продаж у ТП
                </h1>
                <p className="text-sm text-gray-600 truncate">
                  Личностные качества и навыки управления бонусной системой и планирования выполнения задач СПП
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="hidden sm:inline text-sm text-gray-500">{participants.length} участника(ов)</span>
              <SaveChip saving={saving} />
            </div>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {participants.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет участников</h3>
            <p className="text-gray-600">Участники мероприятия не найдены</p>
          </div>
        ) : (
          <>
            {/* ======= Блок 1: Личностные качества ======= */}
            <section aria-labelledby="personal-title">
              <div className="mb-4">
                <h3 id="personal-title" className="text-lg font-semibold text-emerald-700 leading-tight">
                  Личностные качества и мотивация
                </h3>
                <p className="text-sm text-slate-500 mt-1">Лидерство, коммуникация, обучаемость, мотивация</p>
              </div>

              {/* Мобильные карточки - только личностные качества */}
              <div className="grid gap-4 md:hidden">
                {pagedParticipants.map(p => {
                  const e = getEval(p.id);

                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow"
                    >
                      {/* Шапка карточки */}
                      <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4 border border-slate-200">
                        <div className="font-semibold text-slate-800">{p.full_name}</div>
                        <div className="text-xs text-slate-500">
                          {p.territory_name || '—'} {p.territory_region ? `· ${p.territory_region}` : ''}
                        </div>
                      </div>

                      {/* Личностные качества */}
                      <div className="space-y-3">
                        {Object.entries(evaluationCriteria).map(([key, crit]) => (
                          <div key={key}>
                            <div className="flex items-center gap-1.5 text-sm text-slate-700 mb-1">
                              <span className="font-medium">{crit.title}</span>
                              <button
                                onClick={() => setOpenInfo(key)}
                                aria-label={`Подробнее о ${crit.title}`}
                                className="p-1 rounded hover:bg-slate-100 focus:outline-none"
                              >
                                <Info className="w-4 h-4 text-slate-500" />
                              </button>
                            </div>
                            <Segmented3 value={e[key as PersonalKey]} onChange={(v: Level) => updateField(p.id, key as PersonalKey, v)} />
                          </div>
                        ))}
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Десктоп-таблица */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="sticky left-0 z-10 text-left py-3 px-4 font-semibold bg-slate-50 w-60 border-r border-slate-200">
                        Участник
                      </th>
                      {Object.entries(evaluationCriteria).map(([key, c]) => (
                        <th key={key} className="text-center py-3 px-3 font-semibold text-slate-800">
                          <div className="inline-flex items-center gap-1.5">
                            <span>{c.title}</span>
                            <button
                              onClick={() => setOpenInfo(key)}
                              className="p-1 rounded-full hover:bg-slate-200"
                              aria-label={`Подробнее: ${c.title}`}
                            >
                              <Info className="w-4 h-4 text-slate-500" />
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedParticipants.map((p, i) => {
                      const e = getEval(p.id);
                      return (
                        <tr key={p.id} className={`transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}>
                          <td
                            className="sticky left-0 z-10 bg-inherit border-r border-slate-200 py-2.5 px-4 w-60"
                          >
                            <div className="font-medium text-slate-900 truncate">{p.full_name}</div>
                            <div className="text-xs text-slate-500 truncate">
                              {p.territory_name || '—'}
                              {p.territory_region && ` · ${p.territory_region}`}
                            </div>
                          </td>
                          {Object.keys(evaluationCriteria).map(key => (
                            <td key={key} className="py-2.5 px-3 text-center align-middle">
                              <Segmented3 value={e[key as PersonalKey]} onChange={(v: Level) => updateField(p.id, key as PersonalKey, v)} />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm hover:bg-slate-50 disabled:opacity-50 focus:outline-none"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Назад
                </button>
                <div className="text-sm text-slate-600">
                  Страница <span className="font-semibold text-slate-800">{page}</span> из {totalPages}
                </div>
                <button
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm hover:bg-slate-50 disabled:opacity-50 focus:outline-none"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Вперед
                </button>
              </div>
            )}

            {/* ======= Блок 2: Навыки продаж (карточка = вся строка) ======= */}
            <section aria-labelledby="sales-title">
              <div className="mb-4">
                <h3 id="sales-title" className="text-lg font-semibold text-emerald-700 leading-tight">
                  Навыки управления бонусной системой и планирования выполнения задач СПП
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Расчет бонуса, инструменты ТП, выполнение задач СПП, планирование, подключение клиентов
                </p>
              </div>

              {/* одна карточка = вся ширина ряда */}
              <div className="grid gap-4 grid-cols-1">
                {pagedParticipants.map(p => {
                  const e = getEval(p.id);
                  const avg = e.average_skills_score;

                  const topSkills: SalesKey[] = ['bonus_calculation', 'tools_usage', 'task_execution'];
                  const bottomSkills: SalesKey[] = ['weekly_planning', 'new_client_connection', 'client_connection_skill'];

                  const avgTone =
                    avg > 4.0 ? { box: 'border-green-200 bg-green-50', text: 'text-green-800' } :
                    avg >= 3.0 ? { box: 'border-yellow-200 bg-yellow-50', text: 'text-yellow-800' } :
                                  { box: 'border-red-200 bg-red-50', text: 'text-red-800' };

                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow"
                    >
                      {/* шапка карточки */}
                      <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-800">{p.full_name}</div>
                            <div className="text-xs text-slate-500">
                              {p.territory_name || '—'} {p.territory_region ? `· ${p.territory_region}` : ''}
                            </div>
                          </div>
                          {/* Средняя оценка в шапке - только для мобильной версии */}
                          <div className="md:hidden flex items-center gap-2">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm font-semibold ${
                              avg > 4.0 ? 'bg-green-100 text-green-800' :
                              avg >= 3.0 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              <BarChart3 className="w-4 h-4" />
                              {avg.toFixed(1)}
                            </div>
                            <button
                              onClick={() => setOpenInfo('average_skills_score')}
                              className="p-1 rounded hover:bg-slate-200"
                              aria-label="Подробнее о средней оценке"
                            >
                              <Info className="w-4 h-4 text-slate-500" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* сетка: 3 + 3 + правая панель */}
                      <div
                        className="
                          grid gap-4
                          grid-cols-1
                          lg:[grid-template-columns:repeat(3,minmax(0,1fr))_260px]
                        "
                      >
                        {/* верхний ряд */}
                        {topSkills.map(key => (
                          <div
                            key={key}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-3 min-h-[96px] flex flex-col justify-between"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-medium text-slate-700 pr-2">
                                {key === 'bonus_calculation' && 'Считает бонус по направлениям с учетом порогов'}
                                {key === 'tools_usage' && 'Пользуется инструментами ТП для задач СПП в ТТ'}
                                {key === 'task_execution' && 'Выполняет задачи СПП с учетом категории ТТ'}
                              </span>
                              <button
                                onClick={() => setOpenInfo(key)}
                                className="p-1 rounded hover:bg-slate-100 flex-shrink-0 focus:outline-none"
                                aria-label="Описание"
                              >
                                <Info className="w-4 h-4 text-slate-500" />
                              </button>
                            </div>
                            <div className="mt-2">
                              <NumberScale value={e[key]} onChange={(v: number) => updateField(p.id, key, v)} />
                            </div>
                          </div>
                        ))}

                        {/* правая панель со средней — на высоту двух рядов */}
                        <div className={`rounded-xl border px-4 py-3 row-span-2 ${avgTone.box}`}>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold text-slate-800 pr-2">
                              {salesCriteria.average_skills_score.title}
                            </span>
                            <button
                              onClick={() => setOpenInfo('average_skills_score')}
                              className="p-1 rounded hover:bg-slate-100 flex-shrink-0 focus:outline-none"
                              aria-label="Подробнее о средней оценке"
                            >
                              <Info className="w-4 h-4 text-slate-600" />
                            </button>
                          </div>
                          <div className="mt-12 flex justify-center" aria-live="polite">
                            <div className={`inline-flex items-baseline gap-2 px-3 py-2 rounded-xl ${avgTone.text}`}>
                              <span className="text-5xl font-black leading-none tracking-tight">
                                {Number.isFinite(avg) ? avg.toFixed(1) : '—'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* нижний ряд */}
                        {bottomSkills.map(key => (
                          <div
                            key={key}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-3 min-h-[96px] flex flex-col justify-between"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-medium text-slate-700 pr-2">
                                {key === 'weekly_planning' &&
                                  'Планирует задачи по неделям для выхода на 100% бонус с учетом развития территории'}
                                {key === 'new_client_connection' && 'Умеет подключать нового клиента'}
                                {key === 'client_connection_skill' && 'Навык подключения нового клиента'}
                              </span>
                              <button
                                onClick={() => setOpenInfo(key)}
                                className="p-1 rounded hover:bg-slate-100 flex-shrink-0 focus:outline-none"
                                aria-label="Описание"
                              >
                                <Info className="w-4 h-4 text-slate-500" />
                              </button>
                            </div>
                            <div className="mt-2">
                              <NumberScale value={e[key]} onChange={(v: number) => updateField(p.id, key, v)} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Повторная пагинация */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm hover:bg-slate-50 disabled:opacity-50 focus:outline-none"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Назад
                </button>
                <div className="text-sm text-slate-600">
                  Страница <span className="font-semibold text-slate-800">{page}</span> из {totalPages}
                </div>
                <button
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm hover:bg-slate-50 disabled:opacity-50 focus:outline-none"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Вперед
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Модальное окно с описанием */}
      {openInfo && <InfoModal criterionId={openInfo} onClose={() => setOpenInfo(null)} />}
    </div>
  );
}

/* ========================== Вспомогательная модалка ========================== */

function InfoModal({ criterionId, onClose }: { criterionId: string; onClose: () => void }) {
  // 6) Modal: UX-полировка - закрытие по Esc и блокировка скролла
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') onClose(); 
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  let entry: any = null;
  let isPersonal = false;

   // Ищем в личностных качествах
   if (Object.prototype.hasOwnProperty.call(evaluationCriteria, criterionId)) {
    entry = (evaluationCriteria as any)[criterionId];
    isPersonal = true;
  }
  // Если не найдено, ищем в навыках продаж
  else {
    // Сначала проверяем среднюю оценку
    if (criterionId === 'average_skills_score') {
      entry = salesCriteria.average_skills_score;
    } else {
      // Ищем в категориях навыков
      for (const category of Object.values(salesCriteria)) {
        if ('skills' in category && Object.prototype.hasOwnProperty.call(category.skills, criterionId)) {
          entry = (category.skills as any)[criterionId];
          break;
        }
      }
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {entry?.title || 'Информация'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 focus:outline-none rounded-lg"
            aria-label="Закрыть"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {entry ? (
          <div className="space-y-4 text-sm text-slate-700">
            <div>
              <p className="font-semibold text-slate-800 mb-1">Описание</p>
              <p className="text-slate-600">{entry.description}</p>
            </div>

            {isPersonal ? (
              <div>
                <p className="font-semibold text-slate-800 mb-2">Уровни</p>
                <ul className="space-y-2 text-slate-600">
                  <li className="flex items-start gap-3">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 mt-1 flex-shrink-0 border-2 border-white ring-1 ring-emerald-500" />
                    <span>
                      <b className="text-slate-800">Высокий:</b>
                      {entry.levels.high}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-3 h-3 rounded-full bg-amber-500 mt-1 flex-shrink-0 border-2 border-white ring-1 ring-amber-500" />
                    <span>
                      <b className="text-slate-800">Средний:</b>
                      {entry.levels.medium}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-3 h-3 rounded-full bg-rose-500 mt-1 flex-shrink-0 border-2 border-white ring-1 ring-rose-500" />
                    <span>
                      <b className="text-slate-800">Низкий:</b>
                      {entry.levels.low}
                    </span>
                  </li>
                </ul>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-slate-800 mb-2">
                  Уровни оценки (1–5)
                </p>
                <div className="space-y-1.5 text-xs text-slate-600">
                  {Object.entries(entry.levels)
                    .sort(([a], [b]) => Number(b) - Number(a))
                    .map(([level, desc]) => (
                      <p key={level}>
                        <b>{level}:</b> {String(desc)}
                      </p>
                    ))}
                </div>

                {criterionId === 'average_skills_score' && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="font-semibold text-slate-800 mb-2">
                      Автоматическое цветовое выделение
                    </p>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <p className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                        <b className="text-green-700">Зелёным</b> — оценка &gt; 4.0. Высокий уровень применения умений.
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
                        <b className="text-yellow-700">Жёлтым</b> — оценка 3.0–4.0. Средний уровень применения умений.
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                        <b className="text-red-700">Красным</b> — оценка &lt; 3.0. Низкий уровень применения умений.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-slate-600 text-sm">
            Подробная информация для этого критерия не найдена.
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none transition-colors text-sm font-medium"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
