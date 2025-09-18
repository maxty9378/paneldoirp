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
    <div className="fixed inset-0 z-[10005] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#06A478] to-[#059669] px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6" />
              <h2 className="text-xl font-bold">{examTitle}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!schedule || schedule.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Расписание не настроено</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-[#06A478]/30 via-[#06A478]/60 to-[#06A478]/30 z-0"></div>
              
              <div className="space-y-6">
                {schedule.map((item, index) => (
                  <div key={item.id || index} className="group relative">
                    {/* Timeline dot */}
                    <div className="absolute left-6 top-6 w-4 h-4 bg-white border-4 border-[#06A478] rounded-full shadow-lg z-20 group-hover:scale-125 transition-transform duration-200"></div>
                    
                    {/* Content card */}
                    <div className="ml-12 relative">
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group-hover:border-[#06A478]/30 group-hover:-translate-y-1 overflow-hidden">
                        {/* Card header */}
                        <div className="bg-gradient-to-r from-[#06A478]/5 via-[#06A478]/10 to-[#06A478]/5 px-6 py-4 border-b border-[#06A478]/20">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                              <div className="flex items-center space-x-2">
                                <div className="bg-[#06A478] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
                                  {item.time || item.startTime || 'Время не указано'}
                                </div>
                                {item.endTime && (
                                  <>
                                    <div className="flex items-center text-[#06A478]/60">
                                      <div className="w-6 bg-[#06A478]/30 h-0.5"></div>
                                      <div className="w-2 h-2 bg-[#06A478]/50 rounded-full mx-1"></div>
                                      <div className="w-6 bg-[#06A478]/30 h-0.5"></div>
                                    </div>
                                    <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200">
                                      {item.endTime}
                                    </div>
                                  </>
                                )}
                                {item.duration && (
                                  <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200">
                                    {item.duration}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-end">
                              {item.type && (
                                <div className="bg-gradient-to-r from-[#06A478]/10 to-[#06A478]/20 text-[#06A478] px-4 py-2 rounded-lg text-sm font-medium border border-[#06A478]/30">
                                  {item.type}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Card content */}
                        <div className="p-6">
                          <h4 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#06A478] transition-colors">
                            {item.title}
                          </h4>
                          {item.description && (
                            <div className="mt-3">
                              <p className="text-gray-600 leading-relaxed">
                                {item.description}
                              </p>
                            </div>
                          )}
                          
                          {/* Additional info */}
                          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#06A478] text-white rounded-lg hover:bg-[#059669] transition-colors font-medium"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;
