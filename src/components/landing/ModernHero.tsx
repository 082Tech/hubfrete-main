import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

// Product mockup component
function ProductMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-5xl mx-auto mt-16 lg:mt-24"
    >
      {/* Glow effect behind */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-primary/5 to-transparent blur-3xl -z-10 scale-110" />
      
      {/* Main mockup container */}
      <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden border border-border/50 bg-card shadow-2xl">
        {/* Browser header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border/50">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-primary/60" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-4 py-1 rounded-lg bg-background text-xs text-muted-foreground">
              app.hubfrete.com
            </div>
          </div>
        </div>
        
        {/* Dashboard preview */}
        <div className="p-6 lg:p-8 bg-gradient-to-b from-background to-muted/30">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Cargas Ativas', value: '127', change: '+12%' },
              { label: 'Em Trânsito', value: '45', change: '+8%' },
              { label: 'Entregues Hoje', value: '23', change: '+15%' },
              { label: 'OTIF', value: '98.5%', change: '+2.3%' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="p-4 rounded-xl bg-card border border-border/50"
              >
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs text-primary mt-1">{stat.change}</p>
              </motion.div>
            ))}
          </div>
          
          {/* Map placeholder */}
          <div className="rounded-xl bg-muted/50 border border-border/50 h-48 lg:h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              </div>
              <p className="text-sm text-muted-foreground">Mapa de rastreamento em tempo real</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating elements */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="absolute -left-4 lg:-left-12 top-1/3 hidden md:block"
      >
        <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Match Inteligente</p>
              <p className="text-xs text-muted-foreground">3 motoristas disponíveis</p>
            </div>
          </div>
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute -right-4 lg:-right-8 top-1/2 hidden md:block"
      >
        <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-green-500" />
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

export function ModernHero() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start pt-32 lg:pt-40 pb-20 overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="container mx-auto px-6 relative z-10">
        {/* Announcement badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-8"
        >
          <a 
            href="#features"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors group"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm">Novo: Match Inteligente com IA</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </a>
        </motion.div>

        {/* Main headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
            Plataforma de logística para{' '}
            <span className="text-primary">quem move o Brasil</span>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground text-center max-w-2xl mx-auto mt-6"
        >
          Conecte cargas a motoristas verificados. Rastreie em tempo real. 
          Receba D+0. Sem complicação.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
        >
          <Button
            size="lg"
            onClick={() => navigate('/login')}
            className="rounded-full px-8 h-12 text-base bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          >
            Começar Agora
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => {}}
            className="rounded-full px-8 h-12 text-base gap-2"
          >
            <Play className="w-4 h-4" />
            Ver Demonstração
          </Button>
        </motion.div>

        {/* Product Mockup */}
        <ProductMockup />
      </div>
    </section>
  );
}
