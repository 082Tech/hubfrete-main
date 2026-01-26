import { motion } from 'framer-motion';
import { Truck, Package, MapPin, ArrowRight } from 'lucide-react';
import { Suspense, lazy, Component, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the globe component for better performance
const LogisticsGlobe = lazy(() => 
  import('./LogisticsGlobe').then(mod => ({ default: mod.LogisticsGlobe }))
);

const stats = [
  { icon: Truck, value: '10.000+', label: 'Motoristas Verificados' },
  { icon: Package, value: '50.000+', label: 'Cargas Movimentadas' },
  { icon: MapPin, value: '5.570+', label: 'Cidades Atendidas' },
];

function GlobeSkeleton() {
  return (
    <div className="w-full h-[400px] md:h-[500px] flex items-center justify-center">
      <Skeleton className="w-[300px] h-[300px] md:w-[400px] md:h-[400px] rounded-full" />
    </div>
  );
}

// Simple fallback for when globe fails
function GlobeErrorFallback() {
  return (
    <div className="w-full h-[400px] md:h-[500px] flex items-center justify-center">
      <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px]">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
        <div className="absolute inset-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/5" />
        <div className="absolute inset-0 flex items-center justify-center">
          <MapPin className="w-24 h-24 md:w-32 md:h-32 text-primary/40" />
        </div>
      </div>
    </div>
  );
}

// Error Boundary to catch WebGL crashes
interface ErrorBoundaryState {
  hasError: boolean;
}

class GlobeErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('Globe WebGL error caught:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return <GlobeErrorFallback />;
    }
    return this.props.children;
  }
}

export function ModernGlobeSection() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left side - Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-2 lg:order-1"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-6">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-primary font-medium">Cobertura Nacional</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              Conectando o Brasil{' '}
              <span className="text-primary">de ponta a ponta</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              Nossa rede de logística cobre todo o território nacional, conectando 
              embarcadores e transportadoras em tempo real para entregas mais 
              rápidas e eficientes.
            </p>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="text-center"
                >
                  <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                  <div className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            <motion.a
              href="#features"
              className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all group"
              whileHover={{ x: 5 }}
            >
              Conheça nossa plataforma
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </motion.a>
          </motion.div>

          {/* Right side - Globe with Error Boundary */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="order-1 lg:order-2"
          >
            <GlobeErrorBoundary>
              <Suspense fallback={<GlobeSkeleton />}>
                <LogisticsGlobe />
              </Suspense>
            </GlobeErrorBoundary>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
