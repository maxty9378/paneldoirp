import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Loader2,
  Search,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Target,
  Award
} from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

type EventStatus = 'draft' | 'published';
type EventFormat = 'online' | 'offline';

interface EventTypeRecord {
  id: string;
  name: string;
  name_ru: string;
  is_online: boolean | null;
  requires_location?: boolean | null;
  has_entry_test?: boolean | null;
  has_final_test?: boolean | null;
  has_feedback_form?: boolean | null;
  description?: string | null;
  default_points?: number | null; // <- Фикс: добавили для префилла баллов
}

interface UserRecord {
  id: string;
  full_name: string;
  email: string;
  position?: string | null;
  sap_number?: string | null; // <- Фикс: добавили для поиска
}

interface FormValues {
  title: string;
  description: string;
  eventTypeId: string;
  startDateTime: string;
  endDateTime: string;
  format: EventFormat;
  location: string;
  meetingLink: string;
  points: string;
  maxParticipants: string;
  status: EventStatus;
}

interface SuccessState {
  eventId: string;
  title: string;
  startDateTime: string | null;
  eventType?: string;
  format: EventFormat;
  participantsCount: number;
}

interface EventInsertPayload {
  title: string;
  description: string | null;
  event_type_id: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  meeting_link: string | null;
  points: number;
  max_participants: number | null;
  status: EventStatus;
  creator_id: string | null;
  updated_at: string;
}

interface CreateEventPageProps {
  onCancel?: () => void; // <- Фикс: для закрытия модалки
  onSuccess?: (eventId?: string) => void; // <- Фикс: для успеха в модалке (редирект)
  editingEvent?: any; // <- Фикс: для режима редактирования (данные события)
}

const defaultValues: FormValues = {
  title: '',
  description: '',
  eventTypeId: '',
  startDateTime: '',
  endDateTime: '',
  format: 'online',
  location: '',
  meetingLink: '',
  points: '',
  maxParticipants: '',
  status: 'draft'
};

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Не выбрано';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Не выбрано';
  }

  return format(date, "d MMMM yyyy, HH:mm", { locale: ru });
}

function formatDuration(start: string, end: string) {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  const diffMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
  if (diffMinutes <= 0) return null;

  if (diffMinutes < 60) {
    return `${diffMinutes} мин`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
}

function formatStatus(status: EventStatus) {
  switch (status) {
    case 'draft':
      return 'Черновик';
    case 'published':
      return 'Опубликовано';
    default:
      return status;
  }
}

export default function CreateEventPage({ onCancel, onSuccess, editingEvent }: CreateEventPageProps) {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [eventTypes, setEventTypes] = useState<EventTypeRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<SuccessState | null>(null); // <- Фикс: используем только если не в модалке
  const [participantQuery, setParticipantQuery] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<UserRecord[]>([]);

  const isEditing = !!editingEvent; // <- Фикс: определяем режим редактирования

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<FormValues>({ defaultValues });

  const watchEventTypeId = watch('eventTypeId');
  const watchFormat = watch('format');
  const watchTitle = watch('title');
  const watchDescription = watch('description');
  const watchStart = watch('startDateTime');
  const watchEnd = watch('endDateTime');
  const watchStatus = watch('status');
  const watchPoints = watch('points');
  const watchMaxParticipants = watch('maxParticipants');
  const watchMeetingLink = watch('meetingLink');
  const watchLocation = watch('location');

  const canCreateEvents = useMemo(() => {
    const role = userProfile?.role;
    return role ? ['trainer', 'moderator', 'administrator'].includes(role) : false;
  }, [userProfile?.role]);

  const selectedEventType = useMemo(
    () => eventTypes.find(type => type.id === watchEventTypeId) || null,
    [eventTypes, watchEventTypeId]
  );

  const filteredUsers = useMemo(() => {
    const query = participantQuery.trim().toLowerCase();
    if (!query) {
      return users.slice(0, 15);
    }

    return users
      .filter(userRecord => {
        const fullName = userRecord.full_name?.toLowerCase() || '';
        const email = userRecord.email?.toLowerCase() || '';
        const position = userRecord.position?.toLowerCase() || '';
        const sap = userRecord.sap_number?.toLowerCase() || ''; // <- Фикс: добавили поиск по SAP
        return fullName.includes(query) || email.includes(query) || position.includes(query) || sap.includes(query);
      })
      .slice(0, 15);
  }, [participantQuery, users]);

  // <- Фикс: префилл формы для редактирования
  useEffect(() => {
    if (isEditing && editingEvent) {
      // Заполняем форму данными события
      setValue('title', editingEvent.title || '');
      setValue('description', editingEvent.description || '');
      setValue('eventTypeId', editingEvent.event_type_id || '');
      setValue('startDateTime', editingEvent.start_date ? editingEvent.start_date.slice(0, 16) : ''); // ISO to local
      setValue('endDateTime', editingEvent.end_date ? editingEvent.end_date.slice(0, 16) : '');
      setValue('status', editingEvent.status || 'published');
      setValue('points', editingEvent.points?.toString() || '');
      setValue('maxParticipants', editingEvent.max_participants?.toString() || '');

      // Устанавливаем формат по типу события
      const eventType = eventTypes.find(t => t.id === editingEvent.event_type_id);
      if (eventType) {
        setValue('format', eventType.is_online ? 'online' : 'offline');
        if (eventType.is_online) {
          setValue('meetingLink', editingEvent.meeting_link || '');
          setValue('location', ''); // Очищаем локацию для онлайн
        } else {
          setValue('location', editingEvent.location || '');
          setValue('meetingLink', ''); // Очищаем ссылку для оффлайн
        }
      } else if (editingEvent.meeting_link) {
        setValue('format', 'online');
        setValue('meetingLink', editingEvent.meeting_link);
      } else if (editingEvent.location) {
        setValue('format', 'offline');
        setValue('location', editingEvent.location);
      }

      // Префилл участников
      if (editingEvent.event_participants) {
        const participantIds = editingEvent.event_participants.map((p: any) => p.user_id);
        const selectedUsers = users.filter(u => participantIds.includes(u.id));
        setSelectedParticipants(selectedUsers);
      }
    }
  }, [editingEvent, eventTypes, users, setValue, isEditing]);

  useEffect(() => {
    let isCancelled = false;

    const loadInitialData = async () => {
      setInitialLoading(true);
      setInitialError(null);

      try {
        const [eventTypesResponse, usersResponse] = await Promise.all([
          supabase
            .from('event_types')
            .select('id, name, name_ru, is_online, requires_location, has_entry_test, has_final_test, has_feedback_form, description, default_points') // <- Фикс: добавили default_points
            .order('name_ru', { ascending: true }),
          supabase
            .from('users')
            .select('id, full_name, email, position, status, sap_number') // <- Фикс: добавили sap_number
            .eq('status', 'active')
            .order('full_name', { ascending: true })
        ]);

        if (eventTypesResponse.error) {
          throw eventTypesResponse.error;
        }

        if (usersResponse.error) {
          throw usersResponse.error;
        }

        if (!isCancelled) {
          setEventTypes(eventTypesResponse.data || []);
          setUsers((usersResponse.data || []).map(userRecord => ({
            id: userRecord.id,
            full_name: userRecord.full_name,
            email: userRecord.email,
            position: userRecord.position,
            sap_number: userRecord.sap_number
          })));
        }
      } catch (error) {
        console.error('Не удалось загрузить данные для создания мероприятия:', error);
        if (!isCancelled) {
          setInitialError('Не удалось загрузить типы мероприятий или список сотрудников. Попробуйте обновить страницу.');
        }
      } finally {
        if (!isCancelled) {
          setInitialLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isCancelled = true;
    };
  }, []);

  // <- Фикс: автоустановка формата и default_points по типу события
  useEffect(() => {
    if (selectedEventType) {
      setValue('format', selectedEventType.is_online ? 'online' : 'offline');
      // Автозаполнение баллов, если не заполнено
      if (!watchPoints && selectedEventType.default_points) {
        setValue('points', selectedEventType.default_points.toString());
      }
    }
  }, [selectedEventType, setValue, watchPoints]);

  const toggleParticipant = (participant: UserRecord) => {
    setSelectedParticipants(current => {
      const exists = current.some(item => item.id === participant.id);
      if (exists) {
        return current.filter(item => item.id !== participant.id);
      }
      return [...current, participant];
    });
  };

  const removeParticipant = (participantId: string) => {
    setSelectedParticipants(current => current.filter(item => item.id !== participantId));
  };

  // <- Фикс: обработка submit с поддержкой edit (update вместо insert)
  const onSubmit = async (values: FormValues) => {
    if (!canCreateEvents) {
      setSubmitError('У вас нет прав на создание мероприятий.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!values.startDateTime) {
        throw new Error('Укажите дату и время начала.');
      }

      if (!values.eventTypeId) {
        throw new Error('Выберите тип мероприятия.');
      }

      const startIso = new Date(values.startDateTime).toISOString();
      const endIso = values.endDateTime ? new Date(values.endDateTime).toISOString() : null;

      const formatType: EventFormat = values.format;

      const payload: EventInsertPayload = {
        title: values.title.trim(),
        description: values.description.trim() || null,
        event_type_id: values.eventTypeId,
        start_date: startIso,
        end_date: endIso,
        location: formatType === 'offline' ? values.location.trim() || null : null,
        meeting_link: formatType === 'online' ? values.meetingLink.trim() || null : null,
        points: values.points ? Number(values.points) : 0,
        max_participants: values.maxParticipants ? Number(values.maxParticipants) : null,
        status: values.status,
        creator_id: user?.id ?? null,
        updated_at: new Date().toISOString()
      };

      let eventId: string;

      if (isEditing && editingEvent?.id) {
        // Режим редактирования: update
        const { data: updatedEvent, error: updateError } = await supabase
          .from('events')
          .update(payload)
          .eq('id', editingEvent.id)
          .select('id')
          .single();

        if (updateError) {
          throw updateError;
        }
        eventId = updatedEvent.id;

        // Обновляем участников: удаляем старых, добавляем новых
        await supabase
          .from('event_participants')
          .delete()
          .eq('event_id', eventId);

        if (selectedParticipants.length > 0) {
          const participantsPayload = selectedParticipants.map(participant => ({
            event_id: eventId,
            user_id: participant.id,
            attended: false // <- Фикс: по умолчанию false
          }));

          const { error: participantsError } = await supabase
            .from('event_participants')
            .insert(participantsPayload);

          if (participantsError) {
            throw participantsError;
          }
        }
      } else {
        // Режим создания: insert
        const { data: event, error: eventError } = await supabase
          .from('events')
          .insert(payload)
          .select('id')
          .single();

        if (eventError) {
          throw eventError;
        }
        eventId = event.id;

        if (selectedParticipants.length > 0) {
          const participantsPayload = selectedParticipants.map(participant => ({
            event_id: eventId,
            user_id: participant.id,
            attended: false // <- Фикс: по умолчанию false
          }));

          const { error: participantsError } = await supabase
            .from('event_participants')
            .insert(participantsPayload);

          if (participantsError) {
            throw participantsError;
          }
        }
      }

      // Успех: если в модалке — вызываем onSuccess, иначе показываем successState
      if (onSuccess) {
        onSuccess(eventId); // <- Фикс: для модалки — закрытие + редирект в родителе
      } else {
        setSuccessState({
          eventId,
          title: values.title.trim(),
          startDateTime: values.startDateTime,
          eventType: selectedEventType?.name_ru,
          format: formatType,
          participantsCount: selectedParticipants.length
        });
        reset(defaultValues);
        setSelectedParticipants([]);
        setParticipantQuery('');
      }
    } catch (error) {
      console.error('Ошибка при создании/редактировании мероприятия:', error);
      setSubmitError(error instanceof Error ? error.message : 'Не удалось сохранить мероприятие. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const duration = useMemo(() => formatDuration(watchStart, watchEnd), [watchStart, watchEnd]);

  // <- Фикс: обработчик отмены с пропсом
  const handleCancelClick = () => {
    if (onCancel) {
      onCancel(); // Для модалки
    } else {
      navigate(-1); // Standalone
    }
  };

  if (!canCreateEvents) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="relative overflow-hidden rounded-[32px] border border-red-100 bg-gradient-to-br from-red-50 via-white to-white px-8 py-12 shadow-[0_44px_120px_-70px_rgba(127,29,29,0.2)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.15),transparent_60%)]" />
          <div className="relative flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Недостаточно прав</h1>
            <p className="mt-3 max-w-xl text-sm text-slate-600">
              Создавать мероприятия могут только тренеры, модераторы и администраторы. Если вам нужен доступ, обратитесь к своему куратору.
            </p>
            <button
              onClick={() => navigate('/events')}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Вернуться к мероприятиям
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[32px] border border-white/15 bg-gradient-to-br from-[#0EA47A] via-[#0E9F6E] to-[#0C8C5D] px-6 py-10 text-white shadow-[0_44px_120px_-70px_rgba(8,47,35,0.85)] sm:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),transparent_60%)]" />
        <div className="absolute -top-20 right-0 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute bottom-0 -left-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0)_45%)]" />

        <div className="relative flex flex-col gap-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-5">
              <button
                onClick={handleCancelClick} // <- Фикс: используем пропс-обработчик
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 transition hover:bg-white/20"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Назад к мероприятиям
              </button>

              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                  <Sparkles className="h-3.5 w-3.5" />
                  Мастер создания мероприятий
                </div>
                <h1 className="text-[30px] font-semibold leading-tight sm:text-[36px]">
                  {isEditing ? 'Редактируем мероприятие' : 'Создаём новое мероприятие'} {/* <- Фикс: заголовок для edit */}
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
                  {isEditing 
                    ? 'Обновите параметры и сохраните изменения.' 
                    : 'Сконцентрируйтесь на содержании — мы подсветим важные шаги, предложим тип мероприятия и подскажем, где ещё нужны детали.'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/70">Тип</p>
                <p className="text-sm font-semibold text-white">
                  {selectedEventType?.name_ru || 'Не выбран'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/70">Дата</p>
                <p className="text-sm font-semibold text-white">
                  {watchStart ? formatDateTime(watchStart) : 'Выберите дату'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                {watchFormat === 'online' ? <Video className="h-5 w-5 text-white" /> : <MapPin className="h-5 w-5 text-white" />}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/70">Формат</p>
                <p className="text-sm font-semibold text-white">
                  {watchFormat === 'online' ? 'Онлайн' : 'Офлайн'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/70">Участники</p>
                <p className="text-sm font-semibold text-white">
                  {selectedParticipants.length > 0 ? `${selectedParticipants.length} выбран${selectedParticipants.length === 1 ? '' : 'о'}` : 'Выберите позже'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* <- Фикс: success-state только если не в модалке (onSuccess обрабатывается в родителе) */}
      {!onSuccess && successState && (
        <section className="relative overflow-hidden rounded-[28px] border border-emerald-200/60 bg-emerald-50 px-6 py-8 shadow-[0_30px_80px_-60px_rgba(4,120,87,0.55)] sm:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.1),transparent_65%)]" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Мероприятие сохранено
              </div>
              <div>
                <h2 className="text-xl font-semibold text-emerald-900">{successState.title}</h2>
                <p className="mt-2 text-sm text-emerald-800/80">
                  {successState.eventType || 'Мероприятие'} • {formatDateTime(successState.startDateTime)} • {successState.format === 'online' ? 'Онлайн' : 'Офлайн'}
                </p>
                <p className="text-sm text-emerald-800/80">
                  Участников добавлено: {successState.participantsCount}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate(`/event/${successState.eventId}`)}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Открыть карточку события
              </button>
              <button
                onClick={() => navigate('/events')}
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300 bg-white/70 px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
              >
                Вернуться к списку
              </button>
            </div>
          </div>
        </section>
      )}

      {initialError && (
        <div className="rounded-3xl border border-red-100 bg-red-50/80 p-6 text-sm text-red-700">
          {initialError}
        </div>
      )}

      {initialLoading ? (
        <div className="flex justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm font-medium">Загружаем типы мероприятий и список сотрудников…</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <section className="rounded-[28px] border border-slate-200/60 bg-white/90 p-6 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Основная информация</h2>
                  <p className="text-sm text-slate-500">Название, описание и тип помогут сформировать ожидания участников.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                  <Award className="h-3.5 w-3.5" />
                  Заполните поля с *
                </div>
              </div>

              <div className="mt-6 grid gap-5">
                <div>
                  <label htmlFor="title" className="mb-2 block text-sm font-medium text-slate-700">
                    Название мероприятия *
                  </label>
                  <input
                    id="title"
                    type="text"
                    {...register('title', { required: 'Укажите название мероприятия' })}
                    placeholder="Например, Тренинг по развитию экспертных продаж"
                    className={clsx(
                      'w-full rounded-2xl border bg-white px-4 py-3 text-sm shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100',
                      errors.title ? 'border-red-300' : 'border-slate-200'
                    )}
                  />
                  {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
                </div>

                <div>
                  <label htmlFor="description" className="mb-2 block text-sm font-medium text-slate-700">
                    Краткое описание
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    {...register('description')}
                    placeholder="Опишите цель и ключевые результаты, которых хотите достичь с участниками."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="eventTypeId" className="mb-2 block text-sm font-medium text-slate-700">
                      Тип мероприятия *
                    </label>
                    <div className="relative">
                      <select
                        id="eventTypeId"
                        {...register('eventTypeId', { required: 'Выберите тип мероприятия' })}
                        className={clsx(
                          'w-full appearance-none rounded-2xl border bg-white px-4 py-3 text-sm shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100',
                          errors.eventTypeId ? 'border-red-300' : 'border-slate-200'
                        )}
                      >
                        <option value="">Выберите тип</option>
                        {eventTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.name_ru}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">▾</div>
                    </div>
                    {errors.eventTypeId && <p className="mt-1 text-sm text-red-600">{errors.eventTypeId.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="status" className="mb-2 block text-sm font-medium text-slate-700">
                      Статус *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['draft', 'published'] as EventStatus[]).map(statusValue => {
                        const isActive = watchStatus === statusValue;
                        return (
                          <button
                            key={statusValue}
                            type="button"
                            onClick={() => setValue('status', statusValue, { shouldDirty: true })}
                            className={clsx(
                              'flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition',
                              isActive
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm'
                                : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:text-emerald-600'
                            )}
                          >
                            <span>{formatStatus(statusValue)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {selectedEventType?.description && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-800">
                    {selectedEventType.description}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200/60 bg-white/90 p-6 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Расписание и формат</h2>
                  <p className="text-sm text-slate-500">Дата, длительность и формат помогут участникам спланировать участие.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="startDateTime" className="mb-2 block text-sm font-medium text-slate-700">
                      Начало *
                    </label>
                    <input
                      id="startDateTime"
                      type="datetime-local"
                      {...register('startDateTime', { required: 'Укажите дату и время начала' })}
                      className={clsx(
                        'w-full rounded-2xl border bg-white px-4 py-3 text-sm shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100',
                        errors.startDateTime ? 'border-red-300' : 'border-slate-200'
                      )}
                    />
                    {errors.startDateTime && <p className="mt-1 text-sm text-red-600">{errors.startDateTime.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="endDateTime" className="mb-2 block text-sm font-medium text-slate-700">
                      Окончание
                    </label>
                    <input
                      id="endDateTime"
                      type="datetime-local"
                      {...register('endDateTime', {
                        validate: value => {
                          if (!value) return true;
                          if (!watchStart) return 'Сначала укажите дату начала';
                          const startDate = new Date(watchStart);
                          const endDate = new Date(value);
                          return endDate > startDate || 'Дата окончания должна быть позже начала';
                        }
                      })}
                      className={clsx(
                        'w-full rounded-2xl border bg-white px-4 py-3 text-sm shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100',
                        errors.endDateTime ? 'border-red-300' : 'border-slate-200'
                      )}
                    />
                    {errors.endDateTime && <p className="mt-1 text-sm text-red-600">{errors.endDateTime.message}</p>}
                    {duration && <p className="mt-1 text-xs text-emerald-600">Продолжительность: {duration}</p>}
                  </div>
                </div>

                <div>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Формат проведения *</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(['online', 'offline'] as EventFormat[]).map(formatValue => {
                      const isActive = watchFormat === formatValue;
                      return (
                        <button
                          key={formatValue}
                          type="button"
                          onClick={() => setValue('format', formatValue, { shouldDirty: true })}
                          className={clsx(
                            'flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition',
                            isActive
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-600'
                          )}
                        >
                          <div className="mt-0.5">
                            {formatValue === 'online' ? (
                              <Video className="h-5 w-5" />
                            ) : (
                              <MapPin className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {formatValue === 'online' ? 'Онлайн-формат' : 'Офлайн-формат'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatValue === 'online'
                                ? 'Ссылку на подключение увидят все приглашённые участники.'
                                : 'Укажите площадку или адрес, чтобы участники не перепутали место встречи.'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="meetingLink" className="mb-2 block text-sm font-medium text-slate-700">
                      Ссылка на подключение {watchFormat === 'online' && '*'}
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                        <LinkIcon className="h-4 w-4" />
                      </div>
                      <input
                        id="meetingLink"
                        type="url"
                        {...register('meetingLink', {
                          validate: value => {
                            if (watchFormat !== 'online') return true;
                            if (!value) return 'Добавьте ссылку на подключение';
                            return true;
                          }
                        })}
                        placeholder="https://meet.google.com/..."
                        className={clsx(
                          'w-full rounded-2xl border bg-white px-10 py-3 text-sm shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100',
                          errors.meetingLink ? 'border-red-300' : 'border-slate-200',
                          watchFormat !== 'online' && 'opacity-60'
                        )}
                        disabled={watchFormat !== 'online'}
                      />
                    </div>
                    {errors.meetingLink && <p className="mt-1 text-sm text-red-600">{errors.meetingLink.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="location" className="mb-2 block text-sm font-medium text-slate-700">
                      Локация {watchFormat === 'offline' && '*'}
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <input
                        id="location"
                        type="text"
                        {...register('location', {
                          validate: value => {
                            if (watchFormat !== 'offline') return true;
                            if (!value?.trim()) return 'Укажите площадку проведения';
                            return true;
                          }
                        })}
                        placeholder="Например, Москва, офис SNS, аудитория 3.2"
                        className={clsx(
                          'w-full rounded-2xl border bg-white px-10 py-3 text-sm shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100',
                          errors.location ? 'border-red-300' : 'border-slate-200',
                          watchFormat !== 'offline' && 'opacity-60'
                        )}
                        disabled={watchFormat !== 'offline'}
                      />
                    </div>
                    {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="points" className="mb-2 block text-sm font-medium text-slate-700">
                      Баллы за участие
                    </label>
                    <input
                      id="points"
                      type="number"
                      min={0}
                      {...register('points', {
                        validate: value => {
                          if (!value) return true;
                          const numberValue = Number(value);
                          if (Number.isNaN(numberValue)) return 'Введите число';
                          if (numberValue < 0) return 'Баллы не могут быть отрицательными';
                          return true;
                        }
                      })}
                      placeholder="Например, 50"
                      className={clsx(
                        'w-full rounded-2xl border bg-white px-4 py-3 text-sm shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100',
                        errors.points ? 'border-red-300' : 'border-slate-200'
                      )}
                    />
                    {errors.points && <p className="mt-1 text-sm text-red-600">{errors.points.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="maxParticipants" className="mb-2 block text-sm font-medium text-slate-700">
                      Лимит участников
                    </label>
                    <input
                      id="maxParticipants"
                      type="number"
                      min={0}
                      {...register('maxParticipants', {
                        validate: value => {
                          if (!value) return true;
                          const numberValue = Number(value);
                          if (Number.isNaN(numberValue)) return 'Введите число';
                          if (numberValue < 0) return 'Количество не может быть отрицательным';
                          return true;
                        }
                      })}
                      placeholder="Оставьте пустым, если без ограничений"
                      className={clsx(
                        'w-full rounded-2xl border bg-white px-4 py-3 text-sm shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100',
                        errors.maxParticipants ? 'border-red-300' : 'border-slate-200'
                      )}
                    />
                    {errors.maxParticipants && <p className="mt-1 text-sm text-red-600">{errors.maxParticipants.message}</p>}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200/60 bg-white/90 p-6 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Участники</h2>
                  <p className="text-sm text-slate-500">Добавьте людей сейчас или вернитесь к этому после сохранения.</p>
                </div>
                <span className="rounded-full bg-slate-900/90 px-3 py-1 text-xs font-semibold text-white">
                  {selectedParticipants.length} выбрано
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {selectedParticipants.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedParticipants.map(participant => (
                      <button
                        type="button"
                        key={participant.id}
                        onClick={() => removeParticipant(participant.id)}
                        className="group inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                      >
                        <span>{participant.full_name}</span>
                        <span className="text-emerald-500 group-hover:text-emerald-600">×</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={participantQuery}
                    onChange={event => setParticipantQuery(event.target.value)}
                    placeholder="Найдите сотрудника по имени или email"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div className="grid gap-2 max-h-60 overflow-y-auto"> {/* <- Фикс: скролл для модалки */}
                  {filteredUsers.length === 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                      Не нашли никого по запросу «{participantQuery}». Попробуйте изменить поисковую фразу.
                    </div>
                  )}

                  {filteredUsers.map(userRecord => {
                    const isSelected = selectedParticipants.some(participant => participant.id === userRecord.id);
                    return (
                      <button
                        key={userRecord.id}
                        type="button"
                        onClick={() => toggleParticipant(userRecord)}
                        className={clsx(
                          'flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition',
                          isSelected
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-600'
                        )}
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{userRecord.full_name}</p>
                          <p className="text-xs text-slate-500">{userRecord.email}</p>
                          {userRecord.position && <p className="text-xs text-slate-400">{userRecord.position}</p>}
                          {userRecord.sap_number && <p className="text-xs text-slate-400">SAP: {userRecord.sap_number}</p>}
                        </div>
                        <div className={clsx(
                          'flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold transition',
                          isSelected
                            ? 'border-emerald-400 bg-emerald-500 text-white shadow-inner'
                            : 'border-slate-200 bg-white text-slate-400'
                        )}
                        >
                          {isSelected ? '✓' : '+'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {submitError && (
              <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {submitError}
              </div>
            )}

            {/* <- Фикс: кнопки в sticky bottom только если не в модалке; в модалке — родитель управляет */}
            {!onCancel && (
              <div className="sticky bottom-6 z-10 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200/70 bg-white/95 px-5 py-4 shadow-[0_28px_48px_-36px_rgba(15,23,42,0.4)] backdrop-blur">
                <div className="text-xs text-slate-500">
                  {watchTitle ? 'Не забудьте проверить дату и список участников перед публикацией.' : 'Сначала заполните ключевые поля, чтобы активировать сохранение.'}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleCancelClick}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0EA47A] via-[#0E9F6E] to-[#0C8C5D] px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Сохраняем…
                      </>
                    ) : (
                      isEditing ? 'Обновить мероприятие' : 'Сохранить мероприятие'
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* <- Фикс: aside с предпросмотром только если не в модалке (в модалке — компактнее) */}
          {!onCancel && (
            <aside className="space-y-4 xl:sticky xl:top-6">
              <div className="rounded-[28px] border border-white/60 bg-white/90 p-6 shadow-[0_32px_70px_-40px_rgba(15,23,42,0.4)] backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">Предпросмотр</h3>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                    {formatStatus(watchStatus)}
                  </span>
                </div>
                <div className="mt-4 space-y-4 text-sm text-slate-600">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Название</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{watchTitle || 'Добавьте название'}</p>
                    {watchDescription && <p className="mt-1 text-xs text-slate-500">{watchDescription}</p>}
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      <Calendar className="h-4 w-4 text-emerald-500" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Начало</p>
                        <p className="text-sm font-medium text-slate-800">{formatDateTime(watchStart)}</p>
                      </div>
                    </div>
                    {watchEnd && (
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                        <Clock className="h-4 w-4 text-emerald-500" />
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Окончание</p>
                          <p className="text-sm font-medium text-slate-800">{formatDateTime(watchEnd)}</p>
                          {duration && <p className="text-xs text-emerald-600">Длительность: {duration}</p>}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      {watchFormat === 'online' ? <Video className="h-4 w-4 text-emerald-500" /> : <MapPin className="h-4 w-4 text-emerald-500" />}
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Формат</p>
                        <p className="text-sm font-medium text-slate-800">
                          {watchFormat === 'online' ? 'Онлайн' : 'Офлайн'}
                        </p>
                        {watchFormat === 'online' && watchMeetingLink && (
                          <p className="text-xs text-slate-500 break-words">{watchMeetingLink}</p>
                        )}
                        {watchFormat === 'offline' && watchLocation && (
                          <p className="text-xs text-slate-500">{watchLocation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="uppercase tracking-[0.12em] text-slate-400">Баллы</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{watchPoints || '0'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="uppercase tracking-[0.12em] text-slate-400">Лимит</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{watchMaxParticipants || 'Не ограничено'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Участники</p>
                    {selectedParticipants.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {selectedParticipants.slice(0, 4).map(participant => (
                          <li key={participant.id} className="text-xs text-slate-600">
                            {participant.full_name}
                          </li>
                        ))}
                        {selectedParticipants.length > 4 && (
                          <li className="text-xs text-slate-400">
                            + ещё {selectedParticipants.length - 4}
                          </li>
                        )}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">Вы ещё не добавили участников.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 text-xs text-slate-500 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.35)] backdrop-blur">
                <p className="font-semibold text-slate-700">Подсказки</p>
                <ul className="mt-3 space-y-2">
                  <li>• После сохранения вы сможете добавить материалы и опубликовать анонс.</li>
                  <li>• Проверяйте, совпадает ли формат с выбранным типом мероприятия.</li>
                  <li>• Если не уверены в списке участников, сохраните черновик — никто не получит уведомления.</li>
                </ul>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}