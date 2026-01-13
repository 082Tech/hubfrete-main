import { MapPin, Zap, Shield, Truck, BarChart3, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: MapPin,
    title: 'Rastreamento em Tempo Real',
    description: 'Acompanhe cada etapa da sua carga com mapa, ETA, geofences e alertas instantâneos.',
  },
  {
    icon: Zap,
    title: 'Pagamento D+0',
    description: 'Receba via Pix no mesmo dia. Antecipação disponível com taxa transparente.',
  },
  {
    icon: Shield,
    title: 'Fretes Seguros',
    description: 'Motoristas verificados e aprovados. Checklist digital obrigatório com fotos.',
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

export function FeaturesSection() {
  return (
    <section className="py-24 bg-background/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            FreteHub: logística ponta a ponta que{' '}
            <span className="text-primary">impulsiona seus resultados</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            O marketplace de logística que conecta, em poucos cliques, fábricas, 
            distribuidores, transportadoras e motoristas autônomos.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={feature.title}
              className="group bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border"
            >
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
