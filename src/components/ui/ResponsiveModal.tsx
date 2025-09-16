import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useMobile } from '../../hooks/use-mobile';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showCloseButton?: boolean;
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
  className = '',
  showCloseButton = true,
}) => {
  const isMobile = useMobile();

  // Блокировка прокрутки фона при открытом модальном окне
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'xs:max-w-sm',
    md: 'xs:max-w-md',
    lg: 'xs:max-w-lg', 
    xl: 'xs:max-w-xl',
    '2xl': 'xs:max-w-2xl',
  };

  return (
    <div className={`fixed inset-0 z-[9999] flex ${isMobile ? 'items-end' : 'items-center'} justify-center bg-black/50 backdrop-blur-sm p-0 xs:p-4`}>
      <div className={`
        relative w-full ${maxWidthClasses[maxWidth]} max-h-[95vh] xs:max-h-[90vh] 
        overflow-hidden ${isMobile ? 'rounded-t-3xl' : 'rounded-2xl xs:rounded-3xl'} 
        bg-white shadow-2xl transform transition-all duration-500 ease-out 
        ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full opacity-0 scale-95'}
        ${className}
      `}>
        {/* Заголовок */}
        <div className="relative bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 p-4 xs:p-6 text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex-1 pr-2">
              <h2 className="text-lg xs:text-2xl font-bold mb-1 leading-tight" style={{ fontFamily: 'SNS, sans-serif' }}>
                {title}
              </h2>
              {subtitle && (
                <p className="text-emerald-100 text-xs xs:text-sm truncate">
                  {subtitle}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors duration-200 touch-target"
              >
                <X className="w-5 h-5 xs:w-6 xs:h-6" />
              </button>
            )}
          </div>
        </div>

        {/* Контент */}
        <div className="flex flex-col max-h-[calc(95vh-120px)] xs:max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// Компонент для контента модального окна с прокруткой
export const ModalContent: React.FC<{ 
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`p-4 xs:p-6 overflow-y-auto ios-scroll flex-1 ${className}`}>
      {children}
    </div>
  );
};

// Компонент для футера модального окна
export const ModalFooter: React.FC<{ 
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`border-t border-gray-100 p-4 xs:p-6 bg-gray-50 ${className}`}>
      {children}
    </div>
  );
};
