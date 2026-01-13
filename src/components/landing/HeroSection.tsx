import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Truck, ArrowRight, Package, MapPin } from 'lucide-react';
import heroImage from '@/assets/hero-truck-road.jpg';

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] lg:min-h-screen flex items-center pt-20 pb-5 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt=""
          className="w-full h-full object-cover"
        />

        {/* White gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent" />
      </div>

      {/* Animated elements (hidden on mobile) */}
      <div className="hidden lg:block absolute top-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div
        className="hidden lg:block absolute bottom-1/4 left-1/4 w-48 h-48 bg-accent/20 rounded-full blur-2xl animate-pulse"
        style={{ animationDelay: '1s' }}
      />

      <div className="mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Text Content */}
          <div className="space-y-6 sm:space-y-8 p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent rounded-full">
              <Package className="w-4 h-4 text-accent-foreground" />
              <span className="text-xs sm:text-sm font-medium text-accent-foreground">
                Marketplace de Logística #1 do Brasil
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black leading-tight">
              Conectando o{' '}
              <span className="text-primary">Brasil</span>{' '}
              com logística inteligente
            </h1>

            <p className="text-base sm:text-lg text-black max-w-xl">
              Marketplace que conecta fábricas, distribuidores, varejistas,
              motoristas e transportadoras. Publique cargas, aceite fretes,
              gerencie e rastreie em tempo real.
            </p>

            {/* Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-base sm:text-lg"
                onClick={() => navigate('/cadastro/embarcador')}
              >
                <Package className="w-5 h-5" />
                Sou Embarcador
              </Button>

              <Button
                size="lg"
                variant="secondary"
                className="gap-2 text-base sm:text-lg"
                onClick={() => navigate('/cadastro/transportadora')}
              >
                <Truck className="w-5 h-5" />
                Sou Transportadora
              </Button>

              <Button
                size="lg"
                className="gap-2 text-base sm:text-lg"
                onClick={() => navigate('/cadastro/motorista')}
              >
                Sou Motorista
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-white/20">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-primary">50k+</div>
                <div className="text-sm text-black">Motoristas Ativos</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-primary">10k+</div>
                <div className="text-sm text-black">Empresas Parceiras</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-primary">98%</div>
                <div className="text-sm text-black">Entregas no Prazo</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}