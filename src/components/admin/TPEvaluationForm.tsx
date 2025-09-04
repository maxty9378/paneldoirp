import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Users, Star, TrendingUp, MessageSquare, Award, CheckCircle, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface TPEvaluationFormProps {
  eventId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Participant {
  id: string;
  full_name: string;
  territory_name?: string;
  territory_region?: string;
}

interface TPEvaluation {
  participant_id: string;
  leadership_potential: 'high' | 'medium' | 'low';
  business_communication: 'high' | 'medium' | 'low';
  learning_ability: 'high' | 'medium' | 'low';
  motivation_level: 'high' | 'medium' | 'low';
  goal_setting: number; // 1-5
  client_contact: number; // 1-5
  needs_identification: number; // 1-5
  presentation_demo: number; // 1-5
  objection_handling: number; // 1-5
  new_client_connection: number; // 1-5
  average_skills_score: number; // автоматически вычисляется
  notes?: string;
}

const evaluationCriteria = {
  leadership_potential: {
    title: 'Лидерский потенциал ТП',
    description: 'занимает в тренинге активную позицию, помогает вовлекать в обучение других ТП личным примером; помогает другим ТП лучше справляться с заданиями; активно делится своим успешным опытом с группой.',
    levels: {
      high: 'Высокий - проявляется в большинстве ситуаций в тренинге, приводит к высокому результату',
      medium: 'Средний - проявляется примерно в 50% ситуаций в тренинге, приводит к приемлемому результату',
      low: 'Низкий - проявляется менее, чем в 50% ситуаций в тренинге или не приводит к приемлемому результату'
    }
  },
  business_communication: {
    title: 'Деловая коммуникация у ТП',
    description: 'речь ТП логична и понятна другому человеку; умеет внимательно слушать другого человека и вести конструктивный диалог; высказывания ТП достоверные и убедительные; в речи отсутствуют слова "паразиты" и уменьшительно-ласкательные слова.',
    levels: {
      high: 'Высокий - проявляется в большинстве ситуаций в тренинге, приводит к высокому результату',
      medium: 'Средний - проявляется примерно в 50% ситуаций в тренинге, приводит к приемлемому результату',
      low: 'Низкий - проявляется менее, чем в 50% ситуаций в тренинге или не приводит к приемлемому результату'
    }
  },
  learning_ability: {
    title: 'Уровень обучаемости у ТП',
    description: 'умеет переносить полученные знания и умения в новую ситуацию или для решения текущих задач; находит оригинальные подходы к решению предложенных ему проблемных ситуаций; отказывается от неэффективной модели поведения и самостоятельно формирует новую эффективную модель поведения.',
    levels: {
      high: 'Высокий - проявляется в большинстве ситуаций в тренинге, приводит к высокому результату',
      medium: 'Средний - проявляется примерно в 50% ситуаций в тренинге, приводит к приемлемому результату',
      low: 'Низкий - проявляется менее, чем в 50% ситуаций в тренинге или не приводит к приемлемому результату'
    }
  },
  motivation_level: {
    title: 'Уровень мотивации ТП на выполнение задач СПП',
    description: 'лично заинтересован в получении новых знаний и умений для применения их на практике; количество жалоб на условия работы минимально или отсутствуют.',
    levels: {
      high: 'Высокий - проявляется в большинстве ситуаций в тренинге, приводит к высокому результату',
      medium: 'Средний - проявляется примерно в 50% ситуаций в тренинге, приводит к приемлемому результату',
      low: 'Низкий - проявляется менее, чем в 50% ситуаций в тренинге или не приводит к приемлемому результату'
    }
  }
};

const salesSkills = {
  goal_setting: 'Умеет ставить цели на визит (по SMART)',
  client_contact: 'Умеет устан. деловой контакт с клиентом',
  needs_identification: 'Умеет выявл. потребности клиента',
  presentation_demo: 'Умеет проводить демонстр. торг. предл.',
  objection_handling: 'Умеет эффективно нейтр. возражения клиента',
  new_client_connection: 'Навык подключения нового клиента'
};

const skillLevels = {
  5: 'очень высокий уровень: ТП самостоятельно и безошибочно демонстрирует умение',
  4: 'высокий уровень: ТП самостоятельно и с небольшим количеством ошибок демонстрирует умение',
  3: 'средний уровень: ТП с помощью тренера и с небольшим количеством ошибок демонстрирует умение',
  2: 'низкий уровень: ТП с помощью тренера и с большим количеством ошибок демонстрирует умение',
  1: 'очень низкий уровень: ТП саботирует применение умения'
};

export function TPEvaluationForm({ eventId, onClose, onSuccess }: TPEvaluationFormProps) {
  const { userProfile } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [evaluations, setEvaluations] = useState<Map<string, TPEvaluation>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());
  const [showTooltip, setShowTooltip] = useState<{criterion: string, level: string} | null>(null);

  useEffect(() => {
    fetchParticipants();
  }, [eventId]);

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('event_participants_view')
        .select('user_id, full_name, territory_name, territory_region')
        .eq('event_id', eventId);

      if (error) throw error;

      const participantsData = data.map(p => ({
        id: p.user_id,
        full_name: p.full_name,
        territory_name: p.territory_name,
        territory_region: p.territory_region
      }));

      setParticipants(participantsData);

      // Инициализируем оценки для каждого участника
      const initialEvaluations = new Map<string, TPEvaluation>();
      participantsData.forEach(participant => {
        initialEvaluations.set(participant.id, {
          participant_id: participant.id,
          leadership_potential: 'medium',
          business_communication: 'medium',
          learning_ability: 'medium',
          motivation_level: 'medium',
          goal_setting: 3,
          client_contact: 3,
          needs_identification: 3,
          presentation_demo: 3,
          objection_handling: 3,
          new_client_connection: 3,
          average_skills_score: 3
        });
      });
      setEvaluations(initialEvaluations);
    } catch (err) {
      console.error('Error fetching participants:', err);
      setError('Не удалось загрузить список участников');
    } finally {
      setLoading(false);
    }
  };

  const updateEvaluation = (participantId: string, field: keyof TPEvaluation, value: any) => {
    setEvaluations(prev => {
      const newEvaluations = new Map(prev);
      const evaluation = newEvaluations.get(participantId);
      if (evaluation) {
        const updatedEvaluation = { ...evaluation, [field]: value };
        
        // Пересчитываем среднюю оценку навыков продаж
        if (field.startsWith('goal_setting') || field.startsWith('client_contact') || 
            field.startsWith('needs_identification') || field.startsWith('presentation_demo') ||
            field.startsWith('objection_handling') || field.startsWith('new_client_connection')) {
          const skillsScores = [
            updatedEvaluation.goal_setting,
            updatedEvaluation.client_contact,
            updatedEvaluation.needs_identification,
            updatedEvaluation.presentation_demo,
            updatedEvaluation.objection_handling,
            updatedEvaluation.new_client_connection
          ];
          updatedEvaluation.average_skills_score = skillsScores.reduce((sum, score) => sum + score, 0) / skillsScores.length;
        }
        
        newEvaluations.set(participantId, updatedEvaluation);
      }
      return newEvaluations;
    });
  };

  const getScoreColor = (score: number) => {
    if (score > 4.0) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 3.0) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreLabel = (score: number) => {
    if (score > 4.0) return 'Высокий уровень';
    if (score >= 3.0) return 'Средний уровень';
    return 'Низкий уровень';
  };

  const toggleCriteriaExpansion = (criterion: string) => {
    const newExpanded = new Set(expandedCriteria);
    if (newExpanded.has(criterion)) {
      newExpanded.delete(criterion);
    } else {
      newExpanded.add(criterion);
    }
    setExpandedCriteria(newExpanded);
  };

  const showLevelTooltip = (criterion: string, level: string) => {
    setShowTooltip({ criterion, level });
  };

  const hideTooltip = () => {
    setShowTooltip(null);
  };

  // Компонент для компактного отображения критерия
  const CompactCriterionCard = ({ 
    criterionKey, 
    criterion, 
    participantId, 
    evaluation 
  }: { 
    criterionKey: string; 
    criterion: any; 
    participantId: string; 
    evaluation: TPEvaluation; 
  }) => {
    const isExpanded = expandedCriteria.has(`${participantId}_${criterionKey}`);
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <h5 className="font-medium text-gray-900 text-sm">{criterion.title}</h5>
          <button
            onClick={() => toggleCriteriaExpansion(`${participantId}_${criterionKey}`)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <Info className="w-3 h-3" />
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
        
        {isExpanded && (
          <p className="text-xs text-gray-600 mb-3">{criterion.description}</p>
        )}
        
        <div className="space-y-1">
          {Object.entries(criterion.levels).map(([level, description]) => (
            <label key={level} className="flex items-start gap-2 cursor-pointer text-xs">
              <input
                type="radio"
                name={`${participantId}_${criterionKey}`}
                value={level}
                checked={evaluation[criterionKey as keyof TPEvaluation] === level}
                onChange={(e) => updateEvaluation(participantId, criterionKey as keyof TPEvaluation, e.target.value)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <span className="font-medium capitalize">
                  {level === 'high' ? 'Высокий' : level === 'medium' ? 'Средний' : 'Низкий'}
                </span>
                <button
                  onClick={() => showLevelTooltip(criterionKey, level)}
                  className="ml-1 text-blue-500 hover:text-blue-700"
                  title="Подробное описание"
                >
                  <Info className="w-3 h-3 inline" />
                </button>
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  };

  // Компонент для компактного отображения навыка продаж
  const CompactSkillCard = ({ 
    skillKey, 
    skillTitle, 
    participantId, 
    evaluation 
  }: { 
    skillKey: string; 
    skillTitle: string; 
    participantId: string; 
    evaluation: TPEvaluation; 
  }) => {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <h5 className="font-medium text-gray-900 text-sm mb-2">{skillTitle}</h5>
        
        <div className="space-y-1">
          {Object.entries(skillLevels).map(([score, description]) => (
            <label key={score} className="flex items-start gap-2 cursor-pointer text-xs">
              <input
                type="radio"
                name={`${participantId}_${skillKey}`}
                value={score}
                checked={evaluation[skillKey as keyof TPEvaluation] === parseInt(score)}
                onChange={(e) => updateEvaluation(participantId, skillKey as keyof TPEvaluation, parseInt(e.target.value))}
                className="mt-0.5"
              />
              <div className="flex-1">
                <span className="font-medium">{score} - {description}</span>
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const evaluationsArray = Array.from(evaluations.values());
      
      // Сохраняем оценки в базу данных
      const { error } = await supabase
        .from('tp_evaluations')
        .upsert(
          evaluationsArray.map(evaluation => ({
            event_id: eventId,
            participant_id: evaluation.participant_id,
            evaluator_id: userProfile?.id,
            leadership_potential: evaluation.leadership_potential,
            business_communication: evaluation.business_communication,
            learning_ability: evaluation.learning_ability,
            motivation_level: evaluation.motivation_level,
            goal_setting: evaluation.goal_setting,
            client_contact: evaluation.client_contact,
            needs_identification: evaluation.needs_identification,
            presentation_demo: evaluation.presentation_demo,
            objection_handling: evaluation.objection_handling,
            new_client_connection: evaluation.new_client_connection,
            average_skills_score: evaluation.average_skills_score,
            notes: evaluation.notes,
            evaluated_at: new Date().toISOString()
          })),
          { onConflict: 'event_id,participant_id' }
        );

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error saving evaluations:', err);
      setError('Не удалось сохранить оценки');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-sns-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-900">Загрузка участников...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Заголовок */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-sns-green to-green-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'SNS, sans-serif', textTransform: 'uppercase' }}>
                Оценка ТП
              </h2>
              <p className="text-green-100 mt-1">Онлайн тренинг предназначен для развития у новых ТП навыка продаж</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-green-200 transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Содержимое */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <p className="text-green-800">Оценки успешно сохранены!</p>
              </div>
            </div>
          )}

          <div className="space-y-8">
            {participants.map((participant) => {
              const evaluation = evaluations.get(participant.id);
              if (!evaluation) return null;

              return (
                <div key={participant.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  {/* Информация об участнике */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-sns-green rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{participant.full_name}</h3>
                        <div className="text-sm text-gray-600">
                          {participant.territory_name && <span>Филиал: {participant.territory_name}</span>}
                          {participant.territory_region && <span className="ml-2">Регион: {participant.territory_region}</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Личностные качества */}
                  <div className="mb-4">
                    <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-sns-green" />
                      Личностные качества и уровень мотивации ТП
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {Object.entries(evaluationCriteria).map(([key, criteria]) => (
                        <CompactCriterionCard
                          key={key}
                          criterionKey={key}
                          criterion={criteria}
                          participantId={participant.id}
                          evaluation={evaluation}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Навыки продаж */}
                  <div className="mb-4">
                    <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-sns-green" />
                      Оценка уровня развития навыков продаж у ТП
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(salesSkills).map(([key, title]) => (
                        <CompactSkillCard
                          key={key}
                          skillKey={key}
                          skillTitle={title}
                          participantId={participant.id}
                          evaluation={evaluation}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Средняя оценка */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-gray-900">Средняя оценка навыков продаж по ТП</h5>
                      <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getScoreColor(evaluation.average_skills_score)}`}>
                        {evaluation.average_skills_score.toFixed(1)} - {getScoreLabel(evaluation.average_skills_score)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Автоматическое цветовое выделение: 
                      <span className="text-green-600 font-medium"> Зелёным - оценка &gt;4,0</span>, 
                      <span className="text-yellow-600 font-medium"> Жёлтым - от 3,0 до 4,0</span>, 
                      <span className="text-red-600 font-medium"> Красным - &lt;3,0</span>
                    </p>
                  </div>

                  {/* Дополнительные комментарии */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Дополнительные комментарии
                    </label>
                    <textarea
                      value={evaluation.notes || ''}
                      onChange={(e) => updateEvaluation(participant.id, 'notes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
                      rows={3}
                      placeholder="Дополнительные замечания по участнику..."
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-sns-green text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Сохранение...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Сохранить оценки
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Всплывающая подсказка */}
      {showTooltip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {evaluationCriteria[showTooltip.criterion as keyof typeof evaluationCriteria]?.title}
              </h3>
              <button
                onClick={hideTooltip}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  {showTooltip.level === 'high' ? 'Высокий уровень' : 
                   showTooltip.level === 'medium' ? 'Средний уровень' : 'Низкий уровень'}
                </h4>
                <p className="text-sm text-gray-600">
                  {evaluationCriteria[showTooltip.criterion as keyof typeof evaluationCriteria]?.levels[showTooltip.level as keyof typeof evaluationCriteria.leadership_potential.levels]}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Описание критерия</h4>
                <p className="text-sm text-gray-600">
                  {evaluationCriteria[showTooltip.criterion as keyof typeof evaluationCriteria]?.description}
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={hideTooltip}
                className="px-4 py-2 bg-sns-green text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
