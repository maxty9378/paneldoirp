import React, { useState, useEffect } from 'react';
import { X, User, MapPin, Briefcase, Calendar, GraduationCap, Award, Clock } from 'lucide-react';

interface DossierData {
  id?: string;
  user_id: string;
  photo_url?: string;
  program_name?: string;
  position?: string;
  territory?: string;
  age?: number;
  experience_in_position?: string;
  education?: {
    level?: string;
    institution?: string;
    specialty?: string;
  };
  career_path?: string;
  achievements?: string[];
  created_at?: string;
  updated_at?: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  sap_number: string;
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
  <div 
    className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] rounded-lg ${className}`}
    style={{ 
      animation: 'shimmer 1.5s ease-in-out infinite',
      backgroundImage: 'linear-gradient(90deg, #e5e7eb 0%, #d1d5db 50%, #e5e7eb 100%)'
    }}
  />
);

const SkeletonAvatar: React.FC = () => (
  <div className="relative">
    <div 
      className="w-32 h-40 md:w-44 md:h-52 rounded-2xl bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]"
      style={{ 
        animation: 'shimmer 1.5s ease-in-out infinite',
        backgroundImage: 'linear-gradient(90deg, #e5e7eb 0%, #d1d5db 50%, #e5e7eb 100%)'
      }}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-gray-300/50 to-transparent rounded-2xl"></div>
  </div>
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
  const [contentVisible, setContentVisible] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [typewriterText, setTypewriterText] = useState('');



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
      document.body.style.overflow = 'hidden';
      return () => {
        // Восстанавливаем прокрутку при закрытии
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Анимация появления контента
  useEffect(() => {
    if (isOpen && !loading) {
      setContentVisible(false);
      setCurrentSection(0);
      setTypewriterText('');
      
      // Задержка перед началом анимации
      const timer = setTimeout(() => {
        setContentVisible(true);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, loading]);

  // Эффект печатающей машинки для ФИО
  useEffect(() => {
    if (!contentVisible) return;
    
    const fullName = user?.full_name?.toUpperCase() || 'НЕ УКАЗАНО';
    let currentIndex = 0;
    
    const typeInterval = setInterval(() => {
      if (currentIndex <= fullName.length) {
        setTypewriterText(fullName.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        // После завершения печати ФИО, показываем остальные блоки
        setTimeout(() => setCurrentSection(1), 200);
        setTimeout(() => setCurrentSection(2), 400);
        setTimeout(() => setCurrentSection(3), 600);
        setTimeout(() => setCurrentSection(4), 800);
      }
    }, 40); // Скорость печати ФИО
    
    return () => clearInterval(typeInterval);
  }, [contentVisible, user?.full_name]);

  if (!isOpen) return null;
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`relative max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl transform transition-all duration-700 ease-out ${
        isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full opacity-0 scale-95'
      }`}>
        {/* Заголовок с кнопкой закрытия */}
        <div className="relative bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 p-6 text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'SNS, sans-serif' }}>
                Досье резервиста
              </h2>
              <p className="text-emerald-100 text-sm">
                Подробная информация о кандидате
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Основной контент */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
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
                      <div className="relative w-full h-full">
                        {imageLoading && (
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
                        )}
                        <img
                          src={dossier.photo_url}
                          alt={user?.full_name || 'Фото'}
                          loading="lazy"
                          className={`w-full h-full object-cover transition-opacity duration-300 ${
                            imageLoading ? 'opacity-0' : 'opacity-100'
                          }`}
                          onLoad={() => setImageLoading(false)}
                          onError={() => {
                            setImageError(true);
                            setImageLoading(false);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
                        {getInitials(user?.full_name) ? (
                          <span 
                            className="text-4xl font-bold text-emerald-600" 
                            style={{ fontFamily: 'SNS, sans-serif' }}
                          >
                            {getInitials(user?.full_name)}
                          </span>
                        ) : (
                          <User className="w-12 h-12 text-emerald-600" />
                        )}
                      </div>
                    )}
                  </div>
                  
                </div>

                {/* Основная информация */}
                <div className="flex-1 min-w-0">
                  <div className="mb-3">
                    <h3 
                      className="text-xl md:text-3xl font-bold text-gray-900 mb-2 leading-tight uppercase" 
                      style={{ 
                        fontFamily: 'SNS, sans-serif',
                        color: '#06A478'
                      }}
                    >
                      {contentVisible ? (
                        <span className="inline-block">
                          {typewriterText}
                          {typewriterText.length < (user?.full_name?.toUpperCase() || 'НЕ УКАЗАНО').length && (
                            <span className="animate-pulse ml-1 text-emerald-500">|</span>
                          )}
                        </span>
                      ) : (
                        <span className="opacity-0">...</span>
                      )}
                    </h3>
                    <div className="flex flex-wrap gap-1 md:gap-2 mb-2">
                      {/* Должность */}
                      <span className={`inline-flex items-center px-2 py-1 md:px-3 rounded-full text-xs md:text-sm font-medium bg-emerald-100 text-emerald-800 transition-all duration-300 ${
                        currentSection >= 2 ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
                      }`}>
                        <Briefcase className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                        {dossier?.position || user?.position?.name || 'Не указана'}
                      </span>
                      
                      {/* Территория */}
                      <span className={`inline-flex items-center px-2 py-1 md:px-3 rounded-full text-xs md:text-sm font-medium bg-blue-100 text-blue-800 transition-all duration-300 delay-100 ${
                        currentSection >= 3 ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
                      }`}>
                        <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                        {dossier?.territory || user?.territory?.name || 'Не указан'}
                      </span>
                      
                      {/* Возраст */}
                      {dossier?.age && (
                        <span className={`inline-flex items-center px-2 py-1 md:px-3 rounded-full text-xs md:text-sm font-medium bg-purple-100 text-purple-800 transition-all duration-300 delay-200 ${
                          currentSection >= 4 ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
                        }`}>
                          <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                          {dossier.age} лет
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Подробная информация */}
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-400 delay-700 ${
                currentSection >= 4 ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'
              }`}>
                {/* Опыт работы */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Опыт работы</h4>
                      <p className="text-sm text-gray-600">Стаж в текущей должности</p>
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-emerald-700">
                    {formatExperience(user?.work_experience_days, dossier?.experience_in_position)}
                  </div>
                </div>

                {/* Образование */}
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
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-blue-700">
                      {dossier?.education?.level || 'Не указано'}
                    </div>
                    {dossier?.education?.institution && (
                      <div className="text-sm text-gray-600">
                        {dossier.education.institution}
                      </div>
                    )}
                    {dossier?.education?.specialty && (
                      <div className="text-sm text-gray-600">
                        Специальность: {dossier.education.specialty}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Карьерный путь */}
              {dossier?.career_path && (
                <div className={`bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100 transition-all duration-400 delay-1000 ${
                  currentSection >= 4 ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Карьерный путь</h4>
                      <p className="text-sm text-gray-600">История развития</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {dossier.career_path}
                  </div>
                </div>
              )}

              {/* Достижения */}
              {dossier?.achievements && dossier.achievements.length > 0 && (
                <div className={`bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100 transition-all duration-400 delay-1400 ${
                  currentSection >= 4 ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Достижения</h4>
                      <p className="text-sm text-gray-600">Награды и успехи</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {dossier.achievements.map((achievement, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-amber-400 rounded-full mt-2 shrink-0"></div>
                        <div className="text-sm text-gray-700 leading-relaxed">
                          {achievement}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>
              {dossier?.created_at && (
                <span>
                  Создано: {new Date(dossier.created_at).toLocaleDateString('ru-RU')}
                </span>
              )}
            </div>
            <div>
              Система управления резервом кадров
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};