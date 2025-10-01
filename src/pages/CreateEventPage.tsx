import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Link as LinkIcon,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Star,
  Users
} from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

dayjs.locale('ru');

interface EventTypeOption {
  id: string;
  name: string;
  name_ru: string;
  is_online?: boolean;
  is_exam?: boolean;
  default_points?: number | null;
}

interface ParticipantOption {
  id: string;
  full_name: string;
  email?: string;
  sap_number?: string;
  position?: string;
  branch_id?: string | null;
}

interface CreateEventFormState {
  title: string;
  description: string;
  event_type_id: string;
  start_date: string;
  end_date: string;
  location: string;
  meeting_link: string;
  points: string;
  max_participants: string;
  status: 'draft' | 'published';
}

interface CreateEventPageProps {
  onCancel?: () => void;
  onSuccess?: (eventId?: string) => void;
}

type FormErrorState = Record<string, string>;

const initialFormState: CreateEventFormState = {
  title: '',
  description: '',
  event_type_id: '',
  start_date: '',
  end_date: '',
  location: '',
  meeting_link: '',
  points: '',
  max_participants: '',
  status: 'published'
};

const chipsPalette = [
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700'
];

const MIN_TITLE_LENGTH = 5;

function buildEventPreview(
  form: CreateEventFormState,
  type: EventTypeOption | undefined,
  participants: ParticipantOption[]
): string[] {
  const rows: string[] = [];

  if (type) {
    rows.push(`Тип: ${type.name_ru}`);
  }
  if (form.start_date) {
    rows.push(`Начало: ${dayjs(form.start_date).format('D MMMM YYYY, HH:mm')}`);
  }
  if (form.end_date) {
    rows.push(`Окончание: ${dayjs(form.end_date).format('D MMMM YYYY, HH:mm')}`);
  }
  if (form.location) {
    rows.push(`Локация: ${form.location}`);
  }
  if (form.meeting_link) {
    rows.push(`Ссылка: ${form.meeting_link}`);
  }
  if (participants.length > 0) {
    rows.push(`Участники: ${participants.length}`);
  }
  if (form.points) {
    rows.push(`Баллы: ${form.points}`);
  }

  rows.push(`Статус: ${form.status === 'published' ? 'Опубликовано' : 'Черновик'}`);

  return rows;
}

function getChipColor(index: number) {
  return chipsPalette[index % chipsPalette.length];
}

export default function CreateEventPage({ onCancel, onSuccess }: CreateEventPageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState<CreateEventFormState>(initialFormState);
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>([]);
  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrorState>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    const loadEventTypes = async () => {
      setIsLoadingTypes(true);
      const { data, error } = await supabase
        .from('event_types')
        .select('id, name, name_ru, is_online, is_exam, default_points')
        .order('name_ru', { ascending: true });

      if (error) {
        console.error('Не удалось загрузить типы мероприятий', error);
      }

      setEventTypes(data ?? []);
      setIsLoadingTypes(false);
    };

    loadEventTypes();
  }, []);

  useEffect(() => {
    const loadParticipants = async () => {
      setIsLoadingParticipants(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, sap_number, position, branch_id, status')
        .eq('status', 'active')
        .order('full_name');

      if (error) {
        console.error('Не удалось загрузить пользователей', error);
      }

      setParticipants(
        (data ?? []).map(user => ({
          id: user.id,
          full_name: user.full_name,
          email: user.email ?? undefined,
          sap_number: user.sap_number ?? undefined,
          position: user.position ?? undefined,
          branch_id: user.branch_id ?? undefined
        }))
      );
      setIsLoadingParticipants(false);
    };

    loadParticipants();
  }, []);

  useEffect(() => {
    if (!form.event_type_id) {
      return;
    }

    const selectedType = eventTypes.find(type => type.id === form.event_type_id);
    if (!selectedType) {
      return;
    }

    setForm(prev => ({
      ...prev,
      points: prev.points || (selectedType.default_points?.toString() ?? ''),
      meeting_link: selectedType.is_online ? prev.meeting_link : '',
      location: selectedType.is_online ? '' : prev.location
    }));
  }, [form.event_type_id, eventTypes]);

  const filteredParticipants = useMemo(() => {
    if (!searchTerm.trim()) {
      return participants;
    }

    const normalized = searchTerm.trim().toLowerCase();
    return participants.filter(participant => {
      return (
        participant.full_name.toLowerCase().includes(normalized) ||
        participant.email?.toLowerCase().includes(normalized) ||
        participant.sap_number?.toLowerCase().includes(normalized)
      );
    });
  }, [participants, searchTerm]);

  const selectedParticipants = useMemo(() => {
    if (!selectedParticipantIds.length) {
      return [];
    }

    const ids = new Set(selectedParticipantIds);
    return participants.filter(participant => ids.has(participant.id));
  }, [participants, selectedParticipantIds]);

  const selectedType = useMemo(
    () => eventTypes.find(type => type.id === form.event_type_id),
    [eventTypes, form.event_type_id]
  );

  const previewRows = useMemo(
    () => buildEventPreview(form, selectedType, selectedParticipants),
    [form, selectedType, selectedParticipants]
  );

  const participantStats = useMemo(() => {
    if (!participants.length) {
      return { selected: 0, total: 0 };
    }

    return {
      selected: selectedParticipantIds.length,
      total: participants.length
    };
  }, [participants.length, selectedParticipantIds.length]);

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipantIds(prev =>
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const handleInputChange = <K extends keyof CreateEventFormState>(field: K, value: CreateEventFormState[K]) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const nextErrors: FormErrorState = {};

    if (!form.title.trim()) {
      nextErrors.title = 'Название обязательно';
    } else if (form.title.trim().length < MIN_TITLE_LENGTH) {
      nextErrors.title = `Минимум ${MIN_TITLE_LENGTH} символов`;
    }

    if (!form.event_type_id) {
      nextErrors.event_type_id = 'Выберите тип мероприятия';
    }

    if (!form.start_date) {
      nextErrors.start_date = 'Укажите дату начала';
    }

    if (form.end_date && form.start_date && dayjs(form.end_date).isBefore(dayjs(form.start_date))) {
      nextErrors.end_date = 'Окончание не может быть раньше старта';
    }

    if (!selectedType?.is_online && !form.location.trim()) {
      nextErrors.location = 'Укажите место проведения';
    }

    if (selectedType?.is_online && !form.meeting_link.trim()) {
      nextErrors.meeting_link = 'Добавьте ссылку для онлайн мероприятия';
    }

    if (form.points) {
      const parsedPoints = Number(form.points);
      if (Number.isNaN(parsedPoints) || parsedPoints < 0) {
        nextErrors.points = 'Введите неотрицательное число';
      }
    }

    if (form.max_participants) {
      const parsedMax = Number(form.max_participants);
      if (!Number.isInteger(parsedMax) || parsedMax <= 0) {
        nextErrors.max_participants = 'Введите положительное целое число';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetPageState = () => {
    setForm(initialFormState);
    setSelectedParticipantIds([]);
    setSearchTerm('');
  };

  const handleSuccess = (eventId?: string) => {
    if (onSuccess) {
      onSuccess(eventId);
      return;
    }

    resetPageState();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!user) {
      setGlobalError('Не удалось определить пользователя. Перезайдите в систему.');
      return;
    }

    setIsSaving(true);
    setGlobalError(null);

    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          title: form.title.trim(),
          description: form.description.trim() || null,
          event_type_id: form.event_type_id,
          start_date: form.start_date,
          end_date: form.end_date || null,
          location: form.location.trim() || null,
          meeting_link: form.meeting_link.trim() || null,
          points: form.points ? Number(form.points) : null,
          max_participants: form.max_participants ? Number(form.max_participants) : null,
          status: form.status,
          creator_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      const eventId = data?.id;

      if (eventId && selectedParticipantIds.length) {
        const participantRows = selectedParticipantIds.map(participantId => ({
          event_id: eventId,
          user_id: participantId,
          attended: false
        }));

        const { error: participantsError } = await supabase
          .from('event_participants')
          .insert(participantRows);

        if (participantsError) {
          throw participantsError;
        }
      }

      handleSuccess(eventId);
    } catch (error) {
      console.error('Не удалось создать мероприятие', error);
      setGlobalError('Не удалось сохранить мероприятие. Попробуйте ещё раз.');
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isLoadingTypes || isLoadingParticipants;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }

    navigate(-1);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 pb-20">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-[#0E9F6E]/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-white/40 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-10">
        <header className="flex flex-col gap-6 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl shadow-emerald-100/50 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex w-max items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Новое мероприятие</h1>
                <p className="text-sm text-slate-500 sm:text-base">
                  Заполните основные параметры, выберите участников и опубликуйте событие в пару кликов.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 text-sm text-slate-500 sm:items-end">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 shadow-sm">
              <Users className="h-4 w-4 text-emerald-500" />
              <div className="flex items-baseline gap-1 text-slate-700">
                <span className="text-xl font-semibold text-slate-900">{participantStats.selected}</span>
                <span>/</span>
                <span>{participantStats.total}</span>
              </div>
              <span>участников</span>
            </div>
            {selectedType && (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 shadow-sm">
                <Calendar className="h-4 w-4 text-sky-500" />
                <span className="text-slate-600">{selectedType.name_ru}</span>
              </div>
            )}
          </div>
        </header>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Основные данные</h2>
                  <p className="text-sm text-slate-500">Название, формат и описание помогут коллегам быстро понять содержание.</p>
                </div>
                <Star className="h-6 w-6 text-amber-400" />
              </div>

              <div className="space-y-5">
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>Название</span>
                    {errors.title && <span className="text-xs font-normal text-rose-500">{errors.title}</span>}
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={event => handleInputChange('title', event.target.value)}
                    placeholder="Например, Онлайн-сессия для менеджеров"
                    className={clsx(
                      'mt-1 w-full rounded-2xl border bg-white/80 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100',
                      errors.title ? 'border-rose-300' : 'border-slate-200'
                    )}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Описание</label>
                  <textarea
                    value={form.description}
                    onChange={event => handleInputChange('description', event.target.value)}
                    placeholder="Кратко расскажите, о чем мероприятие, и какие ожидания у участников"
                    rows={4}
                    className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>Тип мероприятия</span>
                    {errors.event_type_id && <span className="text-xs font-normal text-rose-500">{errors.event_type_id}</span>}
                  </label>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {isLoadingTypes ? (
                      <div className="flex h-32 items-center justify-center rounded-2xl border border-slate-200 bg-white/70">
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                      </div>
                    ) : (
                      eventTypes.map(type => {
                        const isActive = form.event_type_id === type.id;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => handleInputChange('event_type_id', type.id)}
                            className={clsx(
                              'flex items-start gap-3 rounded-2xl border px-4 py-4 text-left shadow-sm transition',
                              isActive
                                ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700 shadow-emerald-100'
                                : 'border-slate-200 bg-white/70 text-slate-600 hover:border-emerald-200/80 hover:bg-emerald-50/40'
                            )}
                          >
                            <div className={clsx('mt-1 h-2.5 w-2.5 rounded-full', isActive ? 'bg-emerald-500' : 'bg-slate-200')} />
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{type.name_ru}</p>
                              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                {type.is_online ? 'Онлайн формат' : 'Очное участие'}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Расписание и логистика</h2>
                  <p className="text-sm text-slate-500">Укажите даты и дополнительные параметры события.</p>
                </div>
                <Clock className="h-6 w-6 text-slate-400" />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>Дата и время начала</span>
                    {errors.start_date && <span className="text-xs font-normal text-rose-500">{errors.start_date}</span>}
                  </label>
                  <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                    <input
                      type="datetime-local"
                      value={form.start_date}
                      onChange={event => handleInputChange('start_date', event.target.value)}
                      className="w-full border-0 bg-transparent text-sm outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>Окончание</span>
                    {errors.end_date && <span className="text-xs font-normal text-rose-500">{errors.end_date}</span>}
                  </label>
                  <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <input
                      type="datetime-local"
                      value={form.end_date}
                      onChange={event => handleInputChange('end_date', event.target.value)}
                      className="w-full border-0 bg-transparent text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>{selectedType?.is_online ? 'Ссылка на встречу' : 'Локация'}</span>
                    {selectedType?.is_online && errors.meeting_link && (
                      <span className="text-xs font-normal text-rose-500">{errors.meeting_link}</span>
                    )}
                    {!selectedType?.is_online && errors.location && (
                      <span className="text-xs font-normal text-rose-500">{errors.location}</span>
                    )}
                  </label>
                  <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                    {selectedType?.is_online ? (
                      <LinkIcon className="h-4 w-4 text-sky-500" />
                    ) : (
                      <MapPin className="h-4 w-4 text-rose-400" />
                    )}
                    <input
                      type="text"
                      value={selectedType?.is_online ? form.meeting_link : form.location}
                      onChange={event =>
                        selectedType?.is_online
                          ? handleInputChange('meeting_link', event.target.value)
                          : handleInputChange('location', event.target.value)
                      }
                      placeholder={selectedType?.is_online ? 'https://meet...' : 'Москва, офис на Тверской, зал №2'}
                      className="w-full border-0 bg-transparent text-sm outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>Баллы за участие</span>
                    {errors.points && <span className="text-xs font-normal text-rose-500">{errors.points}</span>}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.points}
                    onChange={event => handleInputChange('points', event.target.value)}
                    className={clsx(
                      'mt-1 w-full rounded-2xl border bg-white/80 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100',
                      errors.points ? 'border-rose-300' : 'border-slate-200'
                    )}
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>Максимум участников</span>
                    {errors.max_participants && <span className="text-xs font-normal text-rose-500">{errors.max_participants}</span>}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.max_participants}
                    onChange={event => handleInputChange('max_participants', event.target.value)}
                    className={clsx(
                      'mt-1 w-full rounded-2xl border bg-white/80 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100',
                      errors.max_participants ? 'border-rose-300' : 'border-slate-200'
                    )}
                  />
                </div>

                <div className="sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Статус</span>
                  <div className="mt-3 flex gap-3">
                    {(['published', 'draft'] as const).map(status => {
                      const isActive = form.status === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleInputChange('status', status)}
                          className={clsx(
                            'flex flex-1 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm shadow-sm transition',
                            isActive
                              ? 'border-emerald-300 bg-emerald-50/80 text-emerald-700 shadow-emerald-100'
                              : 'border-slate-200 bg-white/70 text-slate-600 hover:border-emerald-200/80 hover:bg-emerald-50/40'
                          )}
                        >
                          <div>
                            <p className="font-semibold capitalize">
                              {status === 'published' ? 'Опубликовано' : 'Черновик'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {status === 'published'
                                ? 'Участники увидят мероприятие сразу после сохранения'
                                : 'Можете вернуться и завершить заполнение позже'}
                            </p>
                          </div>
                          <CheckCircle2 className={clsx('h-5 w-5', isActive ? 'text-emerald-500' : 'text-slate-300')} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Участники</h2>
                  <p className="text-sm text-slate-500">Используйте поиск, чтобы быстро подобрать коллег и команды.</p>
                </div>
                <Users className="h-6 w-6 text-emerald-500" />
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={event => setSearchTerm(event.target.value)}
                      placeholder="Поиск по имени, email или SAP"
                      className="w-full border-0 bg-transparent text-sm outline-none"
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    Выбрано участников: <span className="font-medium text-slate-700">{selectedParticipantIds.length}</span>
                  </div>
                </div>

                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {isLoadingParticipants ? (
                    <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white/70">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                    </div>
                  ) : filteredParticipants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white/70 py-12 text-center text-sm text-slate-500">
                      <AlertCircle className="h-5 w-5 text-slate-400" />
                      По вашему запросу ничего не найдено
                    </div>
                  ) : (
                    filteredParticipants.map((participant, index) => {
                      const isSelected = selectedParticipantIds.includes(participant.id);
                      return (
                        <button
                          key={participant.id}
                          type="button"
                          onClick={() => toggleParticipant(participant.id)}
                          className={clsx(
                            'flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm shadow-sm transition',
                            isSelected
                              ? 'border-emerald-200 bg-emerald-50/90 text-emerald-700 shadow-emerald-100'
                              : 'border-slate-200 bg-white/80 text-slate-600 hover:border-emerald-200/80 hover:bg-emerald-50/40'
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{participant.full_name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              {participant.email && <span>{participant.email}</span>}
                              {participant.sap_number && <span>SAP: {participant.sap_number}</span>}
                              {participant.position && <span>{participant.position}</span>}
                            </div>
                          </div>
                          <div className={clsx('text-xs font-medium', getChipColor(index))}>
                            {isSelected ? 'В списке' : 'Добавить'}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {selectedParticipants.length > 0 && (
                  <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 text-xs text-emerald-700">
                    <p className="font-semibold">Уже выбрали:</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedParticipants.slice(0, 8).map((participant, index) => (
                        <span
                          key={participant.id}
                          className={clsx(
                            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium shadow-sm',
                            getChipColor(index)
                          )}
                        >
                          <Users className="h-3 w-3" />
                          {participant.full_name}
                        </span>
                      ))}
                      {selectedParticipants.length > 8 && (
                        <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
                          +{selectedParticipants.length - 8}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-6">
            <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-slate-900">Предпросмотр</h2>
              <p className="mt-1 text-sm text-slate-500">Проверьте ключевые детали, прежде чем сохранить мероприятие.</p>

              <div className="mt-6 space-y-4">
                {previewRows.map((row, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white/60 px-4 py-3 text-sm text-slate-600">
                    <ChevronRight className="mt-1 h-4 w-4 text-emerald-500" />
                    <span>{row}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 text-emerald-800 shadow-[0_28px_60px_-40px_rgba(16,185,129,0.45)] backdrop-blur-xl">
              <h2 className="text-lg font-semibold">Готовы опубликовать?</h2>
              <p className="mt-1 text-sm text-emerald-700">
                Проверяем, что все данные заполнены. Вы всегда сможете вернуться и отредактировать событие.
              </p>

              {globalError && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-white/70 px-4 py-3 text-sm text-rose-600">
                  {globalError}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isLoading || isSaving}
                  className={clsx(
                    'inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-600',
                    (isLoading || isSaving) && 'cursor-not-allowed opacity-60'
                  )}
                >
                  {(isLoading || isSaving) && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSaving ? 'Сохраняем…' : 'Сохранить мероприятие'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white/80 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-white"
                >
                  Отменить
                </button>
              </div>

              <p className="mt-4 text-xs text-emerald-700/80">
                После сохранения участники получат приглашение в зависимости от настроек уведомлений.
              </p>
            </section>
          </aside>
        </form>
      </div>
    </div>
  );
}
