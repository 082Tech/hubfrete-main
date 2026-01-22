import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Showcase screens with real screenshots
const showcaseScreens = [
  { 
    id: 1, 
    title: 'Cargas Disponíveis',
    subtitle: 'Visualize e aceite cargas publicadas',
    image: '/image.png'
  },
  { 
    id: 2, 
    title: 'Cargas Publicadas',
    subtitle: 'Gerencie suas cargas ativas',
    image: '/image-2.png'
  },
  { 
    id: 3, 
    title: 'Relatórios',
    subtitle: 'Analise o desempenho das operações',
    image: '/image-3.png'
  },
  { 
    id: 4, 
    title: 'Gestão de Entregas',
    subtitle: 'Acompanhe entregas em tempo real',
    image: '/image-4.png'
  },
];

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
          <div className="relative rounded-lg overflow-hidden bg-neutral-900 aspect-[16/8]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              >
                <img 
                  src={showcaseScreens[currentIndex].image}
                  alt={showcaseScreens[currentIndex].title}
                  className="w-full h-full object-contain object-left-top"
                />
              </motion.div>
            </AnimatePresence>
            
            {/* Subtle screen reflection */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
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
