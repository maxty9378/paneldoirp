import React, { useState, useEffect } from 'react';
import { X, User, MapPin, Calendar, Briefcase, Award, GraduationCap, Clock, Mail, Phone, Building, Edit, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

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
  career_path?: string;
  achievements?: string | string[];
  skills?: string | string[];
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
  onModalStateChange?: (isOpen: boolean) => void;
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
  loading = false,
  onModalStateChange
}) => {
  const { userProfile } = useAuth();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<DossierData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Проверяем, является ли пользователь администратором
  const isAdmin = userProfile?.role === 'administrator';

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

  // Нормализация достижений и навыков в массив
  const normalizeToArray = (data: string | string[] | undefined): string[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      return data.split('\n').filter(item => item.trim()).map(item => item.trim());
    }
    return [];
  };

  // Инициализация данных для редактирования
  useEffect(() => {
    if (dossier) {
      setEditingData({
        ...dossier,
        user_id: user.id,
        achievements: Array.isArray(dossier.achievements) 
          ? dossier.achievements.join('\n') 
          : dossier.achievements || '',
        skills: Array.isArray(dossier.skills) 
          ? dossier.skills.join('\n') 
          : dossier.skills || ''
      });
    } else {
      setEditingData({
        user_id: user.id,
        photo_url: '',
        phone: '',
        location: '',
        experience_in_position: formatExperience(user?.work_experience_days),
        education: {
          level: '',
          specialty: '',
          institution: ''
        },
        career_path: '',
        achievements: '',
        skills: '',
        additional_info: ''
      });
    }
  }, [dossier, user.id, user.work_experience_days]);

  // Функция сохранения досье
  const handleSave = async () => {
    if (!editingData) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('participant_dossiers')
        .upsert({
          ...editingData,
          event_id: editingData.event_id || editingData.exam_event_id,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      alert('Досье сохранено');
      setIsEditing(false);
      // Можно добавить callback для обновления родительского компонента
    } catch (err) {
      console.error('Ошибка сохранения досье:', err);
      alert('Не удалось сохранить досье');
    } finally {
      setIsSaving(false);
    }
  };

  // Функция отмены редактирования
  const handleCancel = () => {
    if (dossier) {
      setEditingData({
        ...dossier,
        user_id: user.id,
        achievements: Array.isArray(dossier.achievements) 
          ? dossier.achievements.join('\n') 
          : dossier.achievements || '',
        skills: Array.isArray(dossier.skills) 
          ? dossier.skills.join('\n') 
          : dossier.skills || ''
      });
    } else {
      setEditingData({
        user_id: user.id,
        photo_url: '',
        phone: '',
        location: '',
        experience_in_position: formatExperience(user?.work_experience_days),
        education: {
          level: '',
          specialty: '',
          institution: ''
        },
        career_path: '',
        achievements: '',
        skills: '',
        additional_info: ''
      });
    }
    setIsEditing(false);
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
      // Сохраняем текущую позицию прокрутки
      const scrollY = window.scrollY;
      
      // Блокируем прокрутку
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Восстанавливаем прокрутку при закрытии
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Уведомляем родительский компонент о состоянии модального окна
  useEffect(() => {
    onModalStateChange?.(isOpen);
  }, [isOpen, onModalStateChange]);

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
      
      /* Убираем safe area для полноэкранного режима */
      .dossier-modal {
        padding-top: 0px !important;
        padding-left: 0px !important;
        padding-right: 0px !important;
        padding-bottom: 0px !important;
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
        paddingBottom: '0px',
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
            <div className="flex items-center gap-2">
              {!isEditing ? (
                isAdmin ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 rounded-lg hover:bg-gray-50 active:bg-gray-100 touch-manipulation"
                    aria-label="Редактировать"
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
                    <Edit className="w-5 h-5 text-gray-700 pointer-events-none" />
                  </button>
                ) : null
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {isSaving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium"
                  >
                    Отмена
                  </button>
                </div>
              )}
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
          </div>
        </header>

        {/* Контент (скролл) */}
        <main className="flex-1 overflow-y-auto px-4 pt-3 pb-32">
          {loading ? (
            // Скелетон загрузки
            <div className="space-y-6">
              <div className="flex gap-6">
                <SkeletonAvatar />
                <div className="flex-1 space-y-3">
                  <SkeletonLine className="h-7 md:h-8 w-3/4" />
                  <div className="flex flex-wrap gap-1">
                    <SkeletonLine className="h-6 w-20" />
                    <SkeletonLine className="h-6 w-24" />
                    <SkeletonLine className="h-6 w-16" />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <SkeletonLine className="h-6 w-1/3" />
                    <SkeletonLine className="h-4 w-full" />
                    <SkeletonLine className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Основное содержимое
            <div className="space-y-8">
              {/* Основная информация */}
              <div className="flex gap-6">
                {/* Фото */}
                <div className="relative shrink-0">
                  <div className="w-32 h-40 md:w-44 md:h-52 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 shadow-lg border-4 border-white">
                    {dossier?.photo_url && !imageError ? (
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
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                        <span className="text-4xl font-bold text-white">
                          {getInitials(user.full_name)}
                        </span>
                      </div>
                    )}
                    {imageLoading && (
                      <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Информация */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'SNS, sans-serif' }}>
                      {user.full_name}
                    </h3>
                    <p className="text-gray-600 mb-1">{user.position?.name}</p>
                    <p className="text-sm text-gray-500">{user.territory?.name}</p>
                  </div>

                  {/* Контактная информация */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{user.email}</span>
                    </div>
                    {isEditing ? (
                      <>
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <input
                            type="text"
                            value={editingData?.phone || ''}
                            onChange={(e) => setEditingData(prev => prev ? { ...prev, phone: e.target.value } : null)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Телефон"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <input
                            type="text"
                            value={editingData?.location || ''}
                            onChange={(e) => setEditingData(prev => prev ? { ...prev, location: e.target.value } : null)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Местоположение"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {dossier?.phone && (
                          <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700">{dossier.phone}</span>
                          </div>
                        )}
                        {dossier?.location && (
                          <div className="flex items-center gap-3">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700">{dossier.location}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Карточки информации */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Опыт работы */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Опыт работы</h4>
                      <p className="text-sm text-gray-600">Стаж в текущей должности</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700">
                    {formatExperience(user?.work_experience_days, dossier?.experience_in_position)}
                  </div>
                </div>

                {/* Образование */}
                {(dossier?.education || isEditing) && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Образование</h4>
                        <p className="text-sm text-gray-600">Уровень и специальность</p>
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingData?.education?.level || ''}
                          onChange={(e) => setEditingData(prev => prev ? { 
                            ...prev, 
                            education: { ...prev.education, level: e.target.value }
                          } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Уровень образования"
                        />
                        <input
                          type="text"
                          value={editingData?.education?.specialty || ''}
                          onChange={(e) => setEditingData(prev => prev ? { 
                            ...prev, 
                            education: { ...prev.education, specialty: e.target.value }
                          } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Специальность"
                        />
                        <input
                          type="text"
                          value={editingData?.education?.institution || ''}
                          onChange={(e) => setEditingData(prev => prev ? { 
                            ...prev, 
                            education: { ...prev.education, institution: e.target.value }
                          } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Учебное заведение"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {typeof dossier?.education === 'string' ? (
                          <div className="text-sm text-gray-700">{dossier.education}</div>
                        ) : (
                          <>
                            {dossier?.education?.level && (
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">Уровень:</span> {dossier.education.level}
                              </div>
                            )}
                            {dossier?.education?.specialty && (
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">Специальность:</span> {dossier.education.specialty}
                              </div>
                            )}
                            {dossier?.education?.institution && (
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">Учебное заведение:</span> {dossier.education.institution}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Карьерный путь в ГК СНС */}
                {(dossier?.career_path || isEditing) && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Путь в ГК СНС</h4>
                        <p className="text-sm text-gray-600">Карьерный рост в компании</p>
                      </div>
                    </div>
                    {isEditing ? (
                      <textarea
                        value={editingData?.career_path || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, career_path: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24 resize-none"
                        placeholder="Опишите карьерный путь в ГК СНС"
                      />
                    ) : (
                      <div className="text-sm text-gray-700 whitespace-pre-line">
                        {dossier?.career_path || 'Карьерный путь не указан'}
                      </div>
                    )}
                  </div>
                )}

                {/* Достижения */}
                {(dossier?.achievements || isEditing) && (
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Достижения</h4>
                        <p className="text-sm text-gray-600">Профессиональные успехи</p>
                      </div>
                    </div>
                    {isEditing ? (
                      <textarea
                        value={editingData?.achievements || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, achievements: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24 resize-none"
                        placeholder="Введите достижения, каждое с новой строки"
                      />
                    ) : (
                      <div className="space-y-2">
                        {(() => {
                          const achievements = normalizeToArray(dossier?.achievements);
                          return achievements.length > 0 ? (
                            achievements.map((achievement, index) => (
                              <div key={index} className="flex items-center space-x-3 p-3 bg-gradient-to-r from-[#06A478]/5 to-[#059669]/5 border border-[#06A478]/20 rounded-lg hover:shadow-sm transition-all duration-200">
                                <div className="flex-shrink-0">
                                  <div className="w-6 h-6 bg-gradient-to-br from-[#06A478] to-[#059669] rounded-full flex items-center justify-center shadow-sm">
                                    <Award className="w-3 h-3 text-white" />
                                  </div>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">{achievement}</p>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8">
                              <Award className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                              <p className="text-gray-500">Достижения не указаны</p>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Навыки */}
                {(dossier?.skills || isEditing) && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                        <Building className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Навыки</h4>
                        <p className="text-sm text-gray-600">Профессиональные компетенции</p>
                      </div>
                    </div>
                    {isEditing ? (
                      <textarea
                        value={editingData?.skills || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, skills: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24 resize-none"
                        placeholder="Введите навыки, каждый с новой строки"
                      />
                    ) : (
                      <div className="space-y-2">
                        {(() => {
                          const skills = normalizeToArray(dossier?.skills);
                          return skills.length > 0 ? (
                            skills.map((skill, index) => (
                              <div key={index} className="flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg hover:shadow-sm transition-all duration-200">
                                <div className="flex-shrink-0">
                                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-sm">
                                    <Building className="w-3 h-3 text-white" />
                                  </div>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">{skill}</p>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8">
                              <Building className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                              <p className="text-gray-500">Навыки не указаны</p>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Дополнительная информация */}
                {(dossier?.additional_info || isEditing) && (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200 md:col-span-2">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gray-500 rounded-xl flex items-center justify-center">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Дополнительная информация</h4>
                        <p className="text-sm text-gray-600">Прочая важная информация</p>
                      </div>
                    </div>
                    {isEditing ? (
                      <textarea
                        value={editingData?.additional_info || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, additional_info: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24 resize-none"
                        placeholder="Введите дополнительную информацию"
                      />
                    ) : (
                      <div className="text-sm text-gray-700">{dossier?.additional_info}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Футер (sticky bottom) */}
        <footer className="sticky bottom-0 z-10 border-t border-gray-100 bg-white px-4 py-4 pb-safe-bottom">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              ← Назад
            </button>
          </div>
        </footer>
      </div>
    </>
  );
};