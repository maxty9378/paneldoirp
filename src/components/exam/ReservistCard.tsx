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
        relative overflow-hidden rounded-[20px] sm:rounded-[28px]
        bg-white border border-gray-100/80
        shadow-[0_4px_16px_rgba(0,0,0,0.06)] sm:shadow-[0_8px_32px_rgba(0,0,0,0.08)]
        hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] sm:hover:shadow-[0_12px_48px_rgba(0,0,0,0.12)]
        p-4 sm:p-5 md:p-6
        h-fit
        group
        transition-all duration-300 ease-out
        hover:scale-[1.01] sm:hover:scale-[1.02]
        backdrop-blur-sm
        min-h-[180px] sm:min-h-[200px]
        w-full max-w-[100vw] sm:max-w-[400px]
        mx-auto
      "
      role="group"
    >
      {/* верх: фото + текст */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        {/* фото как на макете: вертикальный прямоугольник с мягкими углами */}
        <div className="relative shrink-0 mx-auto sm:mx-0">
          <div className="h-[120px] w-[100px] sm:h-[160px] sm:w-[130px] rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/60 overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-300">
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
        <div className="min-w-0 flex-1 text-center sm:text-left">
          {/* ФИО: две строки, капслок, фирменный зелёный */}
          <div className="mb-2 leading-none">
            <div 
              className="text-[20px] sm:text-[24px] font-extrabold tracking-wide uppercase" 
              style={{ 
                color: '#06A478',
                fontFamily: 'SNS, sans-serif'
              }}
            >
              {nameParts.top}
            </div>
            {nameParts.bottom ? (
              <div 
                className="text-[20px] sm:text-[24px] font-extrabold tracking-wide uppercase" 
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
          <div className="text-[14px] sm:text-[16px] text-gray-900 leading-tight font-medium">
            {position}
          </div>
          {territory ? (
            <div className="text-[14px] sm:text-[16px] text-gray-900 leading-tight">
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
        <div className="mt-3 flex items-center justify-center sm:justify-start text-[13px] sm:text-[15px] text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
          <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors duration-300 mr-2">
            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" />
          </div>
          <span className="font-medium text-center sm:text-left">
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
        <div className="flex gap-2 sm:gap-3">
          {assignedCases.map((caseNumber) => {
            const isCompleted = completedCases.has(caseNumber);
            return (
              <div
                key={caseNumber}
                className={`
                  flex-1 rounded-[16px] sm:rounded-[20px] border-2 p-3 sm:p-4 transition-all duration-200 cursor-pointer relative
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
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 rounded-xl flex items-center justify-center ${
                    isCompleted ? 'bg-green-200' : 'bg-emerald-100'
                  }`}>
                    <span className={`font-bold text-sm sm:text-lg ${
                      isCompleted ? 'text-green-700' : 'text-emerald-600'
                    }`}>
                      {caseNumber}
                    </span>
                  </div>
                  <div className={`text-xs sm:text-sm font-semibold mb-1 sm:mb-2 ${
                    isCompleted ? 'text-green-700' : 'text-gray-700'
                  }`}>
                    Кейс #{caseNumber}
                  </div>
                  
                  {/* Статус */}
                  <div className={`inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium ${
                    isCompleted 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isCompleted ? (
                      <>
                        <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="hidden sm:inline">Оценка выставлена</span>
                        <span className="sm:hidden">Готово</span>
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full"></div>
                        <span className="hidden sm:inline">Оценить решение</span>
                        <span className="sm:hidden">Оценить</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Кнопки действий */}
        <div className="mt-4 space-y-2 sm:space-y-3">
          <button
            onClick={() => setShowDossier(true)}
            className="
              w-full h-10 sm:h-12 rounded-[16px] sm:rounded-[20px]
              bg-gray-50 text-gray-600 text-[14px] sm:text-[16px] font-medium
              border border-gray-200
              hover:bg-gray-100 hover:text-gray-700 hover:border-gray-300
              active:bg-gray-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300
              transition-all duration-200 ease-out
              flex items-center justify-center gap-2
            "
            aria-label="Досье резервиста"
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Досье резервиста</span>
            <span className="sm:hidden">Досье</span>
          </button>

          <button
            onClick={() => onEvaluate?.(participant.user.id)}
            className="
              w-full h-10 sm:h-12 rounded-[16px] sm:rounded-[20px]
              text-white text-[14px] sm:text-[16px] font-semibold
              shadow-lg shadow-black/10
              hover:shadow-xl hover:shadow-black/20 hover:scale-[1.01] sm:hover:scale-[1.02]
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
        onModalStateChange={(isOpen) => {
          // Уведомляем родительский компонент о состоянии модального окна
          if (isOpen) {
            // Можно добавить логику для скрытия меню если нужно
          }
        }}
      />

      {/* мягкие круглые углы у всей карточки и лёгкий блик для объёма */}
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full blur-2xl" style={{ backgroundColor: '#06A478', opacity: 0.03 }} />
    </div>
  );
};

