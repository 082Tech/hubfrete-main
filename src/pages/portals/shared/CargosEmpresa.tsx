import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Shield, Plus, Settings, Lock, Unlock, Pencil, Loader2, ShieldAlert, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUserContext } from '@/hooks/useUserContext';

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

const permissaoLabels: Record<string, string> = {
  'cargas.visualizar': 'Cargas — Visualizar',
  'cargas.criar': 'Cargas — Criar',
  'cargas.editar': 'Cargas — Editar',
  'entregas.visualizar': 'Entregas — Visualizar',
  'entregas.finalizar': 'Entregas — Finalizar',
  'mensagens.visualizar': 'Mensagens — Visualizar',
  'mensagens.enviar': 'Mensagens — Enviar',
  'financeiro.visualizar': 'Financeiro — Visualizar',
  'financeiro.exportar': 'Financeiro — Exportar',
  'relatorios.visualizar': 'Relatórios — Visualizar',
  'relatorios.exportar': 'Relatórios — Exportar',
  'filiais.visualizar': 'Filiais — Visualizar',
  'filiais.editar': 'Filiais — Editar',
  'usuarios.visualizar': 'Usuários — Visualizar',
  'usuarios.gerenciar': 'Usuários — Gerenciar',
  'usuarios.convidar': 'Usuários — Convidar',
  'configuracoes.visualizar': 'Configurações — Visualizar',
  'configuracoes.editar': 'Configurações — Editar',
  'frota.visualizar': 'Frota — Visualizar',
  'frota.editar': 'Frota — Editar',
  'motoristas.visualizar': 'Motoristas — Visualizar',
  'motoristas.editar': 'Motoristas — Editar',
};

const categoryOrder: Record<string, string[]> = {
  embarcador: ['cargas', 'entregas', 'mensagens', 'financeiro', 'relatorios', 'filiais', 'usuarios', 'configuracoes'],
  transportadora: ['cargas', 'entregas', 'frota', 'motoristas', 'mensagens', 'financeiro', 'relatorios', 'filiais', 'usuarios', 'configuracoes'],
};

const categoryLabels: Record<string, string> = {
  cargas: 'Ofertas', entregas: 'Cargas', financeiro: 'Financeiro', relatorios: 'Relatórios',
  usuarios: 'Usuários', configuracoes: 'Configurações', frota: 'Frota', mensagens: 'Mensagens',
  filiais: 'Filiais', motoristas: 'Motoristas',
};

const allPermissionsByScope: Record<string, string[]> = {
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

function groupPermissions(perms: EmpresaCargoPermissao[], escopo: string) {
  const groups: Record<string, EmpresaCargoPermissao[]> = {};
  for (const p of perms) {
    const cat = p.permissao.split('.')[0];
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  }
  const order = categoryOrder[escopo] || Object.keys(groups);
  const ordered: [string, EmpresaCargoPermissao[]][] = [];
  for (const cat of order) {
    if (groups[cat]) ordered.push([cat, groups[cat]]);
  }
  for (const cat of Object.keys(groups)) {
    if (!order.includes(cat)) ordered.push([cat, groups[cat]]);
  }
  return ordered;
}

export default function CargosEmpresa() {
  const queryClient = useQueryClient();
  const { empresa, cargo } = useUserContext();
  const empresaId = empresa?.id;
  const empresaTipo = empresa?.tipo === 'EMBARCADOR' ? 'embarcador' : 'transportadora';

  const [selectedCargo, setSelectedCargo] = useState<EmpresaCargoConfig | null>(null);
  const [newCargoOpen, setNewCargoOpen] = useState(false);
  const [newCargoName, setNewCargoName] = useState('');
  const [newCargoDesc, setNewCargoDesc] = useState('');
  const [editCargoOpen, setEditCargoOpen] = useState(false);
  const [editCargoDesc, setEditCargoDesc] = useState('');
  const [deleteCargoTarget, setDeleteCargoTarget] = useState<EmpresaCargoConfig | null>(null);

  const isAdmin = (cargo as string) === 'Administrador';

  const { data: cargos = [], isLoading: loadingCargos } = useQuery({
    queryKey: ['empresa_cargos_config', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await (supabase as any)
        .from('empresa_cargos_config')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('editavel', { ascending: true })
        .order('nome');
      if (error) throw error;
      return data as EmpresaCargoConfig[];
    },
    enabled: !!empresaId,
  });

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
      if (!newCargoName.trim() || !empresaId) throw new Error('Nome obrigatório');
      const name = newCargoName.trim();
      const { data: inserted, error } = await (supabase as any)
        .from('empresa_cargos_config')
        .insert({ empresa_id: empresaId, nome: name, descricao: newCargoDesc.trim() || null, editavel: true })
        .select().single();
      if (error) throw error;
      const scopePerms = allPermissionsByScope[empresaTipo] || [];
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
    mutationFn: async (c: EmpresaCargoConfig) => {
      if (!c.editavel) throw new Error('Cargo protegido');
      const { error } = await (supabase as any).from('empresa_cargos_config').delete().eq('id', c.id);
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

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ShieldAlert className="w-16 h-16 mb-4 opacity-50" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-sm mt-2">Apenas administradores podem gerenciar cargos.</p>
      </div>
    );
  }

  const groupedPerms = groupPermissions(permissoes, empresaTipo);

  return (
    <div className="h-full overflow-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-7 h-7 text-primary" />
          Cargos e Permissões
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie os cargos e permissões de acesso da sua empresa
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cargo List */}
        <Card className="lg:col-span-1">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Cargos</h3>
              <Button size="sm" variant="outline" onClick={() => setNewCargoOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Novo
              </Button>
            </div>
            {loadingCargos ? (
              <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16" />)}</div>
            ) : (
              <div className="space-y-2">
                {cargos.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCargo(c)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedCargo?.id === c.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {c.editavel ? <Unlock className="w-3.5 h-3.5 text-muted-foreground" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                        <span className="font-medium text-sm">{c.nome}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setSelectedCargo(c); setEditCargoDesc(c.descricao || ''); setEditCargoOpen(true); }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        {c.editavel && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteCargoTarget(c); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {c.descricao && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.descricao}</p>}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <CardContent className="p-4 flex-1 overflow-hidden">
            {!selectedCargo ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Settings className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Selecione um cargo para configurar permissões</p>
              </div>
            ) : loadingPerms ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : permissoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ShieldAlert className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Nenhuma permissão configurada para este cargo</p>
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
                              onCheckedChange={(checked) => togglePermission.mutate({ id: perm.id, permitido: checked })}
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

      {/* New Cargo Dialog */}
      <Dialog open={newCargoOpen} onOpenChange={setNewCargoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Cargo</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome do cargo</Label>
              <Input value={newCargoName} onChange={e => setNewCargoName(e.target.value)} placeholder="Ex: supervisor, financeiro..." />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={newCargoDesc} onChange={e => setNewCargoDesc(e.target.value)} placeholder="Descreva as responsabilidades" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCargoOpen(false)}>Cancelar</Button>
            <Button onClick={() => createCargo.mutate()} disabled={createCargo.isPending || !newCargoName.trim()}>
              {createCargo.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Cargo Dialog */}
      <Dialog open={editCargoOpen} onOpenChange={setEditCargoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Cargo — {selectedCargo?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Descrição</Label>
              <Textarea value={editCargoDesc} onChange={e => setEditCargoDesc(e.target.value)} placeholder="Descreva as responsabilidades" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCargoOpen(false)}>Cancelar</Button>
            <Button onClick={() => updateCargo.mutate()} disabled={updateCargo.isPending}>
              {updateCargo.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCargoTarget} onOpenChange={() => setDeleteCargoTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cargo "{deleteCargoTarget?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todas as permissões associadas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteCargoTarget && deleteCargo.mutate(deleteCargoTarget)}
              disabled={deleteCargo.isPending}
            >
              {deleteCargo.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
