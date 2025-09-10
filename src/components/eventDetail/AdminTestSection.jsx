import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// Иконки (можно заменить на ваши импорты из библиотеки иконок)
const FileTextIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const PlayIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const ClockIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const CheckCircleIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const ChevronUpIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

const ChevronDownIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export default function AdminTestSection({ eventId, userProfile, onStartTest }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tests, setTests] = useState({
    entry: null,
    final: null,
    annual: null
  });

  useEffect(() => {
    const fetchTests = async () => {
      if (!eventId) return;
      
      setLoading(true);
      try {
        // Получаем информацию о мероприятии
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('event_type_id')
          .eq('id', eventId)
          .single();
          
        if (eventError) throw eventError;
        
        // Получаем все тесты для данного типа мероприятия
        const { data: testsData, error: testsError } = await supabase
          .from('tests')
          .select('*')
          .eq('event_type_id', eventData.event_type_id)
          .eq('status', 'active');
          
        if (testsError) throw testsError;
        
        // Распределяем тесты по типам
        const updatedTests = { ...tests };
        testsData?.forEach(test => {
          if (['entry', 'final', 'annual'].includes(test.type)) {
            updatedTests[test.type] = test;
          }
        });
        
        setTests(updatedTests);
      } catch (err) {
        console.error('Ошибка при загрузке тестов:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTests();
  }, [eventId]);

  const renderTestCard = (test, type, color) => {
    const colorStyles = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        textSecondary: 'text-blue-700',
        textInfo: 'text-blue-600',
        btn: 'bg-blue-600 hover:bg-blue-700',
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-800',
        textSecondary: 'text-purple-700',
        textInfo: 'text-purple-600',
        btn: 'bg-purple-600 hover:bg-purple-700',
      },
      amber: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-800',
        textSecondary: 'text-amber-700',
        textInfo: 'text-amber-600',
        btn: 'bg-amber-600 hover:bg-amber-700',
      },
    };
    const styles = colorStyles[color];

    if (!test) return null;

    return (
      <div className={`${styles.bg} ${styles.border} rounded-lg p-4 transition-shadow hover:shadow-md`}>
        <h4 className={`font-medium ${styles.text} flex items-center`}>
          <FileTextIcon className="h-4 w-4 mr-2" />
          {type === 'entry' ? 'Входной тест' : type === 'final' ? 'Итоговый тест' : 'Годовой тест'}
        </h4>
        <p className={`text-sm ${styles.textSecondary} mt-1 mb-3`}>{test.title}</p>
        <div className={`text-xs ${styles.textInfo} mb-4 space-y-1`}>
          <div className="flex items-center">
            <ClockIcon className="h-3.5 w-3.5 mr-1" />
            <span>{test.time_limit === 0 ? 'Без ограничения времени' : `${test.time_limit} минут`}</span>
          </div>
          <div className="flex items-center">
            <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />
            <span>Проходной балл: {test.passing_score}%</span>
          </div>
        </div>
        <button
          onClick={() => onStartTest(type)}
          className={`w-full ${styles.btn} text-white px-4 py-3 rounded-xl transition-all duration-300 flex items-center justify-center group font-semibold`}
        >
          <PlayIcon size={18} className="mr-3 group-hover:animate-pulse" />
          <span className="text-base">Тестировать</span>
        </button>
      </div>
    );
  };

  // Если нет тестов, не показываем компонент
  if (!tests.entry && !tests.final && !tests.annual) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
      <div 
        className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-medium text-gray-800 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-gray-600">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          Администрирование тестов
        </h3>
        {isExpanded ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        )}
      </div>
      
      {isExpanded && (
        <div className="p-4">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Этот раздел предназначен для администраторов. Здесь вы можете протестировать тесты, доступные для данного мероприятия.
            </p>
          </div>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Загрузка тестов...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tests.entry && renderTestCard(tests.entry, 'entry', 'blue')}
              {tests.final && renderTestCard(tests.final, 'final', 'purple')}
              {tests.annual && renderTestCard(tests.annual, 'annual', 'amber')}
            </div>
          )}
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-700">
              <strong>Примечание:</strong> Тесты, пройденные в режиме администратора, будут помечены как тестовые и не будут учитываться в статистике пользователей.
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 