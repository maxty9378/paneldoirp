import React from 'react';
import { CompactDossierCard } from './CompactDossierCard';

interface ReservistCardProps {
  participant: {
    id: string;
    user: {
      id: string;
      full_name: string;
      email: string;
      sap_number: string;
      work_experience_days?: number;
      position?: { name: string };
      territory?: { name: string };
    };
  };
  dossier?: any;
  onRate?: (participantId: string) => void;
  onViewDossier?: (participantId: string) => void;
}

export const ReservistCard: React.FC<ReservistCardProps> = ({
  participant,
  dossier,
  onRate,
  onViewDossier
}) => {
  return (
    <CompactDossierCard
      participant={participant}
      dossier={dossier}
      onRate={onRate}
      onViewDossier={onViewDossier}
    />
  );
};