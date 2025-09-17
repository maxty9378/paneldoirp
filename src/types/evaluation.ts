// Типы для системы оценки кейсов

export interface ExamCase {
  id: string;
  case_number: number;
  title: string;
  description: string | null;
  correct_answer: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParticipantAssignedCase {
  id: string;
  event_participant_id: string;
  exam_case_id: string;
  assigned_at: string;
  assigned_by: string | null;
  exam_case: ExamCase;
}

export interface CaseEvaluation {
  id: string;
  exam_event_id: string;
  reservist_id: string;
  evaluator_id: string;
  case_number: number;
  criteria_scores: {
    correctness: number;
    clarity: number;
    independence: number;
  };
  comments?: string | null;
  created_at: string;
  updated_at: string;
}

// Старая структура для обратной совместимости
export interface LegacyCaseEvaluation {
  id: string;
  participant_case_id: string;
  evaluator_id: string;
  
  // Оценки по критериям (1-5 баллов)
  correctness_score: number | null;
  clarity_score: number | null;
  independence_score: number | null;
  
  // Комментарии к оценкам
  correctness_comment: string | null;
  clarity_comment: string | null;
  independence_comment: string | null;
  overall_comment: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface EvaluationCriteria {
  id: keyof Pick<CaseEvaluation, 'correctness_score' | 'clarity_score' | 'independence_score'>;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const EVALUATION_CRITERIA: EvaluationCriteria[] = [
  {
    id: 'correctness_score',
    name: 'Правильность решения',
    description: 'Совпадение с правильным ответом',
    icon: '🎯',
    color: 'emerald'
  },
  {
    id: 'clarity_score',
    name: 'Чёткость объяснения',
    description: 'Ясность и логичность объяснения выбранного варианта решения',
    icon: '💬',
    color: 'blue'
  },
  {
    id: 'independence_score',
    name: 'Степень самостоятельности',
    description: 'Решил самостоятельно или с чьей-либо помощью',
    icon: '🎪',
    color: 'purple'
  }
];

export const SCORE_LABELS = {
  1: { label: '1 - Неудовлетворительно', emoji: '❌', color: 'red' },
  2: { label: '2 - Плохо', emoji: '👎', color: 'orange' },
  3: { label: '3 - Удовлетворительно', emoji: '👌', color: 'yellow' },
  4: { label: '4 - Хорошо', emoji: '👍', color: 'blue' },
  5: { label: '5 - Отлично', emoji: '⭐', color: 'green' }
} as const;

export type ScoreValue = keyof typeof SCORE_LABELS;

// Участник с назначенными кейсами
export interface ParticipantWithCases {
  id: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    sap_number: string | null;
    work_experience_days: number | null;
    position: { name: string } | null;
    territory: { name: string } | null;
  };
  dossier?: {
    id: string;
    photo_url: string | null;
    [key: string]: any;
  } | null;
  assigned_cases: ParticipantAssignedCase[];
  case_evaluations: CaseEvaluation[];
}

// Статистика оценки
export interface EvaluationStats {
  total_participants: number;
  evaluated_participants: number;
  completion_percentage: number;
  average_scores: {
    correctness: number;
    clarity: number;
    independence: number;
    overall: number;
  };
}
