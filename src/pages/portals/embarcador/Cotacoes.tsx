import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  FileText,
  MapPin,
  Clock,
  DollarSign,
  Star,
  Check,
  X,
  Building2,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';

const mockCotacoes = [
  {
    id: 'COT-001',
    cargaId: 'CRG-2026-002',
    descricao: 'Minério de Cobre - Lote B',
    origem: 'Marabá, PA',
    destino: 'Barcarena, PA',
    dataLimite: '13/01/2026',
    propostas: [
      { id: 'P1', transportadora: 'TransNorte Logística', valor: 'R$ 7.800,00', prazo: '3 dias', avaliacao: 4.8, entregas: 156 },
      { id: 'P2', transportadora: 'Rápido Pará Transportes', valor: 'R$ 8.200,00', prazo: '2 dias', avaliacao: 4.5, entregas: 89 },
      { id: 'P3', transportadora: 'LogBrasil Cargas', valor: 'R$ 7.500,00', prazo: '4 dias', avaliacao: 4.2, entregas: 234 },
    ],
    status: 'Aguardando Decisão'
  },
  {
    id: 'COT-002',
    cargaId: 'CRG-2026-008',
    descricao: 'Ferramentas Especiais',
    origem: 'Belo Horizonte, MG',
    destino: 'Parauapebas, PA',
    dataLimite: '14/01/2026',
    propostas: [
      { id: 'P4', transportadora: 'Expresso Minas', valor: 'R$ 12.300,00', prazo: '5 dias', avaliacao: 4.6, entregas: 312 },
      { id: 'P5', transportadora: 'CargoSul Express', valor: 'R$ 11.800,00', prazo: '6 dias', avaliacao: 4.3, entregas: 178 },
    ],
    status: 'Aguardando Decisão'
  },
  {
    id: 'COT-003',
    cargaId: 'CRG-2026-001',
    descricao: 'Minério de Ferro - Lote A',
    origem: 'Parauapebas, PA',
    destino: 'São Luís, MA',
    dataLimite: '12/01/2026',
    propostas: [],
    status: 'Aguardando Propostas'
  },
];

export default function Cotacoes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCotacao, setExpandedCotacao] = useState<string | null>('COT-001');

  const filteredCotacoes = mockCotacoes.filter(cotacao =>
    cotacao.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cotacao.cargaId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cotacao.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">3</p>
                  <p className="text-xs text-muted-foreground">Em Cotação</p>
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
                  <p className="text-2xl font-bold text-foreground">5</p>
                  <p className="text-xs text-muted-foreground">Propostas Recebidas</p>
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
                  <p className="text-2xl font-bold text-foreground">R$ 7.5k</p>
                  <p className="text-xs text-muted-foreground">Menor Proposta</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Star className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">4.5</p>
                  <p className="text-xs text-muted-foreground">Média Avaliação</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por ID ou descrição..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Cotações List */}
        <div className="space-y-4">
          {filteredCotacoes.map((cotacao) => (
            <Card key={cotacao.id} className="border-border overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => setExpandedCotacao(expandedCotacao === cotacao.id ? null : cotacao.id)}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-foreground">{cotacao.id}</h3>
                        <Badge variant={cotacao.propostas.length > 0 ? 'default' : 'secondary'}>
                          {cotacao.propostas.length} proposta(s)
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {cotacao.cargaId} - {cotacao.descricao}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {cotacao.origem} → {cotacao.destino}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Até {cotacao.dataLimite}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${
                    expandedCotacao === cotacao.id ? 'rotate-90' : ''
                  }`} />
                </div>
              </CardHeader>
              
              {expandedCotacao === cotacao.id && cotacao.propostas.length > 0 && (
                <CardContent className="border-t border-border pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-4">Propostas recebidas</p>
                  <div className="space-y-3">
                    {cotacao.propostas.map((proposta) => (
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
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                {proposta.avaliacao}
                              </span>
                              <span>{proposta.entregas} entregas</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">{proposta.valor}</p>
                            <p className="text-sm text-muted-foreground">Prazo: {proposta.prazo}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive">
                              <X className="w-4 h-4" />
                              Recusar
                            </Button>
                            <Button size="sm" className="gap-1">
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
              
              {expandedCotacao === cotacao.id && cotacao.propostas.length === 0 && (
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
      </div>
    </PortalLayout>
  );
}