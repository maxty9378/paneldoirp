import React from 'react';
import { Calendar, Users, BookOpen, TrendingUp, Award, Shield, MapPin, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getDeclension, formatExperienceWithDeclension } from '../utils/textUtils';
import { Event, USER_ROLE_LABELS } from '../types';

// Мок-данные мероприятий
const mockUpcomingEvents: Event[] = [
  {
    id: '1',
    title: 'Продажи в розничной торговле - базовый курс',
    type: 'online_training',
    description: 'Комплексное обучение основам продаж для новых сотрудников',
    date_time: '2024-12-20T10:00:00Z',
    location: 'Онлайн',
    link: 'https://zoom.us/j/123456789',
    points: 50,
    status: 'active',
    creator_id: 'user1',
    created_at: '2024-12-15T09:00:00Z',
    updated_at: '2024-12-15T09:00:00Z'
  },
  {
    id: '2',
    title: 'Работа с возражениями клиентов',
    type: 'in_person_training',
    description: 'Практический тренинг по технике работы с возражениями',
    date_time: '2024-12-22T14:00:00Z',
    location: 'Конференц-зал, офис Москва',
    points: 75,
    status: 'active',
    creator_id: 'user1',
    created_at: '2024-12-15T09:00:00Z',
    updated_at: '2024-12-15T09:00:00Z'
  }
];

// Карточка мероприятия
function EventCard({ event }: { event: Event }) {
  const date = new Date(event.date_time);
  return (
    <div className="bg-white rounded-2xl shadow-md p-4 flex flex-col gap-2 transition hover:shadow-lg">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sns-100 text-sns-600">
          {event.type === 'online_training' ? 'Онлайн' : 'Очно'}
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar size={14} /> {date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
      <p className="text-gray-600 text-sm line-clamp-2">{event.description}</p>
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <MapPin size={14} /> {event.location}
        </span>
        {event.link && (
          <a
            href={event.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-sns-500 hover:underline"
          >
            <LinkIcon size={14} /> Ссылка
          </a>
        )}
        <span className="flex items-center gap-1 text-xs text-yellow-600 ml-auto">
          <Award size={14} /> {event.points} баллов
        </span>
      </div>
    </div>
  );
}

// Карточка статистики
function StatsCard({
  title,
  value,
  change,
  changeType,
  icon
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-2 items-start">
      <div className="flex items-center gap-2 text-sns-500">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{title}</div>
      {change && (
        <div className={`text-xs mt-1 ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </div>
      )}
    </div>
  );
}

export function DashboardView() {
  const { user, userProfile, loading } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Загрузка данных пользователя...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Welcome Section */}
      <section className="bg-gradient-to-r from-sns-500 to-sns-600 rounded-2xl p-5 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">
              {getGreeting()}, {userProfile?.full_name?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'Пользователь'}!
            </h1>
            <p className="text-white/90 text-base sm:text-lg mb-2">
              Добро пожаловать в личный кабинет своего обучения
            </p>
            <div className="flex items-center space-x-2 text-white/80 text-sm">
              <Shield size={16} />
              <span>
                Роль: {userProfile?.role ? USER_ROLE_LABELS[userProfile.role] : 'Не определена'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-2 sm:mt-0">
            <div className="flex items-center space-x-2">
              <Award size={20} />
              <span className="font-semibold">1,247 баллов</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar size={20} />
              <span>
                {new Date().toLocaleDateString('ru-RU', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'long'
                })}
              </span>
            </div>
            {user?.work_experience_days && user.work_experience_days > 0 && (
              <div className="flex items-center space-x-2">
                <Users size={20} />
                <span>{formatExperienceWithDeclension(user.work_experience_days)}</span>
              </div>
            )}
          </div>
        </div>
        {/* Декоративный круг для красоты */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
        <StatsCard
          title="Активные мероприятия"
          value={8}
          change="+2 за неделю"
          changeType="positive"
          icon={<BookOpen size={22} />}
        />
        <StatsCard
          title="Участники"
          value={142}
          change="+12 за месяц"
          changeType="positive"
          icon={<Users size={22} />}
        />
        <StatsCard
          title="Завершенные курсы"
          value={24}
          change="+6 за месяц"
          changeType="positive"
          icon={<Award size={22} />}
        />
        <StatsCard
          title="Средняя оценка"
          value="4.8"
          change="+0.2 за месяц"
          changeType="positive"
          icon={<TrendingUp size={22} />}
        />
      </section>

      {/* Upcoming Events as Cards */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Ближайшие мероприятия
          </h2>
          <button className="text-sns-500 hover:text-sns-600 transition-colors text-sm font-medium">
            Смотреть все
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockUpcomingEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      {/* Bottom Navigation для мобильных */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-md flex justify-around items-center py-2 sm:hidden">
        <button className="flex flex-col items-center text-sns-500">
          <BookOpen size={22} />
          <span className="text-xs mt-0.5">Курсы</span>
        </button>
        <button className="flex flex-col items-center text-sns-500">
          <Calendar size={22} />
          <span className="text-xs mt-0.5">Календарь</span>
        </button>
        <button className="flex flex-col items-center text-sns-500">
          <Users size={22} />
          <span className="text-xs mt-0.5">Команда</span>
        </button>
        <button className="flex flex-col items-center text-sns-500">
          <Award size={22} />
          <span className="text-xs mt-0.5">Достижения</span>
        </button>
      </nav>
    </div>
  );
}