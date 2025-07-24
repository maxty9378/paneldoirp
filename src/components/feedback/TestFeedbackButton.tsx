import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';

export function TestFeedbackButton() {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    console.log('Test button clicked!');
    setClicked(true);
    setTimeout(() => setClicked(false), 2000);
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold mb-4">Тест кнопки обратной связи</h3>
      <button
        onClick={handleClick}
        className="inline-flex items-center px-6 py-3 rounded-xl text-base font-semibold transition-all duration-200 text-white shadow-md hover:shadow-lg"
        style={{ backgroundColor: '#06A478' }}
      >
        <PlusCircle className="h-5 w-5 mr-2" />
        <span>Тестовая кнопка</span>
      </button>
      {clicked && (
        <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-lg">
          Кнопка работает! ✅
        </div>
      )}
    </div>
  );
} 