import React from 'react';
import { MapPin, Video } from 'lucide-react';

interface EventPlaceProps {
  location?: string;
  meeting_link?: string;
}

export function EventPlace({
  location,
  meeting_link,
}: EventPlaceProps) {
  if (!location && !meeting_link) return null;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Место проведения</h3>
      </div>
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Место проведения */}
          <div className="flex-1 bg-gray-50 rounded-xl p-4 flex items-center min-w-0">
            <div className="flex-shrink-0 bg-sns-green/10 rounded-full p-2 mr-3">
              <MapPin className="w-5 h-5 text-sns-green" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500 mb-0.5 font-medium">Место проведения</div>
              <div className="font-semibold text-gray-900 truncate max-w-[180px] sm:max-w-[220px]">
                {location || <span className='text-gray-400'>Не указано</span>}
              </div>
            </div>
          </div>
          
          {/* Ссылка на встречу */}
          {meeting_link && (
            <div className="flex-1 bg-gray-50 rounded-xl p-4 flex flex-col min-w-0 justify-center">
              <a
                href={meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-sns-green text-white rounded-lg font-medium hover:bg-sns-green-dark hover:text-white transition-colors text-sm shadow-sm hover:shadow-md hover:scale-105"
              >
                <Video className="w-4 h-4" />
                Перейти к встрече
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 