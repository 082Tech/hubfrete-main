import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, Truck, MapPin, Package } from 'lucide-react';

// Showcase screen data with visual mockups
const showcaseScreens = [
  { 
    id: 1, 
    title: 'Cargas Disponíveis',
    subtitle: 'Visualize e aceite cargas publicadas',
    icon: Package,
    color: 'from-primary/20 to-primary/5',
    accent: 'bg-primary'
  },
  { 
    id: 2, 
    title: 'Cargas Publicadas',
    subtitle: 'Gerencie suas cargas ativas',
    icon: TrendingUp,
    color: 'from-emerald-500/20 to-emerald-500/5',
    accent: 'bg-emerald-500'
  },
  { 
    id: 3, 
    title: 'Relatórios',
    subtitle: 'Analise o desempenho das operações',
    icon: TrendingUp,
    color: 'from-amber-500/20 to-amber-500/5',
    accent: 'bg-amber-500'
  },
  { 
    id: 4, 
    title: 'Cargas em Rota',
    subtitle: 'Acompanhe entregas em tempo real',
    icon: Truck,
    color: 'from-sky-500/20 to-sky-500/5',
    accent: 'bg-sky-500'
  },
];

// Visual mockup component
function ScreenMockup({ screen }: { screen: typeof showcaseScreens[0] }) {
  const Icon = screen.icon;
  
  return (
    <div className={`w-full h-full bg-gradient-to-br ${screen.color} flex flex-col`}>
      {/* Sidebar mockup */}
      <div className="flex h-full">
        <div className="w-14 lg:w-16 bg-card/80 border-r border-border/30 flex flex-col items-center py-4 gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <div className="w-4 h-4 rounded bg-primary" />
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`w-6 h-6 rounded ${i === 1 ? 'bg-primary/30' : 'bg-muted/50'}`} />
          ))}
        </div>
        
        {/* Main content area */}
        <div className="flex-1 p-4 lg:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <div>
              <div className="h-4 lg:h-5 w-32 lg:w-48 bg-foreground/80 rounded mb-2" />
              <div className="h-2.5 lg:h-3 w-48 lg:w-64 bg-muted-foreground/30 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-20 rounded-lg bg-muted/60" />
              <div className={`h-8 w-24 rounded-lg ${screen.accent}`} />
            </div>
          </div>
          
          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mb-4 lg:mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-2.5 lg:p-4 rounded-lg bg-card/90 border border-border/40">
                <div className="h-2 w-12 bg-muted-foreground/30 rounded mb-2" />
                <div className={`h-4 lg:h-6 w-10 lg:w-14 rounded ${i === 0 ? screen.accent : 'bg-foreground/70'}`} />
              </div>
            ))}
          </div>
          
          {/* Main content - table/list mockup */}
          <div className="rounded-xl bg-card/90 border border-border/40 p-3 lg:p-4">
            <div className="flex gap-4 lg:gap-6 mb-3 lg:mb-4 border-b border-border/30 pb-2 lg:pb-3">
              {['Código', 'Origem', 'Destino', 'Status'].map((col, i) => (
                <div key={col} className={`h-2.5 rounded bg-muted-foreground/40 ${i === 0 ? 'w-16' : i === 3 ? 'w-12' : 'w-20'}`} />
              ))}
            </div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 lg:gap-6 py-2 lg:py-3 border-b border-border/20 last:border-0">
                <div className={`h-2.5 w-20 lg:w-24 rounded ${screen.accent}/60`} />
                <div className="h-2.5 w-16 lg:w-24 rounded bg-muted-foreground/30" />
                <div className="h-2.5 w-16 lg:w-24 rounded bg-muted-foreground/30" />
                <div className={`h-5 lg:h-6 w-16 lg:w-20 rounded-full ${i === 0 ? screen.accent : 'bg-muted/60'}`} />
              </div>
            ))}
          </div>
        </div>
        
        {/* Right panel - map mockup */}
        <div className="hidden lg:block w-1/3 bg-muted/30 border-l border-border/30 p-4">
          <div className="h-full rounded-xl bg-gradient-to-b from-sky-100/50 to-emerald-100/50 dark:from-sky-900/20 dark:to-emerald-900/20 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="h-2 w-24 bg-muted-foreground/20 rounded mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MacBookSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % showcaseScreens.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-5xl mx-auto mt-16 lg:mt-24"
    >
      {/* Glow effect behind */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-primary/5 to-transparent blur-3xl -z-10 scale-110" />
      
      {/* MacBook Frame */}
      <div className="relative">
        {/* Screen bezel - dark frame */}
        <div className="relative rounded-t-xl lg:rounded-t-2xl overflow-hidden bg-neutral-900 dark:bg-neutral-800 p-2 lg:p-3">
          {/* Camera notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 lg:w-32 h-6 lg:h-7 bg-neutral-900 dark:bg-neutral-800 rounded-b-xl flex items-center justify-center z-20">
            <div className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-neutral-700 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-neutral-600" />
            </div>
          </div>
          
          {/* Screen content area */}
          <div className="relative rounded-lg overflow-hidden bg-background aspect-[16/10]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              >
                <ScreenMockup screen={showcaseScreens[currentIndex]} />
              </motion.div>
            </AnimatePresence>
            
            {/* Subtle screen reflection */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
        
        {/* MacBook bottom/keyboard area */}
        <div className="relative h-3 lg:h-4 bg-gradient-to-b from-neutral-300 to-neutral-400 dark:from-neutral-600 dark:to-neutral-700 rounded-b-xl">
          {/* Notch/indent at bottom */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 lg:w-20 h-1 lg:h-1.5 bg-neutral-400 dark:bg-neutral-500 rounded-b-lg" />
        </div>
        
        {/* Shadow under MacBook */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[90%] h-4 bg-foreground/10 blur-xl rounded-full" />
      </div>

      {/* Slide indicators */}
      <div className="flex items-center justify-center gap-2 mt-8">
        {showcaseScreens.map((screen, index) => (
          <button
            key={screen.id}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'w-6 bg-primary' 
                : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
            aria-label={`Go to ${screen.title}`}
          />
        ))}
      </div>

      {/* Current slide title */}
      <motion.div 
        key={currentIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mt-4"
      >
        <p className="text-sm text-muted-foreground">{showcaseScreens[currentIndex].subtitle}</p>
      </motion.div>

      {/* Floating elements */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="absolute -left-4 lg:-left-12 top-1/4 hidden md:block"
      >
        <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium">Rastreamento Ativo</p>
              <p className="text-xs text-muted-foreground">45 veículos online</p>
            </div>
          </div>
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute -right-4 lg:-right-8 top-1/3 hidden md:block"
      >
        <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium">Entrega Confirmada</p>
              <p className="text-xs text-muted-foreground">POD recebido • 14:32</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
