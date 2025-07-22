import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarToggleButtonProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
}

export const SidebarToggleButton: React.FC<SidebarToggleButtonProps> = React.memo(({ isCollapsed, onToggle, className }) => {
  return (
    <button
      className={clsx(
        'hidden lg:flex items-center justify-center z-50 rounded-full transition backdrop-blur bg-white/60 border border-white/40 shadow-2xl',
        'w-10 h-10',
        className
      )}
      onClick={onToggle}
      title={isCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
      style={{ outline: 'none' }}
    >
      {isCollapsed ? (
        <ChevronRight size={22} className="text-gray-400 hover:text-gray-600 transition-colors" />
      ) : (
        <ChevronLeft size={22} className="text-gray-400 hover:text-gray-600 transition-colors" />
      )}
    </button>
  );
});
