import { motion } from 'framer-motion';
import { MapPin, Zap, Shield, Truck, BarChart3, MessageCircle, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: MapPin,
    title: 'Rastreamento Real-Time',
    description: 'Acompanhe cada etapa com mapa, ETA, geofences e alertas instantâneos.',
  },
  {
    icon: Zap,
    title: 'Pagamento D+0',
    description: 'Receba via Pix no mesmo dia. Antecipação disponível com taxa transparente.',
  },
  {
    icon: Shield,
    title: 'Fretes Seguros',
    description: 'Motoristas verificados e aprovados. Checklist digital com fotos obrigatórias.',
  },
  {
    icon: Truck,
    title: 'Match Inteligente',
    description: 'Algoritmo prioriza motoristas verificados e próximos aos seus hubs.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Executivo',
    description: 'KPIs em tempo real: OTIF, lead time, ranking de motoristas e custo por rota.',
  },
  {
    icon: MessageCircle,
    title: 'Chat Integrado',
    description: 'Comunicação direta entre Embarcador, Motorista e Torre de Controle.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
    },
  },
};

export function ModernFeatures() {
  return (
    <section id="features" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16 lg:mb-20"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Tudo que você precisa para{' '}
            <span className="text-primary">gerenciar sua logística</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            O marketplace de logística que conecta fábricas, distribuidores, 
            transportadoras e motoristas autônomos.
          </p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group relative p-6 lg:p-8 rounded-2xl border border-border bg-card/50 backdrop-blur-sm hover:bg-card hover:border-primary/20 transition-all duration-300"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              
              {/* Content */}
              <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
              
              {/* Hover arrow */}
              <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="inline-flex items-center gap-1 text-sm text-primary font-medium">
                  Saiba mais
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
