import { Button } from '@/components/ui/button';
import {
  FileText,
  Navigation,
  BarChart,
  Truck,
  Building2,
  ArrowRight,
  CheckCircle,
  MapPin,
  Clock,
  Shield,
  Wallet,
  Fuel,
  Wrench,
  Gift,
  Star,
  Bell,
  Wifi,
  Upload,
  FileCheck,
  Route,
  Users,
  Camera,
  MessageSquare,
  CreditCard,
  BarChart3,
  Settings,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';

const steps = [
  {
    number: 1,
    icon: FileText,
    title: 'Publicação da carga',
    items: [
      'Cadastre fretes "Imediato", "Programado" ou "Retorno"',
      'Anexe documentos fiscais com OCR de NF-e/CT-e',
      'Defina janelas, SLAs, requisitos e preferências de rota',
    ],
  },
  {
    number: 2,
    icon: Users,
    title: 'Match e aceite rápido',
    items: [
      'Algoritmo prioriza motoristas verificados e próximos',
      'Checklist digital obrigatório com fotos',
    ],
  },
  {
    number: 3,
    icon: Navigation,
    title: 'Em trânsito com roteirização',
    items: [
      'Monitoramento em tempo real (mapa, ETA, geofences)',
      'Desvio de rota e botão de pânico',
      'Chat integrado: Embarcador ↔ Motorista ↔ Torre',
    ],
  },
  {
    number: 4,
    icon: CheckCircle,
    title: 'Entrega e comprovação',
    items: [
      'POD completo: fotos, assinatura eletrônica',
      'Validação fiscal por OCR',
      'Linha do tempo operacional',
    ],
  },
  {
    number: 5,
    icon: CreditCard,
    title: 'Financeiro automatizado',
    items: [
      'Carteira Digital com Pix e antecipação D+0',
      'Conciliação por carga, ciclo e status',
    ],
  },
  {
    number: 6,
    icon: BarChart,
    title: 'Inteligência operacional',
    items: [
      'SGC: abastecimentos, despesas, manutenções',
      'Dashboard executivo com KPIs',
    ],
  },
];

export function HowItWorksSection() {
  const navigate = useNavigate();

  return (
    <div>
      <section id="como-funciona" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Como funciona
            </h2>
            <p className="text-lg text-muted-foreground">
              Em 6 passos simples
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2" />

            <div className="space-y-12">
              {steps.map((step, index) => (
                <div
                  key={step.number}
                  className={`relative flex items-center gap-8 ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                    }`}
                >
                  {/* Content */}
                  <div className={`flex-1 ${index % 2 === 0 ? 'lg:text-right' : 'lg:text-left'}`}>
                    <div className={`bg-card rounded-2xl p-6 shadow-sm border border-border inline-block ${index % 2 === 0 ? 'lg:ml-auto' : 'lg:mr-auto'
                      } max-w-md`}>
                      <div className={`flex items-center gap-4 mb-4 ${index % 2 === 0 ? 'lg:flex-row-reverse' : ''
                        }`}>
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                          <step.icon className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground">
                          {step.title}
                        </h3>
                      </div>
                      <ul className={`space-y-2 ${index % 2 === 0 ? 'lg:text-right' : 'lg:text-left'}`}>
                        {step.items.map((item, i) => (
                          <li key={i} className="text-muted-foreground text-sm flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Number */}
                  <div className="hidden lg:flex w-16 h-16 bg-primary text-primary-foreground rounded-full items-center justify-center text-2xl font-bold z-10 shadow-lg">
                    {step.number}
                  </div>

                  {/* Empty space for layout */}
                  <div className="hidden lg:block flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="embarcadores" className="py-20 bg-background/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-primary">O que o Embarcador ganha</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Plataforma completa para gestão logística de ponta a ponta
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Monitor de Cargas */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Monitor de Cargas em Tempo Real</h3>
                <p className="text-muted-foreground text-sm">
                  Mapa com ETA, rotas e alertas (desvio, pânico, atraso, perda de sinal) em toda a malha nacional.
                </p>
              </CardContent>
            </Card>

            {/* Linha do Tempo */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Linha do Tempo por Carga</h3>
                <p className="text-muted-foreground text-sm">
                  Visão global de eventos com SLA, evidências e comparativo planejado x realizado.
                </p>
              </CardContent>
            </Card>

            {/* Documentos */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Módulo de Documentos</h3>
                <p className="text-muted-foreground text-sm">
                  Upload em lote, OCR fiscal, validações automáticas e trilha de auditoria completa.
                </p>
              </CardContent>
            </Card>

            {/* Financeiro */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Módulo Financeiro</h3>
                <p className="text-muted-foreground text-sm">
                  Pagamentos por ciclo, volumes transportados, conciliação e exportações detalhadas.
                </p>
              </CardContent>
            </Card>

            {/* Dashboard Executivo */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Dashboard Executivo</h3>
                <p className="text-muted-foreground text-sm">
                  OTIF, lead time, ranking de motoristas, peso transportado, custo por rota e R$/km estimado.
                </p>
              </CardContent>
            </Card>

            {/* Chat Unificado */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Chat Unificado</h3>
                <p className="text-muted-foreground text-sm">
                  Comunicação direta com Motorista e Torre de Controle para resolver ocorrências sem fricção.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Button onClick={() => navigate("/cadastro/embarcador")} className="gap-2">
              Começar como Embarcador
              <ArrowRight size={20} />
            </Button>
          </div>
        </div>
      </section>

      {/* Para Motoristas - Vantagens */}
      <section id="motoristas" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-primary">
              Vantagens para o Motorista
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Mais ganhos, menos custos e controle total do veículo
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Carteira Digital */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Carteira Digital + Antecipação D+0</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Receba via Pix com previsão semanal garantida na segunda-feira seguinte e, quando precisar, antecipe
                  em D+0 com taxa transparente.
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Extrato por viagem e por ciclo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Chaves Pix salvas e status em tempo real
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Acompanhamento em Tempo Real */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Acompanhamento em Tempo Real</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Minha Viagem com mapa, ETA e rota otimizada (economia de pedágio e combustível).
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Alertas de desvio e áreas de risco
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Botão de pânico com localização instantânea
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Registro digital de POD, fotos e assinatura
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* SGC no App */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Fuel className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">SGC: Custos e Manutenção</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Abastecimentos com OCR do cupom, odômetro e geolocalização; cálculo automático de km/L.
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Despesas de viagem e receitas por carga
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    P&L simplificado da viagem
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Detecção de preço fora da curva
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Pneus e Manutenção */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Wrench className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Pneus e Manutenção</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Medição de sulco por posição, rodízio, trocas, recapagens e alertas de sulco crítico.
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Manutenções preventivas por km/tempo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Lembretes automáticos
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Visualização de OS aprovadas
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Clube de Vantagens */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Clube de Vantagens</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Descontos em combustível, oficinas e pneus em toda a região.
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Pagamento via Carteira (QR)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Validação por geolocalização
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Benefícios progressivos
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Reputação */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Reputação que Vira Prioridade</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Desempenho (OTIF, avaliações e histórico) aumenta prioridade em ofertas.
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Acesso a rotas melhores
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Oportunidades premium
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Notificações Inteligentes */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg md:col-span-2 lg:col-span-1">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Notificações Inteligentes</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Lembretes do ciclo de pagamento, alertas de manutenção, avisos de rota segura e postos parceiros.
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Wifi className="h-3 w-3 text-primary" />
                    Funciona offline com sincronização automática
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Dashboard de Indicadores */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg md:col-span-2">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Dashboard de Indicadores</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Todos os seus números na palma da mão para decisões mais inteligentes.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div className="p-3 bg-primary/10 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Km/L</p>
                    <p className="font-bold text-foreground">Consumo</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">R$/Km</p>
                    <p className="font-bold text-foreground">Custo</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Pneu/Km</p>
                    <p className="font-bold text-foreground">Desgaste</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Por Viagem</p>
                    <p className="font-bold text-foreground">Ganhos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Button onClick={() => navigate("/cadastro/motorista")} className="gap-2">
              Começar como Motorista
              <ArrowRight size={20} />
            </Button>
          </div>
        </div>
      </section>

      {/* Para Transportadoras - Benefícios */}
      <section id="transportadoras" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-primary">
              Benefícios para a Transportadora
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Controle total da frota, motoristas e operação em uma única plataforma
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Gestão de Frota */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Gestão Completa de Frota</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Cadastro de veículos, documentação, manutenções e histórico completo em um só lugar.
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Controle de licenciamentos e IPVA
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Alertas de vencimentos automáticos
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Gestão de Motoristas */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Gestão de Motoristas</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Perfis completos, documentação, avaliações e histórico de viagens de cada motorista.
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Ranking de desempenho por motorista
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Controle de CNH e exames
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Torre de Controle */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Torre de Controle</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Monitoramento de toda a frota em tempo real com alertas inteligentes.
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Mapa com posição de todos os veículos
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Alertas de desvio, atraso e ocorrências
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Financeiro Centralizado */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Financeiro Centralizado</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Controle de receitas, despesas, comissões e pagamentos em um painel unificado.
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Faturamento por cliente e por rota
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Conciliação automática de fretes
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Relatórios e KPIs */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Relatórios e KPIs</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Dashboards executivos com indicadores de performance operacional e financeira.
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    OTIF, lead time e custo por km
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Exportação para Excel e PDF
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Integração com Embarcadores */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Integração com Embarcadores</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Receba ofertas de fretes diretamente na plataforma e gerencie contratos.
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Aceite rápido de cargas disponíveis
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    Histórico de parcerias e avaliações
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Painel Administrativo */}
            <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-lg md:col-span-2 lg:col-span-3">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Painel Administrativo Completo</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Visão 360° da operação com todos os indicadores que você precisa.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div className="p-3 bg-primary/10 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-bold text-foreground">Veículos</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Ativos</p>
                    <p className="font-bold text-foreground">Motoristas</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Em Trânsito</p>
                    <p className="font-bold text-foreground">Cargas</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Mensal</p>
                    <p className="font-bold text-foreground">Faturamento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Button onClick={() => navigate("/cadastro/transportadora")} className="gap-2">
              Começar como Transportadora
              <ArrowRight size={20} />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
