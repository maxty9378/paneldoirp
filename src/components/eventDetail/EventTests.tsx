import React from 'react';
import { Play } from 'lucide-react';

export function EventTests({ event, tests, onStartTest, onAction }: { event: any; tests: any[]; onStartTest?: any; onAction?: any }) {
  if (!tests?.length) return <div className="p-4 text-gray-500">Нет тестов для этого мероприятия</div>;
  return (
    <div className="bg-white rounded-xl p-4 border">
      <h2 className="text-lg font-semibold mb-2">Тесты</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tests.map((test) => (
          <div key={test.id} className="border rounded-lg p-3 flex flex-col gap-2">
            <div className="font-medium text-sns-green">{test.title}</div>
            <div className="text-xs text-gray-500">Тип: {test.type}</div>
            <div className="text-xs text-gray-500">Время: {test.time_limit} мин</div>
            <div className="text-xs text-gray-500">Проходной балл: {test.passing_score}%</div>
            {onStartTest && (
              <button
                className="mt-3 px-6 py-3 bg-sns-green text-white rounded-xl hover:bg-sns-green-dark transition-all duration-300 font-semibold flex items-center justify-center group"
                onClick={() => onStartTest(test.type)}
              >
                <Play className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                <span className="text-base">Начать тест</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 