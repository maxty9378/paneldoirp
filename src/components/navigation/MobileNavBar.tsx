import { Fragment, type ComponentType, type SVGProps } from 'react';
import { clsx } from 'clsx';
import {
  Home,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  UsersRound,
  CircleUserRound,
  CirclePlus
} from 'lucide-react';
import { Spinner } from '../ui/Spinner';

export interface MobileNavItem {
  id: string;
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: number;
  disabled?: boolean;
}

interface MobileNavBarProps {
  activeItem: string;
  items: MobileNavItem[];
  onSelect: (id: string) => void;
  isVisible?: boolean;
  showCreateButton?: boolean;
  onCreatePress?: () => void;
  busy?: boolean;
}

const iconMap = {
  dashboard: Home,
  events: CalendarCheck,
  testing: ClipboardList,
  employees: UsersRound,
  profile: CircleUserRound,
  calendar: CalendarDays,
};

export function MobileNavBar({
  activeItem,
  items,
  onSelect,
  isVisible = true,
  showCreateButton = false,
  onCreatePress,
  busy = false,
}: MobileNavBarProps) {
  return (
    <div
      className={clsx(
        'pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 lg:hidden transition-all duration-300',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      )}
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
        <nav className="pointer-events-auto w-full rounded-3xl border border-white/60 bg-white/90 shadow-xl backdrop-blur-xl">
          <ul className="flex items-stretch justify-between">
            {items.map((item) => {
              const Icon = item.icon || iconMap[item.id as keyof typeof iconMap] || Home;
              const isActive = activeItem === item.id;

              return (
                <li key={item.id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => !item.disabled && onSelect(item.id)}
                    disabled={item.disabled}
                    className={clsx(
                      'group relative flex w-full flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-all duration-200 touch-target',
                      isActive
                        ? 'text-sns-green'
                        : 'text-slate-500 hover:text-sns-green focus:text-sns-green',
                      item.disabled && 'opacity-40'
                    )}
                  >
                    <Icon className={clsx('h-5 w-5 transition-transform duration-200', isActive && 'scale-110')} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="absolute right-6 top-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {(showCreateButton || busy) && (
          <div className="pointer-events-auto">
            <button
              type="button"
              onClick={onCreatePress}
              disabled={busy}
              className="flex items-center gap-2 rounded-full bg-sns-green px-6 py-3 text-sm font-semibold text-white shadow-xl transition-all duration-200 hover:bg-emerald-600 active:scale-95"
            >
              {busy ? (
                <Spinner size={18} light direction="horizontal" label="Пожалуйста, подождите" labelClassName="text-white" />
              ) : (
                <Fragment>
                  <CirclePlus className="h-5 w-5" />
                  <span>Создать</span>
                </Fragment>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MobileNavBar;
