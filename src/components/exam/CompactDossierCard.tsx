import React, { useMemo } from 'react';
import { Star, Info, Calendar, MapPin, User as UserIcon } from 'lucide-react';

type Edu = { level?: string; institution?: string; specialty?: string };
interface DossierData {
  id?: string;
  user_id: string;
  photo_url?: string;
  program_name?: string;
  position?: string;
  territory?: string;
  age?: number;
  experience_in_position?: string;
  education?: Edu;
  career_path?: string;
  achievements?: string[];
  created_at?: string;
  updated_at?: string;
}

interface DossierCardProps {
  participant: {
    id: string;
    user: {
      id: string;
      full_name: string;
      email: string;
      sap_number: string;
      work_experience_days?: number;
      position?: { name: string };
      territory?: { name: string };
    };
  };
  dossier?: DossierData;
  onDetails?: (participantId: string) => void;
  onRate?: (participantId: string) => void;
}

function splitName(full: string) {
  if (!full) return { top: '', bottom: '' };
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { top: parts[0], bottom: '' };
  // первая строка — фамилия ПРОПИСНЫМИ, вторая — имя
  return { top: parts[0], bottom: parts.slice(1).join(' ') };
}

function calcExperienceText(days?: number, fallback?: string) {
  if (fallback) return fallback;
  if (!days || days <= 0) return '';
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const y = years > 0 ? `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}` : '';
  const m = months > 0 ? `${months} ${months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев'}` : '';
  const pieces = [y, m].filter(Boolean).join(' ');
  return pieces;
}

export const CompactDossierCard: React.FC<DossierCardProps> = ({
  participant,
  dossier,
  onDetails,
  onRate,
}) => {
  const nameParts = useMemo(() => splitName(participant?.user?.full_name || ''), [participant]);
  const position = dossier?.position || participant?.user?.position?.name || 'Должность';
  const territory = dossier?.territory || participant?.user?.territory?.name || '';
  const age = dossier?.age;
  const exp = calcExperienceText(participant?.user?.work_experience_days, dossier?.experience_in_position);

  // аватарка или инициалы
  const initials = useMemo(() => {
    const [a, b] = (participant?.user?.full_name || '')
      .split(/\s+/)
      .map(s => s[0]?.toUpperCase())
      .filter(Boolean);
    return [a, b].filter(Boolean).join('');
  }, [participant]);

  return (
    <div
      className="
        relative overflow-hidden rounded-[24px]
        bg-white/80 backdrop-blur-xl
        border border-emerald-600/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)]
        p-4
        md:p-5
      "
      style={{
        // лёгкое стекло
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.86) 100%)',
      }}
    >
      {/* Контентная зона */}
      <div className="flex gap-4">
        {/* Фото */}
        <div className="relative">
          {dossier?.photo_url ? (
            <img
              src={dossier.photo_url}
              alt={participant?.user?.full_name || 'Фото'}
              className="h-[120px] w-[120px] object-cover object-center rounded-2xl border border-emerald-600/15 bg-emerald-50"
            />
          ) : (
            <div className="h-[120px] w-[120px] rounded-2xl border border-emerald-600/15 bg-emerald-50 flex items-center justify-center">
              {initials ? (
                <span className="text-2xl font-bold text-emerald-700">{initials}</span>
              ) : (
                <UserIcon className="w-7 h-7 text-emerald-600/60" />
              )}
            </div>
          )}
        </div>

        {/* Текст */}
        <div className="min-w-0">
          {/* Имя в 2 строки */}
          <div className="leading-none mb-2">
            <div className="text-[22px] md:text-[24px] font-extrabold tracking-wide text-emerald-700 uppercase truncate">
              {nameParts.top}
            </div>
            {nameParts.bottom ? (
              <div className="text-[22px] md:text-[24px] font-extrabold tracking-wide text-emerald-700 uppercase truncate">
                {nameParts.bottom}
              </div>
            ) : null}
          </div>

          {/* Должность */}
          <div className="text-[15px] md:text-[16px] font-medium text-gray-900 truncate">
            {position}
          </div>

          {/* Территория */}
          {territory ? (
            <div className="mt-0.5 flex items-center text-[15px] text-gray-700">
              <span className="truncate">{territory}</span>
            </div>
          ) : null}

          {/* Возраст + опыт в 1 строке */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {typeof age === 'number' && age > 0 ? (
              <span className="inline-flex items-center px-3 py-1 rounded-xl bg-emerald-600 text-white text-[14px] font-semibold">
                {age} лет
              </span>
            ) : null}

            {exp ? (
              <span className="inline-flex items-center text-[14px] text-gray-700">
                <Calendar className="w-4 h-4 mr-1 opacity-70" />
                {exp ? `${exp} в должности` : ''}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Подвал с кнопками */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => onDetails?.(participant.user.id)}
          className="
            flex-1 h-11 rounded-2xl bg-gray-900/90 text-white
            text-[16px] font-semibold
            hover:opacity-95 active:opacity-90 transition
          "
        >
          Подробнее
        </button>

        <button
          onClick={() => onRate?.(participant.user.id)}
          className="
            flex-1 h-11 rounded-2xl bg-emerald-600 text-white
            text-[16px] font-semibold
            hover:bg-emerald-700 active:bg-emerald-800 transition
            inline-flex items-center justify-center gap-2
          "
        >
          Поставить оценку
          <Star className="w-5 h-5 fill-white" />
        </button>
      </div>

      {/* Лёгкий декоративный блик справа внизу */}
      <div className="pointer-events-none absolute -bottom-10 -right-14 h-36 w-36 rounded-full bg-emerald-200/30 blur-2xl" />
    </div>
  );
};
