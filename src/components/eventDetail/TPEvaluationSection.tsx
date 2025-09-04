import { useEffect, useState } from 'react';
import {
  XCircle, Info, BarChart3, UserCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TPEvaluationSectionProps {
  eventId: string;
  userProfile: any;
}

interface Participant {
  id: string;
  full_name: string;
  territory_name?: string;
  territory_region?: string;
}

type Level = 'high' | 'medium' | 'low' | 'unselected';

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
  notes?: string;
}

const evaluationCriteria = {
  leadership_potential: {
    title: 'Лидерский потенциал',
    description: 'занимает в тренинге активную позицию, помогает вовлекать в обучение других ТП личным примером; помогает другим ТП лучше справляться с заданиями; активно делится своим успешным опытом с группой.',
    levels: {
      high: 'Высокий - проявляется в большинстве ситуаций в тренинге, приводит к высокому результату',
      medium: 'Средний - проявляется примерно в 50% ситуаций в тренинге, приводит к приемлемому результату',
      low: 'Низкий - проявляется менее, чем в 50% ситуаций в тренинге или не приводит к приемлемому результату',
    },
  },
  business_communication: {
    title: 'Уровень деловой коммуникации',
    description: 'речь ТП логична и понятна другому человеку; умеет внимательно слушать другого человека и вести конструктивный диалог; высказывания ТП достоверные и убедительные; в речи отсутствуют слова "паразиты" и уменьшительно-ласкательные слова.',
    levels: {
      high: 'Высокий - проявляется в большинстве ситуаций в тренинге, приводит к высокому результату',
      medium: 'Средний - проявляется примерно в 50% ситуаций в тренинге, приводит к приемлемому результату',
      low: 'Низкий - проявляется менее, чем в 50% ситуаций в тренинге или не приводит к приемлемому результату',
    },
  },
  learning_ability: {
    title: 'Уровень обучаемости',
    description: 'умеет переносить полученные знания и умения в новую ситуацию или для решения текущих задач; находит оригинальные подходы к решению предложенных ему проблемных ситуаций; отказывается от неэффективной модели поведения и самостоятельно формирует новую эффективную модель поведения.',
    levels: {
      high: 'Высокий - проявляется в большинстве ситуаций в тренинге, приводит к высокому результату',
      medium: 'Средний - проявляется примерно в 50% ситуаций в тренинге, приводит к приемлемому результату',
      low: 'Низкий - проявляется менее, чем в 50% ситуаций в тренинге или не приводит к приемлемому результату',
    },
  },
  motivation_level: {
    title: 'Уровень мотивации ТП\nна выполнение задач СПП',
    description: 'лично заинтересован в получении новых знаний и умений для применения их на практике; количество жалоб на условия работы минимально или отсутствуют.',
    levels: {
      high: 'Высокий - проявляется в большинстве ситуаций в тренинге, приводит к высокому результату',
      medium: 'Средний - проявляется примерно в 50% ситуаций в тренинге, приводит к приемлемому результату',
      low: 'Низкий - проявляется менее, чем в 50% ситуаций в тренинге или не приводит к приемлемому результату',
    },
  },
} as const;

const salesSkills = {
  goal_setting: 'Цели на визит (SMART)',
  client_contact: 'Деловой контакт',
  needs_identification: 'Выявление потребностей',
  presentation_demo: 'Демонстрация предложения',
  objection_handling: 'Нейтрализация возражений',
  new_client_connection: 'Подключение нового клиента',
} as const;

const salesSkillsDescriptions = {
  goal_setting: {
    title: 'Умеет ставить цели на визит (по SMART)',
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
    title: 'Умеет устанавливать деловой контакт с клиентом',
    description: 'ТП умеет устанавливать профессиональный деловой контакт с клиентом, создавая атмосферу доверия и взаимопонимания.',
    levels: {
      5: 'Очень высокий уровень: ТП самостоятельно и безошибочно демонстрирует умение',
      4: 'Высокий уровень: ТП самостоятельно и с небольшим количеством ошибок демонстрирует умение',
      3: 'Средний уровень: ТП с помощью тренера и с небольшим количеством ошибок демонстрирует умение',
      2: 'Низкий уровень: ТП с помощью тренера и с большим количеством ошибок демонстрирует умение',
      1: 'Очень низкий уровень: ТП саботирует применение умения'
    }
  },
  needs_identification: {
    title: 'Умеет выявлять потребности клиента',
    description: 'ТП умеет задавать правильные вопросы и выявлять реальные потребности клиента для предложения подходящего решения.',
    levels: {
      5: 'Очень высокий уровень: ТП самостоятельно и безошибочно демонстрирует умение',
      4: 'Высокий уровень: ТП самостоятельно и с небольшим количеством ошибок демонстрирует умение',
      3: 'Средний уровень: ТП с помощью тренера и с небольшим количеством ошибок демонстрирует умение',
      2: 'Низкий уровень: ТП с помощью тренера и с большим количеством ошибок демонстрирует умение',
      1: 'Очень низкий уровень: ТП саботирует применение умения'
    }
  },
  presentation_demo: {
    title: 'Умеет проводить демонстрацию торгового предложения',
    description: 'ТП умеет эффективно демонстрировать торговое предложение, подчеркивая его преимущества и соответствие потребностям клиента.',
    levels: {
      5: 'Очень высокий уровень: ТП самостоятельно и безошибочно демонстрирует умение',
      4: 'Высокий уровень: ТП самостоятельно и с небольшим количеством ошибок демонстрирует умение',
      3: 'Средний уровень: ТП с помощью тренера и с небольшим количеством ошибок демонстрирует умение',
      2: 'Низкий уровень: ТП с помощью тренера и с большим количеством ошибок демонстрирует умение',
      1: 'Очень низкий уровень: ТП саботирует применение умения'
    }
  },
  objection_handling: {
    title: 'Умеет эффективно нейтрализовать возражения клиента',
    description: 'ТП умеет выявлять, понимать и эффективно нейтрализовать возражения клиента, превращая их в возможности для продажи.',
    levels: {
      5: 'Очень высокий уровень: ТП самостоятельно и безошибочно демонстрирует умение',
      4: 'Высокий уровень: ТП самостоятельно и с небольшим количеством ошибок демонстрирует умение',
      3: 'Средний уровень: ТП с помощью тренера и с небольшим количеством ошибок демонстрирует умение',
      2: 'Низкий уровень: ТП с помощью тренера и с большим количеством ошибок демонстрирует умение',
      1: 'Очень низкий уровень: ТП саботирует применение умения'
    }
  },
  new_client_connection: {
    title: 'Навык подключения нового клиента',
    description: 'ТП умеет эффективно подключать новых клиентов, завершая продажу и устанавливая долгосрочные деловые отношения.',
    levels: {
      5: 'Очень высокий уровень: ТП самостоятельно и безошибочно демонстрирует навык',
      4: 'Высокий уровень: ТП самостоятельно и с небольшим количеством ошибок демонстрирует навык',
      3: 'Средний уровень: ТП с помощью тренера и с небольшим количеством ошибок демонстрирует навык',
      2: 'Низкий уровень: ТП с помощью тренера и с большим количеством ошибок демонстрирует навык',
      1: 'Очень низкий уровень: ТП саботирует применение навыка'
    }
  }
} as const;


function levelLabel(l: Level) {
  return l === 'high' ? 'Высокий' : l === 'medium' ? 'Средний' : l === 'low' ? 'Низкий' : 'Выбери';
}
function scoreBadge(score: number) {
  if (score > 4.0) return 'text-green-700 bg-green-50 border-green-200';
  if (score >= 3.0) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-rose-700 bg-rose-50 border-rose-200';
}

function Toggle3({ value, onChange }: { value: Level; onChange: (v: Level) => void }) {
  const cycleLevel = () => {
    const levels: Level[] = ['unselected', 'high', 'medium', 'low'];
    const currentIndex = levels.indexOf(value);
    const nextIndex = (currentIndex + 1) % levels.length;
    onChange(levels[nextIndex]);
  };

  const getButtonColor = (level: Level) => {
    switch (level) {
      case 'high': return 'bg-emerald-600 text-white';
      case 'medium': return 'bg-amber-500 text-white';
      case 'low': return 'bg-slate-600 text-white';
      case 'unselected': return 'bg-gray-200 text-gray-600 border border-gray-300';
    }
  };

  return (
    <button
      type="button"
      onClick={cycleLevel}
      className={`w-20 h-6 rounded text-xs font-medium transition hover:opacity-80 text-center ${getButtonColor(value)}`}
      title="Нажмите для переключения: Выбери → Высокий → Средний → Низкий"
    >
      {levelLabel(value)}
    </button>
  );
}
function Toggle5({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const getButtonColor = (score: number) => {
    switch (score) {
      case 5: return 'bg-emerald-600 text-white border-emerald-600';
      case 4: return 'bg-green-500 text-white border-green-500';
      case 3: return 'bg-amber-500 text-white border-amber-500';
      case 2: return 'bg-orange-500 text-white border-orange-500';
      case 1: return 'bg-red-500 text-white border-red-500';
      default: return 'bg-slate-200 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          className={`w-6 h-6 rounded text-xs font-medium border transition hover:brightness-110 focus:outline-none focus:ring-1 focus:ring-emerald-200 ${
            value === score 
              ? getButtonColor(score)
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
          title={`Оценка ${score}`}
        >
          {score}
        </button>
      ))}
    </div>
  );
}

export function TPEvaluationSection({ eventId, userProfile }: TPEvaluationSectionProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [evaluations, setEvaluations] = useState<Map<string, TPEvaluation>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    personal: true,
    popup_leadership_potential: false,
    popup_business_communication: false,
    popup_learning_ability: false,
    popup_motivation_level: false,
    popup_goal_setting: false,
    popup_client_contact: false,
    popup_needs_identification: false,
    popup_presentation_demo: false,
    popup_objection_handling: false,
    popup_new_client_connection: false,
  });
  const [flashRow, setFlashRow] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const isTrainer =
    userProfile?.role === 'trainer' ||
    userProfile?.role === 'administrator' ||
    userProfile?.role === 'moderator';
  if (!isTrainer) return null;

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from('event_participants_view')
          .select('user_id, full_name, territory_name, territory_region')
          .eq('event_id', eventId);

        if (error) throw error;

        const list: Participant[] = (data ?? []).map((p: any) => ({
          id: p.user_id,
          full_name: p.full_name,
          territory_name: p.territory_name,
          territory_region: p.territory_region,
        }));
        setParticipants(list);

        // Загружаем существующие оценки из базы данных
        const { data: existingEvaluations, error: evalError } = await supabase
          .from('tp_evaluations')
          .select('*')
          .eq('event_id', eventId);

        if (evalError) {
          console.error('Ошибка загрузки оценок:', evalError);
        }

        console.log('Загружены существующие оценки:', existingEvaluations);

        // Создаем карту оценок, объединяя существующие с дефолтными
        const init = new Map<string, TPEvaluation>();
        list.forEach((u) => {
          // Ищем существующую оценку для этого участника
          const existing = existingEvaluations?.find(e => e.participant_id === u.id);
          
          if (existing) {
            // Используем существующую оценку
            init.set(u.id, {
              participant_id: u.id,
              leadership_potential: existing.leadership_potential,
              business_communication: existing.business_communication,
              learning_ability: existing.learning_ability,
              motivation_level: existing.motivation_level,
              goal_setting: existing.goal_setting,
              client_contact: existing.client_contact,
              needs_identification: existing.needs_identification,
              presentation_demo: existing.presentation_demo,
              objection_handling: existing.objection_handling,
              new_client_connection: existing.new_client_connection,
              average_skills_score: existing.average_skills_score,
              notes: existing.notes || '',
            });
          } else {
            // Создаем новую оценку с дефолтными значениями
            init.set(u.id, {
              participant_id: u.id,
              leadership_potential: 'unselected',
              business_communication: 'unselected',
              learning_ability: 'unselected',
              motivation_level: 'unselected',
              goal_setting: 3,
              client_contact: 3,
              needs_identification: 3,
              presentation_demo: 3,
              objection_handling: 3,
              new_client_connection: 3,
              average_skills_score: 3,
              notes: '',
            });
          }
        });
        console.log('Инициализированы оценки для участников:', init);
        setEvaluations(init);
      } catch (e) {
        console.error(e);
        setError('Не удалось загрузить участников');
      } finally {
        setLoading(false);
      }
    };
    fetchParticipants();
  }, [eventId]);

  const recalcAvg = (e: TPEvaluation) => {
    const arr = [
      e.goal_setting,
      e.client_contact,
      e.needs_identification,
      e.presentation_demo,
      e.objection_handling,
      e.new_client_connection,
    ];
    return arr.reduce((s, v) => s + v, 0) / arr.length;
  };

  const update = (id: string, patch: Partial<TPEvaluation>) => {
    setEvaluations((prev) => {
      const next = new Map(prev);
      const cur = next.get(id);
      if (!cur) return prev;
      const merged = { ...cur, ...patch };
      merged.average_skills_score = recalcAvg(merged);
      next.set(id, merged);
      
      // Автосохранение
      console.log('Обновление оценки:', { id, patch, merged });
      saveEvaluation(merged);
      
      // Подсветка строки
      setFlashRow(id);
      setTimeout(() => setFlashRow(null), 500);
      
      return next;
    });
  };

  const saveEvaluation = async (evaluation: TPEvaluation) => {
    console.log('Начало сохранения оценки:', evaluation);
    
    if (!userProfile?.id) {
      console.error('Нет ID пользователя для сохранения оценки');
      return;
    }
    
    try {
      const row = {
        event_id: eventId,
        participant_id: evaluation.participant_id,
        evaluator_id: userProfile.id,
        leadership_potential: evaluation.leadership_potential === 'unselected' ? 'medium' : evaluation.leadership_potential,
        business_communication: evaluation.business_communication === 'unselected' ? 'medium' : evaluation.business_communication,
        learning_ability: evaluation.learning_ability === 'unselected' ? 'medium' : evaluation.learning_ability,
        motivation_level: evaluation.motivation_level === 'unselected' ? 'medium' : evaluation.motivation_level,
        goal_setting: evaluation.goal_setting,
        client_contact: evaluation.client_contact,
        needs_identification: evaluation.needs_identification,
        presentation_demo: evaluation.presentation_demo,
        objection_handling: evaluation.objection_handling,
        new_client_connection: evaluation.new_client_connection,
        average_skills_score: evaluation.average_skills_score,
        notes: evaluation.notes,
        evaluated_at: new Date().toISOString(),
      };
      
      console.log('Данные для сохранения в БД:', row);
      
      const { error } = await supabase
        .from('tp_evaluations')
        .upsert(row, { onConflict: 'event_id,participant_id,evaluator_id' });
        
      if (error) {
        console.error('Ошибка автосохранения:', error);
        console.error('Данные для сохранения:', row);
        setError(`Не удалось сохранить оценку: ${error.message || 'Неизвестная ошибка'}`);
             } else {
         console.log('✅ Оценка успешно сохранена');
         setSaved(true);
         setTimeout(() => setSaved(false), 1200);
       }
    } catch (e) {
      console.error('Ошибка автосохранения:', e);
      setError('Не удалось сохранить оценку');
    }
  };

  // Компонент тоста
  function Toast({ open, text }:{open:boolean; text:string}) {
    if (!open) return null;
    return (
      <div className="fixed bottom-4 right-4 bg-emerald-600 text-white text-sm px-3 py-2 rounded-lg shadow-lg">
        {text}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-1/3 bg-gray-200 rounded" />
          <div className="h-4 w-2/3 bg-gray-200 rounded" />
          <div className="h-4 w-1/2 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             {/* Заголовок секции в стиле блока Тестирование */}
       <div 
         className={`px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 cursor-pointer transition-colors duration-200 ${
           isExpanded ? 'bg-white' : 'bg-gray-50'
         }`}
         onClick={() => setIsExpanded(!isExpanded)}
       >
         <div className="flex items-center justify-between">
           <div>
             <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900">Оценка ТП</h3>
             <p className="text-xs sm:text-sm text-gray-400">
               Оцените личностные качества и навыки продаж участников. Выберите уровень для каждого критерия — изменения сохраняются автоматически.
             </p>
           </div>
           
           <div className="flex items-center gap-2 sm:gap-3">
             <span className="text-xs text-gray-400 hidden sm:inline">
               {isExpanded ? 'Скрыть оценку' : 'Раскрыть оценку'}
             </span>
             <button 
               className="!w-5 !h-5 sm:!w-8 sm:!h-8 rounded-full bg-gradient-to-r from-[#06A478] to-[#059669] hover:from-[#059669] hover:to-[#048A5A] flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
               onClick={(e) => {
                 e.stopPropagation();
                 setIsExpanded(!isExpanded);
               }}
             >
               <svg 
                 className={`!w-3 !h-3 sm:!w-4 sm:!h-4 text-white transition-transform duration-200 ${
                   isExpanded ? 'rotate-45' : 'rotate-0'
                 }`} 
                 fill="none" 
                 stroke="currentColor" 
                 viewBox="0 0 24 24"
               >
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
               </svg>
             </button>
           </div>
         </div>
       </div>

      {/* Содержимое секции */}
      {isExpanded && (
        <>
          {/* Панель состояния */}
          {error && (
            <div className="px-4 sm:px-6 pt-4">
              {error && (
                <div className="mb-3 px-3 py-2 rounded-lg border bg-rose-50 border-rose-200 text-rose-700 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
          )}

          <div className="p-4 sm:p-6 space-y-10">
        {/* ---------- БЛОК 1: Личностные качества и мотивация ---------- */}
        <section>
                     <div className="mb-4">
             <h3 className="text-lg font-medium text-[#06A478] flex items-center gap-2">
               <UserCheck className="w-5 h-5 text-[#06A478]" />
               Личностные качества и мотивация
             </h3>
             <p className="text-sm text-slate-500 mt-1">
               Оцените лидерство, коммуникацию, обучаемость и вовлечённость участников
             </p>
           </div>

          <div className="space-y-6">

              {/* Таблица по участникам */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                                     <thead>
                     <tr className="border-b-2 border-emerald-200" style={{ backgroundColor: '#06A478' }}>
                       <th className="sticky left-0 backdrop-blur
                                      shadow-[inset_-10px_0_8px_-10px_rgba(0,0,0,0.08)]
                                      text-left py-3 px-3 font-semibold text-white rounded-tl-xl" style={{ backgroundColor: '#06A478' }}>
                         Участник
                       </th>
                       {Object.entries(evaluationCriteria).map(([key, c], index) => (
                         <th key={c.title} className={`text-center py-3 px-3 font-semibold text-white border-r border-white/20 ${
                           index === Object.entries(evaluationCriteria).length - 1 ? 'rounded-tr-xl' : ''
                         }`}>
                           <div className="flex items-center justify-center gap-1">
                             <span className="whitespace-pre-line">{c.title}</span>
                             <button
                               onClick={() => setExpanded(prev => ({ ...prev, [`popup_${key}`]: !prev[`popup_${key}`] }))}
                               className="ml-1 p-1 rounded-full hover:bg-white/20 transition"
                               title="Подробное описание"
                             >
                               <Info className="w-4 h-4 text-white" />
                             </button>
                           </div>
                         </th>
                       ))}
                     </tr>
                   </thead>
                  <tbody>
                    {participants.map((p, i) => {
                      const e = evaluations.get(p.id)!;
                      return (
                        <tr key={p.id} className={[
                          i % 2 ? 'bg-white' : 'bg-slate-50/50',
                          flashRow === p.id ? 'animate-[pulse_0.5s_ease_1]' : ''
                        ].join(' ')}>
                          <td className="sticky left-0 bg-inherit border-r border-slate-200 
                                         shadow-[inset_-10px_0_8px_-10px_rgba(0,0,0,0.06)] py-2 px-3">
                            <div className="font-medium text-slate-900">{p.full_name}</div>
                            <div className="text-xs text-slate-500">
                              {p.territory_name || '—'}
                              {p.territory_region && ` · ${p.territory_region}`}
                            </div>
                          </td>

                                                     {/* четыре поля уровня */}
                           <td className="py-2 px-3 text-center border-r border-slate-200">
                             <Toggle3
                               value={e.leadership_potential}
                               onChange={(v) => update(p.id, { leadership_potential: v })}
                             />
                           </td>
                           <td className="py-2 px-3 text-center border-r border-slate-200">
                             <Toggle3
                               value={e.business_communication}
                               onChange={(v) => update(p.id, { business_communication: v })}
                             />
                           </td>
                           <td className="py-2 px-3 text-center border-r border-slate-200">
                             <Toggle3
                               value={e.learning_ability}
                               onChange={(v) => update(p.id, { learning_ability: v })}
                             />
                           </td>
                           <td className="py-2 px-3 text-center">
                             <Toggle3
                               value={e.motivation_level}
                               onChange={(v) => update(p.id, { motivation_level: v })}
                             />
                           </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
          </div>
        </section>

        {/* ---------- БЛОК 2: Навыки продаж ---------- */}
        <section>
                     <div className="mb-4">
             <h3 className="text-lg font-medium text-[#06A478] flex items-center gap-2">
               <BarChart3 className="w-5 h-5 text-[#06A478]" />
               Навыки продаж
             </h3>
             <p className="text-sm text-slate-500 mt-1">
               Ставка целей, контакт, выявление потребностей, презентация, работа с возражениями
             </p>
           </div>

          <div className="space-y-6">

              {/* Таблица навыков */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                                     <thead>
                     <tr className="border-b-2 border-emerald-200" style={{ backgroundColor: '#06A478' }}>
                       <th className="sticky left-0 backdrop-blur
                                      shadow-[inset_-10px_0_8px_-10px_rgba(0,0,0,0.08)]
                                      text-left py-3 px-3 font-semibold text-white w-56 rounded-tl-xl" style={{ backgroundColor: '#06A478' }}>
                         Участник
                       </th>
                       {(Object.keys(salesSkills) as Array<keyof typeof salesSkills>).map((k) => (
                         <th key={k} className="text-center py-3 px-3 font-semibold text-white border-r border-white/20">
                           <div className="flex items-center justify-center gap-1">
                             <span>{salesSkills[k]}</span>
                             <button
                               onClick={() => setExpanded(prev => ({ ...prev, [`popup_${k}`]: !prev[`popup_${k}`] }))}
                               className="ml-1 p-1 rounded-full hover:bg-white/20 transition"
                               title="Подробное описание"
                             >
                               <Info className="w-4 h-4 text-white" />
                             </button>
                           </div>
                         </th>
                       ))}
                       <th className="sticky right-0 backdrop-blur
                                      shadow-[inset_10px_0_8px_-10px_rgba(0,0,0,0.08)]
                                      text-center py-3 px-3 font-semibold text-white rounded-tr-xl" style={{ backgroundColor: '#06A478' }}>
                         Средняя
                       </th>
                     </tr>
                   </thead>
                  <tbody>
                    {participants.map((p, i) => {
                      const e = evaluations.get(p.id)!;
                      return (
                        <tr key={p.id} className={[
                          i % 2 ? 'bg-white' : 'bg-slate-50/50',
                          flashRow === p.id ? 'animate-[pulse_0.5s_ease_1]' : ''
                        ].join(' ')}>
                          <td className="sticky left-0 bg-inherit border-r border-slate-200 w-56
                                         shadow-[inset_-10px_0_8px_-10px_rgba(0,0,0,0.06)] py-2 px-3">
                            <div className="font-medium text-slate-900">{p.full_name}</div>
                            <div className="text-xs text-slate-500">
                              {p.territory_name || '—'}
                              {p.territory_region && ` · ${p.territory_region}`}
                            </div>
                          </td>

                          {(Object.keys(salesSkills) as Array<keyof typeof salesSkills>).map((k) => (
                            <td key={k} className="py-2 px-3 text-center border-r border-slate-200">
                              <Toggle5
                                value={e[k] as number}
                                onChange={(n) => update(p.id, { [k]: n } as Partial<TPEvaluation>)}
                              />
                            </td>
                          ))}

                          <td className="sticky right-0 bg-inherit border-l border-slate-200 
                                         shadow-[inset_10px_0_8px_-10px_rgba(0,0,0,0.06)] py-2 px-3 text-center">
                            <span className={`px-2 py-1 rounded border text-xs font-medium ${scoreBadge(e.average_skills_score)}`}>
                              {e.average_skills_score.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

          </div>
        </section>
      </div>

             {/* Липкая нижняя панель — воздух и шрифт */}
       <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-100 
                       px-5 py-3 flex items-center justify-between">
         <div className="text-xs text-slate-500">{participants.length} участников</div>
       </div>

       {/* Popup'ы с информацией о критериях */}
       {Object.entries(evaluationCriteria).map(([key, criteria]) => (
         expanded[`popup_${key}`] && (
           <div key={key} className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-semibold text-slate-900">
                   {criteria.title}
                 </h3>
                 <button
                   onClick={() => setExpanded(prev => ({ ...prev, [`popup_${key}`]: false }))}
                   className="text-slate-400 hover:text-slate-600 transition-colors"
                 >
                   <XCircle className="w-5 h-5" />
                 </button>
               </div>
               
               <div className="space-y-4">
                 <div>
                   <h4 className="font-medium text-slate-900 mb-2">Описание критерия</h4>
                   <p className="text-sm text-slate-600">
                     {criteria.description}
                   </p>
                 </div>
                 
                 <div>
                   <h4 className="font-medium text-slate-900 mb-2">Уровни оценки</h4>
                   <div className="space-y-2">
                     {Object.entries(criteria.levels).map(([level, description]) => (
                       <div key={level} className="p-2 bg-slate-50 rounded-lg">
                         <div className="flex items-center gap-2 mb-1">
                           <span className={`px-2 py-1 rounded text-xs font-medium ${
                             level === 'high' ? 'bg-emerald-100 text-emerald-700' :
                             level === 'medium' ? 'bg-amber-100 text-amber-700' :
                             'bg-slate-100 text-slate-700'
                           }`}>
                             {level === 'high' ? 'Высокий' : level === 'medium' ? 'Средний' : 'Низкий'}
                           </span>
                         </div>
                         <p className="text-xs text-slate-600">{description}</p>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
               
               <div className="mt-6 flex justify-end">
                 <button
                   onClick={() => setExpanded(prev => ({ ...prev, [`popup_${key}`]: false }))}
                   className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors"
                 >
                   Понятно
                 </button>
               </div>
             </div>
           </div>
         )
       ))}

       {/* Popup'ы с информацией о навыках продаж */}
       {Object.entries(salesSkillsDescriptions).map(([key, skill]) => (
         expanded[`popup_${key}`] && (
           <div key={key} className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-semibold text-slate-900">
                   {skill.title}
                 </h3>
                 <button
                   onClick={() => setExpanded(prev => ({ ...prev, [`popup_${key}`]: false }))}
                   className="text-slate-400 hover:text-slate-600 transition-colors"
                 >
                   <XCircle className="w-5 h-5" />
                 </button>
               </div>
               
               <div className="space-y-4">
                 <div>
                   <h4 className="font-medium text-slate-900 mb-2">Описание навыка</h4>
                   <p className="text-sm text-slate-600">
                     {skill.description}
                   </p>
                 </div>
                 
                 <div>
                   <h4 className="font-medium text-slate-900 mb-2">Уровни оценки</h4>
                   <div className="space-y-2">
                     {Object.entries(skill.levels).map(([level, description]) => (
                       <div key={level} className="flex items-start gap-2">
                         <span className="font-medium text-violet-600 min-w-[1.5rem]">{level}</span>
                         <span className="text-sm text-slate-600">{description}</span>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
               
               <div className="mt-6 flex justify-end">
                 <button
                   onClick={() => setExpanded(prev => ({ ...prev, [`popup_${key}`]: false }))}
                   className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors"
                 >
                   Понятно
                 </button>
               </div>
             </div>
           </div>
         )
                ))}
        
        {/* Тост сохранения */}
        <Toast open={saved} text="Сохранено" />
        </>
      )}
    </div>
  );
}
 
 export default TPEvaluationSection;
