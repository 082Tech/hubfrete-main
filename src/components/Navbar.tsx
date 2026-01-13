import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Truck, Menu, X } from 'lucide-react';
import { isAuthenticated } from '@/lib/api';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const authenticated = isAuthenticated();

  const navLinks = [
    { href: '#como-funciona', label: 'Como Funciona' },
    { href: '#embarcadores', label: 'Para Empresas' },
    { href: '#motoristas', label: 'Para Motoristas' },
    { href: '#contato', label: 'Contato' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-background backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="p-2 bg-primary rounded-lg">
              <Truck className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Hub<span className="text-primary">Frete</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {authenticated ? (
              <Button onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  Entrar
                </Button>
                <Button onClick={() => navigate('/login')}>
                  Começar Agora
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <div className="flex flex-col gap-6 mt-8">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-foreground hover:text-primary transition-colors text-lg font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
                <div className="flex flex-col gap-3 pt-4 border-t border-border">
                  {authenticated ? (
                    <Button onClick={() => { setIsOpen(false); navigate('/dashboard'); }}>
                      Dashboard
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => { setIsOpen(false); navigate('/login'); }}>
                        Entrar
                      </Button>
                      <Button onClick={() => { setIsOpen(false); navigate('/login'); }}>
                        Começar Agora
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
