import React, { useState, useEffect } from 'react';
import { User, MapPin, Award, GraduationCap, Calendar, Edit, Camera, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

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
  groupName?: string;
  onEdit?: (participantId: string, dossierData: DossierData) => void;
  onSave: (participantId: string, dossierData: DossierData) => void;
}

const DossierCard: React.FC<DossierCardProps> = ({ participant, dossier, groupName, onEdit, onSave }) => {
  const { userProfile } = useAuthBFF();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // Проверяем, является ли пользователь администратором
  const isAdmin = userProfile?.role === 'administrator';
  
  // Формируем название программы с номером группы
  const getProgramName = () => {
    const groupNumber = groupName || '20';
    return `УЧАСТНИК ПРОГРАММЫ КР «ПОТЕНЦИАЛ: ГДФ-${groupNumber}»`;
  };

  // Рассчитываем опыт в должности из дней
  const getExperienceInPosition = () => {
    if (dossier?.experience_in_position) {
      return dossier.experience_in_position;
    }
    
    if (participant.user.work_experience_days) {
      const days = participant.user.work_experience_days;
      const years = Math.floor(days / 365);
      const months = Math.floor((days % 365) / 30);
      
      let experienceText = '';
      if (years > 0 && months > 0) {
        experienceText = `${years} год ${months} месяцев`;
      } else if (years > 0) {
        experienceText = `${years} год`;
      } else if (months > 0) {
        experienceText = `${months} месяцев`;
      } else {
        experienceText = `${days} дней`;
      }
      
      return `${experienceText} (${days} дней)`;
    }
    
    return '';
  };

  const [editingData, setEditingData] = useState<DossierData>(() => {
    if (dossier) {
      return {
        ...dossier,
        program_name: getProgramName(), // Всегда используем актуальное название программы
      };
    }
    return {
      user_id: participant.user.id,
      program_name: getProgramName(),
      position: participant.user.position?.name || '',
      experience_in_position: getExperienceInPosition(),
      education: {},
      achievements: []
    };
  });

  const handleSave = () => {
    onSave(participant.user.id, editingData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditingData(dossier || {
      user_id: participant.user.id,
      program_name: getProgramName(),
      education: {},
      achievements: []
    });
    setIsEditing(false);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    // Проверяем размер файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Размер файла не должен превышать 5MB');
      return;
    }

    setIsUploadingPhoto(true);

    try {
      // Создаем уникальное имя файла
      const fileExt = file.name.split('.').pop();
      const fileName = `${participant.user.id}_${Date.now()}.${fileExt}`;
      const filePath = `dossier-photos/${fileName}`;

      // Загружаем файл в Supabase Storage
      const { error } = await supabase.storage
        .from('dossier-photos')
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      // Получаем публичный URL
      const { data: { publicUrl } } = supabase.storage
        .from('dossier-photos')
        .getPublicUrl(filePath);
      
      // Обновляем данные
      setEditingData(prev => ({
        ...prev,
        photo_url: publicUrl
      }));

      // Показываем уведомление
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
      notification.textContent = 'Фото успешно загружено!';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.transform = 'translateX(0)';
      }, 100);
      
      setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 300);
      }, 3000);

    } catch (error) {
      console.error('Ошибка загрузки фото:', error);
      alert('Не удалось загрузить фото. Попробуйте снова.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePhotoClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = handlePhotoUpload;
    input.click();
  };

  // Обновляем данные при изменении dossier
  useEffect(() => {
    if (dossier) {
      setEditingData({
        ...dossier,
        program_name: getProgramName(), // Всегда используем актуальное название программы
      });
    } else {
      setEditingData({
        user_id: participant.user.id,
        program_name: getProgramName(),
        position: participant.user.position?.name || '',
        experience_in_position: getExperienceInPosition(),
        education: {},
        achievements: []
      });
    }
  }, [dossier, participant.user.id, participant.user.position?.name, participant.user.work_experience_days, groupName]);

  const addAchievement = () => {
    setEditingData(prev => ({
      ...prev,
      achievements: [...(prev.achievements || []), '']
    }));
  };

  const parseAchievements = (text: string) => {
    // Разбиваем текст по строкам и фильтруем пустые
    let lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Если есть только одна строка, пробуем разбить по различным разделителям
    if (lines.length === 1) {
      const line = lines[0];
      
      // Пробуем разбить по точкам, если они есть
      if (line.includes('•') || line.includes('·')) {
        return line.split(/[•·]/).map(item => item.trim()).filter(item => item.length > 0);
      }
      
      // Пробуем разбить по "Мотивационная программа" (если это список программ)
      if (line.includes('Мотивационная программа')) {
        const parts = line.split('Мотивационная программа');
        return parts.map(item => {
          const trimmed = item.trim();
          return trimmed ? `Мотивационная программа${trimmed}` : '';
        }).filter(item => item.length > 0);
      }
      
      // Пробуем разбить по "«" (если есть кавычки)
      if (line.includes('«')) {
        const parts = line.split('«');
        return parts.map(item => {
          const trimmed = item.trim();
          if (trimmed && !trimmed.startsWith('«')) {
            return `«${trimmed}`;
          }
          return trimmed;
        }).filter(item => item.length > 0);
      }
      
      // Если ничего не подошло, возвращаем как есть
      return [line];
    }
    
    // Если несколько строк, но они могут быть объединены в одну
    if (lines.length === 1 || (lines.length === 2 && lines[1].length < 50)) {
      const combined = lines.join(' ');
      
      // Пробуем разбить по "Мотивационная программа"
      if (combined.includes('Мотивационная программа')) {
        const parts = combined.split('Мотивационная программа');
        return parts.map(item => {
          const trimmed = item.trim();
          return trimmed ? `Мотивационная программа${trimmed}` : '';
        }).filter(item => item.length > 0);
      }
    }
    
    return lines;
  };

  const handlePasteAchievements = (event: React.ClipboardEvent) => {
    const pastedText = event.clipboardData.getData('text');
    const achievements = parseAchievements(pastedText);
    
    if (achievements.length > 1) {
      event.preventDefault();
      setEditingData(prev => ({
        ...prev,
        achievements: [...(prev.achievements || []), ...achievements]
      }));
    }
  };

  const updateAchievement = (index: number, value: string) => {
    setEditingData(prev => ({
      ...prev,
      achievements: prev.achievements?.map((item, i) => i === index ? value : item) || []
    }));
  };

  const removeAchievement = (index: number) => {
    setEditingData(prev => ({
      ...prev,
      achievements: prev.achievements?.filter((_, i) => i !== index) || []
    }));
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Редактирование досье</h3>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#06A478] text-white rounded-lg hover:bg-[#059669] transition-colors"
            >
              Сохранить
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Фото и основная информация */}
          <div className="flex items-start space-x-6">
            <div className="relative">
              <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                {editingData.photo_url ? (
                  <img 
                    src={editingData.photo_url} 
                    alt="Фото" 
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <Camera className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <button 
                onClick={handlePhotoClick}
                disabled={isUploadingPhoto}
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#06A478] text-white rounded-full flex items-center justify-center hover:bg-[#059669] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingPhoto ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Программа</label>
                <input
                  type="text"
                  value={editingData.program_name || getProgramName()}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-600"
                  placeholder={getProgramName()}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Должность</label>
                <input
                  type="text"
                  value={editingData.position || participant.user.position?.name || ''}
                  onChange={(e) => setEditingData(prev => ({ ...prev, position: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06A478] focus:border-transparent"
                  placeholder="Супервайзер СНС – Зеленоград"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Филиал</label>
                <input
                  type="text"
                  value={participant.user.territory?.name || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-600"
                  placeholder="Зеленоград"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Возраст</label>
                  <input
                    type="number"
                    value={editingData.age || ''}
                    onChange={(e) => setEditingData(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06A478] focus:border-transparent"
                    placeholder="35"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Опыт в должности</label>
                  <input
                    type="text"
                    value={editingData.experience_in_position || ''}
                    onChange={(e) => setEditingData(prev => ({ ...prev, experience_in_position: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06A478] focus:border-transparent"
                    placeholder="1 год 6 месяцев"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Образование и Путь в ГК СНС в две колонки */}
          <div className="border-t border-gray-200 pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Образование */}
              <div>
                <h4 className="text-lg font-semibold text-[#06A478] mb-4 flex items-center">
                  <GraduationCap className="w-5 h-5 mr-2" />
                  ОБРАЗОВАНИЕ
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Уровень</label>
                    <input
                      type="text"
                      value={editingData.education?.level || ''}
                      onChange={(e) => setEditingData(prev => ({ 
                        ...prev, 
                        education: { ...prev.education, level: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06A478] focus:border-transparent"
                      placeholder="Высшее"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Учебное заведение</label>
                    <input
                      type="text"
                      value={editingData.education?.institution || ''}
                      onChange={(e) => setEditingData(prev => ({ 
                        ...prev, 
                        education: { ...prev.education, institution: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06A478] focus:border-transparent"
                      placeholder="Московская Академия экономики и права"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Специальность</label>
                    <input
                      type="text"
                      value={editingData.education?.specialty || ''}
                      onChange={(e) => setEditingData(prev => ({ 
                        ...prev, 
                        education: { ...prev.education, specialty: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06A478] focus:border-transparent"
                      placeholder="Юрист"
                    />
                  </div>
                </div>
              </div>

              {/* Путь в ГК СНС */}
              <div>
                <h4 className="text-lg font-semibold text-[#06A478] mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  ПУТЬ В ГК «СНС»
                </h4>
                <textarea
                  value={editingData.career_path || ''}
                  onChange={(e) => setEditingData(prev => ({ ...prev, career_path: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06A478] focus:border-transparent"
                  rows={6}
                  placeholder="С июля 2023 - в должности Супервайзера"
                />
              </div>
            </div>
          </div>

          {/* Достижения */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-[#06A478] flex items-center">
                <Award className="w-5 h-5 mr-2" />
                ДОСТИЖЕНИЯ
              </h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const modal = document.createElement('div');
                    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                    modal.innerHTML = `
                      <div class="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
                        <h3 class="text-lg font-semibold mb-4">Вставить список достижений</h3>
                        <textarea 
                          id="achievements-text" 
                          class="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none"
                          placeholder="Вставьте список достижений...&#10;&#10;Пример:&#10;«Новогодний старт 4-5-6 января»&#10;Мотивационная программа по i:FORCE MS10000_сентябрь&#10;Мотивационная программа по подключению потенциальных точек декабрь"
                        ></textarea>
                        <div class="flex justify-end space-x-2 mt-4">
                          <button id="cancel-btn" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">Отмена</button>
                          <button id="add-btn" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Добавить</button>
                        </div>
                      </div>
                    `;
                    
                    document.body.appendChild(modal);
                    
                    const textarea = modal.querySelector('#achievements-text') as HTMLTextAreaElement;
                    const cancelBtn = modal.querySelector('#cancel-btn');
                    const addBtn = modal.querySelector('#add-btn');
                    
                    textarea.focus();
                    
                    const closeModal = () => {
                      document.body.removeChild(modal);
                    };
                    
                    cancelBtn?.addEventListener('click', closeModal);
                    addBtn?.addEventListener('click', () => {
                      const text = textarea.value.trim();
                      if (text) {
                        const achievements = parseAchievements(text);
                        setEditingData(prev => ({
                          ...prev,
                          achievements: [...(prev.achievements || []), ...achievements]
                        }));
                      }
                      closeModal();
                    });
                    
                    modal.addEventListener('click', (e) => {
                      if (e.target === modal) closeModal();
                    });
                  }}
                  className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  📋 Вставить список
                </button>
                <button
                  onClick={addAchievement}
                  className="px-3 py-1 bg-[#06A478] text-white rounded-lg hover:bg-[#059669] transition-colors text-sm"
                >
                  + Добавить
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {editingData.achievements?.map((achievement, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gradient-to-r from-[#06A478]/5 to-[#059669]/5 border border-[#06A478]/20 rounded-lg hover:shadow-sm transition-all duration-200">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-gradient-to-br from-[#06A478] to-[#059669] rounded-full flex items-center justify-center shadow-sm">
                      <Award className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={achievement}
                    onChange={(e) => updateAchievement(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-[#06A478]/30 rounded-lg focus:ring-2 focus:ring-[#06A478] focus:border-transparent text-sm"
                    placeholder="Мотивационная программа..."
                  />
                  <button
                    onClick={() => removeAchievement(index)}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-6">
      {/* Заголовок программы */}
      <div className="bg-[#06A478] text-white px-4 py-2 rounded-lg mb-6 text-center font-semibold">
        {dossier?.program_name || getProgramName()}
      </div>

      {/* Основная информация */}
      <div className="flex items-start space-x-6 mb-6">
        <div 
          className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={handlePhotoClick}
          title="Нажмите для загрузки фото"
        >
          {dossier?.photo_url ? (
            <img 
              src={dossier.photo_url} 
              alt="Фото" 
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <User className="w-8 h-8 text-gray-400" />
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-[#06A478] mb-2">
            {participant.user.full_name}
          </h3>
          <p className="text-gray-600 mb-1">
            {dossier?.position || participant.user.position?.name || 'Должность не указана'}
          </p>
          <p className="text-sm text-gray-500">
            {dossier?.territory || participant.user.territory?.name || 'Филиал не указан'}
          </p>
          <div className="flex items-center text-sm text-gray-500 space-x-4">
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {dossier?.age ? `${dossier.age} лет` : 'Возраст не указан'}
            </span>
            <span className="flex items-center">
              <User className="w-4 h-4 mr-1" />
              {getExperienceInPosition() || 'Опыт не указан'}
            </span>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-[#06A478] hover:bg-[#06A478]/10 rounded-lg transition-colors"
          >
            <Edit className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Секции информации */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Образование */}
        <div className="border-t-2 border-dashed border-gray-300 pt-4">
          <h4 className="text-lg font-semibold text-[#06A478] mb-3 flex items-center">
            <GraduationCap className="w-5 h-5 mr-2" />
            ОБРАЗОВАНИЕ
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-[#06A478] rounded-full"></div>
              <span className="font-medium">{dossier?.education?.level || 'Не указано'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-[#06A478] rounded-full"></div>
              <span>{dossier?.education?.institution || 'Не указано'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-[#06A478] rounded-full"></div>
              <span>{dossier?.education?.specialty || 'Не указано'}</span>
            </div>
          </div>
        </div>

        {/* Путь в ГК СНС */}
        <div className="border-t-2 border-dashed border-gray-300 pt-4">
          <h4 className="text-lg font-semibold text-[#06A478] mb-3 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            ПУТЬ В ГК «СНС»
          </h4>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm leading-relaxed">{dossier?.career_path || 'Не указано'}</p>
          </div>
        </div>

        {/* Достижения */}
        <div className="border-t-2 border-dashed border-gray-300 pt-4 lg:col-span-2">
          <h4 className="text-lg font-semibold text-[#06A478] mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2" />
            ДОСТИЖЕНИЯ
          </h4>
          <div className="space-y-2">
            {dossier?.achievements && dossier.achievements.length > 0 ? (
              dossier.achievements.map((achievement, index) => (
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
            )}
          </div>
        </div>
      </div>

      {/* Футер */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">ИДИ ВПЕРЕД И ДОСТИГАЙ!</p>
        <div className="text-right">
          <div className="text-lg font-bold text-[#06A478]">SNS</div>
          <div className="text-xs text-gray-500">Group of companies</div>
        </div>
      </div>
    </div>
  );
};

export default DossierCard;
