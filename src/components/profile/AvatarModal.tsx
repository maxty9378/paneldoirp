import React, { useState } from 'react';
import { X, Upload, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSuccess: () => void;
}

export function AvatarModal({ isOpen, onClose, user, onSuccess }: AvatarModalProps) {
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    setUploading(true);
    try {
      // Генерируем уникальное имя файла
      const fileExt = file.name.split('.').pop();
      const filePath = `public/${user.id}.${fileExt}`;

      // Загружаем файл в бакет avatars
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });
      if (uploadError) throw uploadError;

      // Получаем публичную ссылку
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error('Не удалось получить ссылку на аватар');

      // Обновляем avatar_url в таблице users
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      onSuccess();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Ошибка загрузки аватара. Попробуйте другой файл.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Изменить аватар</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="text-center">
          <div className="w-24 h-24 bg-gray-300 rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden">
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera size={32} className="text-gray-600" />
            )}
          </div>

          <div className="space-y-4">
            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <div className="bg-sns-green text-white px-4 py-2 rounded-lg hover:bg-sns-green-dark transition-colors cursor-pointer inline-flex items-center space-x-2">
                <Upload size={16} />
                <span>{uploading ? 'Загрузка...' : 'Выбрать файл'}</span>
              </div>
            </label>

            <p className="text-sm text-gray-500">
              Поддерживаются форматы: JPG, PNG, GIF (макс. 5 МБ)
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}