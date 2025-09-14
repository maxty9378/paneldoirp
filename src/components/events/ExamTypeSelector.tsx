import React, { useState, useEffect } from 'react';
import { Users, Star, Briefcase, ChevronDown, Check, Plus, User, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TalentCategory {
  id: string;
  name: string;
  name_ru: string;
  description: string;
  color: string;
}

interface Expert {
  id: string;
  fullName: string;
  position: string;
  email: string;
}

interface ExamTypeSelectorProps {
  onCategorySelect: (category: TalentCategory | null) => void;
  onGroupNameChange: (groupName: string) => void;
  onExpertEmailsChange: (emails: string[]) => void;
  onExpertsChange?: (experts: Expert[]) => void;
  onTitleUpdate?: (title: string) => void;
  onDescriptionUpdate?: (description: string) => void;
  selectedCategory?: TalentCategory | null;
  groupName?: string;
  expertEmails?: string[];
  experts?: Expert[];
}

export function ExamTypeSelector({
  onCategorySelect,
  onGroupNameChange,
  onExpertEmailsChange,
  onExpertsChange,
  onTitleUpdate,
  onDescriptionUpdate,
  selectedCategory,
  groupName = '',
  expertEmails = [],
  experts = []
}: ExamTypeSelectorProps) {
  const [categories, setCategories] = useState<TalentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [newExpert, setNewExpert] = useState({
    fullName: '',
    position: '',
    email: ''
  });
  const [localExperts, setLocalExperts] = useState<Array<{
    id: string;
    fullName: string;
    position: string;
    email: string;
  }>>([]);

  // Загрузка категорий талантов
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('talent_categories')
        .select('*')
        .order('name_ru');

      if (error) throw error;
      setCategories(data || []);
      console.log('Загружены категории талантов:', data);
    } catch (err) {
      console.error('Error fetching talent categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Синхронизация с пропсом experts
  useEffect(() => {
    setLocalExperts(experts);
  }, [experts]);

  const generateTitleAndDescription = (category: TalentCategory | null, group: string) => {
    if (!category) return;
    
    const title = `Экзамен кадрового резерва - ${category.name_ru}${group ? ` (${group})` : ''}`;
    const description = `Комплексная оценка кандидатов в кадровый резерв по категории "${category.name_ru}". ${category.description}${group ? ` Группа: ${group}.` : ''} Экзамен включает три этапа: защита кейсов, защита проекта и диагностическую игру.`;
    
    onTitleUpdate?.(title);
    onDescriptionUpdate?.(description);
  };

  const handleCategorySelect = (category: TalentCategory) => {
    onCategorySelect(category);
    generateTitleAndDescription(category, groupName);
    setIsOpen(false);
  };

  const handleGroupNameChange = (groupName: string) => {
    onGroupNameChange(groupName);
    if (selectedCategory) {
      generateTitleAndDescription(selectedCategory, groupName);
    }
  };

  const handleAddExpert = () => {
    if (newExpert.fullName.trim() && newExpert.email.trim()) {
      const expert: Expert = {
        id: Date.now().toString(),
        fullName: newExpert.fullName.trim(),
        position: newExpert.position.trim(),
        email: newExpert.email.trim()
      };
      
      const updatedExperts = [...localExperts, expert];
      setLocalExperts(updatedExperts);
      onExpertsChange?.(updatedExperts);
      
      // Также обновляем список email для обратной совместимости
      const emails = updatedExperts.map(e => e.email);
      onExpertEmailsChange(emails);
      
      setNewExpert({ fullName: '', position: '', email: '' });
    }
  };

  const handleRemoveExpert = (expertId: string) => {
    const updatedExperts = localExperts.filter(e => e.id !== expertId);
    setLocalExperts(updatedExperts);
    onExpertsChange?.(updatedExperts);
    
    // Также обновляем список email для обратной совместимости
    const emails = updatedExperts.map(e => e.email);
    onExpertEmailsChange(emails);
  };

  const handleNewExpertChange = (field: keyof typeof newExpert, value: string) => {
    setNewExpert(prev => ({ ...prev, [field]: value }));
  };

  const getCategoryIcon = (name: string) => {
    switch (name) {
      case 'talent_sv':
        return <Star className="h-5 w-5" />;
      case 'potential_gdf':
        return <Users className="h-5 w-5" />;
      case 'professionals_rm':
        return <Briefcase className="h-5 w-5" />;
      default:
        return <Users className="h-5 w-5" />;
    }
  };

  if (loading) {
    console.log('ExamTypeSelector: Загрузка категорий талантов...');
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  console.log('ExamTypeSelector: Рендер с категориями:', categories);

  return (
    <div className="space-y-6">
      {/* Выбор категории кадрового резерва */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Категория Кадрового резерва *
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {selectedCategory ? (
                <>
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: selectedCategory.color + '20' }}
                  >
                    {getCategoryIcon(selectedCategory.name)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{selectedCategory.name_ru}</div>
                    <div className="text-sm text-gray-500">{selectedCategory.description}</div>
                  </div>
                </>
              ) : (
                <span className="text-gray-500">Выберите категорию кадрового резерва</span>
              )}
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategorySelect(category)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                >
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    {getCategoryIcon(category.name)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{category.name_ru}</div>
                    <div className="text-sm text-gray-500">{category.description}</div>
                  </div>
                  {selectedCategory?.id === category.id && (
                    <Check className="h-5 w-5 text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Название группы */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Название группы *
        </label>
        <input
          type="text"
          value={groupName}
          onChange={(e) => handleGroupNameChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Например: 21"
          required
        />
      </div>


      {/* Эксперты */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-4 flex items-center">
          <Users className="w-4 h-4 text-[#06A478] mr-2" />
          Эксперты *
        </label>
        
        {/* Форма добавления нового эксперта */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Добавить эксперта</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                ФИО *
              </label>
              <input
                type="text"
                value={newExpert.fullName}
                onChange={(e) => handleNewExpertChange('fullName', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06A478] focus:border-[#06A478]"
                placeholder="Иванов Иван Иванович"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Должность
              </label>
              <input
                type="text"
                value={newExpert.position}
                onChange={(e) => handleNewExpertChange('position', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06A478] focus:border-[#06A478]"
                placeholder="Руководитель отдела"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={newExpert.email}
                onChange={(e) => handleNewExpertChange('email', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06A478] focus:border-[#06A478]"
                placeholder="expert@company.com"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddExpert}
            disabled={!newExpert.fullName.trim() || !newExpert.email.trim()}
            className="mt-3 px-4 py-2 bg-[#06A478] text-white text-sm font-medium rounded-lg hover:bg-[#05976b] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить эксперта
          </button>
        </div>

        {/* Список экспертов */}
        {localExperts.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Добавленные эксперты</h4>
            {localExperts.map((expert) => (
              <div
                key={expert.id}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <User className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="font-medium text-gray-800">{expert.fullName}</span>
                  </div>
                  {expert.position && (
                    <p className="text-sm text-gray-600 mb-1">{expert.position}</p>
                  )}
                  <p className="text-sm text-blue-600">{expert.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveExpert(expert.id)}
                  className="ml-4 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {localExperts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Добавьте экспертов для проведения экзамена</p>
          </div>
        )}
      </div>
    </div>
  );
}
