import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Plus, Edit, Trash2, Eye, BarChart4, FileText, AlertTriangle, Check } from 'lucide-react';
import { FeedbackTemplateEditor } from '../feedback/FeedbackTemplateEditor';
import { clsx } from 'clsx';

interface FeedbackTemplate {
  id: string;
  name: string;
  description: string;
  event_type_id: string;
  event_type: {
    name: string;
    name_ru: string;
  };
  is_default: boolean;
  created_at: string;
  updated_at: string;
  questions_count: number;
}

export function FeedbackManagement() {
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  
  useEffect(() => {
    fetchTemplates();
  }, []);
  
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feedback_templates')
        .select(`
          *,
          event_type:event_type_id(name, name_ru)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Для каждого шаблона получаем количество вопросов
      const templatesWithQuestionCount = await Promise.all((data || []).map(async (template) => {
        const { count, error: countError } = await supabase
          .from('feedback_questions')
          .select('id', { count: 'exact', head: true })
          .eq('template_id', template.id);
        
        return {
          ...template,
          questions_count: count || 0
        };
      }));
      
      setTemplates(templatesWithQuestionCount);
    } catch (err) {
      console.error('Error fetching feedback templates:', err);
      setError('Не удалось загрузить шаблоны обратной связи');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateTemplate = () => {
    setEditingTemplateId(null);
    setShowEditor(true);
  };
  
  const handleEditTemplate = (templateId: string) => {
    setEditingTemplateId(templateId);
    setShowEditor(true);
  };
  
  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот шаблон обратной связи?')) {
      return;
    }
    
    setDeletingTemplateId(templateId);
    try {
      const { error } = await supabase
        .from('feedback_templates')
        .delete()
        .eq('id', templateId);
      
      if (error) throw error;
      
      // Обновляем список шаблонов
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (err) {
      console.error('Error deleting template:', err);
      alert('Ошибка при удалении шаблона');
    } finally {
      setDeletingTemplateId(null);
    }
  };
  
  const handleEditorClose = () => {
    setShowEditor(false);
    setEditingTemplateId(null);
  };
  
  const handleEditorSuccess = () => {
    fetchTemplates();
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление обратной связью</h1>
          <p className="text-gray-600 mt-1">
            Создание и редактирование форм обратной связи для мероприятий
          </p>
        </div>
        <button
          onClick={handleCreateTemplate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          <span>Создать шаблон</span>
        </button>
      </div>

      {/* Список шаблонов */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
            Шаблоны обратной связи
          </h2>
        </div>
        <div>
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет шаблонов обратной связи</h3>
              <p className="text-gray-600 mb-6">
                Создайте первый шаблон для сбора обратной связи по мероприятиям
              </p>
              <button
                onClick={handleCreateTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5 inline mr-2" />
                Создать шаблон
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Название
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Тип мероприятия
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Вопросов
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      По умолчанию
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Последнее обновление
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templates.map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{template.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {template.description || 'Без описания'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-blue-100 text-blue-800">
                          {template.event_type?.name_ru || template.event_type?.name || 'Не указан'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          {template.questions_count}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        {template.is_default ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        {new Date(template.updated_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => alert(`Просмотр статистики по шаблону ${template.id}`)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="Статистика"
                          >
                            <BarChart4 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEditTemplate(template.id)}
                            className="text-gray-400 hover:text-green-600 transition-colors"
                            title="Редактировать"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            disabled={!!deletingTemplateId}
                            className={clsx(
                              "text-gray-400 hover:text-red-600 transition-colors",
                              deletingTemplateId === template.id && "opacity-50 cursor-not-allowed"
                            )}
                            title="Удалить"
                          >
                            {deletingTemplateId === template.id ? (
                              <div className="h-5 w-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Редактор шаблона */}
      <FeedbackTemplateEditor
        isOpen={showEditor}
        onClose={handleEditorClose}
        templateId={editingTemplateId || undefined}
        onSuccess={handleEditorSuccess}
      />
    </div>
  );
}