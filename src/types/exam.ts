// Типы для экзамена кадрового резерва

export interface ExamEvent {
  id: string;
  title: string;
  description: string;
  event_type_id: string;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  location: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  exam_config: ExamConfig;
  detailed_schedule?: DetailedScheduleItem[];
}

export interface DetailedScheduleItem {
  time: string;
  title: string;
  duration: string;
  description: string;
}

export interface ExamConfig {
  id: string;
  exam_event_id: string;
  total_duration_hours: number;
  break_duration_minutes: number;
  max_participants: number;
  evaluation_criteria: EvaluationCriteria;
  created_at: string;
  updated_at: string;
}

export interface ExamSchedule {
  id: string;
  exam_event_id: string;
  stage: ExamStage;
  start_time: string;
  end_time: string;
  location: string;
  evaluators: string[]; // user_ids
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExamStage {
  id: 'case_defense' | 'project_defense' | 'diagnostic_game';
  name: string;
  name_ru: string;
  description: string;
  duration_minutes: number;
  order: number;
}

export interface ReservistDossier {
  id: string;
  exam_event_id: string;
  user_id: string;
  position: string;
  department: string;
  experience_years: number;
  education: string;
  achievements: string[];
  strengths: string[];
  development_areas: string[];
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ExamEvaluation {
  id: string;
  exam_event_id: string;
  reservist_id: string;
  stage: ExamStage['id'];
  evaluator_id: string;
  scores: EvaluationScores;
  comments: string;
  recommendations: string;
  created_at: string;
  updated_at: string;
}

export interface EvaluationScores {
  case_defense?: {
    case1_score: number; // 1-10
    case2_score: number; // 1-10
    presentation_quality: number; // 1-10
    problem_solving: number; // 1-10
    communication: number; // 1-10
  };
  project_defense?: {
    project_quality: number; // 1-10
    innovation: number; // 1-10
    feasibility: number; // 1-10
    presentation: number; // 1-10
    qa_handling: number; // 1-10
  };
  diagnostic_game?: {
    leadership: number; // 1-10
    teamwork: number; // 1-10
    decision_making: number; // 1-10
    stress_management: number; // 1-10
    creativity: number; // 1-10
  };
}

export interface EvaluationCriteria {
  case_defense: {
    max_score: number;
    passing_score: number;
    criteria: {
      case1_score: { weight: number; description: string };
      case2_score: { weight: number; description: string };
      presentation_quality: { weight: number; description: string };
      problem_solving: { weight: number; description: string };
      communication: { weight: number; description: string };
    };
  };
  project_defense: {
    max_score: number;
    passing_score: number;
    criteria: {
      project_quality: { weight: number; description: string };
      innovation: { weight: number; description: string };
      feasibility: { weight: number; description: string };
      presentation: { weight: number; description: string };
      qa_handling: { weight: number; description: string };
    };
  };
  diagnostic_game: {
    max_score: number;
    passing_score: number;
    criteria: {
      leadership: { weight: number; description: string };
      teamwork: { weight: number; description: string };
      decision_making: { weight: number; description: string };
      stress_management: { weight: number; description: string };
      creativity: { weight: number; description: string };
    };
  };
}

export interface ExamParticipant {
  id: string;
  exam_event_id: string;
  user_id: string;
  status: 'registered' | 'confirmed' | 'attended' | 'completed' | 'disqualified';
  registration_date: string;
  confirmation_date?: string;
  attendance_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExamResults {
  reservist_id: string;
  total_score: number;
  max_possible_score: number;
  percentage: number;
  passed: boolean;
  stage_results: {
    case_defense: {
      score: number;
      max_score: number;
      passed: boolean;
    };
    project_defense: {
      score: number;
      max_score: number;
      passed: boolean;
    };
    diagnostic_game: {
      score: number;
      max_score: number;
      passed: boolean;
    };
  };
  overall_rating: 'excellent' | 'good' | 'satisfactory' | 'unsatisfactory';
  recommendations: string[];
}

// Константы для этапов экзамена
export const EXAM_STAGES: ExamStage[] = [
  {
    id: 'case_defense',
    name: 'Case Defense',
    name_ru: 'Защита кейсов',
    description: 'Защита двух кейсов с презентацией решения',
    duration_minutes: 60,
    order: 1,
  },
  {
    id: 'project_defense',
    name: 'Project Defense',
    name_ru: 'Защита проекта',
    description: 'Презентация и защита собственного проекта',
    duration_minutes: 90,
    order: 2,
  },
  {
    id: 'diagnostic_game',
    name: 'Diagnostic Game',
    name_ru: 'Диагностическая игра',
    description: 'Ситуационная игра для оценки лидерских качеств',
    duration_minutes: 120,
    order: 3,
  },
];

// Константы для критериев оценки
export const DEFAULT_EVALUATION_CRITERIA: EvaluationCriteria = {
  case_defense: {
    max_score: 50,
    passing_score: 30,
    criteria: {
      case1_score: { weight: 0.2, description: 'Качество решения первого кейса' },
      case2_score: { weight: 0.2, description: 'Качество решения второго кейса' },
      presentation_quality: { weight: 0.2, description: 'Качество презентации' },
      problem_solving: { weight: 0.2, description: 'Способность к решению проблем' },
      communication: { weight: 0.2, description: 'Коммуникативные навыки' },
    },
  },
  project_defense: {
    max_score: 50,
    passing_score: 30,
    criteria: {
      project_quality: { weight: 0.25, description: 'Качество проекта' },
      innovation: { weight: 0.2, description: 'Инновационность решения' },
      feasibility: { weight: 0.2, description: 'Реализуемость проекта' },
      presentation: { weight: 0.2, description: 'Качество презентации' },
      qa_handling: { weight: 0.15, description: 'Работа с вопросами' },
    },
  },
  diagnostic_game: {
    max_score: 50,
    passing_score: 30,
    criteria: {
      leadership: { weight: 0.25, description: 'Лидерские качества' },
      teamwork: { weight: 0.2, description: 'Командная работа' },
      decision_making: { weight: 0.2, description: 'Принятие решений' },
      stress_management: { weight: 0.2, description: 'Управление стрессом' },
      creativity: { weight: 0.15, description: 'Креативность' },
    },
  },
};
