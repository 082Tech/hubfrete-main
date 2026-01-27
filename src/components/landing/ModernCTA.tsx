import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Package, Truck, User } from 'lucide-react';
import { motion } from 'framer-motion';

export function ModernCTA() {
  const navigate = useNavigate();

  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-primary" />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-primary-foreground mb-6">
            Pronto para transformar sua logística?
          </h2>
          <p className="text-lg lg:text-xl text-primary-foreground/80 mb-10">
            Junte-se a milhares de empresas e motoristas que já fazem parte 
            da maior rede de logística do Brasil.
          </p>

          {/* Role selection cards */}
          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            {[
              { icon: Package, label: 'Sou Embarcador', path: '/pre-cadastro/embarcador', desc: 'Publique cargas' },
              { icon: Truck, label: 'Sou Transportadora', path: '/pre-cadastro/transportadora', desc: 'Gerencie frota' },
              { icon: User, label: 'Sou Motorista', path: '/pre-cadastro/motorista', desc: 'Aceite fretes' },
            ].map((item, i) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.1 }}
                onClick={() => navigate(item.path)}
                className="group p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all text-left"
              >
                <item.icon className="w-8 h-8 text-primary-foreground mb-3" />
                <p className="text-lg font-semibold text-primary-foreground">{item.label}</p>
                <p className="text-sm text-primary-foreground/70">{item.desc}</p>
              </motion.button>
            ))}
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-8 lg:gap-16 pt-8 border-t border-white/20"
          >
            {[
              { value: '50k+', label: 'Motoristas Ativos' },
              { value: '10k+', label: 'Empresas Parceiras' },
              { value: '98%', label: 'Entregas no Prazo' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl lg:text-4xl font-bold text-primary-foreground">{stat.value}</p>
                <p className="text-sm text-primary-foreground/70 mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
