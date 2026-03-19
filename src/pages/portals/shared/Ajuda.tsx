import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  PlayCircle, FileText, Truck, Package, DollarSign, Settings,
  Shield, Users, BarChart3, Building2, Headphones, ExternalLink,
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqItems: FAQItem[] = [
  {
    category: 'Cargas',
    question: 'Como publico uma nova carga?',
    answer: 'Acesse o menu "Ofertas" e clique em "Nova Carga". Preencha os dados obrigatórios como tipo de carga, peso, origem e destino. Após revisar, publique a carga para que transportadoras interessadas possam visualizá-la.',
  },
  {
    category: 'Cargas',
    question: 'Posso editar uma carga já publicada?',
    answer: 'Sim, enquanto a carga estiver no status "Publicada" e não tiver propostas aceitas, você pode editá-la acessando os detalhes da carga e clicando em "Editar".',
  },
  {
    category: 'Cargas',
    question: 'O que significa carga fracionada?',
    answer: 'Carga fracionada permite que múltiplas transportadoras carreguem partes da carga total. Ao habilitar essa opção, você define o peso mínimo aceito por fração.',
  },
  {
    category: 'Entregas',
    question: 'Como acompanho uma entrega em andamento?',
    answer: 'Acesse "Cargas > Em andamento" para visualizar todas as entregas ativas. Clique em uma entrega para ver detalhes como localização do motorista, status e documentos anexados.',
  },
  {
    category: 'Entregas',
    question: 'Como faço para visualizar o canhoto/comprovante de entrega?',
    answer: 'Na tela de detalhes da entrega, acesse a aba "Documentos". O canhoto anexado pelo motorista estará disponível para visualização e download.',
  },
  {
    category: 'Financeiro',
    question: 'Quando recebo o pagamento do frete?',
    answer: 'O pagamento segue as condições financeiras configuradas pela administração. Você pode verificar seus recebíveis e datas de vencimento na seção "Financeiro".',
  },
  {
    category: 'Financeiro',
    question: 'Como solicitar antecipação de pagamento?',
    answer: 'Se a antecipação estiver habilitada para sua empresa, acesse "Financeiro", selecione o recebível desejado e clique em "Solicitar Antecipação". Uma taxa será aplicada conforme configuração.',
  },
  {
    category: 'Conta',
    question: 'Como alterar minha senha?',
    answer: 'Acesse "Configurações > Segurança" e clique em "Alterar Senha". Você precisará confirmar a nova senha.',
  },
  {
    category: 'Conta',
    question: 'Como gerenciar usuários da minha empresa?',
    answer: 'Administradores podem acessar "Minha Empresa > Usuários" para convidar novos membros, alterar cargos e remover acessos.',
  },
  {
    category: 'Conta',
    question: 'Como adicionar uma filial?',
    answer: 'Acesse "Minha Empresa > Gerenciar Filiais" e clique em "Nova Filial". Preencha os dados como CNPJ, endereço e responsável.',
  },
  {
    category: 'Frota',
    question: 'Como cadastro um veículo na frota?',
    answer: 'Acesse "Minha Frota > Veículos" e clique em "Novo Veículo". Preencha placa, tipo, marca, modelo e demais dados. Você pode vincular carrocerias ao veículo posteriormente.',
  },
  {
    category: 'Frota',
    question: 'Como vincular um motorista à minha transportadora?',
    answer: 'Em "Motoristas", clique em "Cadastrar Motorista" ou use um link de convite. O motorista receberá um acesso para confirmar o vínculo.',
  },
  {
    category: 'Integrações',
    question: 'O HubFrete emite CT-e automaticamente?',
    answer: 'Sim, desde que sua empresa tenha o certificado digital configurado e a configuração fiscal preenchida em "Integrações". A emissão é feita via Focus NFe.',
  },
  {
    category: 'Integrações',
    question: 'Preciso de certificado digital?',
    answer: 'O certificado digital (A1) é necessário apenas para emissão de documentos fiscais (CT-e e MDF-e). Se sua empresa não emite esses documentos via plataforma, não é obrigatório.',
  },
];

const categories = [
  { id: 'todos', label: 'Todos', icon: HelpCircle },
  { id: 'Cargas', label: 'Cargas', icon: Package },
  { id: 'Entregas', label: 'Entregas', icon: Truck },
  { id: 'Financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'Conta', label: 'Conta', icon: Users },
  { id: 'Frota', label: 'Frota', icon: Truck },
  { id: 'Integrações', label: 'Integrações', icon: Settings },
];

export default function Ajuda() {
  const location = useLocation();
  const portalPrefix = location.pathname.startsWith('/transportadora') ? '/transportadora' : '/embarcador';
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('todos');
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const filteredFAQ = faqItems.filter((item) => {
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
    <div className="space-y-6">
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
