import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Filial {
  id: number;
  nome: string;
}

interface UsuarioToEdit {
  id: number;
  nome: string | null;
  email: string | null;
  cargo: 'ADMIN' | 'OPERADOR' | null;
  filiais: { id: number; nome: string | null }[];
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: UsuarioToEdit | null;
  filiais: Filial[];
  onSuccess?: () => void;
}

export function EditUserDialog({
  open,
  onOpenChange,
  usuario,
  filiais,
  onSuccess,
}: EditUserDialogProps) {
  const [nome, setNome] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'OPERADOR'>('OPERADOR');
  const [selectedFiliais, setSelectedFiliais] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (usuario) {
      setNome(usuario.nome || '');
      setRole(usuario.cargo || 'OPERADOR');
      setSelectedFiliais(usuario.filiais.map(f => f.id));
    }
  }, [usuario]);

  const toggleFilial = (filialId: number) => {
    setSelectedFiliais(prev =>
      prev.includes(filialId)
        ? prev.filter(id => id !== filialId)
        : [...prev, filialId]
    );
  };

  const handleSave = async () => {
    if (!usuario) return;

    if (selectedFiliais.length === 0) {
      toast.error('Selecione pelo menos uma filial');
      return;
    }

    setLoading(true);
    try {
      // Update usuario
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ nome, cargo: role })
        .eq('id', usuario.id);

      if (updateError) throw updateError;

      // Get current filiais for this user
      const currentFilialIds = usuario.filiais.map(f => f.id);

      // Filials to add
      const toAdd = selectedFiliais.filter(id => !currentFilialIds.includes(id));
      // Filials to remove
      const toRemove = currentFilialIds.filter(id => !selectedFiliais.includes(id));

      // Remove old associations
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('usuarios_filiais')
          .delete()
          .eq('usuario_id', usuario.id)
          .in('filial_id', toRemove);

        if (removeError) throw removeError;
      }

      // Add new associations
      if (toAdd.length > 0) {
        const inserts = toAdd.map(filialId => ({
          usuario_id: usuario.id,
          filial_id: filialId,
          cargo_na_filial: role,
        }));

        const { error: addError } = await supabase
          .from('usuarios_filiais')
          .insert(inserts);

        if (addError) throw addError;
      }

      // Update cargo_na_filial for existing associations
      const existingFiliais = selectedFiliais.filter(id => currentFilialIds.includes(id));
      if (existingFiliais.length > 0) {
        const { error: updateFilialError } = await supabase
          .from('usuarios_filiais')
          .update({ cargo_na_filial: role })
          .eq('usuario_id', usuario.id)
          .in('filial_id', existingFiliais);

        if (updateFilialError) throw updateFilialError;
      }

      toast.success('Usuário atualizado com sucesso');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário');
    } finally {
      setLoading(false);
    }
  };

  if (!usuario) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" />
            Editar Usuário
          </DialogTitle>
          <DialogDescription>
            Edite as informações e permissões do usuário
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-nome">Nome</Label>
            <Input
              id="edit-nome"
              placeholder="Nome do usuário"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={usuario.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role">Função</Label>
            <Select value={role} onValueChange={(value: 'ADMIN' | 'OPERADOR') => setRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Administrador</SelectItem>
                <SelectItem value="OPERADOR">Operador</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Administradores têm acesso total. Operadores podem gerenciar cargas.
            </p>
          </div>

          {filiais.length > 0 && (
            <div className="space-y-2">
              <Label>Filiais com Acesso *</Label>
              <div className="grid grid-cols-1 gap-2 p-3 border border-border rounded-lg bg-muted/20 max-h-40 overflow-y-auto">
                {filiais.map((filial) => (
                  <div key={filial.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-filial-${filial.id}`}
                      checked={selectedFiliais.includes(filial.id)}
                      onCheckedChange={() => toggleFilial(filial.id)}
                    />
                    <label
                      htmlFor={`edit-filial-${filial.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {filial.nome}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
