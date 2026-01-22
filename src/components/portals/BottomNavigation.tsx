import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Home,
  Package,
  MessageSquare,
  Menu,
  Route,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificacoesDropdown } from '@/components/notificacoes';

type UserType = 'embarcador' | 'transportadora';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const embarcadorNavItems: NavItem[] = [
  { icon: Home, label: 'Home', href: '/embarcador' },
  { icon: Package, label: 'Cargas', href: '/embarcador/cargas' },
  { icon: MessageSquare, label: 'Mensagens', href: '/embarcador/mensagens' },
];

const transportadoraNavItems: NavItem[] = [
  { icon: Home, label: 'Home', href: '/transportadora' },
  { icon: Package, label: 'Cargas', href: '/transportadora/cargas' },
  { icon: Route, label: 'Entregas', href: '/transportadora/entregas' },
  { icon: MessageSquare, label: 'Mensagens', href: '/transportadora/mensagens' },
];

interface BottomNavigationProps {
  userType: UserType;
  onMenuClick: () => void;
}

export function BottomNavigation({ userType, onMenuClick }: BottomNavigationProps) {
  const location = useLocation();
  const navItems = userType === 'embarcador' ? embarcadorNavItems : transportadoraNavItems;
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const isActive = (href: string) => {
    if (href === `/${userType}`) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden transition-transform duration-300",
        !isVisible && "translate-y-full"
      )}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                active 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn('w-5 h-5', active && 'text-primary')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        
        {/* Notifications - icon only */}
        <div className="flex flex-col items-center justify-center flex-1 h-full">
          <NotificacoesDropdown />
        </div>

        {/* Menu button */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
}
