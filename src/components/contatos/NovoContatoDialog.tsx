import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MaskedInput } from '@/components/ui/masked-input';
import { useCnpjLookup } from '@/hooks/useCnpjLookup';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Loader2, Building2, CheckCircle2 } from 'lucide-react';

interface NovoContatoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: number;
  onSuccess: () => void;
}

interface ContatoForm {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  contato_nome: string;
  contato_telefone: string;
  contato_email: string;
}

const initialForm: ContatoForm = {
  cnpj: '',
  razao_social: '',
  nome_fantasia: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
  contato_nome: '',
  contato_telefone: '',
  contato_email: '',
};

export function NovoContatoDialog({ open, onOpenChange, empresaId, onSuccess }: NovoContatoDialogProps) {
  const [form, setForm] = useState<ContatoForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [cnpjLoaded, setCnpjLoaded] = useState(false);
  const { lookup, isLoading: lookingUp, error: cnpjError } = useCnpjLookup();

  const handleCnpjLookup = async () => {
    const cleanCnpj = form.cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      toast.error('CNPJ inválido. Digite os 14 dígitos.');
      return;
    }

    const data = await lookup(cleanCnpj);
    if (data) {
      setForm(prev => ({
        ...prev,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia || '',
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento || '',
        bairro: data.bairro,
        cidade: data.municipio,
        estado: data.uf,
        cep: data.cep,
        contato_telefone: data.telefone || '',
        contato_email: data.email || '',
      }));
      setCnpjLoaded(true);
      toast.success('Dados do CNPJ carregados!');
    } else if (cnpjError) {
      toast.error(cnpjError);
    }
  };

  const handleSave = async () => {
    if (!form.cnpj || !form.razao_social) {
      toast.error('CNPJ e Razão Social são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const cleanCnpj = form.cnpj.replace(/\D/g, '');
      
      // Check if contact already exists
      const { data: existing } = await supabase
        .from('contatos_destino')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('cnpj', cleanCnpj)
        .maybeSingle();

      if (existing) {
        toast.error('Este CNPJ já está cadastrado na sua lista de contatos');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('contatos_destino')
        .insert({
          empresa_id: empresaId,
          cnpj: cleanCnpj,
          razao_social: form.razao_social,
          nome_fantasia: form.nome_fantasia || null,
          logradouro: form.logradouro || null,
          numero: form.numero || null,
          complemento: form.complemento || null,
          bairro: form.bairro || null,
          cidade: form.cidade || null,
          estado: form.estado || null,
          cep: form.cep?.replace(/\D/g, '') || null,
          contato_nome: form.contato_nome || null,
          contato_telefone: form.contato_telefone || null,
          contato_email: form.contato_email || null,
        });

      if (error) throw error;

      toast.success('Contato salvo com sucesso!');
      setForm(initialForm);
      setCnpjLoaded(false);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving contact:', err);
      toast.error('Erro ao salvar contato');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm(initialForm);
    setCnpjLoaded(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Novo Contato
          </DialogTitle>
          <DialogDescription>
            Adicione um novo destinatário à sua lista de contatos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* CNPJ Search */}
          <div className="space-y-2">
            <Label>CNPJ *</Label>
            <div className="flex gap-2">
              <MaskedInput
                mask="cnpj"
                value={form.cnpj}
                onChange={(value) => {
                  setForm(prev => ({ ...prev, cnpj: value }));
                  setCnpjLoaded(false);
                }}
                placeholder="00.000.000/0000-00"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCnpjLookup}
                disabled={lookingUp || form.cnpj.replace(/\D/g, '').length !== 14}
              >
                {lookingUp ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : cnpjLoaded ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Digite o CNPJ e clique na lupa para buscar os dados automaticamente
            </p>
          </div>

          {/* Razão Social */}
          <div className="space-y-2">
            <Label>Razão Social *</Label>
            <Input
              value={form.razao_social}
              onChange={(e) => setForm(prev => ({ ...prev, razao_social: e.target.value }))}
              placeholder="Razão social da empresa"
            />
          </div>

          {/* Nome Fantasia */}
          <div className="space-y-2">
            <Label>Nome Fantasia</Label>
            <Input
              value={form.nome_fantasia}
              onChange={(e) => setForm(prev => ({ ...prev, nome_fantasia: e.target.value }))}
              placeholder="Nome fantasia (opcional)"
            />
          </div>

          {/* Address */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Logradouro</Label>
              <Input
                value={form.logradouro}
                onChange={(e) => setForm(prev => ({ ...prev, logradouro: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input
                value={form.numero}
                onChange={(e) => setForm(prev => ({ ...prev, numero: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input
                value={form.bairro}
                onChange={(e) => setForm(prev => ({ ...prev, bairro: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Complemento</Label>
              <Input
                value={form.complemento}
                onChange={(e) => setForm(prev => ({ ...prev, complemento: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                value={form.cidade}
                onChange={(e) => setForm(prev => ({ ...prev, cidade: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input
                value={form.estado}
                onChange={(e) => setForm(prev => ({ ...prev, estado: e.target.value }))}
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label>CEP</Label>
              <MaskedInput
                mask="cep"
                value={form.cep}
                onChange={(value) => setForm(prev => ({ ...prev, cep: value }))}
                placeholder="00000-000"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="pt-2 border-t">
            <p className="text-sm font-medium mb-3">Dados do Contato</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Responsável</Label>
                <Input
                  value={form.contato_nome}
                  onChange={(e) => setForm(prev => ({ ...prev, contato_nome: e.target.value }))}
                  placeholder="Nome do contato"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <MaskedInput
                  mask="phone"
                  value={form.contato_telefone}
                  onChange={(value) => setForm(prev => ({ ...prev, contato_telefone: value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.contato_email}
                onChange={(e) => setForm(prev => ({ ...prev, contato_email: e.target.value }))}
                placeholder="email@empresa.com"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Contato'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
