import React, { useMemo, useState } from 'react';
import { Calendar, User as UserIcon, Eye, Brain } from 'lucide-react';
import { DossierModal } from './DossierModal';

interface DiagnosticGameCardProps {
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
  isCompleted?: boolean;
  onEvaluate?: (participantId: string) => void;
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

export const DiagnosticGameCard: React.FC<DiagnosticGameCardProps> = ({
  participant,
  isCompleted = false,
  onEvaluate
}) => {
  const [showDossier, setShowDossier] = useState(false);
  
  const nameParts = useMemo(() => splitName(participant?.user?.full_name || ''), [participant]);
  const position = participant?.dossier?.position || participant?.user?.position?.name || 'Супервайзер СНС';
  const territory = participant?.dossier?.territory || participant?.user?.territory?.name || 'СНС – Зеленоград';
  const age = participant?.dossier?.age || Math.floor(Math.random() * 20) + 28;
  const exp = calcExperienceText(participant?.user?.work_experience_days, participant?.dossier?.experience_in_position);

  const initials = useMemo(() => {
    const [a, b] = (participant?.user?.full_name || '')
      .split(/\s+/)
      .map(s => s[0]?.toUpperCase())
      .filter(Boolean);
    return [a, b].filter(Boolean).join('');
  }, [participant]);

  const competencies = [
    { name: 'Компетенция «Ориентация на результат»', icon: '🎯' },
    { name: 'Компетенция «Эффективная коммуникация»', icon: '💬' },
    { name: 'Компетенция «Умение работать в команде»', icon: '👥' },
    { name: 'Компетенция «Системное мышление»', icon: '🧠' }
  ];

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
        {/* фото */}
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
          {/* ФИО: фамилия на первой строке, имя на второй */}
          <div className="mb-1 leading-none">
            <div 
              className="text-[18px] sm:text-[24px] font-extrabold tracking-wide uppercase truncate" 
              style={{ 
                color: '#06A478',
                fontFamily: 'SNS, sans-serif'
              }}
            >
              {nameParts.top}
            </div>
            {nameParts.bottom ? (
              <div 
                className="text-[18px] sm:text-[24px] font-extrabold tracking-wide uppercase truncate" 
                style={{ 
                  color: '#06A478',
                  fontFamily: 'SNS, sans-serif'
                }}
              >
                {nameParts.bottom}
              </div>
            ) : null}
          </div>

          {/* должность и филиал */}
          <div className="text-[16px] text-gray-900 leading-tight font-medium">
            {position}
          </div>
          {territory ? (
            <div className="text-[16px] text-gray-900 leading-tight">
              {territory}
            </div>
          ) : null}

          {/* возраст */}
          <div className="mt-2">
            {typeof age === 'number' && age > 0 ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-white text-[12px] font-medium shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:scale-105" style={{ backgroundColor: '#06A478' }}>
                {age} лет
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* стаж */}
      {exp && (
        <div className="mt-3 flex items-center text-[15px] text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors duration-300 mr-2">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <span className="font-medium">
            {exp} в должности
          </span>
        </div>
      )}

      {/* Блок диагностической игры */}
      <div className="mt-4 space-y-3">
        {/* Заголовок */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-gray-900">Диагностическая игра</h3>
            {isCompleted && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Оценено
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {isCompleted ? 'Компетенции оценены' : 'Оценка управленческих компетенций'}
          </p>
        </div>

        {/* Компетенции */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700 text-center mb-3">4 компетенции:</div>
          <div className="grid grid-cols-2 gap-2">
            {competencies.map((competency, index) => (
              <div key={index} className={`text-xs p-3 rounded-lg border text-center ${
                isCompleted 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}>
                <div className="text-lg mb-1">{competency.icon}</div>
                <div className="font-medium leading-tight">{competency.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Примечание */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="text-xs text-blue-800">
            <span className="font-medium">Примечание:</span> Оценка от 1 до 5 баллов с возможностью дробных значений (1.5, 2.5, 3.5, 4.5)
          </div>
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
          >
            <Brain className="w-4 h-4" />
            <span className="relative z-10">
              {isCompleted ? 'Изменить оценку' : 'Оценить компетенции'}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
          </button>
        </div>
      </div>

      {/* Модальное окно досье */}
      <DossierModal
        isOpen={showDossier}
        onClose={() => setShowDossier(false)}
        onBack={() => setShowDossier(false)}
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

      {/* Декоративный элемент */}
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full blur-2xl" style={{ backgroundColor: '#06A478', opacity: 0.03 }} />
    </div>
  );
};
