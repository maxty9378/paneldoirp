import React from 'react';
import { MapPin, Video, User2 } from 'lucide-react';

interface EventPlaceProps {
  organizerName?: string;
  organizerPosition?: string;
  location?: string;
  meeting_link?: string;
}

export function EventPlace({
  organizerName,
  organizerPosition,
  location,
  meeting_link,
}: EventPlaceProps) {
  if (!organizerName && !location && !meeting_link) return null;
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6 font-mabry">
      {/* Организатор */}
      <div className="flex-1 bg-white rounded-2xl shadow-md border border-gray-100 p-4 flex items-center min-w-0">
        <div className="flex-shrink-0 bg-sns-green/10 rounded-full p-2 mr-3">
          <User2 className="w-7 h-7 text-sns-green" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-gray-400 mb-0.5">Организатор</div>
          <div className="font-semibold text-gray-900 truncate max-w-[180px] sm:max-w-[220px]">{organizerName || <span className='text-gray-300'>Не указано</span>}</div>
          <div className="text-sm text-gray-500 truncate max-w-[180px] sm:max-w-[220px]">{organizerPosition || <span className='text-gray-300'>Должность не указана</span>}</div>
        </div>
      </div>
      {/* Место и ссылка */}
      <div className="flex-1 bg-white rounded-2xl shadow-md border border-gray-100 p-4 flex flex-col min-w-0 justify-between">
        {/* Локация */}
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-5 h-5 text-sns-green" />
          <span className="text-gray-700 font-medium text-base truncate max-w-[180px]">{location || <span className='text-gray-300'>Не указано</span>}</span>
        </div>
        {/* Ссылка */}
        {meeting_link && (
          <a
            href={meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 bg-sns-green text-white rounded-lg font-medium hover:bg-sns-green-dark hover:text-white transition-colors text-sm whitespace-nowrap mt-auto max-w-[220px] w-full justify-center no-underline"
          >
            <Video className="w-4 h-4" />
            Перейти к встрече
          </a>
        )}
      </div>
    </div>
  );
} 