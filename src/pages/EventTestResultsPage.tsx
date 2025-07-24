import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TestResultsOverview } from '../components/admin/TestResultsOverview';
import { ArrowLeft } from 'lucide-react';

export default function EventTestResultsPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/testing');
  };

  if (!eventId) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <h3 className="text-lg font-medium text-red-800 mb-2">Ошибка</h3>
        <p className="text-red-700">ID мероприятия не указан</p>
        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок с кнопкой назад */}
      <div className="flex items-center space-x-4">
        <button
          onClick={handleBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Назад к тестированию</span>
        </button>
      </div>

      {/* Компонент с результатами */}
      <TestResultsOverview eventId={eventId} />
    </div>
  );
} 