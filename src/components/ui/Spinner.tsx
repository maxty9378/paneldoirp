import { forwardRef, type CSSProperties } from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export interface SpinnerProps {
  /** Диаметр спиннера в пикселях */
  size?: number;
  /** Класс для дополнительных стилей */
  className?: string;
  /** Текстовая подпись под спиннером */
  label?: string;
  /** Цвет спиннера, по умолчанию фирменный зелёный */
  color?: string;
  /** Толщина линий иконки */
  strokeWidth?: number;
  /** Показывать ли спиннер в облегчённом (светлом) стиле */
  light?: boolean;
  /** Расположение иконки и подписи */
  direction?: 'vertical' | 'horizontal';
  /** Дополнительный класс для подписи */
  labelClassName?: string;
  /** Дополнительный класс для иконки */
  iconClassName?: string;
}

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(function Spinner(
  {
    size = 28,
    className,
    label,
    color,
    strokeWidth = 2,
    light = false,
    direction = 'vertical',
    labelClassName,
    iconClassName,
  },
  ref
) {
  const iconStyle: CSSProperties = {
    width: size,
    height: size,
    color: color || undefined,
  };

  return (
    <div
      ref={ref}
      className={clsx(
        'flex items-center justify-center gap-2',
        direction === 'horizontal' ? 'flex-row' : 'flex-col',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2
        className={clsx(
          'animate-spin text-sns-green drop-shadow-sm',
          light && 'text-white/80',
          iconClassName
        )}
        style={iconStyle}
        strokeWidth={strokeWidth}
        aria-hidden="true"
      />
      {label && (
        <span
          className={clsx(
            'text-xs font-medium text-gray-500',
            light && 'text-white/80',
            direction === 'horizontal' ? 'text-sm' : '',
            labelClassName
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
});

export default Spinner;
