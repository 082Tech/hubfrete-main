import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Search, PlayCircle, Clock, BookOpen, Package,
  Truck, DollarSign, Settings, Users, BarChart3, Lock,
} from 'lucide-react';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  thumbnailColor: string;
  videoUrl?: string;
}

const tutorials: Tutorial[] = [
  {
    id: '1',
    title: 'Primeiros passos no HubFrete',
    description: 'Conheça a interface, entenda o menu e aprenda a navegar pela plataforma.',
    duration: '5 min',
    category: 'Início',
    thumbnailColor: 'from-primary to-primary/70',
  },
  {
    id: '2',
    title: 'Como publicar sua primeira oferta de carga',
    description: 'Passo a passo completo para criar e publicar uma oferta no marketplace.',
    duration: '8 min',
    category: 'Ofertas',
    thumbnailColor: 'from-blue-500 to-blue-600',
  },
  {
    id: '3',
    title: 'Gerenciando cargas em andamento',
    description: 'Acompanhe cargas, visualize status em tempo real e gerencie documentos.',
    duration: '6 min',
    category: 'Cargas',
    thumbnailColor: 'from-emerald-500 to-emerald-600',
  },
  {
    id: '4',
    title: 'Configuração financeira',
    description: 'Entenda o módulo financeiro: recebíveis, pagamentos e antecipações.',
    duration: '7 min',
    category: 'Financeiro',
    thumbnailColor: 'from-amber-500 to-amber-600',
  },
  {
    id: '5',
    title: 'Cadastro de frota e motoristas',
    description: 'Aprenda a cadastrar veículos, carrocerias e vincular motoristas.',
    duration: '10 min',
    category: 'Frota',
    thumbnailColor: 'from-violet-500 to-violet-600',
  },
  {
    id: '6',
    title: 'Gestão de filiais e usuários',
    description: 'Configure filiais da sua empresa e gerencie permissões de acesso.',
    duration: '5 min',
    category: 'Administração',
    thumbnailColor: 'from-rose-500 to-rose-600',
  },
  {
    id: '7',
    title: 'Emissão de CT-e e MDF-e',
    description: 'Tutorial completo sobre emissão de documentos fiscais pela plataforma.',
    duration: '12 min',
    category: 'Fiscal',
    thumbnailColor: 'from-cyan-500 to-cyan-600',
  },
  {
    id: '8',
    title: 'Relatórios e indicadores',
    description: 'Extraia relatórios operacionais, financeiros e de performance.',
    duration: '6 min',
    category: 'Relatórios',
    thumbnailColor: 'from-orange-500 to-orange-600',
  },
  {
    id: '9',
    title: 'Usando o Assistente com IA',
    description: 'Tire dúvidas, gere resumos e obtenha insights usando o assistente inteligente.',
    duration: '4 min',
    category: 'IA',
    thumbnailColor: 'from-pink-500 to-fuchsia-500',
  },
];

const tutorialCategories = [
  { id: 'todos', label: 'Todos' },
  { id: 'Início', label: 'Início' },
  { id: 'Cargas', label: 'Cargas' },
  { id: 'Entregas', label: 'Entregas' },
  { id: 'Financeiro', label: 'Financeiro' },
  { id: 'Frota', label: 'Frota' },
  { id: 'Administração', label: 'Admin' },
  { id: 'Fiscal', label: 'Fiscal' },
  { id: 'Relatórios', label: 'Relatórios' },
  { id: 'IA', label: 'IA' },
];

export default function Tutoriais() {
  const location = useLocation();
  const portalPrefix = location.pathname.startsWith('/transportadora') ? '/transportadora' : '/embarcador';
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('todos');

  const filteredTutorials = tutorials.filter((t) => {
    const matchesSearch =
      !searchTerm ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'todos' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`${portalPrefix}/ajuda`}>
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tutoriais em Vídeo</h1>
          <p className="text-muted-foreground mt-0.5">
            Mini-curso completo para dominar a plataforma HubFrete
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-medium text-foreground">Progresso do curso</p>
              <span className="text-xs text-muted-foreground">0 de {tutorials.length} concluídos</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: '0%' }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar tutoriais..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {tutorialCategories.map((cat) => (
          <Button
            key={cat.id}
            variant={activeCategory === cat.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Tutorials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTutorials.map((tutorial) => (
          <Card
            key={tutorial.id}
            className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
          >
            {/* Video Thumbnail */}
            <div className={`relative h-40 bg-gradient-to-br ${tutorial.thumbnailColor} flex items-center justify-center`}>
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
              <div className="relative z-10 p-4 rounded-full bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
                <PlayCircle className="w-10 h-10 text-white" />
              </div>
              <Badge className="absolute top-3 right-3 bg-black/40 text-white border-0 text-xs gap-1">
                <Clock className="w-3 h-3" />
                {tutorial.duration}
              </Badge>
              <Badge className="absolute top-3 left-3 bg-white/20 text-white border-0 text-xs">
                {tutorial.category}
              </Badge>
            </div>

            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground text-sm leading-tight mb-1.5 group-hover:text-primary transition-colors">
                {tutorial.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {tutorial.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTutorials.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <PlayCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum tutorial encontrado.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
