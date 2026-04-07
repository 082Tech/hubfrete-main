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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Shield, Plus, Settings, Lock, Unlock, Pencil, Loader2, ShieldCheck, ShieldAlert, Trash2, Building2,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useAdminContext } from '@/components/admin/AdminLayoutWrapper';

// ─── Types ──────────────────────────────────────────────
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

interface EmpresaCargoConfig {
  id: string;
  empresa_id: number;
  nome: string;
  descricao: string | null;
  editavel: boolean;
}

interface EmpresaCargoPermissao {
  id: string;
  empresa_cargo_id: string;
  permissao: string;
  permitido: boolean;
}

interface EmpresaOption {
  id: number;
  nome: string;
  tipo: string;
}

// ─── Labels & Config ────────────────────────────────────
const permissaoLabels: Record<string, string> = {
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

const categoryOrder: Record<string, string[]> = {
  torre: [
    'empresas', 'cargas', 'entregas', 'motoristas', 'ajudantes',
    'veiculos', 'carrocerias', 'storage', 'pre_cadastros', 'usuarios',
    'monitoramento', 'kpis', 'documentos', 'financeiro', 'relatorios',
    'chamados', 'logs', 'cargos',
  ],
  embarcador: [
    'cargas', 'entregas', 'mensagens', 'financeiro', 'relatorios',
    'filiais', 'usuarios', 'configuracoes',
  ],
  transportadora: [
    'cargas', 'entregas', 'frota', 'motoristas', 'mensagens',
    'financeiro', 'relatorios', 'filiais', 'usuarios', 'configuracoes',
  ],
};

const categoryLabels: Record<string, string> = {
  financeiro: 'Financeiro', empresas: 'Empresas', pre_cadastros: 'Pré-Cadastros',
  logs: 'Logs', relatorios: 'Relatórios', usuarios: 'Usuários', cargos: 'Cargos',
  chamados: 'Chamados', entregas: 'Cargas', cargas: 'Ofertas', motoristas: 'Motoristas',
  veiculos: 'Veículos', carrocerias: 'Carrocerias', ajudantes: 'Ajudantes',
  documentos: 'Documentos', monitoramento: 'Monitoramento', kpis: 'KPIs',
  storage: 'Storage', configuracoes: 'Configurações', frota: 'Frota',
  mensagens: 'Mensagens', filiais: 'Filiais',
};

const allPermissionsByScope: Record<string, string[]> = {
  torre: [
    'empresas.visualizar', 'empresas.editar', 'empresas.excluir',
    'cargas.visualizar', 'cargas.editar', 'entregas.visualizar', 'entregas.editar',
    'motoristas.visualizar', 'motoristas.editar', 'ajudantes.visualizar', 'ajudantes.editar',
    'veiculos.visualizar', 'veiculos.editar', 'carrocerias.visualizar', 'carrocerias.editar',
    'storage.visualizar', 'pre_cadastros.visualizar', 'pre_cadastros.aprovar',
    'usuarios.visualizar', 'usuarios.gerenciar', 'monitoramento.visualizar', 'kpis.visualizar',
    'documentos.visualizar', 'documentos.validar',
    'financeiro.visualizar', 'financeiro.baixa', 'financeiro.exportar',
    'relatorios.visualizar', 'relatorios.exportar',
    'chamados.visualizar', 'chamados.responder', 'chamados.atribuir',
    'logs.visualizar', 'cargos.gerenciar',
  ],
  embarcador: [
    'cargas.visualizar', 'cargas.criar', 'cargas.editar',
    'entregas.visualizar', 'entregas.finalizar',
    'mensagens.visualizar', 'mensagens.enviar',
    'financeiro.visualizar', 'financeiro.exportar',
    'relatorios.visualizar', 'relatorios.exportar',
    'filiais.visualizar', 'filiais.editar',
    'usuarios.visualizar', 'usuarios.gerenciar', 'usuarios.convidar',
    'configuracoes.visualizar', 'configuracoes.editar',
  ],
  transportadora: [
    'cargas.visualizar', 'cargas.criar', 'cargas.editar',
    'entregas.visualizar', 'entregas.finalizar',
    'frota.visualizar', 'frota.editar',
    'motoristas.visualizar', 'motoristas.editar',
    'mensagens.visualizar', 'mensagens.enviar',
    'financeiro.visualizar', 'financeiro.exportar',
    'relatorios.visualizar', 'relatorios.exportar',
    'filiais.visualizar', 'filiais.editar',
    'usuarios.visualizar', 'usuarios.gerenciar', 'usuarios.convidar',
    'configuracoes.visualizar', 'configuracoes.editar',
  ],
};

const ESSENTIAL_TORRE_CARGOS = ['super_admin', 'admin', 'suporte'];

function groupPermissionsGeneric<T extends { permissao: string }>(perms: T[], escopo: string) {
  const groups: Record<string, T[]> = {};
  for (const p of perms) {
    const cat = p.permissao.split('.')[0];
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  }
  const order = categoryOrder[escopo] || Object.keys(groups);
  const ordered: [string, T[]][] = [];
  for (const cat of order) {
    if (groups[cat]) ordered.push([cat, groups[cat]]);
  }
  for (const cat of Object.keys(groups)) {
    if (!order.includes(cat)) ordered.push([cat, groups[cat]]);
  }
  return ordered;
}

// ─── Main Component ─────────────────────────────────────
export default function CargosAdmin() {
  const { adminUser } = useAdminContext();
  const queryClient = useQueryClient();
  const [mainTab, setMainTab] = useState<'torre' | 'empresas'>('torre');

  if (adminUser.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ShieldAlert className="w-16 h-16 mb-4 opacity-50" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-sm mt-2">Apenas super admins podem acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="torre" className="gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Torre de Controle
          </TabsTrigger>
          <TabsTrigger value="empresas" className="gap-1.5">
            <Building2 className="w-4 h-4" />
            Empresas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="torre" className="mt-6">
          <TorreCargoManager />
        </TabsContent>

        <TabsContent value="empresas" className="mt-6">
          <EmpresaCargoManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Torre Cargo Manager (uses cargos_config / cargo_permissoes)
// ═══════════════════════════════════════════════════════
function TorreCargoManager() {
  const queryClient = useQueryClient();
  const [selectedCargo, setSelectedCargo] = useState<CargoConfig | null>(null);
  const [newCargoOpen, setNewCargoOpen] = useState(false);
  const [newCargoName, setNewCargoName] = useState('');
  const [newCargoDesc, setNewCargoDesc] = useState('');
  const [editCargoOpen, setEditCargoOpen] = useState(false);
  const [editCargoDesc, setEditCargoDesc] = useState('');
  const [deleteCargoTarget, setDeleteCargoTarget] = useState<CargoConfig | null>(null);

  const { data: cargos = [], isLoading: loadingCargos } = useQuery({
    queryKey: ['cargos_config', 'torre'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('cargos_config')
        .select('*')
        .eq('escopo', 'torre')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as CargoConfig[];
    },
  });

  const { data: permissoes = [], isLoading: loadingPerms } = useQuery({
    queryKey: ['cargo_permissoes', 'torre', selectedCargo?.nome],
    queryFn: async () => {
      if (!selectedCargo) return [];
      const { data, error } = await (supabase as any)
        .from('cargo_permissoes')
        .select('*')
        .eq('escopo', 'torre')
        .eq('cargo', selectedCargo.nome)
        .order('permissao');
      if (error) throw error;
      return data as CargoPermissao[];
    },
    enabled: !!selectedCargo,
  });

  const togglePermission = useMutation({
    mutationFn: async ({ id, permitido }: { id: string; permitido: boolean }) => {
      const { error } = await (supabase as any)
        .from('cargo_permissoes')
        .update({ permitido })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cargo_permissoes'] }),
    onError: () => toast.error('Erro ao atualizar permissão'),
  });

  const createCargo = useMutation({
    mutationFn: async () => {
      if (!newCargoName.trim()) throw new Error('Nome obrigatório');
      const cargoName = newCargoName.trim();
      const { data: inserted, error } = await (supabase as any)
        .from('cargos_config')
        .insert({ escopo: 'torre', nome: cargoName, descricao: newCargoDesc.trim() || null, editavel: true })
        .select().single();
      if (error) throw error;
      const scopePerms = allPermissionsByScope.torre || [];
      if (scopePerms.length > 0) {
        await (supabase as any).from('cargo_permissoes').insert(
          scopePerms.map(p => ({ escopo: 'torre', cargo: cargoName, permissao: p, permitido: false }))
        );
      }
      return inserted as CargoConfig;
    },
    onSuccess: (newCargo) => {
      toast.success('Cargo criado!');
      setNewCargoOpen(false);
      setNewCargoName('');
      setNewCargoDesc('');
      queryClient.invalidateQueries({ queryKey: ['cargos_config'] });
      queryClient.invalidateQueries({ queryKey: ['cargo_permissoes'] });
      if (newCargo) setSelectedCargo(newCargo);
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao criar cargo'),
  });

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
      if (selectedCargo) setSelectedCargo({ ...selectedCargo, descricao: editCargoDesc.trim() || null });
    },
    onError: () => toast.error('Erro ao atualizar cargo'),
  });

  const deleteCargo = useMutation({
    mutationFn: async (cargo: CargoConfig) => {
      if (ESSENTIAL_TORRE_CARGOS.includes(cargo.nome)) throw new Error('Cargo essencial');
      await (supabase as any).from('cargo_permissoes').delete().eq('escopo', 'torre').eq('cargo', cargo.nome);
      const { error } = await (supabase as any).from('cargos_config').delete().eq('id', cargo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cargo excluído!');
      setDeleteCargoTarget(null);
      if (selectedCargo?.id === deleteCargoTarget?.id) setSelectedCargo(null);
      queryClient.invalidateQueries({ queryKey: ['cargos_config'] });
      queryClient.invalidateQueries({ queryKey: ['cargo_permissoes'] });
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao excluir cargo'),
  });

  const groupedPerms = groupPermissionsGeneric(permissoes, 'torre');

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cargo List */}
        <Card className="lg:col-span-1">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Cargos da Torre</h3>
              <Button size="sm" variant="outline" onClick={() => setNewCargoOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Novo
              </Button>
            </div>
            {loadingCargos ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
            ) : (
              <div className="space-y-2">
                {cargos.map(cargo => (
                  <CargoListItem
                    key={cargo.id}
                    cargo={cargo}
                    selected={selectedCargo?.id === cargo.id}
                    canDelete={!ESSENTIAL_TORRE_CARGOS.includes(cargo.nome)}
                    onSelect={() => setSelectedCargo(cargo)}
                    onEdit={() => { setSelectedCargo(cargo); setEditCargoDesc(cargo.descricao || ''); setEditCargoOpen(true); }}
                    onDelete={() => setDeleteCargoTarget(cargo)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 260px)' }}>
          <CardContent className="p-4 flex-1 overflow-hidden">
            <PermissionsPanel
              selectedCargo={selectedCargo ? { nome: selectedCargo.nome, descricao: selectedCargo.descricao, editavel: selectedCargo.editavel } : null}
              loading={loadingPerms}
              permissoes={permissoes}
              groupedPerms={groupedPerms}
              onToggle={(id, checked) => togglePermission.mutate({ id, permitido: checked })}
              disableToggles={selectedCargo?.nome === 'super_admin'}
            />
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <CargoFormDialog
        open={newCargoOpen}
        onOpenChange={setNewCargoOpen}
        title="Novo Cargo — Torre"
        name={newCargoName}
        onNameChange={setNewCargoName}
        desc={newCargoDesc}
        onDescChange={setNewCargoDesc}
        onSubmit={() => createCargo.mutate()}
        isPending={createCargo.isPending}
        showName
      />
      <CargoFormDialog
        open={editCargoOpen}
        onOpenChange={setEditCargoOpen}
        title={`Editar Cargo — ${selectedCargo?.nome}`}
        desc={editCargoDesc}
        onDescChange={setEditCargoDesc}
        onSubmit={() => updateCargo.mutate()}
        isPending={updateCargo.isPending}
      />
      <DeleteCargoDialog
        target={deleteCargoTarget}
        onClose={() => setDeleteCargoTarget(null)}
        onConfirm={() => deleteCargoTarget && deleteCargo.mutate(deleteCargoTarget)}
        isPending={deleteCargo.isPending}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════
// Empresa Cargo Manager (uses empresa_cargos_config / empresa_cargo_permissoes)
// ═══════════════════════════════════════════════════════
function EmpresaCargoManager() {
  const queryClient = useQueryClient();
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('');
  const [selectedCargo, setSelectedCargo] = useState<EmpresaCargoConfig | null>(null);
  const [newCargoOpen, setNewCargoOpen] = useState(false);
  const [newCargoName, setNewCargoName] = useState('');
  const [newCargoDesc, setNewCargoDesc] = useState('');
  const [editCargoOpen, setEditCargoOpen] = useState(false);
  const [editCargoDesc, setEditCargoDesc] = useState('');
  const [deleteCargoTarget, setDeleteCargoTarget] = useState<EmpresaCargoConfig | null>(null);

  // Fetch empresas
  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas_for_cargos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome, nome_fantasia, razao_social, tipo')
        .order('nome_fantasia', { ascending: true });
      if (error) throw error;
      return (data || []).map((e: any) => ({
        id: e.id,
        nome: e.nome_fantasia || e.razao_social || e.nome || `Empresa #${e.id}`,
        tipo: e.tipo,
      })) as EmpresaOption[];
    },
  });

  const empresaIdNum = selectedEmpresaId ? Number(selectedEmpresaId) : null;
  const selectedEmpresa = empresas.find(e => e.id === empresaIdNum);
  const empresaScope = selectedEmpresa?.tipo === 'EMBARCADOR' ? 'embarcador' : 'transportadora';

  // Fetch cargos for selected empresa
  const { data: cargos = [], isLoading: loadingCargos } = useQuery({
    queryKey: ['empresa_cargos_config', selectedEmpresaId],
    queryFn: async () => {
      if (!empresaIdNum) return [];
      const { data, error } = await (supabase as any)
        .from('empresa_cargos_config')
        .select('*')
        .eq('empresa_id', empresaIdNum)
        .order('editavel', { ascending: true })
        .order('nome');
      if (error) throw error;
      return data as EmpresaCargoConfig[];
    },
    enabled: !!empresaIdNum,
  });

  // Fetch permissions for selected cargo
  const { data: permissoes = [], isLoading: loadingPerms } = useQuery({
    queryKey: ['empresa_cargo_permissoes', selectedCargo?.id],
    queryFn: async () => {
      if (!selectedCargo) return [];
      const { data, error } = await (supabase as any)
        .from('empresa_cargo_permissoes')
        .select('*')
        .eq('empresa_cargo_id', selectedCargo.id)
        .order('permissao');
      if (error) throw error;
      return data as EmpresaCargoPermissao[];
    },
    enabled: !!selectedCargo,
  });

  const togglePermission = useMutation({
    mutationFn: async ({ id, permitido }: { id: string; permitido: boolean }) => {
      const { error } = await (supabase as any)
        .from('empresa_cargo_permissoes')
        .update({ permitido })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['empresa_cargo_permissoes'] }),
    onError: () => toast.error('Erro ao atualizar permissão'),
  });

  const createCargo = useMutation({
    mutationFn: async () => {
      if (!newCargoName.trim() || !empresaIdNum) throw new Error('Nome e empresa obrigatórios');
      const cargoName = newCargoName.trim();
      const { data: inserted, error } = await (supabase as any)
        .from('empresa_cargos_config')
        .insert({ empresa_id: empresaIdNum, nome: cargoName, descricao: newCargoDesc.trim() || null, editavel: true })
        .select().single();
      if (error) throw error;

      // Auto-populate permissions (all disabled) based on empresa type
      const scopePerms = allPermissionsByScope[empresaScope] || [];
      if (scopePerms.length > 0) {
        await (supabase as any).from('empresa_cargo_permissoes').insert(
          scopePerms.map(p => ({ empresa_cargo_id: inserted.id, permissao: p, permitido: false }))
        );
      }
      return inserted as EmpresaCargoConfig;
    },
    onSuccess: (newCargo) => {
      toast.success('Cargo criado!');
      setNewCargoOpen(false);
      setNewCargoName('');
      setNewCargoDesc('');
      queryClient.invalidateQueries({ queryKey: ['empresa_cargos_config'] });
      queryClient.invalidateQueries({ queryKey: ['empresa_cargo_permissoes'] });
      if (newCargo) setSelectedCargo(newCargo);
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao criar cargo'),
  });

  const updateCargo = useMutation({
    mutationFn: async () => {
      if (!selectedCargo) return;
      const { error } = await (supabase as any)
        .from('empresa_cargos_config')
        .update({ descricao: editCargoDesc.trim() || null })
        .eq('id', selectedCargo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cargo atualizado!');
      setEditCargoOpen(false);
      queryClient.invalidateQueries({ queryKey: ['empresa_cargos_config'] });
      if (selectedCargo) setSelectedCargo({ ...selectedCargo, descricao: editCargoDesc.trim() || null });
    },
    onError: () => toast.error('Erro ao atualizar cargo'),
  });

  const deleteCargo = useMutation({
    mutationFn: async (cargo: EmpresaCargoConfig) => {
      if (!cargo.editavel) throw new Error('Cargo protegido');
      const { error } = await (supabase as any).from('empresa_cargos_config').delete().eq('id', cargo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cargo excluído!');
      setDeleteCargoTarget(null);
      if (selectedCargo?.id === deleteCargoTarget?.id) setSelectedCargo(null);
      queryClient.invalidateQueries({ queryKey: ['empresa_cargos_config'] });
      queryClient.invalidateQueries({ queryKey: ['empresa_cargo_permissoes'] });
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao excluir cargo'),
  });

  const groupedPerms = groupPermissionsGeneric(permissoes, empresaScope);

  return (
    <>
      {/* Empresa Selector */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-2 block">Selecionar Empresa</Label>
        <Select
          value={selectedEmpresaId}
          onValueChange={(v) => {
            setSelectedEmpresaId(v);
            setSelectedCargo(null);
          }}
        >
          <SelectTrigger className="w-full max-w-md">
            <SelectValue placeholder="Selecione uma empresa..." />
          </SelectTrigger>
          <SelectContent>
            {empresas.map(emp => (
              <SelectItem key={emp.id} value={String(emp.id)}>
                <span className="flex items-center gap-2">
                  {emp.nome}
                  <Badge variant="outline" className="text-[10px] ml-1">
                    {emp.tipo === 'EMBARCADOR' ? 'Embarcador' : 'Transportadora'}
                  </Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!empresaIdNum ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Building2 className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-sm">Selecione uma empresa para gerenciar seus cargos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cargo List */}
          <Card className="lg:col-span-1">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Cargos da Empresa</h3>
                <Button size="sm" variant="outline" onClick={() => setNewCargoOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Novo
                </Button>
              </div>
              {loadingCargos ? (
                <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-16" />)}</div>
              ) : (
                <div className="space-y-2">
                  {cargos.map(cargo => (
                    <CargoListItem
                      key={cargo.id}
                      cargo={{ ...cargo, escopo: empresaScope }}
                      selected={selectedCargo?.id === cargo.id}
                      canDelete={cargo.editavel}
                      onSelect={() => setSelectedCargo(cargo)}
                      onEdit={() => { setSelectedCargo(cargo); setEditCargoDesc(cargo.descricao || ''); setEditCargoOpen(true); }}
                      onDelete={() => setDeleteCargoTarget(cargo)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card className="lg:col-span-2 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 320px)' }}>
            <CardContent className="p-4 flex-1 overflow-hidden">
              <PermissionsPanel
                selectedCargo={selectedCargo ? { nome: selectedCargo.nome, descricao: selectedCargo.descricao, editavel: selectedCargo.editavel } : null}
                loading={loadingPerms}
                permissoes={permissoes}
                groupedPerms={groupedPerms}
                onToggle={(id, checked) => togglePermission.mutate({ id, permitido: checked })}
                disableToggles={false}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialogs */}
      <CargoFormDialog
        open={newCargoOpen}
        onOpenChange={setNewCargoOpen}
        title={`Novo Cargo — ${selectedEmpresa?.nome || 'Empresa'}`}
        name={newCargoName}
        onNameChange={setNewCargoName}
        desc={newCargoDesc}
        onDescChange={setNewCargoDesc}
        onSubmit={() => createCargo.mutate()}
        isPending={createCargo.isPending}
        showName
      />
      <CargoFormDialog
        open={editCargoOpen}
        onOpenChange={setEditCargoOpen}
        title={`Editar Cargo — ${selectedCargo?.nome}`}
        desc={editCargoDesc}
        onDescChange={setEditCargoDesc}
        onSubmit={() => updateCargo.mutate()}
        isPending={updateCargo.isPending}
      />
      <DeleteCargoDialog
        target={deleteCargoTarget ? { nome: deleteCargoTarget.nome } : null}
        onClose={() => setDeleteCargoTarget(null)}
        onConfirm={() => deleteCargoTarget && deleteCargo.mutate(deleteCargoTarget)}
        isPending={deleteCargo.isPending}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════
// Shared Components
// ═══════════════════════════════════════════════════════

function CargoListItem({ cargo, selected, canDelete, onSelect, onEdit, onDelete }: {
  cargo: { id: string; nome: string; descricao?: string | null; editavel: boolean; escopo?: string };
  selected: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        selected ? 'border-admin-accent bg-admin-accent/5' : 'border-border hover:bg-muted/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {cargo.editavel ? <Unlock className="w-3.5 h-3.5 text-muted-foreground" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className="font-medium text-sm">{cargo.nome}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Pencil className="w-3 h-3" />
          </Button>
          {canDelete && (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
      {cargo.descricao && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cargo.descricao}</p>
      )}
    </button>
  );
}

function PermissionsPanel<T extends { id: string; permissao: string; permitido: boolean }>({ selectedCargo, loading, permissoes, groupedPerms, onToggle, disableToggles }: {
  selectedCargo: { nome: string; descricao: string | null; editavel: boolean } | null;
  loading: boolean;
  permissoes: T[];
  groupedPerms: [string, T[]][];
  onToggle: (id: string, checked: boolean) => void;
  disableToggles: boolean;
}) {
  if (!selectedCargo) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Settings className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">Selecione um cargo para configurar permissões</p>
      </div>
    );
  }
  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  if (permissoes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <ShieldAlert className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">Nenhuma permissão configurada para este cargo</p>
        <p className="text-xs mt-1">Cargos novos precisam ter permissões inseridas</p>
      </div>
    );
  }
  return (
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
            {selectedCargo.descricao && <p className="text-sm text-muted-foreground mt-0.5">{selectedCargo.descricao}</p>}
          </div>
          <Badge variant="secondary" className="text-xs">
            {permissoes.filter(p => p.permitido).length}/{permissoes.length} ativas
          </Badge>
        </div>
        {groupedPerms.map(([category, perms]) => (
          <div key={category}>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {categoryLabels[category] || category}
            </h4>
            <div className="space-y-1">
              {perms.map(perm => (
                <div key={perm.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50">
                  <span className="text-sm">{permissaoLabels[perm.permissao] || perm.permissao}</span>
                  <Switch
                    checked={perm.permitido}
                    onCheckedChange={(checked) => onToggle(perm.id, checked)}
                    disabled={disableToggles}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function CargoFormDialog({ open, onOpenChange, title, name, onNameChange, desc, onDescChange, onSubmit, isPending, showName }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  name?: string;
  onNameChange?: (v: string) => void;
  desc: string;
  onDescChange: (v: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  showName?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {showName && (
            <div>
              <Label>Nome do cargo</Label>
              <Input value={name || ''} onChange={e => onNameChange?.(e.target.value)} placeholder="Ex: supervisor, financeiro..." />
            </div>
          )}
          <div>
            <Label>Descrição</Label>
            <Textarea value={desc} onChange={e => onDescChange(e.target.value)} placeholder="Descreva as responsabilidades" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={isPending || (showName && !name?.trim())}>
            {isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {showName ? 'Criar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCargoDialog({ target, onClose, onConfirm, isPending }: {
  target: { nome: string } | null;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <AlertDialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir cargo "{target?.nome}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso removerá o cargo e todas as suas permissões associadas. Usuários com este cargo precisarão ser reatribuídos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
