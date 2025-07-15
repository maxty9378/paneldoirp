import React from 'react';

export function EventInfo({ event }: { event: any }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white rounded-xl p-4 border">
      <div>
        <div className="text-gray-500 text-xs mb-1">Дата</div>
        <div className="font-medium">{event.start_date} {event.end_date && `— ${event.end_date}`}</div>
      </div>
      <div>
        <div className="text-gray-500 text-xs mb-1">Место</div>
        <div className="font-medium">{event.location || '—'}</div>
      </div>
      <div>
        <div className="text-gray-500 text-xs mb-1">Тип</div>
        <div className="font-medium">{event.event_type?.name_ru || event.event_type?.name}</div>
      </div>
      <div>
        <div className="text-gray-500 text-xs mb-1">Организатор</div>
        <div className="font-medium">{event.creator?.full_name}</div>
      </div>
    </div>
  );
} 