import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  FileText,
  MapPin,
  Clock,
  DollarSign,
  Check,
  X,
  Building2,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CotacaoComRelacoes {
  id: string;
  carga_id: string;
  transportadora_id: string;
  valor_proposto: number;
  prazo_entrega_dias: number | null;
  status: string | null;
  observacoes: string | null;
  cargas: {
    codigo: string;
    descricao: string;
    status: string | null;
    enderecos_carga: {
      tipo: string;
      cidade: string;
      estado: string;
    }[];
  };
  transportadoras: {
    razao_social: string;
    nome_fantasia: string | null;
  };
}

interface CotacaoAgrupada {
  carga_id: string;
  codigo: string;
  descricao: string;
  origem: string;
  destino: string;
  dataLimite: string;
  status: string;
  cotacoes: {
    id: string;
    transportadora: string;
    valor: number;
    prazo: number | null;
    observacoes: string | null;
    status: string | null;
  }[];
}

export default function Cotacoes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCotacao, setExpandedCotacao] = useState<string | null>(null);

  // Fetch embarcador
  const { data: embarcador } = useQuery({
    queryKey: ['embarcador', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('embarcadores')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch cotações with related data
  const { data: cotacoesData = [], isLoading } = useQuery({
    queryKey: ['cotacoes_embarcador', embarcador?.id],
    queryFn: async () => {
      if (!embarcador?.id) return [];

      const { data, error } = await supabase
        .from('cotacoes')
        .select(`
          id,
          carga_id,
          transportadora_id,
          valor_proposto,
          prazo_entrega_dias,
          status,
          observacoes,
          cargas!inner (
            codigo,
            descricao,
            status,
            embarcador_id,
            enderecos_carga (
              tipo,
              cidade,
              estado
            )
          ),
          transportadoras (
            razao_social,
            nome_fantasia
          )
        `)
        .eq('cargas.embarcador_id', embarcador.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as CotacaoComRelacoes[];
    },
    enabled: !!embarcador?.id,
  });

  // Group cotações by carga
  const cotacoesAgrupadas: CotacaoAgrupada[] = cotacoesData.reduce((acc, cotacao) => {
    const existingCarga = acc.find(c => c.carga_id === cotacao.carga_id);
    
    const origem = cotacao.cargas.enderecos_carga?.find(e => e.tipo === 'origem');
    const destino = cotacao.cargas.enderecos_carga?.find(e => e.tipo === 'destino');

    const cotacaoItem = {
      id: cotacao.id,
      transportadora: cotacao.transportadoras?.nome_fantasia || cotacao.transportadoras?.razao_social || 'Transportadora',
      valor: cotacao.valor_proposto,
      prazo: cotacao.prazo_entrega_dias,
      observacoes: cotacao.observacoes,
      status: cotacao.status,
    };

    if (existingCarga) {
      existingCarga.cotacoes.push(cotacaoItem);
    } else {
      acc.push({
        carga_id: cotacao.carga_id,
        codigo: cotacao.cargas.codigo,
        descricao: cotacao.cargas.descricao,
        origem: origem ? `${origem.cidade}, ${origem.estado}` : '-',
        destino: destino ? `${destino.cidade}, ${destino.estado}` : '-',
        dataLimite: '-',
        status: cotacao.cargas.status || 'em_cotacao',
        cotacoes: [cotacaoItem],
      });
    }

    return acc;
  }, [] as CotacaoAgrupada[]);

  // Filter only pending cotações
  const cotacoesEmAberto = cotacoesAgrupadas.filter(c => 
    c.cotacoes.some(cot => cot.status === 'pendente')
  );

  // Accept cotação mutation
  const acceptMutation = useMutation({
    mutationFn: async (cotacaoId: string) => {
      const { error } = await supabase
        .from('cotacoes')
        .update({ status: 'aceita', aceita_em: new Date().toISOString() })
        .eq('id', cotacaoId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cotação aceita com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['cotacoes_embarcador'] });
    },
    onError: () => {
      toast.error('Erro ao aceitar cotação');
    },
  });

  // Reject cotação mutation
  const rejectMutation = useMutation({
    mutationFn: async (cotacaoId: string) => {
      const { error } = await supabase
        .from('cotacoes')
        .update({ status: 'recusada', recusada_em: new Date().toISOString() })
        .eq('id', cotacaoId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cotação recusada');
      queryClient.invalidateQueries({ queryKey: ['cotacoes_embarcador'] });
    },
    onError: () => {
      toast.error('Erro ao recusar cotação');
    },
  });

  const filteredCotacoes = cotacoesEmAberto.filter(cotacao =>
    cotacao.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cotacao.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Stats
  const stats = {
    emCotacao: cotacoesEmAberto.length,
    totalPropostas: cotacoesData.filter(c => c.status === 'pendente').length,
    menorProposta: cotacoesData.length > 0 
      ? Math.min(...cotacoesData.filter(c => c.status === 'pendente').map(c => c.valor_proposto))
      : 0,
  };

  // Auto-expand first cotação
  if (filteredCotacoes.length > 0 && expandedCotacao === null) {
    setExpandedCotacao(filteredCotacoes[0].carga_id);
  }

  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cotações</h1>
            <p className="text-muted-foreground">Gerencie propostas recebidas para suas cargas</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.emCotacao}</p>
                  <p className="text-xs text-muted-foreground">Cargas em Cotação</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalPropostas}</p>
                  <p className="text-xs text-muted-foreground">Propostas Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.menorProposta > 0 ? formatCurrency(stats.menorProposta) : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Menor Proposta</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por código ou descrição..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Cotações List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCotacoes.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-foreground mb-1">Nenhuma cotação pendente</h3>
              <p className="text-sm text-muted-foreground">
                As propostas das transportadoras aparecerão aqui
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredCotacoes.map((cotacao) => (
              <Card key={cotacao.carga_id} className="border-border overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setExpandedCotacao(expandedCotacao === cotacao.carga_id ? null : cotacao.carga_id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-foreground">{cotacao.codigo}</h3>
                          <Badge variant={cotacao.cotacoes.filter(c => c.status === 'pendente').length > 0 ? 'default' : 'secondary'}>
                            {cotacao.cotacoes.filter(c => c.status === 'pendente').length} proposta(s) pendente(s)
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {cotacao.descricao}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {cotacao.origem} → {cotacao.destino}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${
                      expandedCotacao === cotacao.carga_id ? 'rotate-90' : ''
                    }`} />
                  </div>
                </CardHeader>
                
                {expandedCotacao === cotacao.carga_id && cotacao.cotacoes.filter(c => c.status === 'pendente').length > 0 && (
                  <CardContent className="border-t border-border pt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-4">Propostas pendentes</p>
                    <div className="space-y-3">
                      {cotacao.cotacoes.filter(c => c.status === 'pendente').map((proposta) => (
                        <div 
                          key={proposta.id} 
                          className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/10 transition-colors gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-muted/30 flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{proposta.transportadora}</p>
                              {proposta.observacoes && (
                                <p className="text-sm text-muted-foreground">{proposta.observacoes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-lg font-bold text-foreground">{formatCurrency(proposta.valor)}</p>
                              <p className="text-sm text-muted-foreground">
                                Prazo: {proposta.prazo ? `${proposta.prazo} dias` : '-'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="gap-1 text-destructive hover:text-destructive"
                                onClick={() => rejectMutation.mutate(proposta.id)}
                                disabled={rejectMutation.isPending}
                              >
                                <X className="w-4 h-4" />
                                Recusar
                              </Button>
                              <Button 
                                size="sm" 
                                className="gap-1"
                                onClick={() => acceptMutation.mutate(proposta.id)}
                                disabled={acceptMutation.isPending}
                              >
                                <Check className="w-4 h-4" />
                                Aceitar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
                
                {expandedCotacao === cotacao.carga_id && cotacao.cotacoes.filter(c => c.status === 'pendente').length === 0 && (
                  <CardContent className="border-t border-border pt-4">
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">Aguardando propostas</p>
                      <p className="text-sm">As transportadoras ainda não enviaram propostas para esta carga.</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
