import React from 'react';
import { AlertCircle, Clock, CheckCircle2, X } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { NotificationTask } from '../../types';
import { clsx } from 'clsx';

interface TaskAlertProps {
  task: NotificationTask;
  onComplete: (taskId: string) => void;
  onDismiss?: (taskId: string) => void;
}

export function TaskAlert({ task, onComplete, onDismiss }: TaskAlertProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'low': return <Clock className="h-4 w-4 text-blue-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Срочно';
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      default: return priority;
    }
  };

  return (
    <div className={clsx(
      "border-l-4 rounded-lg p-4 transition-all duration-200 hover:shadow-soft",
      getPriorityColor(task.priority)
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0 mt-0.5">
            {getPriorityIcon(task.priority)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">{task.title}</h4>
            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
            
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span className="font-medium">
                Приоритет: {getPriorityLabel(task.priority)}
              </span>
              {task.due_date && (
                <span>
                  До: {format(new Date(task.due_date), 'dd.MM.yyyy HH:mm', { locale: ru })}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => onComplete(task.id)}
            className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-100 rounded-lg transition-colors duration-200"
            title="Отметить как выполненное"
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
          {onDismiss && (
            <button
              onClick={() => onDismiss(task.id)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              title="Скрыть"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}