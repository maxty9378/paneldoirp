import React, { useMemo } from 'react';
import { Star, Calendar, User as UserIcon } from 'lucide-react';

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
  return { top: parts[0], bottom: parts.slice(1).join(' ') };
}

function calcExperienceText(days?: number, fallback?: string) {
  if (fallback) return fallback;
  if (!days || days <= 0) return '';
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const y = years > 0 ? `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}` : '';
  const m = months > 0 ? `${months} ${months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев'}` : '';
  return [y, m].filter(Boolean).join(' ');
}

export const CompactDossierCard: React.FC<DossierCardProps> = ({
  participant,
  dossier,
  onDetails,
  onRate
}) => {
  const nameParts = useMemo(() => splitName(participant?.user?.full_name || ''), [participant]);
  const position = dossier?.position || participant?.user?.position?.name || 'Должность';
  const territory = dossier?.territory || participant?.user?.territory?.name || '';
  const age = dossier?.age;
  const exp = calcExperienceText(participant?.user?.work_experience_days, dossier?.experience_in_position);

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
        relative overflow-hidden rounded-[28px]
        bg-white border border-black/5
        shadow-[0_6px_24px_rgba(0,0,0,0.06)]
        p-4 md:p-5
      "
      role="group"
    >
      {/* верх: фото + текст */}
      <div className="flex gap-4">
        {/* фото как на макете: вертикальный прямоугольник с мягкими углами */}
        <div className="relative shrink-0">
          <div className="h-[136px] w-[112px] rounded-2xl bg-gray-100 border border-black/10 overflow-hidden">
            {dossier?.photo_url ? (
              <img
                src={dossier.photo_url}
                alt={participant?.user?.full_name || 'Фото'}
                loading="lazy"
                className="h-full w-full object-cover object-center"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                {initials ? (
                  <span className="text-2xl font-bold text-emerald-700">{initials}</span>
                ) : (
                  <UserIcon className="w-7 h-7 text-emerald-600/60" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* текстовая колонка */}
        <div className="min-w-0 flex-1">
          {/* ФИО: две строки, капслок, фирменный зелёный */}
          <div className="mb-1 leading-none">
            <div className="text-[24px] font-extrabold tracking-wide text-emerald-700 uppercase truncate">
              {nameParts.top}
            </div>
            {nameParts.bottom ? (
              <div className="text-[24px] font-extrabold tracking-wide text-emerald-700 uppercase truncate">
                {nameParts.bottom}
              </div>
            ) : null}
          </div>

          {/* должность и филиал — как две строки без иконок, читаемая межстрочка */}
          <div className="text-[16px] text-gray-900 leading-tight truncate">
            {position}
          </div>
          {territory ? (
            <div className="text-[16px] text-gray-900 leading-tight truncate">
              {territory}
            </div>
          ) : null}

          {/* возраст-пилюля и стаж в должности серым */}
          <div className="mt-2 flex items-center gap-8 flex-wrap">
            {typeof age === 'number' && age > 0 ? (
              <span className="inline-flex items-center px-3 py-[6px] rounded-full bg-emerald-600 text-white text-[14px] font-semibold">
                {age} лет
              </span>
            ) : null}
            {exp ? (
              <span className="inline-flex items-center text-[16px] text-gray-500">
                <Calendar className="w-4 h-4 mr-1 opacity-70" />
                {exp} в должности {position.toLowerCase().includes('супервайзер') ? 'СНС-Зеленоград' : ''}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* кнопки как на макете: широкие пилюли одна над другой с равными отступами */}
      <div className="mt-4 space-y-3">
        <button
          onClick={() => onDetails?.(participant.user.id)}
          className="
            w-full h-12 rounded-[20px]
            bg-neutral-800 text-white text-[16px] font-semibold
            shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]
            hover:opacity-95 active:opacity-90
            focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60
            transition
          "
          aria-label="Подробнее"
        >
          Подробнее
        </button>

        <button
          onClick={() => onRate?.(participant.user.id)}
          className="
            w-full h-12 rounded-[20px]
            bg-emerald-600 text-white text-[16px] font-semibold
            hover:bg-emerald-700 active:bg-emerald-800
            focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60
            transition inline-flex items-center justify-center gap-2
          "
          aria-label="Поставить оценку"
        >
          Поставить оценку
          <Star className="w-5 h-5 fill-white" />
        </button>
      </div>

      {/* мягкие круглые углы у всей карточки и лёгкий блик для объёма */}
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-emerald-200/30 blur-2xl" />
    </div>
  );
};
