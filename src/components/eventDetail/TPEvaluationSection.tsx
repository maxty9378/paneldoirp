import { useNavigate } from 'react-router-dom';

interface TPEvaluationSectionProps {
  eventId: string;
  userProfile: any;
}

export function TPEvaluationSection({ eventId, userProfile }: TPEvaluationSectionProps) {
  const navigate = useNavigate();

  const isTrainer =
    userProfile?.role === 'trainer' ||
    userProfile?.role === 'administrator' ||
    userProfile?.role === 'moderator';
  if (!isTrainer) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Заголовок секции в стиле блока Тестирование */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900">Оценка ТП</h3>
            <p className="text-xs sm:text-sm text-gray-400">
              Оцените личностные качества и навыки продаж участников. Выберите уровень для каждого критерия — изменения сохраняются автоматически.
            </p>
          </div>
          
          <button 
            className="px-4 py-2 bg-[#06A478] text-white rounded-lg text-sm font-medium hover:bg-[#059669] transition-colors"
            onClick={() => navigate(`/event-tp-evaluation/${eventId}`)}
          >
            Открыть
          </button>
        </div>
      </div>
    </div>
  );
}
 
 export default TPEvaluationSection;
