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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, User, Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Empresa {
  id: number;
  nome: string | null;
  tipo: string;
}

interface MotoristaAdminFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista?: {
    id: string;
    nome_completo: string;
    cpf: string;
    email: string | null;
    telefone: string | null;
    cnh: string;
    categoria_cnh: string;
    validade_cnh: string;
    ativo: boolean;
    tipo_cadastro: 'autonomo' | 'frota' | 'terceirizado';
    empresa_id: number | null;
  } | null;
  onSuccess: () => void;
}

const categoriasCNH = ['A', 'B', 'AB', 'C', 'D', 'E', 'AC', 'AD', 'AE'];

export function MotoristaAdminFormDialog({
  open,
  onOpenChange,
  motorista,
  onSuccess,
}: MotoristaAdminFormDialogProps) {
  const isEdit = !!motorista;
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    email: '',
    telefone: '',
    cnh: '',
    categoria_cnh: 'B',
    validade_cnh: '',
    tipo_cadastro: 'autonomo' as 'autonomo' | 'frota' | 'terceirizado',
    empresa_id: '',
    ativo: true,
  });

  useEffect(() => {
    if (open) {
      fetchEmpresas();
      if (motorista) {
        setFormData({
          nome_completo: motorista.nome_completo || '',
          cpf: formatCpf(motorista.cpf) || '',
          email: motorista.email || '',
          telefone: motorista.telefone || '',
          cnh: motorista.cnh || '',
          categoria_cnh: motorista.categoria_cnh || 'B',
          validade_cnh: motorista.validade_cnh?.split('T')[0] || '',
          tipo_cadastro: motorista.tipo_cadastro || 'autonomo',
          empresa_id: motorista.empresa_id?.toString() || '',
          ativo: motorista.ativo !== false,
        });
      } else {
        setFormData({
          nome_completo: '',
          cpf: '',
          email: '',
          telefone: '',
          cnh: '',
          categoria_cnh: 'B',
          validade_cnh: '',
          tipo_cadastro: 'autonomo',
          empresa_id: '',
          ativo: true,
        });
      }
    }
  }, [motorista, open]);

  const fetchEmpresas = async () => {
    try {
      const { data } = await supabase
        .from('empresas')
        .select('id, nome, tipo')
        .eq('tipo', 'TRANSPORTADORA')
        .order('nome');
      setEmpresas(data || []);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    }
  };

  const formatCpf = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  };

  const handleSubmit = async () => {
    if (!formData.nome_completo || !formData.cpf || !formData.cnh || !formData.validade_cnh) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.tipo_cadastro === 'frota' && !formData.empresa_id) {
      toast.error('Selecione a transportadora para motorista de frota');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        nome_completo: formData.nome_completo,
        cpf: formData.cpf.replace(/\D/g, ''),
        email: formData.email || null,
        telefone: formData.telefone || null,
        cnh: formData.cnh,
        categoria_cnh: formData.categoria_cnh,
        validade_cnh: formData.validade_cnh,
        tipo_cadastro: formData.tipo_cadastro,
        empresa_id: formData.tipo_cadastro === 'frota' ? parseInt(formData.empresa_id) : null,
        ativo: formData.ativo,
      };

      if (isEdit && motorista) {
        const { error } = await supabase
          .from('motoristas')
          .update(dataToSave)
          .eq('id', motorista.id);

        if (error) throw error;
        toast.success('Motorista atualizado com sucesso!');
      } else {
        // For new motorista, we need a user_id - create a placeholder
        // In production, this should use proper auth flow
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
          .from('motoristas')
          .insert({
            ...dataToSave,
            user_id: user?.id || crypto.randomUUID(), // Placeholder
          });

        if (error) throw error;
        toast.success('Motorista criado com sucesso!');
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar motorista:', error);
      if (error.code === '23505') {
        toast.error('CPF ou CNH já cadastrado');
      } else {
        toast.error(error.message || 'Erro ao salvar motorista');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-chart-3" />
            {isEdit ? 'Editar Motorista' : 'Novo Motorista'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Editar dados do motorista' : 'Cadastrar novo motorista na plataforma'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label>Nome Completo *</Label>
            <Input
              value={formData.nome_completo}
              onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
              placeholder="Nome completo do motorista"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CPF *</Label>
              <Input
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="motorista@email.com"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>CNH *</Label>
              <Input
                value={formData.cnh}
                onChange={(e) => setFormData({ ...formData, cnh: e.target.value })}
                placeholder="Número CNH"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select 
                value={formData.categoria_cnh} 
                onValueChange={(v) => setFormData({ ...formData, categoria_cnh: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoriasCNH.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Validade *</Label>
              <Input
                type="date"
                value={formData.validade_cnh}
                onChange={(e) => setFormData({ ...formData, validade_cnh: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Cadastro *</Label>
              <Select 
                value={formData.tipo_cadastro} 
                onValueChange={(v: 'autonomo' | 'frota') => setFormData({ ...formData, tipo_cadastro: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="autonomo">Autônomo</SelectItem>
                  <SelectItem value="frota">Frota (Transportadora)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.tipo_cadastro === 'frota' && (
              <div className="space-y-2">
                <Label>Transportadora *</Label>
                <Select 
                  value={formData.empresa_id} 
                  onValueChange={(v) => setFormData({ ...formData, empresa_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.nome || `Empresa ${emp.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Switch
              checked={formData.ativo}
              onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
            />
            <Label>Motorista ativo</Label>
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
                {isEdit ? 'Salvar Alterações' : 'Criar Motorista'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
