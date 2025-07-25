import React, { useState, useEffect } from 'react';
import { User, Video, MapPin, FileText, Download, Upload, Plus, X, Edit, FileSpreadsheet, Monitor, Phone, Mail, ExternalLink, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getEventFiles, uploadEventFile, deleteEventFile } from '../../lib/eventFileStorage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/use-toast';

// Инициализация CSS Houdini для squircle с безопасной типизацией
if (typeof window !== 'undefined') {
  (async function () {
    if (!("paintWorklet" in CSS)) {
      try {
        await import("css-paint-polyfill");
      } catch (error) {
        console.warn('CSS Paint Polyfill not available');
      }
    }
    try {
      // Используем безопасную проверку для paintWorklet
      const css = CSS as any;
      if (css.paintWorklet) {
        await css.paintWorklet.addModule(
          `https://www.unpkg.com/css-houdini-squircle/squircle.min.js`
        );
      }
    } catch (error) {
      console.warn('Squircle Houdini not available, using fallback');
    }
  })();
}

interface EventFile {
  id: string;
  name: string;
  type: 'presentation' | 'workbook';
  url: string;
  size: number;
  created_at: string;
}

interface EventDetailsCardProps {
  event: any;
  isCreator?: boolean;
  onUpdateOrganizerData?: (newAvatarUrl: string) => void;
}

export function EventDetailsCard({ event, isCreator = false, onUpdateOrganizerData }: EventDetailsCardProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  // CSS стили для squircle с fallback
  const squircleStyles = `
    .squircle24 {
      --squircle-radius: 24px;
      --squircle-smooth: 1;
      mask-image: paint(squircle);
      -webkit-mask-image: paint(squircle);
      border-radius: 24px; /* fallback */
    }
    
    .squircle12 {
      --squircle-radius: 12px;
      --squircle-smooth: 1;
      mask-image: paint(squircle);
      -webkit-mask-image: paint(squircle);
      border-radius: 12px; /* fallback */
    }
    
    .squircle8 {
      --squircle-radius: 8px;
      --squircle-smooth: 1;
      mask-image: paint(squircle);
      -webkit-mask-image: paint(squircle);
      border-radius: 8px; /* fallback */
    }
  `;
  
  // Принудительное обновление данных организатора при изменении аватара
  useEffect(() => {
    if (event?.creator?.id && userProfile?.id === event.creator.id && userProfile?.avatar_url !== event.creator.avatar_url) {
      console.log('🔄 Обновляем данные организатора с новой аватаркой');
      console.log('📊 Сравнение:', {
        eventAvatar: event.creator.avatar_url,
        userAvatar: userProfile?.avatar_url,
        hasUpdateFunction: !!onUpdateOrganizerData
      });
      
      if (userProfile?.avatar_url && onUpdateOrganizerData) {
        onUpdateOrganizerData(userProfile.avatar_url);
        console.log('✅ Функция обновления вызвана');
      }
    }
  }, [event?.creator, userProfile, onUpdateOrganizerData]);
  
  // Проверяем, может ли пользователь управлять файлами
  const canManageFiles = isCreator || userProfile?.role === 'administrator' || userProfile?.role === 'moderator';
  const [files, setFiles] = useState<EventFile[]>([]);
  const [loading, setLoading] = useState(false);

  // Функция для копирования в буфер обмена
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} скопирован в буфер обмена`);
    } catch (error) {
      toast('Ошибка копирования');
    }
  };

  // Функция для разбиения полного имени на фамилию и имя
  const splitFullName = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return {
        lastName: parts[0].toUpperCase(),
        firstName: parts.slice(1).join(' ').toUpperCase()
      };
    }
    return {
      lastName: fullName.toUpperCase(),
      firstName: ''
    };
  };

  // Функция для получения инициалов из полного имени
  const getInitials = (fullName: string | undefined) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return fullName[0]?.toUpperCase() || '?';
  };

  // Загрузка файлов мероприятия
  useEffect(() => {
    if (event?.id) {
      loadEventFiles();
    }
  }, [event?.id]);

  const loadEventFiles = async () => {
    setLoading(true);
    try {
      const eventFiles = await getEventFiles(event.id);
      setFiles(eventFiles);
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот файл?')) return;

    try {
      const result = await deleteEventFile(fileId);
      if (result.success) {
        await loadEventFiles();
      } else {
        alert('Ошибка удаления файла: ' + result.error);
      }
    } catch (error) {
      console.error('Ошибка удаления файла:', error);
      alert('Произошла ошибка при удалении файла');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FileText className="w-4 h-4" />;
      case 'ppt':
      case 'pptx':
        return <FileSpreadsheet className="w-4 h-4" />;
      case 'doc':
      case 'docx':
        return <FileText className="w-4 h-4" />;
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <>
      <style>{squircleStyles}</style>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden -mx-4 sm:mx-0">
        {/* Заголовок */}
        <div className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Информация о мероприятии</h3>
            <p className="text-xs sm:text-sm text-gray-600">Детальная информация о мероприятии</p>
          </div>
        </div>

        {/* Основной контент */}
        <div className="space-y-3 sm:space-y-4 lg:space-y-6 p-2 sm:p-4 lg:p-6">
          
          {/* Организатор и онлайн встреча */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {/* Организатор - 2/3 */}
            <div className="lg:col-span-2 bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-3 sm:p-5 lg:p-6 shadow-sm">
              <div className="flex items-start gap-3 sm:gap-4 lg:gap-5">
                {/* Аватарка */}
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-36 lg:h-36 xl:w-44 xl:h-44 bg-gradient-to-br from-[#06A478] to-[#059669] flex items-center justify-center shadow-lg overflow-hidden squircle24" style={{ '--squircle-radius': '24px', '--squircle-smooth': '1' } as React.CSSProperties}>
                    {event.creator?.avatar_url ? (
                      <>
                        <img 
                          src={`${event.creator.avatar_url}?t=${Date.now()}`} 
                          alt={`Аватар ${event.creator.full_name}`}
                          className="w-full h-full object-cover squircle24"
                          style={{ '--squircle-radius': '24px', '--squircle-smooth': '1' } as React.CSSProperties}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                          onLoad={(e) => {
                            e.currentTarget.nextElementSibling?.classList.add('hidden');
                          }}
                        />
                        {/* Fallback с инициалами */}
                        <div className="hidden w-full h-full flex items-center justify-center squircle24" style={{ '--squircle-radius': '24px', '--squircle-smooth': '1' } as React.CSSProperties}>
                          <span className="text-white font-bold text-xl sm:text-2xl lg:text-3xl xl:text-4xl">
                            {getInitials(event.creator.full_name)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className="text-white font-bold text-xl sm:text-2xl lg:text-3xl xl:text-4xl">
                        {getInitials(event.creator.full_name)}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Информация */}
                <div className="flex-1 min-w-0">
                  <div className="mb-2 sm:mb-3">
                    <h5 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 leading-tight">
                      {event.creator?.full_name || 'НЕ УКАЗАН'}
                    </h5>
                  </div>
                  
                  {event.creator?.position?.name && (
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">
                      {event.creator.position.name}
                    </p>
                  )}
                  
                  {(event.creator?.territory?.name || event.creator?.branch?.name) && (
                    <p className="text-xs sm:text-sm text-gray-500 mb-3">
                      {event.creator.territory?.name || event.creator.branch?.name}
                    </p>
                  )}
                  
                  {/* Контакты */}
                  <div className="flex flex-wrap gap-2 justify-start">
                    {event.creator?.phone && (
                      <button 
                        onClick={() => copyToClipboard(event.creator.phone, 'Номер телефона')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs rounded-lg border border-gray-200 transition-colors touch-manipulation"
                        title="Копировать номер телефона"
                      >
                        <Phone className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        <span>
                          {event.creator.phone}
                        </span>
                      </button>
                    )}
                    
                    {event.creator?.email && (
                      <button 
                        onClick={() => copyToClipboard(event.creator.email, 'Email')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs rounded-lg border border-gray-200 transition-colors touch-manipulation"
                        title="Копировать email"
                      >
                        <Mail className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        <span>
                          {event.creator.email}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Онлайн встреча - 1/3 */}
            {event.meeting_link && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-4 lg:p-6 border border-blue-200 rounded-xl">
                <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <Video className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  <span className="hidden sm:inline">Онлайн встреча</span>
                  <span className="sm:hidden">Встреча</span>
                </h4>
                
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex-shrink-0">
                      <img 
                        src="https://cdn-icons-png.freepik.com/512/4401/4401470.png?ga=GA1.1.1556317130.1727868685" 
                        alt="ZOOM" 
                        className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12"
                      />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-blue-700">ZOOM</p>
                      <p className="text-xs text-blue-600 hidden sm:block">Онлайн платформа</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 sm:space-y-3">
                    <button
                      onClick={() => copyToClipboard(event.meeting_link, 'Ссылка на встречу')}
                      className="inline-flex items-center justify-center w-full px-3 py-2.5 bg-gray-600 text-white rounded-lg font-medium text-xs sm:text-sm shadow-md hover:shadow-lg hover:bg-gray-700 transition-all duration-200 touch-manipulation"
                    >
                      <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                      <span className="hidden sm:inline">Скопировать ссылку</span>
                      <span className="sm:hidden">Копировать</span>
                    </button>
                    
                    <a
                      href={event.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-full px-3 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-xs sm:text-sm shadow-md hover:shadow-lg transition-all duration-200 no-underline hover:no-underline hover:text-white touch-manipulation"
                    >
                      <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                      Перейти
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Файлы мероприятия - оптимизированные для мобильных */}
          <div className="p-2 sm:p-4 lg:p-6 border border-gray-200 rounded-xl bg-gray-50/30">
            <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              Файлы мероприятия
            </h4>

            {/* Список файлов */}
            {loading ? (
              <div className="text-center py-6 sm:py-8">
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-[#06A478] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs sm:text-sm text-gray-500">Загрузка файлов...</p>
              </div>
            ) : files.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`flex flex-col p-2.5 sm:p-3 rounded-lg border ${
                      file.type === 'presentation' 
                        ? 'bg-[#06A478]/10 border-[#06A478]/20' 
                        : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                      <div className={`p-1.5 sm:p-2 rounded-lg ${
                        file.type === 'presentation' 
                          ? 'bg-[#06A478]/20 text-[#06A478]' 
                          : 'bg-orange-100 text-orange-600'
                      }`}>
                        {getFileIcon(file.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className={`text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium ${
                          file.type === 'presentation' 
                            ? 'bg-[#06A478]/20 text-[#06A478]' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          <span className="hidden sm:inline">
                            {file.type === 'presentation' ? 'Презентация' : 'Рабочая тетрадь'}
                          </span>
                          <span className="sm:hidden">
                            {file.type === 'presentation' ? 'През.' : 'Тетрадь'}
                          </span>
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors touch-manipulation"
                          title="Скачать файл"
                        >
                          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </a>
                        {canManageFiles && (
                          <button
                            onClick={() => handleFileDelete(file.id)}
                            className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 transition-colors touch-manipulation"
                            title="Удалить файл"
                          >
                            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-gray-300" />
                <p className="text-xs sm:text-sm">Файлы не загружены</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 