import React, { useState } from 'react';
import { X, Upload, Download, FileText } from 'lucide-react';

interface ImportUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<{ success: number; errors: string[] }>;
  onSuccess: () => void;
}

export default function ImportUsersModal({ isOpen, onClose, onImport, onSuccess }: ImportUsersModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    try {
      const importResult = await onImport(file);
      setResult(importResult);
      
      if (importResult.success > 0) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (error) {
      console.error('Import error:', error);
      setResult({ success: 0, errors: ['Ошибка при импорте файла'] });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    // Создаем шаблон CSV файла
    const headers = ['ФИО', 'Email', 'SAP номер', 'Телефон', 'Роль', 'Должность', 'Территория'];
    const template = [
      headers.join(','),
      'Иванов Иван Иванович,ivanov@example.com,12345,+7900123456,employee,Менеджер,Москва'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_users.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Импорт пользователей
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
          {!result && (
            <>
              <div className="text-center">
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center space-x-2 text-sns-green hover:text-sns-green-dark transition-colors"
                >
                  <Download size={16} />
                  <span>Скачать шаблон</span>
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Скачайте шаблон и заполните данными пользователей
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600">
                    Нажмите для выбора файла или перетащите сюда
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Поддерживаются форматы: CSV, Excel
                  </p>
                </label>
              </div>

              {file && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900">Выбранный файл:</p>
                  <p className="text-sm text-gray-600">{file.name}</p>
                </div>
              )}
            </>
          )}

          {result && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${result.success > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <h3 className={`font-medium ${result.success > 0 ? 'text-green-800' : 'text-red-800'}`}>
                  Результат импорта
                </h3>
                <p className={`text-sm mt-1 ${result.success > 0 ? 'text-green-700' : 'text-red-700'}`}>
                  Успешно импортировано: {result.success} пользователей
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-red-700 font-medium">Ошибки:</p>
                    <ul className="text-sm text-red-600 mt-1 space-y-1">
                      {result.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                    <p className="text-sm text-green-700 mt-1">
                      Стандартный пароль для всех пользователей: <span className="font-mono font-bold">123456</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {result ? 'Закрыть' : 'Отмена'}
            </button>
            {!result && (
              <button
                onClick={handleImport}
                disabled={!file || importing}
                className="px-4 py-2 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Upload size={16} />
                <span>{importing ? 'Импорт...' : 'Импортировать'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}