import React, { useState } from 'react';
import { X, Upload, Download, FileText, Sparkles, Check, Target } from 'lucide-react';
import * as XLSX from 'xlsx';

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
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Проверяем размер файла (максимум 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setImportErrors([`Файл слишком большой. Максимальный размер: 10MB. Текущий размер: ${(selectedFile.size / 1024 / 1024).toFixed(1)}MB`]);
      return;
    }

    // Проверяем расширение файла
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      setImportErrors(['Неподдерживаемый формат файла. Используйте .xlsx, .xls или .csv']);
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setImportErrors([]);

    try {
      const data = await readExcelFile(selectedFile);
      setImportPreview(data);
      setShowPreview(true);
    } catch (error) {
      setImportErrors([error instanceof Error ? error.message : 'Ошибка при чтении файла']);
    }
  };

  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Ищем строку с заголовками
          let headerRow = 0;
          let jsonData: any[] = [];
          
          for (let i = 0; i < 15; i++) {
            const testData = XLSX.utils.sheet_to_json(firstSheet, { range: i, header: 1 });
            if (testData.length > 0) {
              const firstRow = testData[0] as any[];
              if (firstRow && firstRow.some(cell => 
                typeof cell === 'string' && 
                (cell.toLowerCase().includes('фио') || 
                 cell.toLowerCase().includes('имя') || 
                 cell.toLowerCase().includes('full name') ||
                 cell.toLowerCase().includes('фамилия') ||
                 cell.toLowerCase().includes('email'))
              )) {
                headerRow = i;
                jsonData = XLSX.utils.sheet_to_json(firstSheet, { range: i + 1 });
                break;
              }
            }
          }
          
          if (jsonData.length === 0) {
            jsonData = XLSX.utils.sheet_to_json(firstSheet, { range: 12 });
          }
          
          if (jsonData.length === 0) {
            throw new Error('Файл не содержит данных. Убедитесь, что файл соответствует шаблону.');
          }
          
          const firstRow = jsonData[0];
          const columnMapping = detectColumnMapping(firstRow);
          
          const parsedData = jsonData.map((row: any) => {
            const fullName = getColumnValue(row, columnMapping.fullName) || '';
            const sapNumber = getColumnValue(row, columnMapping.sapNumber) || '';
            const position = getColumnValue(row, columnMapping.position) || '';
            const territory = getColumnValue(row, columnMapping.territory) || '';
            const experience = getColumnValue(row, columnMapping.experience) || 0;
            const phone = getColumnValue(row, columnMapping.phone) || '';
            const email = getColumnValue(row, columnMapping.email) || '';
            
            let error = null;
            if (!fullName.trim()) {
              error = 'Отсутствует ФИО';
            } else if (!email.trim() && !sapNumber.trim()) {
              error = 'Необходимо указать либо Email, либо SAP номер';
            } else if (email && !isValidEmail(email)) {
              error = 'Неверный формат Email';
            }
            
            return {
              full_name: fullName.trim(),
              sap_number: sapNumber.trim() || null,
              position: { name: position.trim() },
              territory: { name: territory.trim() },
              work_experience_days: parseInt(experience.toString()) || 0,
              phone: phone.trim(),
              email: email.trim() || null,
              error,
              status: error ? 'error' : 'new'
            };
          });
          
          resolve(parsedData);
        } catch (error) {
          reject(new Error('Ошибка при чтении файла. Убедитесь, что файл соответствует шаблону.'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Ошибка чтения файла.'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  const detectColumnMapping = (firstRow: any) => {
    const keys = Object.keys(firstRow);
    const mapping: any = {};
    
    keys.forEach(key => {
      const value = firstRow[key];
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        
        if (lowerValue.includes('фио') || lowerValue.includes('имя') || lowerValue.includes('full name') || lowerValue.includes('фамилия')) {
          mapping.fullName = key;
        } else if (lowerValue.includes('sap') || lowerValue.includes('сап') || lowerValue.includes('номер')) {
          mapping.sapNumber = key;
        } else if (lowerValue.includes('должность') || lowerValue.includes('position') || lowerValue.includes('профессия')) {
          mapping.position = key;
        } else if (lowerValue.includes('территория') || lowerValue.includes('territory') || lowerValue.includes('регион')) {
          mapping.territory = key;
        } else if (lowerValue.includes('опыт') || lowerValue.includes('experience') || lowerValue.includes('стаж')) {
          mapping.experience = key;
        } else if (lowerValue.includes('телефон') || lowerValue.includes('phone') || lowerValue.includes('тел')) {
          mapping.phone = key;
        } else if (lowerValue.includes('email') || lowerValue.includes('почта') || lowerValue.includes('e-mail')) {
          mapping.email = key;
        }
      }
    });
    
    if (!mapping.fullName) mapping.fullName = '__EMPTY_1';
    if (!mapping.sapNumber) mapping.sapNumber = '__EMPTY_2';
    if (!mapping.position) mapping.position = '__EMPTY_3';
    if (!mapping.territory) mapping.territory = '__EMPTY_4';
    if (!mapping.experience) mapping.experience = '__EMPTY_5';
    if (!mapping.phone) mapping.phone = '__EMPTY_7';
    if (!mapping.email) mapping.email = '__EMPTY_8';
    
    return mapping;
  };

  const getColumnValue = (row: any, columnKey: string) => {
    return row[columnKey];
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
    const workbook = XLSX.utils.book_new();
    
    const templateData = [
      ['ФИО', 'SAP номер', 'Должность', 'Территория', 'Опыт работы (дни)', '', 'Телефон', 'Email'],
      ['Иванов Иван Иванович', '12345', 'Менеджер', 'Москва', '365', '', '+7900123456', 'ivanov@example.com'],
      ['Петров Петр Петрович', '67890', 'Специалист', 'Санкт-Петербург', '180', '', '+7900987654', 'petrov@example.com'],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '']
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    
    worksheet['!cols'] = [
      { width: 25 }, // ФИО
      { width: 12 }, // SAP номер
      { width: 20 }, // Должность
      { width: 20 }, // Территория
      { width: 18 }, // Опыт работы
      { width: 5 },  // Пустая колонка
      { width: 15 }, // Телефон
      { width: 25 }  // Email
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Пользователи');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Шаблон_импорта_пользователей.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
          {!result && !showPreview && (
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

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Sparkles size={16} className="text-blue-500 mt-0.5" />
                  </div>
                  <div className="ml-2">
                    <p className="text-sm font-medium text-blue-800">Умный импорт</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Система автоматически определит структуру файла и найдет нужные колонки по названиям заголовков.
                    </p>
                  </div>
                </div>
              </div>

              {importErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <X size={16} className="text-red-500 mr-2" />
                    <h5 className="text-sm font-medium text-red-800">Ошибки импорта</h5>
                  </div>
                  <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                    {importErrors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {showPreview && importPreview.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Предпросмотр импорта: {importPreview.length} пользователей
                  </h3>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                      Готово к импорту: {importPreview.filter(p => !p.error).length}
                    </span>
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                      С ошибками: {importPreview.filter(p => p.error).length}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Назад
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ФИО</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SAP / Email</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Должность</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Территория</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {importPreview.map((participant, idx) => (
                      <tr key={idx} className={participant.error ? 'bg-red-50' : 'hover:bg-gray-50'}>
                        <td className="px-3 py-2 text-sm font-medium">{participant.full_name}</td>
                        <td className="px-3 py-2 text-sm">
                          {participant.email && <div className="text-blue-600">{participant.email}</div>}
                          {participant.sap_number && <div className="text-gray-600 text-xs">SAP: {participant.sap_number}</div>}
                          {participant.phone && <div className="text-gray-500 text-xs">Тел: {participant.phone}</div>}
                        </td>
                        <td className="px-3 py-2 text-sm">{participant.position?.name || '-'}</td>
                        <td className="px-3 py-2 text-sm">{participant.territory?.name || '-'}</td>
                        <td className="px-3 py-2 text-xs text-center">
                          {participant.error ? (
                            <div className="flex flex-col items-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Ошибка
                              </span>
                              <span className="text-xs text-red-600 mt-1 max-w-32 text-center">
                                {participant.error}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Check size={12} className="mr-1" />
                              Готов
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {importPreview.filter(p => p.error).length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Target size={16} className="text-amber-500 mt-0.5" />
                    </div>
                    <div className="ml-2">
                      <p className="text-sm font-medium text-amber-800">Рекомендации по исправлению:</p>
                      <ul className="text-sm text-amber-700 mt-1 space-y-1">
                        <li>• Убедитесь, что все обязательные поля заполнены</li>
                        <li>• Проверьте правильность формата Email адресов</li>
                        <li>• Убедитесь, что ФИО указано полностью</li>
                        <li>• Укажите либо Email, либо SAP номер для каждого пользователя</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
            {!result && showPreview && (
              <button
                onClick={handleImport}
                disabled={importing || importPreview.every(p => p.error)}
                className="px-4 py-2 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Upload size={16} />
                <span>
                  {importing ? 'Импорт...' : `Импорт (${importPreview.filter(p => !p.error).length})`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}