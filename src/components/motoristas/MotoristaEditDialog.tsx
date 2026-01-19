import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, User, CreditCard, FileText, Upload, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

import { MotoristaCompleto, ESTADOS_BRASIL, CATEGORIAS_CNH } from './types';

interface MotoristaEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista: MotoristaCompleto | null;
}

export function MotoristaEditDialog({ open, onOpenChange, motorista }: MotoristaEditDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    email: '',
    telefone: '',
    uf: '',
    tipo_cadastro: 'frota' as 'autonomo' | 'frota',
    cnh: '',
    categoria_cnh: '',
    validade_cnh: '',
    cnh_tem_qrcode: false,
    possui_ajudante: false,
    ativo: true,
  });

  useEffect(() => {
    if (motorista) {
      setFormData({
        nome_completo: motorista.nome_completo,
        cpf: motorista.cpf,
        email: motorista.email || '',
        telefone: motorista.telefone || '',
        uf: motorista.uf || '',
        tipo_cadastro: motorista.tipo_cadastro || 'frota',
        cnh: motorista.cnh,
        categoria_cnh: motorista.categoria_cnh,
        validade_cnh: motorista.validade_cnh,
        cnh_tem_qrcode: motorista.cnh_tem_qrcode || false,
        possui_ajudante: motorista.possui_ajudante || false,
        ativo: motorista.ativo,
      });
    }
  }, [motorista]);

  const handleSubmit = async () => {
    if (!motorista) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('motoristas')
        .update({
          nome_completo: formData.nome_completo,
          cpf: formData.cpf.replace(/\D/g, ''),
          email: formData.email || null,
          telefone: formData.telefone || null,
          uf: formData.uf || null,
          tipo_cadastro: formData.tipo_cadastro,
          cnh: formData.cnh,
          categoria_cnh: formData.categoria_cnh,
          validade_cnh: formData.validade_cnh,
          cnh_tem_qrcode: formData.cnh_tem_qrcode,
          possui_ajudante: formData.possui_ajudante,
          ativo: formData.ativo,
        })
        .eq('id', motorista.id);

      if (error) throw error;

      toast.success('Motorista atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['motoristas_transportadora'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar motorista:', error);
      toast.error('Erro ao atualizar motorista');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!motorista) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Motorista</DialogTitle>
          <DialogDescription>
            Atualize as informações do motorista
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dados" className="gap-2">
              <User className="w-4 h-4" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="cnh" className="gap-2">
              <CreditCard className="w-4 h-4" />
              CNH
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Status do Motorista</p>
                <p className="text-sm text-muted-foreground">
                  {formData.ativo ? 'Ativo' : 'Inativo'}
                </p>
              </div>
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={formData.nome_completo}
                  onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CPF *</Label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>UF</Label>
                <Select
                  value={formData.uf}
                  onValueChange={(v) => setFormData({ ...formData, uf: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BRASIL.map((estado) => (
                      <SelectItem key={estado.value} value={estado.value}>
                        {estado.value} - {estado.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Cadastro</Label>
                <Select
                  value={formData.tipo_cadastro}
                  onValueChange={(v) => setFormData({ ...formData, tipo_cadastro: v as 'autonomo' | 'frota' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="autonomo">Autônomo</SelectItem>
                    <SelectItem value="frota">Frota</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="possui_ajudante"
                checked={formData.possui_ajudante}
                onCheckedChange={(checked) => setFormData({ ...formData, possui_ajudante: checked })}
              />
              <Label htmlFor="possui_ajudante">Possui Ajudante</Label>
            </div>
          </TabsContent>

          <TabsContent value="cnh" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Número CNH *</Label>
                <Input
                  value={formData.cnh}
                  onChange={(e) => setFormData({ ...formData, cnh: e.target.value })}
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
                    {CATEGORIAS_CNH.map((cat) => (
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

            <div className="flex items-center space-x-2">
              <Switch
                id="cnh_qrcode"
                checked={formData.cnh_tem_qrcode}
                onCheckedChange={(checked) => setFormData({ ...formData, cnh_tem_qrcode: checked })}
              />
              <Label htmlFor="cnh_qrcode">CNH Digital possui QR Code válido</Label>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
