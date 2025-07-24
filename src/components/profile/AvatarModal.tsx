import React, { useState, useRef } from 'react';
import { X, Upload, Camera, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSuccess: () => void;
}

export function AvatarModal({ isOpen, onClose, user, onSuccess }: AvatarModalProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Обновляем временную метку при открытии модального окна
  React.useEffect(() => {
    if (isOpen) {
      setAvatarTimestamp(Date.now());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Функция валидации файла
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const minSize = 1024; // 1KB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Поддерживаются только форматы: JPG, PNG, GIF, WebP' };
    }
    
    if (file.size > maxSize) {
      return { isValid: false, error: 'Размер файла не должен превышать 5 МБ' };
    }
    
    if (file.size < minSize) {
      return { isValid: false, error: 'Файл слишком маленький. Выберите изображение большего размера' };
    }
    
    return { isValid: true };
  };

  // Функция для создания предварительного просмотра
  const createPreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Создаем canvas для создания квадратного предварительного просмотра
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Устанавливаем размер canvas как квадрат
          const size = Math.max(img.width, img.height);
          canvas.width = size;
          canvas.height = size;
          
          // Вычисляем позицию для центрирования изображения
          const x = (size - img.width) / 2;
          const y = (size - img.height) / 2;
          
          // Рисуем изображение по центру
          ctx.drawImage(img, x, y);
          
          // Конвертируем в base64
          const squarePreview = canvas.toDataURL('image/jpeg', 0.8);
          setPreviewUrl(squarePreview);
        } else {
          // Fallback к обычному предварительному просмотру
          setPreviewUrl(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Обработчик выбора файла
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    setUploadStatus('idle');
    
    const validation = validateFile(file);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Ошибка валидации файла');
      setUploadStatus('error');
      return;
    }

    setSelectedFile(file);
    createPreview(file);
  };

  // Обработчик удаления выбранного файла
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage('');
    setUploadStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

    const handleFileUpload = async () => {
    if (!selectedFile || !user?.id) {
      setErrorMessage('Отсутствуют необходимые данные для загрузки');
      return;
    }
    
    setUploading(true);
    setUploadStatus('uploading');
    setErrorMessage('');
    
    try {
      // Генерируем уникальное имя файла
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `public/${user.id}.${fileExt}`;
      
      // Загружаем файл в бакет avatars
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, selectedFile, {
          upsert: true,
          contentType: selectedFile.type,
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Получаем публичную ссылку
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data?.publicUrl;
      
      if (!publicUrl) {
        throw new Error('Не удалось получить ссылку на аватар');
      }
      
      // Обновляем avatar_url в таблице users
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
        .select('avatar_url, full_name, email');
      
      if (updateError) {
        throw updateError;
      }

      // Добавляем временную метку к URL для принудительного обновления кэша браузера
      const avatarUrlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

      setUploadStatus('success');
      
      // Обновляем временную метку для принудительного обновления изображения
      setAvatarTimestamp(Date.now());
      
      // Немедленно вызываем onSuccess для обновления профиля
      onSuccess();
      
      // Закрываем модальное окно через небольшую задержку
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setErrorMessage(error.message || 'Ошибка загрузки аватара. Попробуйте другой файл.');
      setUploadStatus('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Изменить аватар</h2>
            <p className="text-sm text-gray-500 mt-1">Загрузите квадратное фото профиля</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            disabled={uploading}
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Текущий аватар */}
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg">
                {user?.avatar_url ? (
                  <img 
                    src={`${user.avatar_url}?t=${avatarTimestamp}`}
                    alt={user.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera size={32} className="text-gray-400" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#06A478] rounded-lg border-2 border-white flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-3 font-medium">{user?.full_name}</p>
            <p className="text-xs text-gray-400 mt-1">Текущий аватар</p>
          </div>

          {/* Область загрузки */}
          <div className="space-y-4">
            {/* Предварительный просмотр */}
            {previewUrl && (
              <div className="relative">
                <div className="text-center mb-3">
                  <p className="text-sm font-medium text-gray-700">Предварительный просмотр</p>
                </div>
                <div className="relative mx-auto w-32 h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 shadow-lg">
                  <img 
                    src={previewUrl} 
                    alt="Предварительный просмотр"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={handleRemoveFile}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center transition-colors shadow-lg"
                    title="Удалить файл"
                  >
                    <Trash2 size={16} className="text-white" />
                  </button>
                </div>
                <div className="text-center mt-3">
                  <p className="text-xs text-gray-500">Новый аватар будет отображаться в квадратном формате</p>
                </div>
              </div>
            )}

            {/* Кнопка выбора файла */}
            {!selectedFile && (
              <label className="block">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
                <div className="w-full p-8 border-2 border-dashed border-gray-300 rounded-2xl hover:border-[#06A478] hover:bg-[#06A478]/5 transition-all duration-200 cursor-pointer group">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-[#06A478]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#06A478]/20 transition-colors">
                      <Upload size={28} className="text-[#06A478]" />
                    </div>
                    <p className="text-base font-medium text-gray-700 mb-2">Выберите квадратное изображение</p>
                    <p className="text-sm text-gray-500 mb-3">Рекомендуется изображение 400x400 пикселей</p>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                      <span className="text-xs text-gray-600">JPG, PNG, GIF, WebP</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-600">Макс. 5 МБ</span>
                    </div>
                  </div>
                </div>
              </label>
            )}

            {/* Информация о файле */}
            {selectedFile && (
              <div className="bg-gradient-to-r from-[#06A478]/5 to-[#2621BE]/5 rounded-2xl p-4 border border-[#06A478]/20">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-[#06A478] rounded-full"></div>
                      <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} МБ</span>
                      <span>•</span>
                      <span>{selectedFile.type.split('/')[1].toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-[#06A478]/10 rounded-lg flex items-center justify-center">
                      <CheckCircle size={16} className="text-[#06A478]" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Сообщения об ошибках */}
            {errorMessage && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={20} className="text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-700">Ошибка загрузки</p>
                  <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Сообщение об успехе */}
            {uploadStatus === 'success' && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={20} className="text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-700">Аватар обновлен!</p>
                  <p className="text-xs text-green-600 mt-0.5">Изменения применены успешно</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-2xl hover:bg-gray-50 transition-colors font-medium shadow-sm"
            disabled={uploading}
          >
            Отмена
          </button>
          <button
            onClick={handleFileUpload}
            disabled={!selectedFile || uploading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#06A478] to-[#059669] text-white rounded-2xl hover:from-[#059669] hover:to-[#048A5A] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#06A478]/25"
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Загрузка...
              </>
            ) : (
              <>
                <Upload size={18} />
                Загрузить аватар
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}