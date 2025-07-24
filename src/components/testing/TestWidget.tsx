import React, { useState } from 'react';
import { FileText, Play, CheckCircle, Clock } from 'lucide-react';

interface TestWidgetProps {
  eventId: string;
  testType: 'entry' | 'final' | 'annual';
}

export function TestWidget({ eventId, testType }: TestWidgetProps) {
  const [testStatus] = useState<'not_started' | 'in_progress' | 'completed'>('not_started');

  const getTestTitle = () => {
    switch (testType) {
      case 'entry': return 'Входной тест';
      case 'final': return 'Финальный тест';
      case 'annual': return 'Годовой тест';
      default: return 'Тест';
    }
  };

  const getStatusIcon = () => {
    switch (testStatus) {
      case 'completed': return <CheckCircle size={20} className="text-green-600" />;
      case 'in_progress': return <Clock size={20} className="text-yellow-600" />;
      default: return <FileText size={20} className="text-gray-600" />;
    }
  };

  const getStatusText = () => {
    switch (testStatus) {
      case 'completed': return 'Завершен';
      case 'in_progress': return 'В процессе';
      default: return 'Не начат';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-gray-700">{getStatusText()}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-gray-600">
          Участников: 0 / 0
        </div>
        <div className="text-sm text-gray-600">
          Средний балл: 0%
        </div>
      </div>

      {testStatus === 'not_started' && (
        <button className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-300 flex items-center justify-center space-x-3 group font-semibold">
          <Play size={18} className="group-hover:animate-pulse" />
          <span className="text-base">Начать тест</span>
        </button>
      )}

      {testStatus === 'completed' && (
        <button className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition-all duration-300 font-semibold">
          <span className="text-base">Просмотреть результаты</span>
        </button>
      )}
    </div>
  );
}