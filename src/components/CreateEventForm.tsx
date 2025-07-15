import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase, EventType, Branch, User } from '../lib/supabase';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Link as LinkIcon, 
  Users, 
  Star,
  Upload,
  X,
  Loader2,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { clsx } from 'clsx';

interface CreateEventFormData {
  title: string;
  description: string;
  event_type_id: string;
  start_date: string;
  end_date: string;
  location: string;
  meeting_link: string;
  points: number;
  max_participants: number;
}

interface CreateEventFormProps {
  onSuccess?: () => void;
}

export function CreateEventForm({ onSuccess }: CreateEventFormProps) {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<CreateEventFormData>();

  const watchedEventTypeId = watch('event_type_id');

  useEffect(() => {
    fetchEventTypes();
    fetchBranches();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (watchedEventTypeId) {
      const eventType = eventTypes.find(et => et.id === watchedEventTypeId);
      setSelectedEventType(eventType || null);
    }
  }, [watchedEventTypeId, eventTypes]);

  const fetchEventTypes = async () => {
    const { data, error } = await supabase
      .from('event_types')
      .select('*')
      .order('name_ru');
    
    if (error) {
      console.error('Error fetching event types:', error);
    } else {
      setEventTypes(data || []);
    }
  };

  const fetchBranches = async () => {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching branches:', error);
    } else {
      setBranches(data || []);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('status', 'active')
      .order('full_name');
    
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
  };

  const onSubmit = async (data: CreateEventFormData) => {
    setIsLoading(true);
    
    try {
      // Create event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          ...data,
          status: 'published',
          points: Number(data.points) || 0,
          max_participants: Number(data.max_participants) || null,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Add participants
      if (selectedUsers.length > 0) {
        const participantsData = selectedUsers.map(userId => ({
          event_id: eventData.id,
          user_id: userId,
        }));

        const { error: participantsError } = await supabase
          .from('event_participants')
          .insert(participantsData);

        if (participantsError) throw participantsError;
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onSuccess?.();
      }, 2000);

    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-squircle-lg shadow-medium p-8 text-center animate-scale-in">
          <div className="w-16 h-16 bg-green-100 rounded-squircle mx-auto flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Мероприятие создано!</h3>
          <p className="text-gray-600">Мероприятие успешно добавлено в систему.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-squircle-lg shadow-medium overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-sns-50 to-sns-100">
          <h2 className="text-xl font-semibold text-gray-900">Создание мероприятия</h2>
          <p className="mt-1 text-sm text-gray-600">
            Заполните информацию о новом мероприятии
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Название мероприятия *
              </label>
              <input
                type="text"
                id="title"
                {...register('title', { required: 'Название обязательно' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sns-500 focus:border-sns-500 transition-all duration-200"
                placeholder="Введите название мероприятия"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="event_type_id" className="block text-sm font-medium text-gray-700 mb-2">
                Тип мероприятия *
              </label>
              <select
                id="event_type_id"
                {...register('event_type_id', { required: 'Тип мероприятия обязателен' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sns-500 focus:border-sns-500 transition-all duration-200"
              >
                <option value="">Выберите тип мероприятия</option>
                {eventTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name_ru}
                  </option>
                ))}
              </select>
              {errors.event_type_id && (
                <p className="mt-1 text-sm text-red-600">{errors.event_type_id.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="points" className="block text-sm font-medium text-gray-700 mb-2">
                Баллы за участие
              </label>
              <div className="relative">
                <Star className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  id="points"
                  {...register('points')}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sns-500 focus:border-sns-500 transition-all duration-200"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Описание
            </label>
            <textarea
              id="description"
              rows={4}
              {...register('description')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sns-500 focus:border-sns-500 transition-all duration-200 resize-none"
              placeholder="Опишите цели и содержание мероприятия"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                Дата и время начала *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="datetime-local"
                  id="start_date"
                  {...register('start_date', { required: 'Дата начала обязательна' })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sns-500 focus:border-sns-500 transition-all duration-200"
                />
              </div>
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600">{errors.start_date.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                Дата и время окончания
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="datetime-local"
                  id="end_date"
                  {...register('end_date')}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sns-500 focus:border-sns-500 transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Location and Link */}
          {selectedEventType && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {selectedEventType.requires_location && (
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                    Место проведения
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      id="location"
                      {...register('location')}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sns-500 focus:border-sns-500 transition-all duration-200"
                      placeholder="Адрес или название помещения"
                    />
                  </div>
                </div>
              )}

              {selectedEventType.is_online && (
                <div>
                  <label htmlFor="meeting_link" className="block text-sm font-medium text-gray-700 mb-2">
                    Ссылка на встречу
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="url"
                      id="meeting_link"
                      {...register('meeting_link')}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sns-500 focus:border-sns-500 transition-all duration-200"
                      placeholder="https://zoom.us/j/..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Max Participants */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="max_participants" className="block text-sm font-medium text-gray-700 mb-2">
                Максимальное количество участников
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  id="max_participants"
                  {...register('max_participants')}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sns-500 focus:border-sns-500 transition-all duration-200"
                  placeholder="Не ограничено"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Participants Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Участники ({selectedUsers.length} выбрано)
            </label>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-xl p-4 space-y-2">
              {users.map((user) => (
                <label
                  key={user.id}
                  className={clsx(
                    "flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50",
                    selectedUsers.includes(user.id) && "bg-sns-50 border border-sns-200"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                    className="mr-3 h-4 w-4 text-sns-500 focus:ring-sns-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{user.full_name}</span>
                      <span className="text-sm text-gray-500">{user.position}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {user.email || user.sap_number}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={isLoading}
              className={clsx(
                "px-6 py-3 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sns-500",
                isLoading
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-gradient-to-r from-sns-500 to-sns-600 hover:from-sns-600 hover:to-sns-700 text-white shadow-medium hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Создание...
                </div>
              ) : (
                'Создать мероприятие'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}