import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { TestsPendingReview } from '../components/admin/TestsPendingReview';
import { TestReviewModal } from '../components/admin/TestReviewModal';

export default function EventTestReviewPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  if (!eventId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ошибка</h1>
          <p className="text-gray-600">ID мероприятия не найден</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Заголовок с кнопкой назад */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Назад
              </button>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  Проверка тестов
                </h1>
                <p className="text-sm text-gray-500">
                  Мероприятие ID: {eventId}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TestsPendingReview
          eventId={eventId}
          onReviewComplete={() => {
            // После завершения проверки можно вернуться назад
            navigate(-1);
          }}
          onEditReview={(attemptId: string) => {
            setSelectedAttemptId(attemptId);
            setShowReviewModal(true);
          }}
        />
      </div>

      {/* Модальное окно для проверки тестов */}
      {showReviewModal && selectedAttemptId && (
        <TestReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedAttemptId(null);
          }}
          attemptId={selectedAttemptId}
          eventId={eventId || ''}
        />
      )}
    </div>
  );
}
