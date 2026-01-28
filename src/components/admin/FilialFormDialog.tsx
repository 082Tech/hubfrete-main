import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, MapPin, Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface FilialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: number;
  empresaNome: string;
  filial?: {
    id: number;
    nome: string | null;
    cnpj: string | null;
    cidade: string | null;
    estado: string | null;
    endereco?: string | null;
    cep?: string | null;
    telefone?: string | null;
    email?: string | null;
    responsavel?: string | null;
    is_matriz: boolean | null;
    ativa: boolean | null;
  } | null;
  onSuccess: () => void;
}

export function FilialFormDialog({
  open,
  onOpenChange,
  empresaId,
  empresaNome,
  filial,
  onSuccess,
}: FilialFormDialogProps) {
  const isEdit = !!filial;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    cidade: '',
    estado: '',
    endereco: '',
    cep: '',
    telefone: '',
    email: '',
    responsavel: '',
    is_matriz: false,
    ativa: true,
  });

  useEffect(() => {
    if (filial) {
      setFormData({
        nome: filial.nome || '',
        cnpj: filial.cnpj || '',
        cidade: filial.cidade || '',
        estado: filial.estado || '',
        endereco: filial.endereco || '',
        cep: filial.cep || '',
        telefone: filial.telefone || '',
        email: filial.email || '',
        responsavel: filial.responsavel || '',
        is_matriz: filial.is_matriz || false,
        ativa: filial.ativa !== false,
      });
    } else {
      setFormData({
        nome: '',
        cnpj: '',
        cidade: '',
        estado: '',
        endereco: '',
        cep: '',
        telefone: '',
        email: '',
        responsavel: '',
        is_matriz: false,
        ativa: true,
      });
    }
  }, [filial, open]);

  const handleSubmit = async () => {
    if (!formData.nome) {
      toast.error('Informe o nome da filial');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        empresa_id: empresaId,
        nome: formData.nome,
        cnpj: formData.cnpj.replace(/\D/g, '') || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        endereco: formData.endereco || null,
        cep: formData.cep.replace(/\D/g, '') || null,
        telefone: formData.telefone || null,
        email: formData.email || null,
        responsavel: formData.responsavel || null,
        is_matriz: formData.is_matriz,
        ativa: formData.ativa,
      };

      if (isEdit && filial) {
        const { error } = await supabase
          .from('filiais')
          .update(dataToSave)
          .eq('id', filial.id);

        if (error) throw error;
        toast.success('Filial atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('filiais')
          .insert(dataToSave);

        if (error) throw error;
        toast.success('Filial criada com sucesso!');
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar filial:', error);
      toast.error(error.message || 'Erro ao salvar filial');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            {isEdit ? 'Editar Filial' : 'Nova Filial'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? `Editar filial de ${empresaNome}` : `Adicionar nova filial para ${empresaNome}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Filial *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Filial Centro"
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                placeholder="São Paulo"
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                placeholder="SP"
                maxLength={2}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              placeholder="Rua, número, bairro"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input
                value={formData.cep}
                onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                placeholder="00000-000"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 0000-0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="filial@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input
                value={formData.responsavel}
                onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                placeholder="Nome do responsável"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_matriz}
                onCheckedChange={(checked) => setFormData({ ...formData, is_matriz: checked })}
              />
              <Label>É a Matriz</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.ativa}
                onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })}
              />
              <Label>Ativa</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                {isEdit ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {isEdit ? 'Salvar Alterações' : 'Criar Filial'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
