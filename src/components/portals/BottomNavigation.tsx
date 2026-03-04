import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Home,
  Package,
  MessageSquare,
  Menu,
  Route,
  Send,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type UserType = 'embarcador' | 'transportadora';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  excludePatterns?: string[];
}

const embarcadorNavItems: NavItem[] = [
  { icon: Home, label: 'Home', href: '/embarcador' },
  { icon: Send, label: 'Ofertas', href: '/embarcador/ofertas' },
  { icon: Package, label: 'Cargas', href: '/embarcador/cargas' },
  { icon: MessageSquare, label: 'Mensagens', href: '/embarcador/mensagens' },
];

const transportadoraNavItems: NavItem[] = [
  { icon: Home, label: 'Home', href: '/transportadora' },
  { icon: DollarSign, label: 'Ofertas', href: '/transportadora/ofertas' },
  { icon: Package, label: 'Cargas', href: '/transportadora/cargas' },
  { icon: MessageSquare, label: 'Mensagens', href: '/transportadora/mensagens' },
];

interface BottomNavigationProps {
  userType: UserType;
  onMenuClick: () => void;
  hidden?: boolean;
}

export function BottomNavigation({ userType, onMenuClick, hidden }: BottomNavigationProps) {
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

  const isActive = (item: NavItem) => {
    const { href, excludePatterns } = item;
    
    // Exact match for home
    if (href === `/${userType}`) {
      return location.pathname === href;
    }
    
    // Check if current path matches but is excluded by another nav item
    if (excludePatterns?.some(pattern => location.pathname.startsWith(pattern))) {
      return false;
    }
    
    return location.pathname.startsWith(href);
  };

  // Hide completely when hidden prop is true
  if (hidden) return null;

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden transition-transform duration-300",
        !isVisible && "translate-y-full"
      )}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item);
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
