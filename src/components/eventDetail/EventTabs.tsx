import React from 'react';

export function EventTabs({ activeTab, setActiveTab }: { activeTab: 'tests' | 'feedback'; setActiveTab: (tab: 'tests' | 'feedback') => void }) {
  return (
    <div className="flex gap-2 border-b mb-2">

      <button
        className={`px-4 py-2 font-medium rounded-t ${activeTab === 'feedback' ? 'bg-sns-green text-white' : 'bg-gray-100 text-gray-700'}`}
        onClick={() => setActiveTab('feedback')}
      >
        Обратная связь
      </button>
    </div>
  );
} 