import React, { useState, useEffect } from 'react';
import { X, User, MapPin, Calendar, Briefcase, Award, GraduationCap, Clock, Mail, Phone, Building } from 'lucide-react';

interface DossierData {
  id?: string;
  user_id: string;
  photo_url?: string;
  phone?: string;
  location?: string;
  experience_in_position?: string;
  education?: string | {
    level?: string;
    specialty?: string;
    institution?: string;
  };
  achievements?: string;
  skills?: string;
  additional_info?: string;
  created_at?: string;
  updated_at?: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  work_experience_days?: number;
  position?: { name: string };
  territory?: { name: string };
}

interface DossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  dossier?: DossierData;
  loading?: boolean;
}

// Компонент скелетона для загрузки
const SkeletonLine: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
);

const SkeletonAvatar: React.FC = () => (
  <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse" />
);

export const DossierModal: React.FC<DossierModalProps> = ({
  isOpen,
  onClose,
  user,
  dossier,
  loading = false
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Создаем инициалы
  const getInitials = (fullName?: string) => {
    if (!fullName) return '';
    return fullName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Форматирование стажа
  const formatExperience = (days?: number, fallback?: string) => {
    if (fallback) return fallback;
    if (!days || days <= 0) return 'Не указан';
    
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    
    const yearStr = years > 0 ? `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}` : '';
    const monthStr = months > 0 ? `${months} ${months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев'}` : '';
    
    return [yearStr, monthStr].filter(Boolean).join(' ') || 'Менее месяца';
  };

  useEffect(() => {
    if (dossier?.photo_url) {
      setImageLoading(true);
      setImageError(false);
    }
  }, [dossier?.photo_url]);

  // Блокировка прокрутки фона при открытом модальном окне
  useEffect(() => {
    if (isOpen) {
      // Блокируем прокрутку
      const y = window.scrollY;
      document.body.classList.add('modal-open');
      document.body.style.position = 'fixed';
      document.body.style.top = `-${y}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      return () => {
        // Восстанавливаем прокрутку при закрытии
        document.body.classList.remove('modal-open');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, y);
      };
    }
  }, [isOpen]);

  const dossierStyles = `
    /* Принудительное убирание всех отступов для модального окна */
    .dossier-modal {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      padding-top: env(safe-area-inset-top, 0px) !important;
      z-index: 10002 !important;
      background: white !important;
    }
    
    /* Убираем отступы у body когда открыто модальное окно */
    body.modal-open {
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
    
    /* Специальные стили для iPhone */
    @media screen and (max-width: 768px) {
      .dossier-modal {
        -webkit-overflow-scrolling: touch !important;
        -webkit-transform: translate3d(0, 0, 0) !important;
        transform: translate3d(0, 0, 0) !important;
      }
      
      .dossier-modal header {
        -webkit-transform: translateZ(0) !important;
        transform: translateZ(0) !important;
        will-change: transform !important;
      }
      
      .dossier-modal button {
        -webkit-tap-highlight-color: transparent !important;
        -webkit-touch-callout: none !important;
        -webkit-user-select: none !important;
        user-select: none !important;
        touch-action: manipulation !important;
      }
      
      /* Убираем возможные конфликты с safe area */
      .dossier-modal {
        padding-top: env(safe-area-inset-top, 0px) !important;
        padding-left: env(safe-area-inset-left, 0px) !important;
        padding-right: env(safe-area-inset-right, 0px) !important;
        padding-bottom: env(safe-area-inset-bottom, 0px) !important;
      }
    }
  `;

  if (!isOpen) return null;
  if (!user) return null;

  return (
    <>
      <style>{dossierStyles}</style>
      <div className="dossier-modal fixed inset-0 z-[10002] flex flex-col bg-white" style={{ 
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        margin: 0,
        padding: 0,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        transform: 'translate3d(0, 0, 0)',
        backfaceVisibility: 'hidden',
        willChange: 'transform',
        WebkitTransform: 'translate3d(0, 0, 0)',
        WebkitBackfaceVisibility: 'hidden',
        WebkitOverflowScrolling: 'touch'
      }}>
        {/* Шапка (sticky top) */}
        <header className="sticky top-0 z-10 border-b border-gray-100 bg-white">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-500">Досье резервиста</div>
                <div className="text-base font-semibold truncate">{user.full_name}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="p-2 rounded-lg hover:bg-gray-50 active:bg-gray-100 touch-manipulation"
              aria-label="Закрыть"
              style={{
                minWidth: '44px',
                minHeight: '44px',
                zIndex: 1000,
                position: 'relative',
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none'
              }}
            >
              <X className="w-6 h-6 text-gray-700 pointer-events-none" />
            </button>
          </div>
        </header>

        {/* Контент (скролл) */}
        <main className="flex-1 overflow-y-auto px-4 pt-3 pb-32">
          <div className="space-y-3">
            {loading ? (
              // Скелетон загрузки
              <div className="space-y-3">
                <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                  <div className="flex gap-4">
                    <SkeletonAvatar />
                    <div className="flex-1 space-y-2">
                      <SkeletonLine className="h-4 w-32" />
                      <SkeletonLine className="h-3 w-24" />
                      <SkeletonLine className="h-3 w-20" />
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                  <SkeletonLine className="h-4 w-full" />
                  <SkeletonLine className="h-3 w-3/4" />
                </div>
              </div>
            ) : (
              <>
                {/* Основная информация */}
                <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{user.full_name}</div>
                      <div className="text-xs text-gray-500">{user.position?.name}</div>
                      <div className="text-xs text-gray-400">{user.territory?.name}</div>
                    </div>
                    {dossier?.photo_url && !imageError ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden">
                        <img
                          src={dossier.photo_url}
                          alt={user.full_name}
                          className="w-full h-full object-cover"
                          onLoad={() => setImageLoading(false)}
                          onError={() => {
                            setImageError(true);
                            setImageLoading(false);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {getInitials(user.full_name)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Контактная информация */}
                <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <div className="text-sm font-medium text-gray-900">Контактная информация</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-600">{user.email}</div>
                    {dossier?.phone && (
                      <div className="text-xs text-gray-600">{dossier.phone}</div>
                    )}
                    {dossier?.location && (
                      <div className="text-xs text-gray-600">{dossier.location}</div>
                    )}
                  </div>
                </div>

                {/* Опыт работы */}
                <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="w-4 h-4 text-gray-500" />
                    <div className="text-sm font-medium text-gray-900">Опыт работы</div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatExperience(user?.work_experience_days, dossier?.experience_in_position)}
                  </div>
                </div>

                {/* Образование */}
                {dossier?.education && (
                  <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <GraduationCap className="w-4 h-4 text-gray-500" />
                      <div className="text-sm font-medium text-gray-900">Образование</div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {typeof dossier.education === 'string' 
                        ? dossier.education 
                        : `${dossier.education.level || ''} ${dossier.education.specialty || ''} ${dossier.education.institution || ''}`.trim()
                      }
                    </div>
                  </div>
                )}

                {/* Достижения */}
                {dossier?.achievements && (
                  <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-4 h-4 text-gray-500" />
                      <div className="text-sm font-medium text-gray-900">Достижения</div>
                    </div>
                    <div className="text-sm text-gray-600">{dossier.achievements}</div>
                  </div>
                )}

                {/* Навыки */}
                {dossier?.skills && (
                  <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      <div className="text-sm font-medium text-gray-900">Навыки</div>
                    </div>
                    <div className="text-sm text-gray-600">{dossier.skills}</div>
                  </div>
                )}

                {/* Дополнительная информация */}
                {dossier?.additional_info && (
                  <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <div className="text-sm font-medium text-gray-900">Дополнительная информация</div>
                    </div>
                    <div className="text-sm text-gray-600">{dossier.additional_info}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* Футер (sticky bottom) */}
        <footer className="sticky bottom-0 z-10 border-t border-gray-100 bg-white px-4 py-3 pb-safe-bottom">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              ← Назад
            </button>
          </div>
        </footer>
      </div>
    </>
  );
};