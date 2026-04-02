import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Shield, Plus, Settings, Lock, Unlock, Pencil, Loader2, ShieldCheck, ShieldAlert,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useAdminContext } from '@/components/admin/AdminLayoutWrapper';

interface CargoConfig {
  id: string;
  escopo: string;
  nome: string;
  descricao: string | null;
  editavel: boolean;
  created_at: string;
}

interface CargoPermissao {
  id: string;
  escopo: string;
  cargo: string;
  permissao: string;
  permitido: boolean;
}

const permissaoLabels: Record<string, string> = {
  // Torre
  'financeiro.visualizar': 'Financeiro — Visualizar',
  'financeiro.baixa': 'Financeiro — Dar Baixa',
  'financeiro.exportar': 'Financeiro — Exportar',
  'empresas.visualizar': 'Empresas — Visualizar',
  'empresas.editar': 'Empresas — Editar',
  'empresas.excluir': 'Empresas — Excluir',
  'pre_cadastros.visualizar': 'Pré-Cadastros — Visualizar',
  'pre_cadastros.aprovar': 'Pré-Cadastros — Aprovar',
  'logs.visualizar': 'Logs — Visualizar',
  'relatorios.visualizar': 'Relatórios — Visualizar',
  'relatorios.exportar': 'Relatórios — Exportar',
  'usuarios.visualizar': 'Usuários — Visualizar',
  'usuarios.gerenciar': 'Usuários — Gerenciar',
  'cargos.gerenciar': 'Cargos — Gerenciar',
  'chamados.visualizar': 'Chamados — Visualizar',
  'chamados.responder': 'Chamados — Responder',
  'chamados.atribuir': 'Chamados — Atribuir',
  'entregas.visualizar': 'Entregas — Visualizar',
  'entregas.editar': 'Entregas — Editar',
  'cargas.visualizar': 'Cargas — Visualizar',
  'cargas.editar': 'Cargas — Editar',
  'motoristas.visualizar': 'Motoristas — Visualizar',
  'motoristas.editar': 'Motoristas — Editar',
  'veiculos.visualizar': 'Veículos — Visualizar',
  'veiculos.editar': 'Veículos — Editar',
  'carrocerias.visualizar': 'Carrocerias — Visualizar',
  'carrocerias.editar': 'Carrocerias — Editar',
  'ajudantes.visualizar': 'Ajudantes — Visualizar',
  'ajudantes.editar': 'Ajudantes — Editar',
  'documentos.visualizar': 'Documentos — Visualizar',
  'documentos.validar': 'Documentos — Validar',
  'monitoramento.visualizar': 'Monitoramento — Visualizar',
  'kpis.visualizar': 'KPIs — Visualizar',
  'storage.visualizar': 'Storage — Visualizar',
  // Sistema
  'cargas.criar': 'Cargas — Criar',
  'entregas.finalizar': 'Entregas — Finalizar',
  'usuarios.convidar': 'Usuários — Convidar',
  'configuracoes.visualizar': 'Configurações — Visualizar',
  'configuracoes.editar': 'Configurações — Editar',
  'frota.visualizar': 'Frota — Visualizar',
  'frota.editar': 'Frota — Editar',
  'mensagens.visualizar': 'Mensagens — Visualizar',
  'mensagens.enviar': 'Mensagens — Enviar',
  'filiais.visualizar': 'Filiais — Visualizar',
  'filiais.editar': 'Filiais — Editar',
};

// Group permissions by category
function groupPermissions(perms: CargoPermissao[]) {
  const groups: Record<string, CargoPermissao[]> = {};
  for (const p of perms) {
    const cat = p.permissao.split('.')[0];
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  }
  return groups;
}

const categoryLabels: Record<string, string> = {
  financeiro: 'Financeiro',
  empresas: 'Empresas',
  pre_cadastros: 'Pré-Cadastros',
  logs: 'Logs',
  relatorios: 'Relatórios',
  usuarios: 'Usuários',
  cargos: 'Cargos',
  chamados: 'Chamados',
  entregas: 'Entregas/Cargas',
  cargas: 'Ofertas',
  motoristas: 'Motoristas',
  veiculos: 'Veículos',
  carrocerias: 'Carrocerias',
  ajudantes: 'Ajudantes',
  documentos: 'Documentos',
  monitoramento: 'Monitoramento',
  kpis: 'KPIs',
  storage: 'Storage',
  configuracoes: 'Configurações',
  frota: 'Frota',
  mensagens: 'Mensagens',
  filiais: 'Filiais',
};

export default function CargosAdmin() {
  const { adminUser } = useAdminContext();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('torre');
  const [selectedCargo, setSelectedCargo] = useState<CargoConfig | null>(null);
  const [newCargoOpen, setNewCargoOpen] = useState(false);
  const [newCargoName, setNewCargoName] = useState('');
  const [newCargoDesc, setNewCargoDesc] = useState('');
  const [editCargoOpen, setEditCargoOpen] = useState(false);
  const [editCargoDesc, setEditCargoDesc] = useState('');

  // Only super_admin should see this page
  if (adminUser.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ShieldAlert className="w-16 h-16 mb-4 opacity-50" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-sm mt-2">Apenas super admins podem acessar esta página.</p>
      </div>
    );
  }

  // Fetch cargos
  const { data: cargos = [], isLoading: loadingCargos } = useQuery({
    queryKey: ['cargos_config', activeTab],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('cargos_config')
        .select('*')
        .eq('escopo', activeTab)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as CargoConfig[];
    },
  });

  // Fetch permissions for selected cargo
  const { data: permissoes = [], isLoading: loadingPerms } = useQuery({
    queryKey: ['cargo_permissoes', activeTab, selectedCargo?.nome],
    queryFn: async () => {
      if (!selectedCargo) return [];
      const { data, error } = await (supabase as any)
        .from('cargo_permissoes')
        .select('*')
        .eq('escopo', activeTab)
        .eq('cargo', selectedCargo.nome)
        .order('permissao');
      if (error) throw error;
      return data as CargoPermissao[];
    },
    enabled: !!selectedCargo,
  });

  // Toggle permission
  const togglePermission = useMutation({
    mutationFn: async ({ id, permitido }: { id: string; permitido: boolean }) => {
      const { error } = await (supabase as any)
        .from('cargo_permissoes')
        .update({ permitido })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargo_permissoes'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar permissão');
    },
  });

  // Create new cargo
  const createCargo = useMutation({
    mutationFn: async () => {
      if (!newCargoName.trim()) throw new Error('Nome obrigatório');
      const { error } = await (supabase as any)
        .from('cargos_config')
        .insert({
          escopo: activeTab,
          nome: newCargoName.trim(),
          descricao: newCargoDesc.trim() || null,
          editavel: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cargo criado!');
      setNewCargoOpen(false);
      setNewCargoName('');
      setNewCargoDesc('');
      queryClient.invalidateQueries({ queryKey: ['cargos_config'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao criar cargo');
    },
  });

  // Update cargo description
  const updateCargo = useMutation({
    mutationFn: async () => {
      if (!selectedCargo) return;
      const { error } = await (supabase as any)
        .from('cargos_config')
        .update({ descricao: editCargoDesc.trim() || null })
        .eq('id', selectedCargo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cargo atualizado!');
      setEditCargoOpen(false);
      queryClient.invalidateQueries({ queryKey: ['cargos_config'] });
      if (selectedCargo) {
        setSelectedCargo({ ...selectedCargo, descricao: editCargoDesc.trim() || null });
      }
    },
    onError: () => {
      toast.error('Erro ao atualizar cargo');
    },
  });

  const groupedPerms = groupPermissions(permissoes);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-8 h-8 text-admin-accent" />
            Gestão de Cargos
          </h1>
          <p className="text-muted-foreground flex items-center gap-1 mt-1">
            <Lock className="w-3.5 h-3.5" />
            Visível apenas para super admins — configure cargos e permissões
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedCargo(null); }}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="torre" className="gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Torre de Controle
          </TabsTrigger>
          <TabsTrigger value="sistema" className="gap-1.5">
            <Settings className="w-4 h-4" />
            Sistema HubFrete
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Cargo list */}
            <Card className="lg:col-span-1">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Cargos</h3>
                  <Button size="sm" variant="outline" onClick={() => setNewCargoOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Novo
                  </Button>
                </div>

                {loadingCargos ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cargos.map(cargo => (
                      <button
                        key={cargo.id}
                        onClick={() => setSelectedCargo(cargo)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedCargo?.id === cargo.id
                            ? 'border-admin-accent bg-admin-accent/5'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {cargo.editavel ? (
                              <Unlock className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                            <span className="font-medium text-sm">{cargo.nome}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCargo(cargo);
                              setEditCargoDesc(cargo.descricao || '');
                              setEditCargoOpen(true);
                            }}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </div>
                        {cargo.descricao && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {cargo.descricao}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Permissions */}
            <Card className="lg:col-span-2 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 260px)' }}>
              <CardContent className="p-4 flex-1 overflow-hidden">
                {!selectedCargo ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Settings className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">Selecione um cargo para configurar permissões</p>
                  </div>
                ) : loadingPerms ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : permissoes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <ShieldAlert className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">Nenhuma permissão configurada para este cargo</p>
                    <p className="text-xs mt-1">Cargos novos precisam ter permissões inseridas manualmente</p>
                  </div>
                ) : (
                  <ScrollArea className="h-full pr-3">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between sticky top-0 bg-card z-10 pb-3">
                        <div>
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            {selectedCargo.nome}
                            {!selectedCargo.editavel && (
                              <Badge variant="outline" className="text-[10px]">
                                <Lock className="w-2.5 h-2.5 mr-1" /> Protegido
                              </Badge>
                            )}
                          </h3>
                          {selectedCargo.descricao && (
                            <p className="text-sm text-muted-foreground mt-0.5">{selectedCargo.descricao}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {permissoes.filter(p => p.permitido).length}/{permissoes.length} ativas
                        </Badge>
                      </div>

                      {Object.entries(groupedPerms).map(([category, perms]) => (
                        <div key={category}>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            {categoryLabels[category] || category}
                          </h4>
                          <div className="space-y-1">
                            {perms.map(perm => (
                              <div
                                key={perm.id}
                                className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                              >
                                <span className="text-sm">
                                  {permissaoLabels[perm.permissao] || perm.permissao}
                                </span>
                                <Switch
                                  checked={perm.permitido}
                                  onCheckedChange={(checked) =>
                                    togglePermission.mutate({ id: perm.id, permitido: checked })
                                  }
                                  disabled={
                                    selectedCargo.nome === 'super_admin' && activeTab === 'torre'
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Cargo Dialog */}
      <Dialog open={newCargoOpen} onOpenChange={setNewCargoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Cargo — {activeTab === 'torre' ? 'Torre' : 'Sistema'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome do cargo</Label>
              <Input
                value={newCargoName}
                onChange={e => setNewCargoName(e.target.value)}
                placeholder="Ex: financeiro, supervisor..."
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={newCargoDesc}
                onChange={e => setNewCargoDesc(e.target.value)}
                placeholder="Descreva as responsabilidades deste cargo"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCargoOpen(false)}>Cancelar</Button>
            <Button onClick={() => createCargo.mutate()} disabled={createCargo.isPending || !newCargoName.trim()}>
              {createCargo.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Cargo Dialog */}
      <Dialog open={editCargoOpen} onOpenChange={setEditCargoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cargo — {selectedCargo?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={editCargoDesc}
                onChange={e => setEditCargoDesc(e.target.value)}
                placeholder="Descreva as responsabilidades deste cargo"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCargoOpen(false)}>Cancelar</Button>
            <Button onClick={() => updateCargo.mutate()} disabled={updateCargo.isPending}>
              {updateCargo.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
