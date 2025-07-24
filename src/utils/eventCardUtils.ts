import { Event } from '../types';

interface EventWithStats extends Event {
  participants_count?: number;
  attendance_rate?: number;
  pending_tests?: number;
  pending_feedback?: number;
  has_report?: boolean;
  test_completed_count?: number;
  test_not_passed_count?: number;
  test_pass_percent?: number;
  event_types?: {
    id: string;
    name: string;
    name_ru: string;
  };
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'published': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'ongoing': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'completed': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
    case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

export const getTypeColor = (event: EventWithStats) => {
  const typeName = event.event_types?.name || event.type || '';
  switch (typeName) {
    case 'online_training': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'in_person_training': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'webinar': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'exam': return 'bg-red-50 text-red-700 border-red-200';
    case 'workshop': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'conference': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'welcome_course': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case 'online_marathon': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'work_session': return 'bg-pink-50 text-pink-700 border-pink-200';
    case 'practicum': return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'case_marathon': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'demo_laboratory': return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'complex_program': return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'business_game': return 'bg-lime-50 text-lime-700 border-lime-200';
    case 'active_seminar': return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'team_tracking': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

export const getCardGradient = (index: number) => {
  const gradients = [
    'from-white via-blue-50/30 to-indigo-50/30',
    'from-white via-emerald-50/30 to-teal-50/30',
    'from-white via-purple-50/30 to-pink-50/30',
    'from-white via-orange-50/30 to-amber-50/30',
    'from-white via-slate-50/30 to-gray-50/30',
    'from-white via-green-50/30 to-emerald-50/30'
  ];
  return gradients[index % gradients.length];
};

export const getCardSize = (variant: 'default' | 'compact' | 'detailed') => {
  switch (variant) {
    case 'compact':
      return 'p-4';
    case 'detailed':
      return 'p-8';
    default:
      return 'p-6';
  }
};

export const getUrgentTasks = (event: EventWithStats) => {
  const tasks = [];
  if (event.pending_tests && event.pending_tests > 0) {
    tasks.push(`${event.pending_tests} не прошли тест`);
  }
  if (event.pending_feedback && event.pending_feedback > 0) {
    tasks.push(`${event.pending_feedback} не заполнили обратную связь`);
  }
  if (event.status === 'completed' && !event.has_report) {
    tasks.push('Не отправлен отчет');
  }
  return tasks;
};

export const hasStatistics = (event: EventWithStats) => {
  return (event.participants_count || 0) > 0;
};

export const getEventPriority = (event: EventWithStats) => {
  const urgentTasks = getUrgentTasks(event);
  if (urgentTasks.length > 0) return 'high';
  if (event.status === 'ongoing' || event.status === 'active') return 'medium';
  return 'low';
}; 