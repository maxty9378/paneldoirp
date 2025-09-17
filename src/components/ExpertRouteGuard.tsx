import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useExpertAccess } from '../hooks/useExpertAccess';
import { AlertCircle } from 'lucide-react';

interface ExpertRouteGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const ExpertRouteGuard: React.FC<ExpertRouteGuardProps> = ({ 
  children, 
  fallback 
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { hasAccess, loading, error } = useExpertAccess(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-[#06A478]/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-[#06A478] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 mt-4 font-medium">Проверяем доступ к экзамену...</p>
          <p className="text-gray-400 text-sm mt-2">Это займет всего секунду</p>
        </div>
      </div>
    );
  }

  if (hasAccess === false) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Доступ запрещен</h2>
          <p className="text-gray-600 mb-4">{error || 'У вас нет прав для просмотра этого контента'}</p>
          <button
            onClick={() => navigate('/exam-reserve')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#06A478] text-white rounded-lg hover:bg-[#059669] transition-colors"
          >
            Вернуться к экзаменам
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ExpertRouteGuard;
