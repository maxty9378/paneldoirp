import React, { useMemo } from 'react';
import { User as UserIcon, MapPin } from 'lucide-react';

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
  onRemove?: (participantId: string) => void;
  showRemoveButton?: boolean;
}

function splitName(full: string) {
  if (!full) return { top: '', bottom: '' };
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { top: parts[0], bottom: '' };
  return { top: parts[0], bottom: parts.slice(1).join(' ') };
}



export const CompactDossierCard: React.FC<DossierCardProps> = ({
  participant,
  dossier,
  onRate,
  onViewDossier,
  onRemove,
  showRemoveButton = false
}) => {
  const nameParts = useMemo(() => splitName(participant?.user?.full_name || ''), [participant]);
  const position = dossier?.position || participant?.user?.position?.name || 'Должность';
  const territory = dossier?.territory || participant?.user?.territory?.name || '';
  const age = dossier?.age;

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
        relative overflow-hidden rounded-3xl
        bg-white/90 backdrop-blur-sm border border-slate-200/60
        shadow-[0_4px_20px_rgba(0,0,0,0.08)]
        hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)]
        hover:shadow-slate-200/50
        p-4 sm:p-5 md:p-6
        h-fit
        group
        transition-all duration-300 ease-out
        hover:scale-[1.01] hover:border-slate-300/80
        min-h-[180px] sm:min-h-[200px]
        active:scale-[0.99]
      "
      role="group"
    >
      {/* верх: фото + текст */}
      <div className="flex gap-3 sm:gap-4 md:gap-5">
        {/* фото как на макете: вертикальный прямоугольник с мягкими углами */}
        <div className="relative shrink-0">
          <div className="h-[140px] w-[100px] sm:h-[160px] sm:w-[115px] md:h-[180px] md:w-[130px] rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/60 overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-300">
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
                    className="text-3xl font-bold group-hover:scale-110 transition-transform duration-300" 
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
        <div className="min-w-0 flex-1 flex flex-col justify-between">
          <div>
            {/* ФИО: фамилия на первой строке, имя на второй */}
            <div className="mb-2 leading-tight">
              <div 
                className="text-base sm:text-lg md:text-xl font-bold tracking-wide uppercase truncate" 
                style={{ 
                  color: '#06A478',
                  fontFamily: 'SNS, sans-serif'
                }}
              >
                {nameParts.top}
              </div>
              {nameParts.bottom ? (
                <div 
                  className="text-base sm:text-lg md:text-xl font-bold tracking-wide uppercase truncate" 
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
            <div className="text-sm sm:text-base text-slate-700 leading-relaxed mb-1">
              {position}
            </div>
            {territory ? (
              <div className="flex items-center gap-1.5 text-sm sm:text-base text-slate-600 leading-relaxed">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{territory}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>


      {/* кнопки как на макете: широкие пилюли одна над другой с равными отступами */}
      <div className="mt-4 space-y-2 sm:space-y-3">
        <button
          onClick={() => onViewDossier?.(participant.user.id)}
          className="
            w-full h-10 sm:h-11 rounded-2xl
            bg-slate-50/80 text-slate-500 text-sm sm:text-base font-medium
            border border-slate-200/60
            hover:bg-slate-100/80 hover:text-slate-600 hover:border-slate-300/80
            active:bg-slate-200/80 active:scale-[0.98]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/30
            transition-all duration-200 ease-out
            backdrop-blur-sm
          "
          aria-label="Досье резервиста"
        >
          Досье резервиста
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => onRate?.(participant.user.id)}
            className="
              flex-1 h-10 sm:h-11 rounded-2xl
              text-white text-sm sm:text-base font-semibold
              shadow-sm shadow-slate-200/50
              hover:shadow-md hover:shadow-slate-300/50 hover:scale-[1.01]
              active:scale-[0.98] active:shadow-sm
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#06A478]/30
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
          
          {showRemoveButton && onRemove && (
            <button
              onClick={() => onRemove(participant.user.id)}
              className="
                h-10 sm:h-11 px-3 sm:px-4 rounded-2xl
                text-white text-sm sm:text-base font-semibold
                shadow-sm shadow-red-200/50
                hover:shadow-md hover:shadow-red-300/50 hover:scale-[1.01]
                active:scale-[0.98] active:shadow-sm
                focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300/30
                transition-all duration-300 ease-out
                inline-flex items-center justify-center gap-2
                relative overflow-hidden
              "
              style={{ backgroundColor: '#dc2626' }}
              aria-label="Удалить участника"
            >
              <span className="relative z-10">×</span>
            </button>
          )}
        </div>
      </div>

      {/* мягкие круглые углы у всей карточки и лёгкий блик для объёма */}
      <div 
        className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-300" 
        style={{ 
          background: 'radial-gradient(circle, rgba(6, 164, 120, 0.3) 0%, rgba(6, 164, 120, 0.1) 50%, transparent 100%)',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          willChange: 'transform'
        }} 
      />
    </div>
  );
};
