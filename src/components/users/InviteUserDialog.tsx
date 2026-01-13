import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Filial {
  id: number;
  nome: string;
}

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyType: 'embarcador' | 'transportadora';
  companyId: string;
  filiais: Filial[];
  onSuccess?: () => void;
}

export function InviteUserDialog({
  open,
  onOpenChange,
  companyType,
  companyId,
  filiais,
  onSuccess,
}: InviteUserDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'OPERADOR'>('OPERADOR');
  const [selectedFiliais, setSelectedFiliais] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleFilial = (filialId: number) => {
    setSelectedFiliais(prev =>
      prev.includes(filialId)
        ? prev.filter(id => id !== filialId)
        : [...prev, filialId]
    );
  };

  const handleInvite = async () => {
    if (!email) {
      toast.error('Digite o email do usuário');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para convidar usuários');
        return;
      }

      const response = await supabase.functions.invoke('invite-user', {
        body: {
          email,
          company_type: companyType,
          company_id: companyId,
          filial_id: selectedFiliais.length > 0 ? selectedFiliais[0] : undefined,
          role,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      toast.success(`Convite enviado para ${email}`);
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error('Error sending invite:', error);
      const message = error instanceof Error ? error.message : 'Erro ao enviar convite';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setRole('OPERADOR');
    setSelectedFiliais([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Convidar Novo Usuário
          </DialogTitle>
          <DialogDescription>
            O usuário receberá um email com o convite para se cadastrar na plataforma
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email do Usuário</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                placeholder="usuario@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Função</Label>
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
              <Label>Filiais com Acesso</Label>
              <div className="grid grid-cols-1 gap-2 p-3 border border-border rounded-lg bg-muted/20 max-h-40 overflow-y-auto">
                {filiais.map((filial) => (
                  <div key={filial.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`filial-${filial.id}`}
                      checked={selectedFiliais.includes(filial.id)}
                      onCheckedChange={() => toggleFilial(filial.id)}
                    />
                    <label
                      htmlFor={`filial-${filial.id}`}
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
          <Button onClick={handleInvite} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar Convite
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}