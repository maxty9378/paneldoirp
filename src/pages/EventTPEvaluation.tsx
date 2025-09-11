import { useEffect, useMemo, useState, useCallback } from 'react';
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
  goal_setting: number;
  client_contact: number;
  needs_identification: number;
  presentation_demo: number;
  objection_handling: number;
  new_client_connection: number;
  average_skills_score: number;
}

/* ========================== UI атомы ========================== */

/** 3-позиционный сегмент-контрол (High/Med/Low) с ползунком */
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

  const idx = items.findIndex(i => i.v === value);

  return (
    <div className="relative w-full select-none">
      <div
        className="grid grid-cols-3 rounded-xl border border-slate-200 bg-white p-1 gap-0"
        role="radiogroup"
        aria-label="Оценка уровня"
      >
        {/* Ползунок */}
        <div
          className={`absolute top-1 h-[calc(100%-0.5rem)] rounded-lg ${items[idx]?.bg} transition-all`}
          style={{ 
            left: `calc(${idx} * 33.333% + 0.25rem)`,
            width: `calc(33.333% - 0.5rem)`
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
              focus:outline-none focus-visible:ring-2 ${i.ring}
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

/** Числовая шкала 1..max с крупными точками-тач-таргетами */
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
    <div className="flex gap-1.5 items-center justify-center">
      {nums.map(n => {
        const active = n === value;
        return (
        <button
            key={n}
            onClick={() => onChange(n)}
            type="button"
            aria-label={`Оценка ${n}`}
            className={`h-8 w-8 rounded-full border text-sm font-medium transition-all
              ${active
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            {n}
        </button>
        );
      })}
    </div>
  );
}

/** Чип статуса сохранения */
function SaveChip({ saving }: { saving: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1 text-xs font-medium border border-slate-200">
      {saving ? <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
      {saving ? 'Сохранение…' : 'Сохранено'}
    </div>
  );
}

/* ========================== Данные критериев ========================== */

const evaluationCriteria = {
  leadership_potential: {
    title: 'Лидерский потенциал',
    description: 'занимает в тренинге активную позицию, помогает вовлекать в обучение других ТП личным примером; помогает другим ТП лучше справляться с заданиями; активно делится своим успешным опытом с группой.',
    levels: {
      high: ' - проявляется в большинстве ситуаций в тренинге, приводит к высокому результату',
      medium: ' - проявляется примерно в 50% ситуаций в тренинге, приводит к приемлемому результату',
      low: ' - проявляется менее, чем в 50% ситуаций в тренинге или не приводит к приемлемому результату'
    }
  },
  business_communication: {
    title: 'Уровень деловой коммуникации',
    description: 'речь логичная и понятная, умеет слушать, аргументирует без слов-паразитов и уменьшительных форм.',
    levels: {
      high: ' - стабильно сильная коммуникация, способствует достижению результата',
      medium: ' - нестабильно, но в целом приемлемый уровень коммуникации',
      low: ' - слабая коммуникация, мешает достижению результата'
    }
  },
  learning_ability: {
    title: 'Уровень обучаемости',
    description: 'переносит знания в практику, ищет решения, отказывается от неэффективного поведения и формирует новое.',
    levels: {
      high: ' - быстро применяет и адаптирует полученные знания',
      medium: ' - нужна поддержка, но двигается в правильном направлении',
      low: ' - застревает на старых моделях поведения'
    }
  },
  motivation_level: {
    title: 'Уровень мотивации',
    description: 'проявляет интерес к получению знаний, жалоб на условия минимум или нет.',
    levels: {
      high: ' - заряжен, активно двигает процесс обучения',
      medium: ' - средняя вовлеченность в процесс',
      low: ' - слабая вовлеченность в процесс обучения'
    }
  }
} as const;

const salesCriteria = {
  goal_setting: {
    title: 'Цели на визит (SMART)',
    description: 'ТП умеет ставить конкретные, измеримые, достижимые, релевантные и ограниченные по времени цели для каждого визита к клиенту.',
    levels: {
      5: 'Очень высокий уровень: ТП самостоятельно и безошибочно демонстрирует умение',
      4: 'Высокий уровень: ТП самостоятельно и с небольшим количеством ошибок демонстрирует умение',
      3: 'Средний уровень: ТП с помощью тренера и с небольшим количеством ошибок демонстрирует умение',
      2: 'Низкий уровень: ТП с помощью тренера и с большим количеством ошибок демонстрирует умение',
      1: 'Очень низкий уровень: ТП саботирует применение умения'
    }
  },
  client_contact: {
    title: 'Деловой контакт',
    description: 'ТП умеет устанавливать и поддерживать деловые отношения с клиентами, соблюдает профессиональную дистанцию.',
    levels: {
      5: 'Очень высокий уровень: ТП самостоятельно и безошибочно демонстрирует умение',
      4: 'Высокий уровень: ТП самостоятельно и с небольшим количеством ошибок демонстрирует умение',
      3: 'Средний уровень: ТП с помощью тренера и с небольшим количеством ошибок демонстрирует умение',
      2: 'Низкий уровень: ТП с помощью тренера и с большим количеством ошибок демонстрирует умение',
      1: 'Очень низкий уровень: ТП саботирует применение умения'
    }
  },
  needs_identification: {
    title: 'Выявление потребностей',
    description: 'ТП умеет задавать правильные вопросы, слушать клиента и выявлять его реальные потребности.',
    levels: {
      5: 'Очень высокий уровень: ТП самостоятельно и безошибочно демонстрирует умение',
      4: 'Высокий уровень: ТП самостоятельно и с небольшим количеством ошибок демонстрирует умение',
      3: 'Средний уровень: ТП с помощью тренера и с небольшим количеством ошибок демонстрирует умение',
      2: 'Низкий уровень: ТП с помощью тренера и с большим количеством ошибок демонстрирует умение',
      1: 'Очень низкий уровень: ТП саботирует применение умения'
    }
  },
  presentation_demo: {
    title: 'Демонстрация предложения',
    description: 'ТП умеет презентовать продукт или услугу, подчеркивая выгоды для клиента.',
    levels: {
      5: 'Очень высокий уровень: ТП самостоятельно и безошибочно демонстрирует умение',
      4: 'Высокий уровень: ТП самостоятельно и с небольшим количеством ошибок демонстрирует умение',
      3: 'Средний уровень: ТП с помощью тренера и с небольшим количеством ошибок демонстрирует умение',
      2: 'Низкий уровень: ТП с помощью тренера и с большим количеством ошибок демонстрирует умение',
      1: 'Очень низкий уровень: ТП саботирует применение умения'
    }
  },
  objection_handling: {
    title: 'Работа с возражениями',
    description: 'ТП умеет работать с возражениями клиента, превращая их в возможности для продажи.',
    levels: {
      5: 'Очень высокий уровень: ТП самостоятельно и безошибочно демонстрирует умение',
      4: 'Высокий уровень: ТП самостоятельно и с небольшим количеством ошибок демонстрирует умение',
      3: 'Средний уровень: ТП с помощью тренера и с небольшим количеством ошибок демонстрирует умение',
      2: 'Низкий уровень: ТП с помощью тренера и с большим количеством ошибок демонстрирует умение',
      1: 'Очень низкий уровень: ТП саботирует применение умения'
    }
  },
  new_client_connection: {
    title: 'Подключение клиента',
    description: 'ТП умеет завершать сделку, получать согласие клиента и планировать следующие шаги.',
    levels: {
      5: 'Очень высокий уровень: ТП самостоятельно и безошибочно демонстрирует умение',
      4: 'Высокий уровень: ТП самостоятельно и с небольшим количеством ошибок демонстрирует умение',
      3: 'Средний уровень: ТП с помощью тренера и с небольшим количеством ошибок демонстрирует умение',
      2: 'Низкий уровень: ТП с помощью тренера и с большим количеством ошибок демонстрирует умение',
      1: 'Очень низкий уровень: ТП саботирует применение умения'
    }
  }
} as const;

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
  const [flashRow, setFlashRow] = useState<string | null>(null);
  const [openInfo, setOpenInfo] = useState<string | null>(null);

  // пагинация для больших групп (мобилкам легче)
  const pageSize = 15;
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
      let evaluationsData = null;
      try {
        console.log('📥 Загружаем оценки для мероприятия:', eventId, 'оценщик:', userProfile?.id);
        
        const { data, error } = await supabase
          .from('tp_evaluations')
          .select('*')
          .eq('event_id', eventId)
          .eq('evaluator_id', userProfile?.id);
        
        if (error) {
          console.warn('❌ Ошибка загрузки оценок:', error);
        } else {
          console.log('✅ Загружено оценок:', data?.length || 0, data);
          evaluationsData = data;
        }
      } catch (err) {
        console.warn('❌ Исключение при загрузке оценок:', err);
      }

      const map = new Map<string, TPEvaluation>();
      evaluationsData?.forEach((e: any) => {
        console.log('🔄 Обрабатываем оценку:', e);
        map.set(e.participant_id, {
          participant_id: e.participant_id,
          leadership_potential: e.leadership_potential || 'high',
          business_communication: e.business_communication || 'high',
          learning_ability: e.learning_ability || 'high',
          motivation_level: e.motivation_level || 'high',
          goal_setting: e.goal_setting || 1,
          client_contact: e.client_contact || 1,
          needs_identification: e.needs_identification || 1,
          presentation_demo: e.presentation_demo || 1,
          objection_handling: e.objection_handling || 1,
          new_client_connection: e.new_client_connection || 1,
          average_skills_score: e.average_skills_score || 1,
        });
      });

      console.log('📊 Создана карта оценок:', map);
      setEvaluations(map);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const getOrCreateEval = useCallback(
    (participantId: string): TPEvaluation => {
      const current =
        evaluations.get(participantId) ||
        ({
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
        new_client_connection: 1,
          average_skills_score: 1,
        } as TPEvaluation);
      if (!evaluations.has(participantId)) {
        setEvaluations(prev => new Map(prev.set(participantId, current)));
      }
      return current;
    },
    [evaluations]
  );

  const update = async (participantId: string, updates: Partial<TPEvaluation>) => {
    try {
      setSaving(true);

      const current = getOrCreateEval(participantId);
      const updated = { ...current, ...updates };
      
      // Вычисляем среднюю оценку навыков продаж
      const skillsScores = [
        updated.goal_setting,
        updated.client_contact,
        updated.needs_identification,
        updated.presentation_demo,
        updated.objection_handling,
        updated.new_client_connection
      ];
      updated.average_skills_score = skillsScores.reduce((sum, score) => sum + score, 0) / skillsScores.length;

      // мгновенное обновление UI
      setEvaluations(prev => new Map(prev.set(participantId, updated)));
      setFlashRow(participantId);
      setTimeout(() => setFlashRow(null), 500);

      // Проверяем права доступа
      if (!userProfile?.id) {
        console.error('❌ Пользователь не авторизован');
        return;
      }

      if (!['administrator', 'moderator', 'trainer', 'expert'].includes(userProfile?.role || '')) {
        console.error('❌ Недостаточно прав для сохранения оценок. Роль:', userProfile?.role);
        return;
      }

      // попытка сохранить
      try {
        const dataToSave = {
            event_id: eventId,
            evaluator_id: userProfile?.id,
            ...updated,
            updated_at: new Date().toISOString()
        };
        
        console.log('💾 Сохраняем оценку в БД:', {
          event_id: eventId,
          participant_id: participantId,
          evaluator_id: userProfile?.id,
          user_role: userProfile?.role,
          data: dataToSave
        });

        // Сначала пробуем upsert
        let { data, error } = await supabase
          .from('tp_evaluations')
          .upsert(dataToSave, {
            onConflict: 'event_id,participant_id,evaluator_id'
          })
          .select();

        // Если upsert не работает, пробуем insert с обработкой дубликатов
        if (error && error.code === '42P10') {
          console.log('🔄 Upsert не поддерживается, пробуем insert...');
          
          const { data: insertData, error: insertError } = await supabase
            .from('tp_evaluations')
            .insert(dataToSave)
            .select();
            
          if (insertError) {
            if (insertError.code === '23505') {
              // Дубликат - пробуем обновить существующую запись
              console.log('🔄 Запись уже существует, обновляем...');
              
              const { data: updateData, error: updateError } = await supabase
                .from('tp_evaluations')
                .update(dataToSave)
                .eq('event_id', eventId)
                .eq('participant_id', participantId)
                .eq('evaluator_id', userProfile?.id)
                .select();
                
              if (updateError) {
                console.error('❌ Ошибка обновления записи:', updateError);
                error = updateError;
              } else {
                console.log('✅ Успешно обновлено в БД:', updateData);
                data = updateData;
                error = null;
              }
            } else {
              console.error('❌ Ошибка вставки записи:', insertError);
              error = insertError;
            }
          } else {
            console.log('✅ Успешно вставлено в БД:', insertData);
            data = insertData;
            error = null;
          }
        }

        if (error) {
          console.error('❌ Ошибка сохранения в базу данных:', error);
          console.error('📋 Детали ошибки:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
        } else {
          console.log('✅ Успешно сохранено в БД:', data);
        }
      } catch (e) {
        console.warn('Ошибка сохранения (таблица может не существовать):', e);
      }
    } catch (err) {
      console.error('Ошибка обновления оценки:', err);
      alert('Не удалось обновить оценку');
    } finally {
      setSaving(false);
    }
  };

  /* ========================== Скелетоны/ошибки ========================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
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
            className="px-4 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-800"
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Назад"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Оценка ТП</h1>
                <p className="text-sm text-gray-600">Личностные качества и навыки продаж</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-sm text-gray-500">{participants.length} участника(ов)</span>
              <SaveChip saving={saving} />
            </div>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {participants.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет участников</h3>
            <p className="text-gray-600">Участники мероприятия не найдены</p>
          </div>
        ) : (
          <>
            {/* ======= Блок 1: Личностные качества (адаптив) ======= */}
            <section aria-labelledby="personal-title">
              <div className="mb-4">
                <h3 id="personal-title" className="text-lg font-semibold text-emerald-700 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-700" />
                  Личностные качества и мотивация
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Лидерство, коммуникация, обучаемость, мотивация
                </p>
              </div>

              {/* Мобильные карточки */}
              <div className="grid gap-4 md:hidden">
                {pagedParticipants.map(p => {
                  const e = evaluations.get(p.id) || getOrCreateEval(p.id);
                  const isFlash = flashRow === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${isFlash ? 'ring-2 ring-emerald-300' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-semibold text-slate-900">{p.full_name}</div>
                          <div className="text-xs text-slate-500">
                            {p.territory_name || '—'} {p.territory_region ? `· ${p.territory_region}` : ''}
                          </div>
                        </div>
                        <button
                          className="p-2 rounded-lg hover:bg-slate-50"
                          onClick={() => setOpenInfo('personal')}
                          aria-label="Описание критериев"
                        >
                          <Info className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(
                          [
                            ['leadership_potential', 'Лидерство'],
                            ['business_communication', 'Коммуникация'],
                            ['learning_ability', 'Обучаемость'],
                            ['motivation_level', 'Мотивация'],
                          ] as const
                        ).map(([key, label]) => (
                          <div key={key}>
                            <div className="text-sm text-slate-600 mb-1 whitespace-nowrap">{label}</div>
                            <Segmented3
                              value={(e as any)[key]}
                              onChange={(v: Level) => update(p.id, { [key]: v } as any)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Десктоп-таблица */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="min-w-[900px] overflow-hidden">
                  <table className="w-full text-sm table-fixed">
                    <thead className="bg-emerald-600 text-white">
                      <tr>
                        <th className="sticky left-0 z-10 text-left py-3 px-4 font-semibold bg-emerald-600 w-40">
                          Участник
                        </th>
                        {Object.values(evaluationCriteria).map(c => (
                          <th key={c.title} className="text-center py-3 px-2 font-semibold w-32">
                            <div className="inline-flex items-center gap-1">
                              <span className="whitespace-nowrap text-xs">{c.title}</span>
                              <button
                                onClick={() => setOpenInfo(c.title)}
                                className="p-1 rounded hover:bg-white/15 flex-shrink-0"
                                aria-label={`Подробнее: ${c.title}`}
                              >
                                <Info className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedParticipants.map((p, i) => {
                        const e = evaluations.get(p.id) || getOrCreateEval(p.id);
                        const isFlash = flashRow === p.id;
                        return (
                          <tr
                            key={p.id}
                            className={`${i % 2 ? 'bg-white' : 'bg-slate-50/60'} transition-colors`}
                          >
                            <td
                              className={`sticky left-0 z-10 bg-inherit border-r border-slate-200 py-2 px-4 w-40 ${
                                isFlash ? 'ring-2 ring-emerald-300' : ''
                              }`}
                            >
                              <div className="font-medium text-slate-900 text-sm truncate">{p.full_name}</div>
                              <div className="text-xs text-slate-500 truncate">
                                {p.territory_name || '—'}
                                {p.territory_region && ` · ${p.territory_region}`}
                              </div>
                            </td>
                            {(
                              [
                                ['leadership_potential'],
                                ['business_communication'],
                                ['learning_ability'],
                                ['motivation_level'],
                              ] as const
                            ).map(([key]) => (
                              <td key={key} className="py-2 px-2 text-center w-32">
                                <div className="w-full">
                                  <Segmented3
                                    value={(e as any)[key]}
                                    onChange={(v: Level) => update(p.id, { [key]: v } as any)}
                                  />
                                </div>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* ======= Пагинация между блоками (общая для страницы) ======= */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Назад
                </button>
                <div className="text-sm text-slate-600">
                  Страница <span className="font-semibold">{page}</span> из {totalPages}
                </div>
                <button
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Вперед
                </button>
              </div>
            )}

            {/* ======= Блок 2: Навыки продаж (адаптив) ======= */}
            <section aria-labelledby="sales-title">
              <div className="mb-4">
                <h3 id="sales-title" className="text-lg font-semibold text-emerald-700 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-700" />
                  Навыки продаж
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Ставка целей, контакт, потребности, презентация, возражения, подключение
                </p>
              </div>

              {/* Мобильные карточки */}
              <div className="grid gap-4 md:hidden">
                {pagedParticipants.map(p => {
                  const e = evaluations.get(p.id) || getOrCreateEval(p.id);
                  const avg = e.average_skills_score;
                  const isFlash = flashRow === p.id;

                  return (
                    <div
                      key={p.id}
                      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${isFlash ? 'ring-2 ring-emerald-300' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-semibold text-slate-900">{p.full_name}</div>
                          <div className="text-xs text-slate-500">
                            {p.territory_name || '—'} {p.territory_region ? `· ${p.territory_region}` : ''}
                          </div>
                        </div>
                        <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs font-semibold">
                          Средняя {avg.toFixed(1)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {(
                          [
                            ['goal_setting', salesCriteria.goal_setting.title],
                            ['client_contact', salesCriteria.client_contact.title],
                            ['needs_identification', salesCriteria.needs_identification.title],
                            ['presentation_demo', salesCriteria.presentation_demo.title],
                            ['objection_handling', salesCriteria.objection_handling.title],
                            ['new_client_connection', salesCriteria.new_client_connection.title],
                          ] as const
                        ).map(([key, title]) => (
                          <div key={key} className="col-span-2 sm:col-span-1">
                            <div className="text-sm text-slate-600 mb-1 whitespace-nowrap">{title}</div>
                            <NumberScale 
                              value={(e as any)[key]} 
                              onChange={(v: number) => update(p.id, { [key]: v } as any)} 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Десктоп-таблица */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="min-w-[1000px] overflow-hidden">
                  <table className="w-full text-sm table-fixed">
                    <thead className="bg-emerald-600 text-white">
                      <tr>
                        <th className="sticky left-0 z-10 text-left py-3 px-4 font-semibold bg-emerald-600 w-48">Участник</th>
                        {Object.values(salesCriteria).map(c => (
                          <th key={c.title} className="text-center py-3 px-1 font-semibold w-20">
                            <div className="inline-flex items-center gap-1">
                              <span className="whitespace-nowrap text-xs truncate">{c.title}</span>
                              <button
                                onClick={() => setOpenInfo(c.title)}
                                className="p-1 rounded hover:bg-white/15 flex-shrink-0"
                                aria-label={`Подробнее: ${c.title}`}
                              >
                                <Info className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          </th>
                        ))}
                        <th className="text-center py-3 px-2 font-semibold w-20">Средняя</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedParticipants.map((p, i) => {
                        const e = evaluations.get(p.id) || getOrCreateEval(p.id);
                        const avg = e.average_skills_score;
                        const isFlash = flashRow === p.id;

                        return (
                          <tr key={p.id} className={`${i % 2 ? 'bg-white' : 'bg-slate-50/60'}`}>
                            <td
                              className={`sticky left-0 z-10 bg-inherit border-r border-slate-200 py-2 px-4 ${
                                isFlash ? 'ring-2 ring-emerald-300' : ''
                              }`}
                            >
                              <div className="font-medium text-slate-900 text-sm truncate">{p.full_name}</div>
                              <div className="text-xs text-slate-500 truncate">
                                {p.territory_name || '—'}
                                {p.territory_region && ` · ${p.territory_region}`}
                              </div>
                            </td>

                            {(
                              [
                                ['goal_setting'],
                                ['client_contact'],
                                ['needs_identification'],
                                ['presentation_demo'],
                                ['objection_handling'],
                                ['new_client_connection'],
                              ] as const
                            ).map(([key]) => (
                              <td key={key} className="py-2 px-1 text-center">
                                <div className="w-full flex justify-center">
                                  <NumberScale value={(e as any)[key]} onChange={(v: number) => update(p.id, { [key]: v } as any)} />
                                </div>
                            </td>
                            ))}

                            <td className="py-2 px-2 text-center">
                              <div className="inline-flex items-center justify-center w-10 h-7 bg-emerald-600 text-white text-xs font-semibold rounded-full">
                                {avg.toFixed(1)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Повторная пагинация внизу для удобства */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Назад
                </button>
                <div className="text-sm text-slate-600">
                  Страница <span className="font-semibold">{page}</span> из {totalPages}
                </div>
                <button
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
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

      {/* Модалки с описанием критериев */}
      {openInfo && (
        <InfoModal title={openInfo} onClose={() => setOpenInfo(null)} />
      )}
    </div>
  );
}

/* ========================== Вспомогательная модалка ========================== */

function InfoModal({ title, onClose }: { title: string; onClose: () => void }) {
  // Ищем в личностных качествах
  let entry: any = Object.values(evaluationCriteria).find(c => c.title === title);
  let isPersonal = true;
  
  // Если не найдено, ищем в навыках продаж
  if (!entry) {
    entry = Object.values(salesCriteria).find(c => c.title === title);
    isPersonal = false;
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">{entry?.title || title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        {entry ? (
          <div className="space-y-4 text-sm text-slate-700">
            <div>
              <div className="font-medium mb-1">Описание</div>
              <div className="text-slate-600">{entry.description}</div>
            </div>
            {isPersonal && 'levels' in entry ? (
              <div>
                <div className="font-medium mb-1">Уровни</div>
                <ul className="space-y-2 text-slate-600">
                  <li className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-600 mt-1 flex-shrink-0"></div>
                    <div><b>Высокий:</b> {entry.levels.high}</div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500 mt-1 flex-shrink-0"></div>
                    <div><b>Средний:</b> {entry.levels.medium}</div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500 mt-1 flex-shrink-0"></div>
                    <div><b>Низкий:</b> {entry.levels.low}</div>
                  </li>
                </ul>
              </div>
            ) : !isPersonal && 'levels' in entry ? (
              <div>
                <div className="font-medium mb-1">Уровни оценки</div>
                <div className="space-y-2">
                  {Object.entries(entry.levels).map(([level, description]) => {
                    const getColor = (level: string) => {
                      if (level.toLowerCase().includes('высокий') || level.toLowerCase().includes('high')) return 'bg-emerald-600';
                      if (level.toLowerCase().includes('средний') || level.toLowerCase().includes('medium')) return 'bg-amber-500';
                      if (level.toLowerCase().includes('низкий') || level.toLowerCase().includes('low')) return 'bg-rose-500';
                      return 'bg-slate-400';
                    };
                    return (
                      <div key={level} className="p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 rounded-full ${getColor(level)} flex-shrink-0`}></div>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                            {level}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{String(description)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-slate-600 text-sm">
            Подробности по критерию будут доступны позже.
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}