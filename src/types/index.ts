export interface User {
  id: string;
  email?: string;
  sap_number?: string;
  full_name: string;
  position?: string;
  phone?: string;
  avatar_url?: string;
  role: 'employee' | 'supervisor' | 'trainer' | 'expert' | 'moderator' | 'administrator';
  subdivision: 'management_company' | 'branches';
  branch_subrole?: 'sales_representative' | 'supervisor' | 'branch_director';
  branch_id?: string;
  status: 'active' | 'inactive' | 'terminating' | 'transferring';
  work_experience_days: number;
  last_sign_in_at?: string;
  created_at: string;
  updated_at: string;
  experience?: number; // Добавляем для совместимости
  territory_id?: string;
  position_id?: string;
  is_active?: boolean;
  department?: string;
  trainer_territories?: any[];
  is_leaving?: boolean;
}

export type UserRole = 'employee' | 'supervisor' | 'trainer' | 'expert' | 'moderator' | 'administrator';

export interface Event {
  id: string;
  title: string;
  type?: string; 
  description?: string;
  date_time?: string; 
  location?: string;
  link?: string;
  points: number;
  status: 'active' | 'completed' | 'cancelled' | 'draft';
  creator_id: string;
  created_at: string;
  updated_at: string;
  start_date: string; 
  end_date?: string;
  meeting_link?: string;
  max_participants?: number;
  event_type_id: string; 
  expert_id?: string;
  event_type?: {
    id: string;
    name: string;
    name_ru: string;
  };
  participants_count?: number; 
  attendance_rate?: number; 
  pending_tests?: number; 
  pending_feedback?: number; 
  has_report?: boolean; 
}

export type EventType = 'online_training' | 'in_person_training' | 'webinar' | 'workshop' | 'conference' | 'exam' | 'welcome_course' | 'online_marathon' | 'work_session' | 'practicum' | 'case_marathon' | 'demo_laboratory' | 'complex_program' | 'business_game' | 'active_seminar' | 'team_tracking';

export interface NotificationTask {
  id: string;
  user_id: string;
  title: string;
  description: string;
  type: 'report_missing' | 'test_pending' | 'annual_test_due' | 'training_overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_completed: boolean;
  due_date?: string;
  created_at: string;
}

export const USER_ROLE_LABELS: Record<string, string> = {
  employee: 'Сотрудник',
  supervisor: 'Супервайзер',
  trainer: 'Тренер',
  expert: 'Эксперт',
  moderator: 'Модератор',
  administrator: 'Администратор'
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  online_training: 'Онлайн-тренинг',
  in_person_training: 'Очный тренинг',
  webinar: 'Вебинар',
  workshop: 'Мастер-класс',
  conference: 'Конференция',
  exam: 'Экзамен',
  welcome_course: 'Welcome Course',
  online_marathon: 'Онлайн-марафон',
  work_session: 'Рабочая сессия',
  practicum: 'Практикум',
  case_marathon: 'Кейс-марафон',
  demo_laboratory: 'Демо-лаборатория',
  complex_program: 'Комплексная программа',
  business_game: 'Деловая игра',
  active_seminar: 'Активный семинар',
  team_tracking: 'Командный трекинг'
};