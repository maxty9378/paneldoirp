import React, { useState } from 'react';
import { X, Download } from 'lucide-react';

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: any[];
  territories: any[];
  positions: any[];
}

export function ExportDataModal({ isOpen, onClose, users, territories, positions }: ExportDataModalProps) {
  const [exportType, setExportType] = useState('users');
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      let data: any[] = [];
      let filename = '';
      let headers: string[] = [];

      switch (exportType) {
        case 'users':
          data = users;
          filename = 'users.csv';
          headers = ['ФИО', 'Email', 'SAP номер', 'Роль', 'Статус', 'Дата создания'];
          break;
        case 'territories':
          data = territories;
          filename = 'territories.csv';
          headers = ['Название', 'Регион', 'Дата создания'];
          break;
        case 'positions':
          data = positions;
          filename = 'positions.csv';
          headers = ['Название', 'Описание', 'Дата создания'];
          break;
      }

      // Создаем CSV контент
      const csvContent = [
        headers.join(','),
        ...data.map(item => {
          switch (exportType) {
            case 'users':
              return [
                item.full_name,
                item.email,
                item.sap_number || '',
                item.role,
                item.is_active ? 'Активен' : 'Неактивен',
                new Date(item.created_at).toLocaleDateString('ru-RU')
              ].join(',');
            case 'territories':
              return [
                item.name,
                item.region || '',
                new Date(item.created_at).toLocaleDateString('ru-RU')
              ].join(',');
            case 'positions':
              return [
                item.name,
                item.description || '',
                new Date(item.created_at).toLocaleDateString('ru-RU')
              ].join(',');
            default:
              return '';
          }
        })
      ].join('\n');

      // Скачиваем файл
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onClose();
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Экспорт данных
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Выберите тип данных для экспорта:
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="users"
                  checked={exportType === 'users'}
                  onChange={(e) => setExportType(e.target.value)}
                  className="h-4 w-4 text-sns-green focus:ring-sns-green border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Пользователи ({users.length})
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="territories"
                  checked={exportType === 'territories'}
                  onChange={(e) => setExportType(e.target.value)}
                  className="h-4 w-4 text-sns-green focus:ring-sns-green border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Территории ({territories.length})
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="positions"
                  checked={exportType === 'positions'}
                  onChange={(e) => setExportType(e.target.value)}
                  className="h-4 w-4 text-sns-green focus:ring-sns-green border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Должности ({positions.length})
                </span>
              </label>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              Данные будут экспортированы в формате CSV, который можно открыть в Excel или других программах для работы с таблицами.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Download size={16} />
              <span>{exporting ? 'Экспорт...' : 'Экспортировать'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}