import React from 'react';
import { X, Calendar, Clock, MapPin, User } from 'lucide-react';

interface ScheduleItem {
  id?: string;
  startTime?: string;
  endTime?: string;
  time?: string;
  title: string;
  description?: string;
  duration?: string | number;
  type?: string;
  location?: string;
  speaker?: string;
}

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleItem[];
  examTitle?: string;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  schedule,
  examTitle = 'Расписание экзамена'
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Фуллскрин слой */}
      <div 
        className="schedule-modal fixed inset-0 z-[10005] overflow-y-auto bg-white" 
        style={{ 
          pointerEvents: 'auto'
        }}
      >
        {/* Шапка (sticky top) */}
        <header 
          className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur-sm"
          style={{ paddingTop: '0px' }}
        >
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-500">Расписание экзамена</div>
                <div className="text-base font-semibold truncate">{examTitle}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                onPointerUp={onClose}
                className="p-2 rounded-lg hover:bg-gray-50 active:bg-gray-100"
                aria-label="Закрыть"
                style={{
                  minWidth: '44px',
                  minHeight: '44px',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  userSelect: 'none'
                }}
              >
                <X className="w-6 h-6 text-gray-700 pointer-events-none" />
              </button>
            </div>
          </div>
        </header>

        {/* Контент */}
        <main className="px-4 pt-3">
          <div className="space-y-3">
            {!schedule || schedule.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Расписание не настроено</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedule.map((item, index) => (
                  <div key={item.id || index} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold">
                          {item.time || item.startTime || 'Время не указано'}
                        </div>
                        {item.endTime && (
                          <div className="text-gray-500 text-sm">
                            — {item.endTime}
                          </div>
                        )}
                        {item.duration && (
                          <div className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                            {item.duration}
                          </div>
                        )}
                      </div>
                      {item.type && (
                        <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                          {item.type}
                        </div>
                      )}
                    </div>
                    
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      {item.title}
                    </h4>
                    
                    {item.description && (
                      <p className="text-gray-600 text-sm leading-relaxed mb-3">
                        {item.description}
                      </p>
                    )}
                    
                    {/* Additional info */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      {item.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{item.location}</span>
                        </div>
                      )}
                      {item.speaker && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{item.speaker}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Кнопки действий */}
            <div className="mt-6 px-4 pb-6">
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  onPointerUp={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                  style={{ minHeight: '48px', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  Назад
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default ScheduleModal;
