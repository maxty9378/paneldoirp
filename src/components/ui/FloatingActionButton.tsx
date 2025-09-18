import React from 'react';
import { Calendar } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  icon = <Calendar className="w-5 h-5" />,
  label,
  position = 'bottom-right',
  size = 'md',
  color = 'primary',
  className = ''
}) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-right':
        return 'bottom-6 right-6';
      case 'bottom-left':
        return 'bottom-6 left-6';
      case 'top-right':
        return 'top-6 right-6';
      case 'top-left':
        return 'top-6 left-6';
      default:
        return 'bottom-6 right-6';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-12 h-12';
      case 'md':
        return 'w-14 h-14';
      case 'lg':
        return 'w-16 h-16';
      default:
        return 'w-14 h-14';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'bg-[#06A478] hover:bg-[#059669] text-white shadow-lg hover:shadow-xl';
      case 'secondary':
        return 'bg-gray-600 hover:bg-gray-700 text-white shadow-lg hover:shadow-xl';
      case 'success':
        return 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl';
      case 'warning':
        return 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg hover:shadow-xl';
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl';
      default:
        return 'bg-[#06A478] hover:bg-[#059669] text-white shadow-lg hover:shadow-xl';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`
        fixed z-50 rounded-full flex items-center justify-center
        transition-all duration-300 ease-in-out
        hover:scale-110 active:scale-95
        focus:outline-none focus:ring-4 focus:ring-opacity-50
        ${getPositionClasses()}
        ${getSizeClasses()}
        ${getColorClasses()}
        ${className}
      `}
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
      aria-label={label || 'Floating Action Button'}
    >
      {icon}
      {label && (
        <span className="ml-2 text-sm font-medium hidden sm:block">
          {label}
        </span>
      )}
    </button>
  );
};

export default FloatingActionButton;
