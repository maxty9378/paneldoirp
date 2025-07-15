import React from 'react';

export function EventFeedback({ event, feedback, onAction }: { event: any; feedback: any; onAction?: any }) {
  return (
    <div className="bg-white rounded-xl p-4 border">
      <h2 className="text-lg font-semibold mb-2">Обратная связь</h2>
      {feedback ? (
        <div> {/* Здесь можно отобразить детали обратной связи */}
          <pre className="text-xs text-gray-600">{JSON.stringify(feedback, null, 2)}</pre>
        </div>
      ) : (
        <div className="text-gray-500">Нет данных обратной связи для этого мероприятия</div>
      )}
    </div>
  );
} 