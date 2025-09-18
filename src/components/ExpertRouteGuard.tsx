import React from 'react';

interface ExpertRouteGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const ExpertRouteGuard: React.FC<ExpertRouteGuardProps> = ({ 
  children, 
  fallback 
}) => {
  // Убираем все проверки доступа - сразу показываем контент
  return <>{children}</>;
};

export default ExpertRouteGuard;
