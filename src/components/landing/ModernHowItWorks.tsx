import { motion } from 'framer-motion';
import { FileText, Users, Navigation, CheckCircle, CreditCard, BarChart } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: FileText,
    title: 'Publique a carga',
    description: 'Cadastre fretes imediatos, programados ou retorno. Anexe documentos com OCR automático.',
  },
  {
    number: '02',
    icon: Users,
    title: 'Match inteligente',
    description: 'Algoritmo prioriza motoristas verificados e próximos. Checklist digital obrigatório.',
  },
  {
    number: '03',
    icon: Navigation,
    title: 'Rastreie em tempo real',
    description: 'Mapa, ETA, geofences. Chat integrado entre todas as partes envolvidas.',
  },
  {
    number: '04',
    icon: CheckCircle,
    title: 'Confirme a entrega',
    description: 'POD completo: fotos, assinatura eletrônica, validação fiscal automática.',
  },
  {
    number: '05',
    icon: CreditCard,
    title: 'Receba rapidamente',
    description: 'Carteira Digital com Pix. Antecipação D+0 disponível com taxa transparente.',
  },
  {
    number: '06',
    icon: BarChart,
    title: 'Analise e otimize',
    description: 'Dashboard executivo com KPIs: OTIF, lead time, custos por rota.',
  },
];

export function ModernHowItWorks() {
  return (
    <section id="como-funciona" className="py-24 lg:py-32 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-bl from-primary/5 to-transparent" />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16 lg:mb-20"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Como funciona
          </h2>
          <p className="text-lg text-muted-foreground">
            Da publicação ao pagamento em 6 passos simples
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="relative group"
            >
              <div className="p-6 lg:p-8 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 h-full">
                {/* Step number */}
                <span className="text-5xl lg:text-6xl font-bold text-muted/20 absolute top-4 right-6 select-none">
                  {step.number}
                </span>
                
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors relative z-10">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-semibold mb-2 relative z-10">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed relative z-10">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
