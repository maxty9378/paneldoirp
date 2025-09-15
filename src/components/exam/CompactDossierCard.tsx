import React, { useMemo } from 'react';
import { Calendar, User as UserIcon } from 'lucide-react';

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
  onRate?: (participantId: string) => void;
  onViewDossier?: (participantId: string) => void;
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
  onRate,
  onViewDossier
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
        bg-white border border-gray-100/80
        shadow-[0_8px_32px_rgba(0,0,0,0.08)]
        hover:shadow-[0_12px_48px_rgba(0,0,0,0.12)]
        p-4 md:p-5
        h-fit
        group
        transition-all duration-300 ease-out
        hover:scale-[1.02]
        backdrop-blur-sm
      "
      role="group"
    >
      {/* верх: фото + текст */}
      <div className="flex gap-4">
        {/* фото как на макете: вертикальный прямоугольник с мягкими углами */}
        <div className="relative shrink-0">
          <div className="h-[136px] w-[112px] rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/60 overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-300">
            {dossier?.photo_url ? (
              <img
                src={dossier.photo_url}
                alt={participant?.user?.full_name || 'Фото'}
                loading="lazy"
                className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                {initials ? (
                  <span 
                    className="text-2xl font-bold group-hover:scale-110 transition-transform duration-300" 
                    style={{ 
                      color: '#06A478',
                      fontFamily: 'SNS, sans-serif'
                    }}
                  >
                    {initials}
                  </span>
                ) : (
                  <UserIcon className="w-7 h-7 group-hover:scale-110 transition-transform duration-300" style={{ color: '#06A478', opacity: 0.6 }} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* текстовая колонка */}
        <div className="min-w-0 flex-1">
          {/* ФИО: две строки, капслок, фирменный зелёный */}
          <div className="mb-1 leading-none">
            <div 
              className="text-[24px] font-extrabold tracking-wide uppercase truncate" 
              style={{ 
                color: '#06A478',
                fontFamily: 'SNS, sans-serif'
              }}
            >
              {nameParts.top}
            </div>
            {nameParts.bottom ? (
              <div 
                className="text-[24px] font-extrabold tracking-wide uppercase truncate" 
                style={{ 
                  color: '#06A478',
                  fontFamily: 'SNS, sans-serif'
                }}
              >
                {nameParts.bottom}
              </div>
            ) : null}
          </div>

          {/* должность и филиал — как две строки без иконок, читаемая межстрочка */}
          <div className="text-[16px] text-gray-900 leading-tight">
            {position}
          </div>
          {territory ? (
            <div className="text-[16px] text-gray-900 leading-tight">
              {territory}
            </div>
          ) : null}

          {/* возраст-пилюля */}
          <div className="mt-2">
            {typeof age === 'number' && age > 0 ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-white text-[12px] font-medium shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:scale-105" style={{ backgroundColor: '#06A478' }}>
                {age} лет
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* стаж в должности - выровнен по левой стороне на уровень фото */}
      {exp ? (
        <div className="mt-3 flex items-center text-[15px] text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors duration-300 mr-2">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <span className="font-medium">{exp} в должности {position.toLowerCase().includes('супервайзер') ? 'СНС-Зеленоград' : ''}</span>
        </div>
      ) : null}

      {/* кнопки как на макете: широкие пилюли одна над другой с равными отступами */}
      <div className="mt-4 space-y-3">
        <button
          onClick={() => onViewDossier?.(participant.user.id)}
          className="
            w-full h-12 rounded-[20px]
            bg-gray-50 text-gray-400 text-[16px] font-normal
            border border-gray-100
            hover:bg-gray-100 hover:text-gray-500 hover:border-gray-200
            active:bg-gray-150
            focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-300/30
            transition-all duration-200 ease-out
          "
          aria-label="Досье резервиста"
        >
          Досье резервиста
        </button>

        <button
          onClick={() => onRate?.(participant.user.id)}
          className="
            w-full h-12 rounded-[20px]
            text-white text-[16px] font-semibold
            shadow-lg shadow-black/10
            hover:shadow-xl hover:shadow-black/20 hover:scale-[1.02]
            active:scale-[0.98] active:shadow-md
            focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-30
            transition-all duration-300 ease-out
            inline-flex items-center justify-center gap-2
            relative overflow-hidden
          "
          style={{ backgroundColor: '#06A478' }}
          aria-label="Поставить оценку"
        >
          <span className="relative z-10">Поставить оценку</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
        </button>
      </div>

      {/* мягкие круглые углы у всей карточки и лёгкий блик для объёма */}
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full blur-2xl" style={{ backgroundColor: '#06A478', opacity: 0.3 }} />
    </div>
  );
};
