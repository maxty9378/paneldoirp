import React, { useState, useEffect } from 'react';
import { User, Briefcase, GraduationCap, Award, Target, Edit, Trash2, Plus, Save, X, Upload } from 'lucide-react';
import { ReservistDossier } from '../../types/exam';
import { supabase } from '../../lib/supabase';

interface ReservistDossierManagerProps {
  examEventId: string;
  onDossierChange?: () => void;
}

export function ReservistDossierManager({ examEventId, onDossierChange }: ReservistDossierManagerProps) {
  const [dossiers, setDossiers] = useState<ReservistDossier[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDossier, setEditingDossier] = useState<ReservistDossier | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Загрузка досье
  const fetchDossiers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reservist_dossiers')
        .select(`
          *,
          users:user_id (
            id,
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('exam_event_id', examEventId)
        .order('created_at');

      if (error) throw error;
      setDossiers(data || []);
    } catch (err) {
      console.error('Error fetching dossiers:', err);
      setError('Ошибка загрузки досье');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка пользователей для выбора
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, avatar_url')
        .order('first_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // Сохранение досье
  const saveDossier = async (dossier: Partial<ReservistDossier>) => {
    try {
      if (editingDossier?.id) {
        // Обновление существующего
        const { error } = await supabase
          .from('reservist_dossiers')
          .update(dossier)
          .eq('id', editingDossier.id);

        if (error) throw error;
      } else {
        // Создание нового
        const { error } = await supabase
          .from('reservist_dossiers')
          .insert([{ ...dossier, exam_event_id: examEventId }]);

        if (error) throw error;
      }

      setEditingDossier(null);
      setIsAddingNew(false);
      fetchDossiers();
      onDossierChange?.();
    } catch (err) {
      console.error('Error saving dossier:', err);
      setError('Ошибка сохранения досье');
    }
  };

  // Удаление досье
  const deleteDossier = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить это досье?')) return;

    try {
      const { error } = await supabase
        .from('reservist_dossiers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchDossiers();
      onDossierChange?.();
    } catch (err) {
      console.error('Error deleting dossier:', err);
      setError('Ошибка удаления досье');
    }
  };

  // Загрузка файла фото
  const uploadPhoto = async (file: File, userId: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `reservist-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      console.error('Error uploading photo:', err);
      throw new Error('Ошибка загрузки фото');
    }
  };

  useEffect(() => {
    fetchDossiers();
    fetchUsers();
  }, [examEventId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок с кнопкой добавления */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Досье резервистов</h3>
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Добавить резервиста
        </button>
      </div>

      {/* Список досье */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dossiers.map((dossier) => (
          <div
            key={dossier.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  {dossier.photo_url ? (
                    <img
                      src={dossier.photo_url}
                      alt="Фото"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {dossier.users?.first_name} {dossier.users?.last_name}
                  </h4>
                  <p className="text-sm text-gray-600">{dossier.position}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingDossier(dossier)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteDossier(dossier.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Briefcase className="h-4 w-4" />
                <span>{dossier.department}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Award className="h-4 w-4" />
                <span>{dossier.experience_years} лет опыта</span>
              </div>
              {dossier.education && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <GraduationCap className="h-4 w-4" />
                  <span className="truncate">{dossier.education}</span>
                </div>
              )}
            </div>

            {/* Достижения */}
            {dossier.achievements.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Достижения</h5>
                <div className="flex flex-wrap gap-1">
                  {dossier.achievements.slice(0, 3).map((achievement, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                    >
                      {achievement}
                    </span>
                  ))}
                  {dossier.achievements.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{dossier.achievements.length - 3} еще
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Сильные стороны */}
            {dossier.strengths.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Сильные стороны</h5>
                <div className="flex flex-wrap gap-1">
                  {dossier.strengths.slice(0, 2).map((strength, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                    >
                      {strength}
                    </span>
                  ))}
                  {dossier.strengths.length > 2 && (
                    <span className="text-xs text-gray-500">
                      +{dossier.strengths.length - 2} еще
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Форма редактирования/добавления */}
      {(editingDossier || isAddingNew) && (
        <DossierEditForm
          dossier={editingDossier}
          users={users}
          onSave={saveDossier}
          onCancel={() => {
            setEditingDossier(null);
            setIsAddingNew(false);
          }}
          onUploadPhoto={uploadPhoto}
        />
      )}

      {/* Сообщение об ошибке */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

// Компонент формы редактирования досье
interface DossierEditFormProps {
  dossier?: ReservistDossier | null;
  users: any[];
  onSave: (dossier: Partial<ReservistDossier>) => void;
  onCancel: () => void;
  onUploadPhoto: (file: File, userId: string) => Promise<string>;
}

function DossierEditForm({ dossier, users, onSave, onCancel, onUploadPhoto }: DossierEditFormProps) {
  const [formData, setFormData] = useState({
    user_id: dossier?.user_id || '',
    position: dossier?.position || '',
    department: dossier?.department || '',
    experience_years: dossier?.experience_years || 0,
    education: dossier?.education || '',
    achievements: dossier?.achievements || [],
    strengths: dossier?.strengths || [],
    development_areas: dossier?.development_areas || [],
    photo_url: dossier?.photo_url || '',
  });

  const [newAchievement, setNewAchievement] = useState('');
  const [newStrength, setNewStrength] = useState('');
  const [newDevelopmentArea, setNewDevelopmentArea] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация
    if (!formData.user_id || !formData.position || !formData.department) {
      alert('Заполните все обязательные поля');
      return;
    }

    onSave(formData);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData.user_id) return;

    try {
      setUploadingPhoto(true);
      const photoUrl = await onUploadPhoto(file, formData.user_id);
      setFormData({ ...formData, photo_url: photoUrl });
    } catch (err) {
      alert('Ошибка загрузки фото');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const addAchievement = () => {
    if (newAchievement.trim()) {
      setFormData({
        ...formData,
        achievements: [...formData.achievements, newAchievement.trim()]
      });
      setNewAchievement('');
    }
  };

  const removeAchievement = (index: number) => {
    setFormData({
      ...formData,
      achievements: formData.achievements.filter((_, i) => i !== index)
    });
  };

  const addStrength = () => {
    if (newStrength.trim()) {
      setFormData({
        ...formData,
        strengths: [...formData.strengths, newStrength.trim()]
      });
      setNewStrength('');
    }
  };

  const removeStrength = (index: number) => {
    setFormData({
      ...formData,
      strengths: formData.strengths.filter((_, i) => i !== index)
    });
  };

  const addDevelopmentArea = () => {
    if (newDevelopmentArea.trim()) {
      setFormData({
        ...formData,
        development_areas: [...formData.development_areas, newDevelopmentArea.trim()]
      });
      setNewDevelopmentArea('');
    }
  };

  const removeDevelopmentArea = (index: number) => {
    setFormData({
      ...formData,
      development_areas: formData.development_areas.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        {dossier ? 'Редактировать досье' : 'Добавить досье резервиста'}
      </h4>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Основная информация */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Резервист *
            </label>
            <select
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Выберите пользователя</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Должность *
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Например: Менеджер по развитию"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Подразделение *
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Например: Отдел маркетинга"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Опыт работы (лет)
            </label>
            <input
              type="number"
              value={formData.experience_years}
              onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Образование
          </label>
          <input
            type="text"
            value={formData.education}
            onChange={(e) => setFormData({ ...formData, education: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Например: МГУ, факультет экономики"
          />
        </div>

        {/* Фото */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Фото
          </label>
          <div className="flex items-center gap-4">
            {formData.photo_url && (
              <img
                src={formData.photo_url}
                alt="Фото"
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
              <Upload className="h-4 w-4" />
              {uploadingPhoto ? 'Загрузка...' : 'Загрузить фото'}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploadingPhoto}
              />
            </label>
          </div>
        </div>

        {/* Достижения */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Достижения
          </label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newAchievement}
                onChange={(e) => setNewAchievement(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Добавить достижение"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAchievement())}
              />
              <button
                type="button"
                onClick={addAchievement}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Добавить
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.achievements.map((achievement, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {achievement}
                  <button
                    type="button"
                    onClick={() => removeAchievement(index)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Сильные стороны */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Сильные стороны
          </label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newStrength}
                onChange={(e) => setNewStrength(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Добавить сильную сторону"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStrength())}
              />
              <button
                type="button"
                onClick={addStrength}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Добавить
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.strengths.map((strength, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                >
                  {strength}
                  <button
                    type="button"
                    onClick={() => removeStrength(index)}
                    className="text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Области развития */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Области развития
          </label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newDevelopmentArea}
                onChange={(e) => setNewDevelopmentArea(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Добавить область развития"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDevelopmentArea())}
              />
              <button
                type="button"
                onClick={addDevelopmentArea}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Добавить
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.development_areas.map((area, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                >
                  {area}
                  <button
                    type="button"
                    onClick={() => removeDevelopmentArea(index)}
                    className="text-orange-600 hover:text-orange-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Save className="h-4 w-4" />
            Сохранить
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
