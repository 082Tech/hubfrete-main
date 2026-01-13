import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  Truck,
  MapPin,
  Phone,
  User,
  Navigation,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Map,
  FileText,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useState } from 'react';

const mockEntregas = [
  { 
    id: 'ENT-001',
    cargaId: 'CRG-2026-004',
    descricao: 'Peças de Reposição',
    motorista: 'João Silva',
    telefone: '(94) 99999-1234',
    placa: 'ABC-1234',
    origem: 'Curitiba, PR',
    destino: 'Marabá, PA',
    status: 'Em Trânsito',
    progresso: 65,
    previsao: '14/01/2026 - 14:00',
    ultimaAtualizacao: 'Há 30 min',
    localizacao: 'Próximo a Goiânia, GO'
  },
  { 
    id: 'ENT-002',
    cargaId: 'CRG-2026-006',
    descricao: 'Componentes Elétricos',
    motorista: 'Carlos Mendes',
    telefone: '(11) 98888-5678',
    placa: 'XYZ-5678',
    origem: 'São Paulo, SP',
    destino: 'Parauapebas, PA',
    status: 'Em Trânsito',
    progresso: 35,
    previsao: '16/01/2026 - 09:00',
    ultimaAtualizacao: 'Há 15 min',
    localizacao: 'Próximo a Palmas, TO'
  },
  { 
    id: 'ENT-003',
    cargaId: 'CRG-2026-007',
    descricao: 'Material de Escritório',
    motorista: 'Pedro Santos',
    telefone: '(91) 97777-9012',
    placa: 'DEF-9012',
    origem: 'Belém, PA',
    destino: 'São Luís, MA',
    status: 'Coletado',
    progresso: 10,
    previsao: '13/01/2026 - 18:00',
    ultimaAtualizacao: 'Há 1 hora',
    localizacao: 'Saindo de Belém, PA'
  },
  { 
    id: 'ENT-004',
    cargaId: 'CRG-2026-003',
    descricao: 'Equipamentos Industriais',
    motorista: 'Roberto Lima',
    telefone: '(94) 96666-3456',
    placa: 'GHI-3456',
    origem: 'São Paulo, SP',
    destino: 'Parauapebas, PA',
    status: 'Atrasado',
    progresso: 80,
    previsao: '12/01/2026 - 10:00',
    ultimaAtualizacao: 'Há 2 horas',
    localizacao: 'Próximo a Imperatriz, MA'
  },
];

const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
  'Coletado': { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Truck },
  'Em Trânsito': { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', icon: Navigation },
  'Atrasado': { color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: AlertCircle },
  'Entregue': { color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle },
};

export default function AcompanharEntregas() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntregas = mockEntregas.filter(entrega => 
    entrega.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entrega.cargaId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entrega.motorista.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Acompanhar Entregas</h1>
            <p className="text-muted-foreground">Rastreie suas cargas em tempo real</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Navigation className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">8</p>
                  <p className="text-xs text-muted-foreground">Em Trânsito</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">3</p>
                  <p className="text-xs text-muted-foreground">Coletados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">1</p>
                  <p className="text-xs text-muted-foreground">Atrasados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">47</p>
                  <p className="text-xs text-muted-foreground">Entregues (mês)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por ID, carga ou motorista..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Entregas Cards */}
        <div className="grid gap-4">
          {filteredEntregas.map((entrega) => {
            const StatusIcon = statusConfig[entrega.status]?.icon || Truck;
            return (
              <Card key={entrega.id} className="border-border overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row">
                    {/* Main Info */}
                    <div className="flex-1 p-6 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-foreground">{entrega.id}</h3>
                            <Badge variant="outline" className={statusConfig[entrega.status]?.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {entrega.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Carga: {entrega.cargaId} - {entrega.descricao}
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">Previsão de Entrega</p>
                            <p className="text-sm text-muted-foreground">{entrega.previsao}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                className="gap-2"
                                onClick={() => toast.info('Abrindo mapa...')}
                              >
                                <Map className="w-4 h-4" />
                                Ver no Mapa
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2">
                                <FileText className="w-4 h-4" />
                                Ver Detalhes Completos
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2">
                                <MessageSquare className="w-4 h-4" />
                                Enviar Mensagem
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="gap-2">
                                <ExternalLink className="w-4 h-4" />
                                Abrir em Nova Aba
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Route */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{entrega.origem}</span>
                        </div>
                        <div className="flex-1 h-px bg-border" />
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-primary" />
                          <span className="text-sm font-medium text-foreground">{entrega.destino}</span>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progresso da viagem</span>
                          <span className="font-medium text-foreground">{entrega.progresso}%</span>
                        </div>
                        <Progress value={entrega.progresso} className="h-2" />
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-foreground">{entrega.localizacao}</span>
                        <span className="text-muted-foreground">• Atualizado {entrega.ultimaAtualizacao}</span>
                      </div>
                    </div>

                    {/* Driver Info */}
                    <div className="lg:w-64 p-6 bg-muted/10 border-t lg:border-t-0 lg:border-l border-border/50">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Motorista
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{entrega.motorista}</p>
                            <p className="text-xs text-muted-foreground">Placa: {entrega.placa}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <Phone className="w-4 h-4" />
                          {entrega.telefone}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </PortalLayout>
  );
}