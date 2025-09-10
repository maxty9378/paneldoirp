import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCheck, BarChart3, Info } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

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
}

// Компонент для переключения между уровнями
function Toggle3({ value, onChange }: { value: Level; onChange: (v: Level) => void }) {
  const options: { value: Level; label: string; color: string }[] = [
    { value: 'high', label: 'Высокий', color: 'bg-green-100 text-green-800 border-green-200' },
    { value: 'medium', label: 'Средний', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { value: 'low', label: 'Низкий', color: 'bg-red-100 text-red-800 border-red-200' },
  ];

  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
            value === opt.value
              ? opt.color
              : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Компонент для числовых оценок
function NumberScale({ value, onChange, max = 5 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((num) => (
        <button
          key={num}
          onClick={() => onChange(num)}
          className={`w-6 h-6 text-xs rounded-full border transition-colors ${
            value === num
              ? 'bg-[#06A478] text-white border-[#06A478]'
              : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
          }`}
        >
          {num}
        </button>
      ))}
    </div>
  );
}

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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    personal: true,
    sales: true,
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

  const evaluationCriteria = {
    leadership_potential: {
      title: 'Лидерский потенциал',
      description: 'Способность влиять на других, принимать решения, брать на себя ответственность'
    },
    business_communication: {
      title: 'Уровень деловой коммуникации',
      description: 'Умение эффективно общаться с клиентами, коллегами и руководством'
    },
    learning_ability: {
      title: 'Уровень обучаемости',
      description: 'Способность быстро осваивать новые знания и навыки'
    },
    motivation_level: {
      title: 'Уровень мотивации ТП на выполнение задач СПП',
      description: 'Заинтересованность в выполнении поставленных задач и достижении целей'
    }
  };

  const salesCriteria = {
    goal_setting: {
      title: 'Цели на визит (SMART)',
      description: 'Умение ставить конкретные, измеримые, достижимые, релевантные и ограниченные по времени цели'
    },
    client_contact: {
      title: 'Деловой контакт',
      description: 'Способность устанавливать и поддерживать профессиональные отношения с клиентами'
    },
    needs_identification: {
      title: 'Выявление потребностей',
      description: 'Умение выявлять и анализировать потребности клиентов'
    },
    presentation_demo: {
      title: 'Демонстрация предложения',
      description: 'Способность эффективно презентовать продукт или услугу'
    },
    objection_handling: {
      title: 'Нейтрализация возражений',
      description: 'Умение работать с возражениями клиентов и находить решения'
    },
    new_client_connection: {
      title: 'Подключение нового клиента',
      description: 'Способность привлекать и подключать новых клиентов'
    }
  };

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Загружаем участников
      const { data: participantsData, error: participantsError } = await supabase
        .from('event_participants')
        .select(`
          id,
          user_id,
          users!inner(
            id,
            full_name,
            territory_name,
            territory_region
          )
        `)
        .eq('event_id', eventId)
        .eq('attended', true);

      if (participantsError) throw participantsError;

      const participantsList = participantsData?.map(p => ({
        id: p.user_id,
        full_name: p.users.full_name,
        territory_name: p.users.territory_name,
        territory_region: p.users.territory_region,
      })) || [];

      setParticipants(participantsList);

      // Загружаем существующие оценки (может не существовать)
      let evaluationsData = null;
      try {
        const { data, error } = await supabase
          .from('tp_evaluations')
          .select('*')
          .eq('event_id', eventId);
        
        if (error) {
          console.warn('Таблица tp_evaluations недоступна:', error);
        } else {
          evaluationsData = data;
        }
      } catch (err) {
        console.warn('Ошибка загрузки оценок (таблица может не существовать):', err);
      }

      const evaluationsMap = new Map<string, TPEvaluation>();
      evaluationsData?.forEach(evaluation => {
        evaluationsMap.set(evaluation.participant_id, {
          participant_id: evaluation.participant_id,
          leadership_potential: evaluation.leadership_potential || 'high',
          business_communication: evaluation.business_communication || 'high',
          learning_ability: evaluation.learning_ability || 'high',
          motivation_level: evaluation.motivation_level || 'high',
          goal_setting: evaluation.goal_setting || 1,
          client_contact: evaluation.client_contact || 1,
          needs_identification: evaluation.needs_identification || 1,
          presentation_demo: evaluation.presentation_demo || 1,
          objection_handling: evaluation.objection_handling || 1,
          new_client_connection: evaluation.new_client_connection || 1,
        });
      });

      setEvaluations(evaluationsMap);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const update = async (participantId: string, updates: Partial<TPEvaluation>) => {
    try {
      setSaving(true);
      
      const current = evaluations.get(participantId) || {
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
      };

      const updated = { ...current, ...updates };
      
      // Обновляем локальное состояние сразу
      setEvaluations(prev => new Map(prev.set(participantId, updated)));
      setFlashRow(participantId);
      setTimeout(() => setFlashRow(null), 1000);

      // Пытаемся сохранить в базу (может не работать)
      try {
        const { error } = await supabase
          .from('tp_evaluations')
          .upsert({
            event_id: eventId,
            participant_id: participantId,
            evaluator_id: userProfile?.id,
            ...updated,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.warn('Не удалось сохранить в базу данных:', error);
        }
      } catch (dbError) {
        console.warn('Ошибка сохранения в базу данных (таблица может не существовать):', dbError);
      }
    } catch (err) {
      console.error('Ошибка обновления оценки:', err);
      alert('Не удалось обновить оценку');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06A478] mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Ошибка загрузки</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Заголовок */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Оценка ТП</h1>
                <p className="text-sm text-gray-600">Оцените личностные качества и навыки продаж участников</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {participants.length} участников
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {participants.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет участников</h3>
            <p className="text-gray-600">Участники мероприятия не найдены</p>
          </div>
        ) : (
          <div className="space-y-10">
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
                        {Object.entries(salesCriteria).map(([key, c], index) => (
                          <th key={c.title} className={`text-center py-3 px-3 font-semibold text-white border-r border-white/20 ${
                            index === Object.entries(salesCriteria).length - 1 ? 'rounded-tr-xl' : ''
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
                        <th className="text-center py-3 px-3 font-semibold text-white rounded-tr-xl">
                          Средняя
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((p, i) => {
                        const e = evaluations.get(p.id)!;
                        const average = (e.goal_setting + e.client_contact + e.needs_identification + 
                                       e.presentation_demo + e.objection_handling + e.new_client_connection) / 6;
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

                            {/* шесть полей навыков продаж */}
                            <td className="py-2 px-3 text-center border-r border-slate-200">
                              <NumberScale
                                value={e.goal_setting}
                                onChange={(v) => update(p.id, { goal_setting: v })}
                              />
                            </td>
                            <td className="py-2 px-3 text-center border-r border-slate-200">
                              <NumberScale
                                value={e.client_contact}
                                onChange={(v) => update(p.id, { client_contact: v })}
                              />
                            </td>
                            <td className="py-2 px-3 text-center border-r border-slate-200">
                              <NumberScale
                                value={e.needs_identification}
                                onChange={(v) => update(p.id, { needs_identification: v })}
                              />
                            </td>
                            <td className="py-2 px-3 text-center border-r border-slate-200">
                              <NumberScale
                                value={e.presentation_demo}
                                onChange={(v) => update(p.id, { presentation_demo: v })}
                              />
                            </td>
                            <td className="py-2 px-3 text-center border-r border-slate-200">
                              <NumberScale
                                value={e.objection_handling}
                                onChange={(v) => update(p.id, { objection_handling: v })}
                              />
                            </td>
                            <td className="py-2 px-3 text-center border-r border-slate-200">
                              <NumberScale
                                value={e.new_client_connection}
                                onChange={(v) => update(p.id, { new_client_connection: v })}
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="inline-flex items-center justify-center w-8 h-6 bg-[#06A478] text-white text-xs font-medium rounded-full">
                                {average.toFixed(1)}
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
          </div>
        )}
      </div>
    </div>
  );
}