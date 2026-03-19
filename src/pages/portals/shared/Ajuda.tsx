import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  HelpCircle, Search, ChevronDown, MessageSquare, Mail, Phone,
  PlayCircle, Truck, Package, DollarSign, Settings,
  Users, Headphones, Boxes, Container, Sparkles,
} from 'lucide-react';
import { AbrirChamadoDialog } from '@/components/chamados/AbrirChamadoDialog';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
  portal: 'embarcador' | 'transportadora' | 'ambos';
}

const faqItems: FAQItem[] = [
  // ── Embarcador: Ofertas de Carga ──
  {
    category: 'Ofertas',
    question: 'Como publico uma nova oferta de carga?',
    answer: 'Acesse o menu "Minhas Ofertas" e clique em "Nova Oferta". Preencha os dados obrigatórios como tipo de carga, peso, origem e destino no wizard de 5 etapas. Após revisar o resumo, publique a oferta para que transportadoras possam visualizá-la e aceitá-la.',
    portal: 'embarcador',
  },
  {
    category: 'Ofertas',
    question: 'Posso editar uma oferta já publicada?',
    answer: 'Sim, enquanto a oferta estiver no status "Publicada" e nenhuma transportadora tiver aceitado, você pode editá-la acessando os detalhes e clicando em "Editar".',
    portal: 'embarcador',
  },
  {
    category: 'Ofertas',
    question: 'O que significa carga fracionada?',
    answer: 'Carga fracionada permite que múltiplas transportadoras carreguem partes da carga total. Ao habilitar essa opção, você define o peso mínimo aceito por fração e o saldo restante é atualizado automaticamente.',
    portal: 'embarcador',
  },
  {
    category: 'Ofertas',
    question: 'Como sei quando uma transportadora aceitou minha oferta?',
    answer: 'Você receberá uma notificação quando uma transportadora aceitar sua oferta. Acesse "Minhas Ofertas" para ver os detalhes da alocação, incluindo motorista, veículo e carroceria designados.',
    portal: 'embarcador',
  },
  {
    category: 'Ofertas',
    question: 'Posso definir requisitos de veículo na oferta?',
    answer: 'Sim. No wizard de criação, você pode especificar tipo de veículo, tipo de carroceria, quantidade de paletes e necessidades especiais como refrigeração, carga perigosa, etc.',
    portal: 'embarcador',
  },
  // ── Embarcador: Cargas (execução) ──
  {
    category: 'Cargas',
    question: 'Como acompanho uma carga em andamento?',
    answer: 'Acesse "Gestão de Cargas" para visualizar todas as cargas ativas. Clique em uma carga para ver detalhes como localização do motorista em tempo real, timeline de eventos e documentos anexados.',
    portal: 'embarcador',
  },
  {
    category: 'Cargas',
    question: 'Como visualizo o comprovante de entrega?',
    answer: 'Na tela de detalhes da carga, acesse a aba "Documentos". O canhoto, fotos de comprovante e assinatura do recebedor estarão disponíveis para visualização e download.',
    portal: 'embarcador',
  },
  {
    category: 'Cargas',
    question: 'Como funciona o rastreamento público?',
    answer: 'Cada carga possui um código de rastreio único. Você pode compartilhar o link de rastreio público com o destinatário para que ele acompanhe a entrega em tempo real, sem precisar de login.',
    portal: 'embarcador',
  },
  // ── Transportadora: Ofertas Disponíveis ──
  {
    category: 'Ofertas',
    question: 'Como encontro ofertas de carga disponíveis?',
    answer: 'Acesse "Ofertas de Carga" no menu lateral para visualizar todas as ofertas publicadas por embarcadores. Use os filtros de rota, tipo de veículo e peso para encontrar as mais adequadas à sua frota.',
    portal: 'transportadora',
  },
  {
    category: 'Ofertas',
    question: 'Como aceito uma oferta de carga?',
    answer: 'Ao visualizar os detalhes de uma oferta, clique em "Aceitar Carga". Você passará por um wizard de 3 etapas: 1) Detalhes da carga, 2) Alocação de motorista, veículo e carroceria, e 3) Revisão final. Após confirmar, a carga é alocada diretamente à sua transportadora.',
    portal: 'transportadora',
  },
  {
    category: 'Ofertas',
    question: 'Posso usar o motorista padrão para agilizar a alocação?',
    answer: 'Sim. Se você tem um motorista padrão configurado, o sistema preenche automaticamente os dados de motorista, veículo e carroceria vinculados, acelerando o processo de aceite.',
    portal: 'transportadora',
  },
  {
    category: 'Ofertas',
    question: 'O que é o indicador de capacidade (Weight Gauge)?',
    answer: 'Na etapa de alocação, o sistema exibe um indicador visual que compara o peso da carga com a capacidade do equipamento selecionado, ajudando a verificar se o veículo/carroceria comporta a carga.',
    portal: 'transportadora',
  },
  // ── Transportadora: Cargas (execução) ──
  {
    category: 'Cargas',
    question: 'Como gerencio minhas cargas em andamento?',
    answer: 'Acesse "Gestão de Cargas" para acompanhar todas as cargas ativas. A visualização padrão é "Por Viagens", agrupando cargas do mesmo motorista. Você pode alternar para "Por Cargas" para ver individualmente.',
    portal: 'transportadora',
  },
  {
    category: 'Cargas',
    question: 'Como anexo CT-e e documentos fiscais a uma carga?',
    answer: 'Na tela de detalhes da carga, acesse a seção de documentos e clique em "Anexar CT-e" ou "Anexar Documento". Se você tiver o certificado digital configurado, pode emitir o CT-e diretamente pela plataforma.',
    portal: 'transportadora',
  },
  {
    category: 'Cargas',
    question: 'O que é uma viagem e como ela se relaciona com as cargas?',
    answer: 'Uma viagem agrupa várias cargas atribuídas ao mesmo motorista em uma única rota. Na gestão de cargas, a visualização "Por Viagens" facilita o acompanhamento de todas as paradas e entregas de um motorista.',
    portal: 'transportadora',
  },
  // ── Transportadora: Frota ──
  {
    category: 'Frota',
    question: 'Como cadastro um veículo na frota?',
    answer: 'Acesse "Minha Frota > Veículos" e clique em "Novo Veículo". Preencha placa, tipo, marca, modelo e demais dados. Você pode vincular carrocerias ao veículo posteriormente.',
    portal: 'transportadora',
  },
  {
    category: 'Frota',
    question: 'Como vincular um motorista à minha transportadora?',
    answer: 'Em "Motoristas", clique em "Cadastrar Motorista" para adicionar manualmente, ou use "Links de Convite" para gerar um link compartilhável. O motorista se cadastra e já fica vinculado à sua empresa.',
    portal: 'transportadora',
  },
  {
    category: 'Frota',
    question: 'Como gerencio carrocerias e vínculos?',
    answer: 'Em "Minha Frota > Carrocerias" você cadastra implementos rodoviários (baú, graneleiro, sider, etc.). Em "Vínculos" é possível associar carrocerias a veículos específicos para agilizar a alocação nas ofertas.',
    portal: 'transportadora',
  },
  // ── Compartilhados: Financeiro ──
  {
    category: 'Financeiro',
    question: 'Como funciona o módulo financeiro?',
    answer: 'O módulo financeiro exibe seus recebíveis e pagamentos organizados por período. Você pode verificar valores de frete, comissões, datas de vencimento e status de cada transação.',
    portal: 'ambos',
  },
  {
    category: 'Financeiro',
    question: 'Como solicitar antecipação de pagamento?',
    answer: 'Se a antecipação estiver habilitada para sua empresa, acesse "Financeiro", selecione o recebível desejado e clique em "Solicitar Antecipação". Uma taxa será aplicada conforme a configuração da sua empresa.',
    portal: 'ambos',
  },
  // ── Compartilhados: Conta e Administração ──
  {
    category: 'Conta',
    question: 'Como alterar minha senha?',
    answer: 'Acesse "Configurações" e clique em "Alterar Senha". Informe a senha atual e a nova senha desejada para confirmar a alteração.',
    portal: 'ambos',
  },
  {
    category: 'Conta',
    question: 'Como gerenciar usuários da minha empresa?',
    answer: 'Administradores podem acessar "Minha Empresa > Usuários" para convidar novos membros por e-mail, alterar cargos (Admin, Operador, Visualizador) e remover acessos.',
    portal: 'ambos',
  },
  {
    category: 'Conta',
    question: 'Como adicionar uma filial?',
    answer: 'Acesse "Minha Empresa > Gerenciar Filiais" e clique em "Nova Filial". Preencha os dados como CNPJ, endereço completo e responsável.',
    portal: 'ambos',
  },
  {
    category: 'Conta',
    question: 'Como funciona o chat de mensagens?',
    answer: 'Cada carga possui um chat integrado entre embarcador e transportadora. Acesse "Mensagens" no menu lateral para ver todas as conversas ativas. Você pode enviar texto e anexos.',
    portal: 'ambos',
  },
  // ── Transportadora: Integrações ──
  {
    category: 'Integrações',
    question: 'O HubFrete emite CT-e automaticamente?',
    answer: 'Sim, desde que sua empresa tenha o certificado digital (A1) configurado e a configuração fiscal preenchida em "Integrações". A emissão é feita via Focus NFe diretamente pela plataforma.',
    portal: 'transportadora',
  },
  {
    category: 'Integrações',
    question: 'Preciso de certificado digital?',
    answer: 'O certificado digital (A1) é necessário apenas para emissão de documentos fiscais (CT-e e MDF-e) pela plataforma. Se sua empresa emite esses documentos por outro sistema, não é obrigatório.',
    portal: 'transportadora',
  },
  {
    category: 'Integrações',
    question: 'O que é a configuração fiscal?',
    answer: 'Em "Integrações > Configuração Fiscal" você define parâmetros como CFOP, série do CT-e, regime tributário e situação do ICMS. Esses dados são usados na emissão automática de documentos fiscais.',
    portal: 'transportadora',
  },
];

const embarcadorCategories = [
  { id: 'todos', label: 'Todos', icon: HelpCircle },
  { id: 'Ofertas', label: 'Ofertas', icon: Boxes },
  { id: 'Cargas', label: 'Cargas', icon: Package },
  { id: 'Financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'Conta', label: 'Conta', icon: Users },
];

const transportadoraCategories = [
  { id: 'todos', label: 'Todos', icon: HelpCircle },
  { id: 'Ofertas', label: 'Ofertas', icon: Boxes },
  { id: 'Cargas', label: 'Cargas', icon: Package },
  { id: 'Frota', label: 'Frota', icon: Truck },
  { id: 'Financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'Conta', label: 'Conta', icon: Users },
  { id: 'Integrações', label: 'Integrações', icon: Settings },
];

export default function Ajuda() {
  const location = useLocation();
  const navigate = useNavigate();
  const isTransportadora = location.pathname.startsWith('/transportadora');
  const portalPrefix = isTransportadora ? '/transportadora' : '/embarcador';
  const portalType = isTransportadora ? 'transportadora' : 'embarcador';
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('todos');
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [chamadoOpen, setChamadoOpen] = useState(false);

  const categories = isTransportadora ? transportadoraCategories : embarcadorCategories;

  const portalFAQ = faqItems.filter(
    (item) => item.portal === 'ambos' || item.portal === portalType
  );

  const filteredFAQ = portalFAQ.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'todos' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleItem = (index: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Central de Ajuda</h1>
        <p className="text-muted-foreground mt-1">
          Encontre respostas, tutoriais e entre em contato com o suporte
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to={`${portalPrefix}/ajuda/tutoriais`}>
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group h-full">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                <PlayCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Tutoriais em Vídeo</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Mini-curso para usar a plataforma
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => window.open('mailto:suporte@hubfrete.com.br', '_blank')}>
          <CardContent className="p-5 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">E-mail</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                suporte@hubfrete.com.br
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => window.open('https://wa.me/5511999999999', '_blank')}>
          <CardContent className="p-5 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 group-hover:bg-green-500 group-hover:text-white transition-colors shrink-0">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">WhatsApp</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Fale conosco pelo WhatsApp
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar nas perguntas frequentes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={activeCategory === cat.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(cat.id)}
            className="gap-1.5"
          >
            <cat.icon className="w-3.5 h-3.5" />
            {cat.label}
          </Button>
        ))}
      </div>

      {/* FAQ List */}
      <div className="space-y-3">
        {filteredFAQ.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <HelpCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma pergunta encontrada para sua busca.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tente outros termos ou entre em contato com o suporte.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFAQ.map((item, idx) => (
            <Collapsible key={idx} open={openItems.has(idx)} onOpenChange={() => toggleItem(idx)}>
              <Card className="overflow-hidden">
                <CollapsibleTrigger className="w-full text-left">
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {item.category}
                      </Badge>
                      <span className="font-medium text-sm text-foreground truncate">
                        {item.question}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground shrink-0 ml-2 transition-transform ${
                        openItems.has(idx) ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-0">
                    <div className="border-t pt-3">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))
        )}
      </div>

      {/* Support CTA */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="p-3 rounded-full bg-primary/10 shrink-0">
            <Headphones className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-semibold text-foreground">Não encontrou o que procurava?</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Nossa equipe de suporte está pronta para ajudar. Abra um chamado e responderemos o mais breve possível.
            </p>
          </div>
          <Button className="gap-2 shrink-0">
            <MessageSquare className="w-4 h-4" />
            Abrir Chamado
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
