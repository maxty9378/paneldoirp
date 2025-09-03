import React from 'react';
import { TrainerUnifiedPanel } from './TrainerUnifiedPanel';

interface TrainerActionNotificationsProps {
  event: any;
  userProfile: any;
  participants: any[];
  onMarkAttendance?: () => void;
  onViewParticipants?: () => void;
  onStartEvent?: () => void;
  onCompleteEvent?: () => void;
  onViewTests?: () => void;
  onViewFeedback?: () => void;
  onViewStats?: () => void;
}

export function TrainerActionNotifications({
  event,
  userProfile,
  participants,
  onMarkAttendance,
  onViewParticipants,
  onStartEvent,
  onCompleteEvent,
  onViewTests,
  onViewFeedback,
  onViewStats
}: TrainerActionNotificationsProps) {
  return (
    <TrainerUnifiedPanel
      event={event}
      userProfile={userProfile}
      participants={participants}
      onMarkAttendance={onMarkAttendance}
      onViewParticipants={onViewParticipants}
      onStartEvent={onStartEvent}
      onCompleteEvent={onCompleteEvent}
    />
  );
}
