import { useState, useCallback, useMemo } from 'react';
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

export function useEventCard(event: EventWithStats) {
  const [openMenu, setOpenMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const urgentTasks = useMemo(() => {
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
  }, [event.pending_tests, event.pending_feedback, event.status, event.has_report]);

  const hasStats = useMemo(() => {
    return (event.participants_count || 0) > 0;
  }, [event.participants_count]);

  const toggleMenu = useCallback(() => {
    setOpenMenu(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setOpenMenu(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  return {
    openMenu,
    isHovered,
    urgentTasks,
    hasStats,
    toggleMenu,
    closeMenu,
    handleMouseEnter,
    handleMouseLeave,
  };
} 