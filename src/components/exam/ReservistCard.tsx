import React, { useMemo, useState } from 'react';
import { Calendar, User as UserIcon, Eye } from 'lucide-react';
import { DossierModal } from './DossierModal';

interface ReservistCardProps {
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
    dossier?: {
      id: string;
      photo_url?: string;
      position?: string;
      territory?: string;
      age?: number;
      experience_in_position?: string;
    };
  };
  index?: number;
  onEvaluate?: (participantId: string) => void;
  assignedCases?: number[];
  completedCases?: Set<number>;
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

export const ReservistCard: React.FC<ReservistCardProps> = ({
  participant,
  onEvaluate,
  assignedCases = [8, 11, 15], // Значения по умолчанию
  completedCases = new Set()
}) => {
  const [showDossier, setShowDossier] = useState(false);
  
  // Отладка данных участника
  console.log('ReservistCard participant:', participant);
  console.log('ReservistCard participant.user:', participant.user);
  console.log('ReservistCard participant.dossier:', participant.dossier);
  console.log('ReservistCard showDossier state:', showDossier);
  
  const nameParts = useMemo(() => splitName(participant?.user?.full_name || ''), [participant]);
  const position = participant?.dossier?.position || participant?.user?.position?.name || 'Супервайзер СНС';
  const territory = participant?.dossier?.territory || participant?.user?.territory?.name || 'СНС – Зеленоград';
  const age = participant?.dossier?.age || Math.floor(Math.random() * 20) + 28; // Возраст от 28 до 47
  const exp = calcExperienceText(participant?.user?.work_experience_days, participant?.dossier?.experience_in_position);

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
        p-5 md:p-6
        h-fit
        group
        transition-all duration-300 ease-out
        hover:scale-[1.02]
        backdrop-blur-sm
        min-h-[200px]
        max-w-[400px]
      "
      role="group"
    >
      {/* верх: фото + текст */}
      <div className="flex gap-4">
        {/* фото как на макете: вертикальный прямоугольник с мягкими углами */}
        <div className="relative shrink-0">
          <div className="h-[160px] w-[130px] rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/60 overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-300">
            {participant?.dossier?.photo_url ? (
              <img
                src={participant.dossier.photo_url}
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
          <div className="text-[16px] text-gray-900 leading-tight font-medium">
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
      {exp && (
        <div className="mt-3 flex items-center text-[15px] text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors duration-300 mr-2">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <span className="font-medium">
            {exp} в должности {position.toLowerCase().includes('супервайзер') ? 'Супервайзера СНС-Зеленоград' : ''}
          </span>
        </div>
      )}

      {/* Блок оценки кейсов */}
      <div className="mt-4 space-y-3">
        {/* Защита кейсов - заголовок */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-gray-900">Защита кейсов</h3>
            {completedCases.size > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {completedCases.size}/{assignedCases.length}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {completedCases.size === 0 
              ? 'Оценка решения кейсов' 
              : completedCases.size === assignedCases.length
                ? 'Все кейсы оценены'
                : `Оценено ${completedCases.size} из ${assignedCases.length} кейсов`
            }
          </p>
        </div>

        {/* Кейсы в ряд */}
        <div className="flex gap-3">
          {assignedCases.map((caseNumber) => {
            const isCompleted = completedCases.has(caseNumber);
            return (
              <div
                key={caseNumber}
                className={`
                  flex-1 rounded-[20px] border-2 p-4 transition-all duration-200 cursor-pointer relative
                  ${isCompleted 
                    ? 'border-green-300 bg-green-50 shadow-sm' 
                    : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 bg-white hover:shadow-md'
                  }
                `}
              >
                {/* Индикатор завершения */}
                {isCompleted && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                
                <div className="text-center">
                  <div className={`w-10 h-10 mx-auto mb-3 rounded-xl flex items-center justify-center ${
                    isCompleted ? 'bg-green-200' : 'bg-emerald-100'
                  }`}>
                    <span className={`font-bold text-lg ${
                      isCompleted ? 'text-green-700' : 'text-emerald-600'
                    }`}>
                      {caseNumber}
                    </span>
                  </div>
                  <div className={`text-sm font-semibold mb-2 ${
                    isCompleted ? 'text-green-700' : 'text-gray-700'
                  }`}>
                    Кейс #{caseNumber}
                  </div>
                  
                  {/* Статус */}
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                    isCompleted 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isCompleted ? (
                      <>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Оценка выставлена
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        Оценить решение
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Кнопки действий */}
        <div className="mt-4 space-y-3">
          <button
            onClick={() => setShowDossier(true)}
            className="
              w-full h-12 rounded-[20px]
              bg-gray-50 text-gray-600 text-[16px] font-medium
              border border-gray-200
              hover:bg-gray-100 hover:text-gray-700 hover:border-gray-300
              active:bg-gray-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300
              transition-all duration-200 ease-out
              flex items-center justify-center gap-2
            "
            aria-label="Досье резервиста"
          >
            <Eye className="w-4 h-4" />
            Досье резервиста
          </button>

          <button
            onClick={() => onEvaluate?.(participant.user.id)}
            className="
              w-full h-12 rounded-[20px]
              text-white text-[16px] font-semibold
              shadow-lg shadow-black/10
              hover:shadow-xl hover:shadow-black/20 hover:scale-[1.02]
              active:scale-[0.98] active:shadow-md
              focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-30
              transition-all duration-300 ease-out
              flex items-center justify-center gap-2
              relative overflow-hidden
            "
            style={{ backgroundColor: '#06A478' }}
            aria-label="Поставить оценку"
          >
            <span className="relative z-10">Поставить оценку</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
          </button>
        </div>
      </div>

      {/* Модальное окно досье */}
      <DossierModal
        isOpen={showDossier}
        onClose={() => setShowDossier(false)}
        user={participant.user}
        dossier={participant.dossier ? {
          ...participant.dossier,
          user_id: participant.user.id
        } : undefined}
      />

      {/* мягкие круглые углы у всей карточки и лёгкий блик для объёма */}
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full blur-2xl" style={{ backgroundColor: '#06A478', opacity: 0.03 }} />
    </div>
  );
};

