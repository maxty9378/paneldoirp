import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Link as LinkIcon,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Users,
  AlertCircle,
  Star,
  ChevronRight
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

interface FormErrorState {
  [key: string]: string;
}

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

function buildEventPreview(form: CreateEventFormState, type?: EventTypeOption | null, participants: ParticipantOption[]): string[] {
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

const chipsPalette = [
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700'
];

function getChipColor(index: number) {
  return chipsPalette[index % chipsPalette.length];
}

const MIN_TITLE_LENGTH = 5;

export default function CreateEventPage({ onCancel, onSuccess }: CreateEventPageProps) {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
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
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | undefined>(undefined);

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

      setParticipants((data ?? []).map(user => ({
        id: user.id,
        full_name: user.full_name,
        email: user.email ?? undefined,
        sap_number: user.sap_number ?? undefined,
        position: user.position ?? undefined,
        branch_id: user.branch_id ?? undefined
      })));
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

  const selectedParticipants = useMemo(
    () => participants.filter(participant => selectedParticipantIds.includes(participant.id)),
    [participants, selectedParticipantIds]
  );

  const currentEventType = eventTypes.find(type => type.id === form.event_type_id);
  const previewRows = buildEventPreview(form, currentEventType, selectedParticipants);

  const handleFieldChange = (field: keyof CreateEventFormState, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
    setErrors(prev => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleToggleParticipant = (participantId: string) => {
    setSelectedParticipantIds(prev =>
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
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
      nextErrors.end_date = 'Дата окончания не может быть раньше начала';
    }

    if (currentEventType?.is_online && !form.meeting_link.trim()) {
      nextErrors.meeting_link = 'Для онлайн формата нужна ссылка';
    }

    if (!currentEventType?.is_online && !currentEventType?.is_exam && !form.location.trim()) {
      nextErrors.location = 'Укажите место проведения';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetForm = () => {
    setForm(initialFormState);
    setSelectedParticipantIds([]);
    setSearchTerm('');
    setErrors({});
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setGlobalError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_type_id: form.event_type_id,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        location: form.location.trim() || null,
        meeting_link: form.meeting_link.trim() || null,
        points: form.points ? Number(form.points) : 0,
        max_participants: form.max_participants ? Number(form.max_participants) : null,
        status: form.status,
        creator_id: userProfile?.id ?? user?.id ?? undefined
      };

      const { data: createdEvent, error: createError } = await supabase
        .from('events')
        .insert(payload)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      if (createdEvent?.id && selectedParticipantIds.length > 0) {
        const participantsPayload = selectedParticipantIds.map(userId => ({
          event_id: createdEvent.id,
          user_id: userId
        }));

        const { error: participantsError } = await supabase
          .from('event_participants')
          .insert(participantsPayload);

        if (participantsError) {
          console.error('Не удалось назначить участников', participantsError);
        }
      }

      setCreatedEventId(createdEvent?.id);
      setIsSuccess(true);
      resetForm();
      onSuccess?.(createdEvent?.id);
    } catch (error: any) {
      console.error('Ошибка создания мероприятия', error);
      setGlobalError(error?.message ?? 'Не удалось создать мероприятие');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/events');
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-slate-50 via-white to-slate-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06A478] via-[#0bb07b] to-[#0d9488] text-white shadow-2xl">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.4),_rgba(6,164,120,0))]" />
          <div className="relative z-10 px-6 py-8 sm:px-10">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Вернуться назад
            </button>
            <div className="mt-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-sm">
                  <Sparkles className="h-4 w-4" />
                  Новый формат мероприятия
                </div>
                <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">
                  Создание мероприятия
                </h1>
                <p className="text-white/80 max-w-2xl">
                  Заполните информацию о событии, выберите формат и участников. Мы сохраним структуру в стиле дашборта,
                  чтобы вам было привычно и удобно работать.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {['Участники', 'Материалы', 'Задачи', 'Рассылки'].map((item, index) => (
                  <div
                    key={item}
                    className={clsx(
                      'rounded-2xl px-4 py-3 text-sm font-medium bg-white/10 backdrop-blur border border-white/20 shadow-sm flex flex-col gap-1',
                      index % 2 === 0 ? 'translate-y-0' : 'translate-y-3'
                    )}
                  >
                    <span className="text-white/70">{item}</span>
                    <span className="text-lg text-white">{index === 0 ? selectedParticipantIds.length : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr] items-start">
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 space-y-6">
              <header className="space-y-1">
                <h2 className="text-xl font-semibold text-gray-900">Основная информация</h2>
                <p className="text-sm text-gray-500">Опишите цель и формат мероприятия</p>
              </header>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название мероприятия
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={event => handleFieldChange('title', event.target.value)}
                    className={clsx(
                      'w-full px-4 py-3 rounded-2xl border shadow-sm transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
                      errors.title ? 'border-red-400' : 'border-gray-200'
                    )}
                    placeholder="Например, «Тренинг по продукту»"
                  />
                  {errors.title && <p className="mt-2 text-sm text-red-500">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={form.description}
                    onChange={event => handleFieldChange('description', event.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition resize-none"
                    placeholder="Расскажите, чему посвящено мероприятие и чего ожидаете от участников"
                  />
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 space-y-6">
              <header className="space-y-1">
                <h2 className="text-xl font-semibold text-gray-900">Формат и расписание</h2>
                <p className="text-sm text-gray-500">Выберите тип, даты и параметры</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <span className="block text-sm font-medium text-gray-700 mb-2">Тип мероприятия</span>
                  <div className="flex flex-wrap gap-3">
                    {isLoadingTypes && (
                      <div className="text-sm text-gray-500">Загружаем типы...</div>
                    )}
                    {!isLoadingTypes && eventTypes.length === 0 && (
                      <div className="text-sm text-gray-500">Типы мероприятий недоступны</div>
                    )}
                    {eventTypes.map(type => {
                      const isActive = form.event_type_id === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => handleFieldChange('event_type_id', type.id)}
                          className={clsx(
                            'px-4 py-2 rounded-2xl border text-sm transition-all flex items-center gap-2',
                            isActive
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                              : 'border-gray-200 hover:border-emerald-400 hover:text-emerald-600'
                          )}
                        >
                          <span>{type.name_ru}</span>
                          {isActive && <ChevronRight className="h-4 w-4" />}
                        </button>
                      );
                    })}
                  </div>
                  {errors.event_type_id && <p className="mt-2 text-sm text-red-500">{errors.event_type_id}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Дата и время начала</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="datetime-local"
                      value={form.start_date}
                      onChange={event => handleFieldChange('start_date', event.target.value)}
                      className={clsx(
                        'w-full pl-12 pr-4 py-3 rounded-2xl border shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
                        errors.start_date ? 'border-red-400' : 'border-gray-200'
                      )}
                    />
                  </div>
                  {errors.start_date && <p className="mt-2 text-sm text-red-500">{errors.start_date}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Дата и время окончания</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="datetime-local"
                      value={form.end_date}
                      onChange={event => handleFieldChange('end_date', event.target.value)}
                      className={clsx(
                        'w-full pl-12 pr-4 py-3 rounded-2xl border shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
                        errors.end_date ? 'border-red-400' : 'border-gray-200'
                      )}
                    />
                  </div>
                  {errors.end_date && <p className="mt-2 text-sm text-red-500">{errors.end_date}</p>}
                </div>

                {!currentEventType?.is_online && !currentEventType?.is_exam && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Место проведения</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={form.location}
                        onChange={event => handleFieldChange('location', event.target.value)}
                        className={clsx(
                          'w-full pl-12 pr-4 py-3 rounded-2xl border shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
                          errors.location ? 'border-red-400' : 'border-gray-200'
                        )}
                        placeholder="Город, адрес, аудитория"
                      />
                    </div>
                    {errors.location && <p className="mt-2 text-sm text-red-500">{errors.location}</p>}
                  </div>
                )}

                {currentEventType?.is_online && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ссылка на встречу</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="url"
                        value={form.meeting_link}
                        onChange={event => handleFieldChange('meeting_link', event.target.value)}
                        className={clsx(
                          'w-full pl-12 pr-4 py-3 rounded-2xl border shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
                          errors.meeting_link ? 'border-red-400' : 'border-gray-200'
                        )}
                        placeholder="https://zoom.us/..."
                      />
                    </div>
                    {errors.meeting_link && <p className="mt-2 text-sm text-red-500">{errors.meeting_link}</p>}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Баллы за участие</label>
                  <div className="relative">
                    <Star className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      min={0}
                      value={form.points}
                      onChange={event => handleFieldChange('points', event.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Максимум участников</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      min={1}
                      value={form.max_participants}
                      onChange={event => handleFieldChange('max_participants', event.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Не ограничено"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
                  <div className="flex gap-3">
                    {(['published', 'draft'] as const).map((status, index) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleFieldChange('status', status)}
                        className={clsx(
                          'px-4 py-2 rounded-2xl border text-sm transition-all',
                          form.status === status
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                            : 'border-gray-200 hover:border-emerald-400 hover:text-emerald-600'
                        )}
                      >
                        <span className="font-medium">{status === 'published' ? 'Опубликовано' : 'Черновик'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 space-y-6">
              <header className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Участники</h2>
                  <p className="text-sm text-gray-500">Выберите коллег, которых нужно пригласить</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 px-4 py-2 text-sm font-medium">
                  <Users className="h-4 w-4" />
                  {selectedParticipantIds.length} выбрано
                </span>
              </header>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder="Поиск по имени или e-mail"
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {isLoadingParticipants && (
                  <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Загрузка пользователей...
                  </div>
                )}
                {!isLoadingParticipants && filteredParticipants.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-2xl">
                    <Users className="h-6 w-6 text-gray-400 mb-2" />
                    Не найдено пользователей по запросу
                  </div>
                )}
                {!isLoadingParticipants && filteredParticipants.map((participant, index) => {
                  const isSelected = selectedParticipantIds.includes(participant.id);
                  return (
                    <label
                      key={participant.id}
                      className={clsx(
                        'flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all cursor-pointer',
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/60'
                          : 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/40'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleParticipant(participant.id)}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-gray-900">{participant.full_name}</span>
                          {participant.position && (
                            <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getChipColor(index))}>
                              {participant.position}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {participant.email || participant.sap_number || 'Без контактов'}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>

            {globalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <div>
                  <p className="font-medium">Ошибка</p>
                  <p className="text-sm">{globalError}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-3 rounded-2xl border border-gray-200 text-gray-700 hover:text-gray-900 hover:border-gray-300 transition"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium shadow-lg shadow-emerald-200/60 hover:from-emerald-600 hover:to-emerald-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Сохраняем...
                  </>
                ) : (
                  'Создать мероприятие'
                )}
              </button>
            </div>
          </form>

          <aside className="space-y-6">
            <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 space-y-6 sticky top-24">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Предпросмотр</h3>
                <span className="inline-flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  <Sparkles className="h-4 w-4" />
                  Автообновление
                </span>
              </div>
              <div className="space-y-3">
                {previewRows.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Заполните форму, чтобы увидеть сводку будущего мероприятия.
                  </p>
                )}
                {previewRows.map(row => (
                  <div
                    key={row}
                    className="flex items-start gap-3 p-3 rounded-2xl border border-gray-200 hover:border-emerald-300 transition"
                  >
                    <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                    <div className="text-sm text-gray-700">{row}</div>
                  </div>
                ))}
              </div>
              {selectedParticipants.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Выбранные участники</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedParticipants.slice(0, 6).map(participant => (
                      <div key={participant.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-emerald-50/60">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{participant.full_name}</p>
                          <p className="text-xs text-gray-500">{participant.email || participant.sap_number || 'Без контактов'}</p>
                        </div>
                      </div>
                    ))}
                    {selectedParticipants.length > 6 && (
                      <p className="text-xs text-gray-500">
                        и ещё {selectedParticipants.length - 6}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {isSuccess && (
              <section className="bg-emerald-500 text-white rounded-3xl shadow-xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-full p-2">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Мероприятие создано</h3>
                    <p className="text-sm text-white/80">Мы сохранили его в списке событий</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/events')}
                    className="px-4 py-3 rounded-2xl bg-white text-emerald-600 font-medium hover:bg-emerald-50 transition"
                  >
                    Перейти к мероприятиям
                  </button>
                  {createdEventId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/event/${createdEventId}`)}
                      className="px-4 py-3 rounded-2xl border border-white/60 text-white hover:bg-white/10 transition"
                    >
                      Открыть карточку события
                    </button>
                  )}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
