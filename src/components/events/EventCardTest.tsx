import React from 'react';
import { EventCard } from './EventCard';

// Тестовые данные
const testEvent = {
  id: 'test-event-1',
  title: 'Тестовое мероприятие',
  description: 'Описание тестового мероприятия для проверки функциональности',
  type: 'online_training',
  status: 'published',
  start_date: '2025-07-04T13:00:00Z',
  end_date: '2025-07-04T19:08:00Z',
  location: 'ZOOM',
  max_participants: 20,
  participants_count: 11,
  created_at: '2025-07-04T10:00:00Z',
  points: 100,
  test_completed_count: 3,
  test_not_passed_count: 8,
  test_pass_percent: 27,
  event_types: {
    id: '1',
    name: 'online_training',
    name_ru: 'Онлайн-тренинг'
  }
};

export function EventCardTest() {
  const handleNavigateToEvent = (eventId: string) => {
    console.log('Navigate to event:', eventId);
    alert(`Переход к мероприятию: ${eventId}`);
  };

  const handleEditEvent = (eventId: string) => {
    console.log('Edit event:', eventId);
    alert(`Редактирование мероприятия: ${eventId}`);
  };

  const handleDeleteEvent = (eventId: string) => {
    console.log('Delete event:', eventId);
    if (confirm(`Удалить мероприятие: ${eventId}?`)) {
      alert(`Мероприятие ${eventId} удалено`);
    }
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">Тест EventCard</h1>
        
        <EventCard
          event={testEvent}
          index={0}
          canCreateEvents={true}
          onNavigateToEvent={handleNavigateToEvent}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
        />
        
        <div className="mt-8 p-4 bg-white rounded-lg border">
          <h2 className="text-lg font-semibold mb-2">Инструкции по тестированию:</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Откройте консоль браузера (F12)</li>
            <li>Нажмите на кнопку с тремя точками (⋮)</li>
            <li>В выпадающем меню нажмите "Редактировать"</li>
            <li>Проверьте сообщения в консоли</li>
            <li>Должно появиться alert с сообщением о редактировании</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 