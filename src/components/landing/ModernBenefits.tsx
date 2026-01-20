import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  MapPin, 
  Clock, 
  Shield, 
  Building2, 
  CheckCircle,
  MessageSquare,
  Wallet,
  Fuel,
  Gift,
  Star,
  Wrench
} from 'lucide-react';

const embarcadorBenefits = [
  { icon: MapPin, title: 'Monitor de Cargas em Tempo Real', desc: 'Mapa com ETA, rotas e alertas em toda a malha nacional.' },
  { icon: Clock, title: 'Linha do Tempo por Carga', desc: 'Visão global de eventos com SLA e comparativo planejado x realizado.' },
  { icon: Shield, title: 'Módulo de Documentos', desc: 'Upload em lote, OCR fiscal e trilha de auditoria completa.' },
  { icon: Building2, title: 'Módulo Financeiro', desc: 'Pagamentos por ciclo, volumes transportados e conciliação.' },
  { icon: CheckCircle, title: 'Dashboard Executivo', desc: 'OTIF, lead time, ranking de motoristas e custo por rota.' },
  { icon: MessageSquare, title: 'Chat Unificado', desc: 'Comunicação direta com Motorista e Torre de Controle.' },
];

const motoristaBenefits = [
  { icon: Wallet, title: 'Carteira Digital + D+0', desc: 'Receba via Pix com antecipação quando precisar.' },
  { icon: MapPin, title: 'Acompanhamento Real-Time', desc: 'Mapa, ETA e rota otimizada para economia.' },
  { icon: Fuel, title: 'SGC: Custos e Manutenção', desc: 'Abastecimentos com OCR e cálculo automático km/L.' },
  { icon: Wrench, title: 'Pneus e Manutenção', desc: 'Medição de sulco, rodízio e manutenções preventivas.' },
  { icon: Gift, title: 'Clube de Vantagens', desc: 'Descontos em combustível, oficinas e pneus.' },
  { icon: Star, title: 'Reputação que Vira Prioridade', desc: 'Melhor avaliação = mais fretes e melhores condições.' },
];

function BenefitCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="group p-5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all duration-300">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h4 className="font-semibold mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

export function ModernBenefits() {
  const navigate = useNavigate();

  return (
    <>
      {/* Para Embarcadores */}
      <section id="embarcadores" className="py-24 lg:py-32">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                Para Embarcadores
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Gerencie sua logística de ponta a ponta
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Plataforma completa para publicar cargas, rastrear entregas e 
                otimizar operações com visibilidade total.
              </p>
              <Button 
                onClick={() => navigate('/cadastro/embarcador')}
                className="rounded-full px-6 gap-2"
              >
                Começar como Embarcador
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>

            {/* Right grid */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid sm:grid-cols-2 gap-4"
            >
              {embarcadorBenefits.map((benefit, i) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i }}
                >
                  <BenefitCard {...benefit} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Para Motoristas */}
      <section id="motoristas" className="py-24 lg:py-32 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left grid */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="grid sm:grid-cols-2 gap-4 order-2 lg:order-1"
            >
              {motoristaBenefits.map((benefit, i) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i }}
                >
                  <BenefitCard {...benefit} />
                </motion.div>
              ))}
            </motion.div>

            {/* Right content */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="order-1 lg:order-2"
            >
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                Para Motoristas
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Mais ganhos, menos custos
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Aceite fretes com pagamento garantido, rastreie suas viagens e 
                tenha controle total do seu veículo e finanças.
              </p>
              <Button 
                onClick={() => navigate('/cadastro/motorista')}
                className="rounded-full px-6 gap-2"
              >
                Começar como Motorista
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}
