import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Landmark, Copy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface BankForm {
  banco: string;
  agencia: string;
  conta: string;
  tipo_conta: string;
  pix: string;
  titular: string;
}

const emptyForm: BankForm = {
  banco: '',
  agencia: '',
  conta: '',
  tipo_conta: 'corrente',
  pix: '',
  titular: '',
};

type Target =
  | { type: 'motorista'; id: string; nome: string }
  | { type: 'empresa'; id: number; nome: string };

interface Props {
  target: Target | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DadosBancariosDialog({ target, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BankForm>(emptyForm);

  const queryKey = target ? ['dados-bancarios', target.type, target.type === 'motorista' ? target.id : target.id] : [];

  const { isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!target) return null;
      if (target.type === 'motorista') {
        const { data, error } = await supabase
          .from('motoristas')
          .select('dados_bancarios')
          .eq('id', target.id)
          .single();
        if (error) throw error;
        return data?.dados_bancarios as any;
      } else {
        const { data, error } = await supabase
          .from('empresas')
          .select('dados_bancarios')
          .eq('id', target.id)
          .single();
        if (error) throw error;
        return data?.dados_bancarios as any;
      }
    },
    enabled: open && !!target,
  });

  // Sync fetched data into form
  useEffect(() => {
    if (!open) return;
    const cached = queryClient.getQueryData(queryKey) as any;
    if (cached) {
      setForm({
        banco: cached.banco || '',
        agencia: cached.agencia || '',
        conta: cached.conta || '',
        tipo_conta: cached.tipo_conta || 'corrente',
        pix: cached.pix || '',
        titular: cached.titular || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, queryClient.getQueryData(queryKey)]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error('No target');
      if (target.type === 'motorista') {
        const { error } = await supabase
          .from('motoristas')
          .update({ dados_bancarios: form as any })
          .eq('id', target.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('empresas')
          .update({ dados_bancarios: form as any })
          .eq('id', target.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Dados bancários salvos com sucesso!');
      onOpenChange(false);
    },
    onError: () => toast.error('Erro ao salvar dados bancários'),
  });

  const copyPix = () => {
    if (form.pix) {
      navigator.clipboard.writeText(form.pix);
      toast.success('Chave PIX copiada!');
    }
  };

  const label = target?.type === 'motorista' ? 'Motorista Autônomo' : 'Transportadora';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            Dados Bancários — {label}
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 bg-muted rounded-lg mb-2">
          <p className="text-sm font-medium text-foreground">{target?.nome || '—'}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Titular</Label>
                <Input
                  value={form.titular}
                  onChange={(e) => setForm(f => ({ ...f, titular: e.target.value }))}
                  placeholder="Nome do titular da conta"
                />
              </div>
              <div>
                <Label>Banco</Label>
                <Input
                  value={form.banco}
                  onChange={(e) => setForm(f => ({ ...f, banco: e.target.value }))}
                  placeholder="Ex: 001 - Banco do Brasil"
                />
              </div>
              <div>
                <Label>Tipo de Conta</Label>
                <Select value={form.tipo_conta} onValueChange={(v) => setForm(f => ({ ...f, tipo_conta: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                    <SelectItem value="pagamento">Pagamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Agência</Label>
                <Input
                  value={form.agencia}
                  onChange={(e) => setForm(f => ({ ...f, agencia: e.target.value }))}
                  placeholder="0001"
                />
              </div>
              <div>
                <Label>Conta</Label>
                <Input
                  value={form.conta}
                  onChange={(e) => setForm(f => ({ ...f, conta: e.target.value }))}
                  placeholder="12345-6"
                />
              </div>
              <div className="col-span-2">
                <Label>Chave PIX</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.pix}
                    onChange={(e) => setForm(f => ({ ...f, pix: e.target.value }))}
                    placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                    className="flex-1"
                  />
                  {form.pix && (
                    <Button type="button" size="icon" variant="outline" onClick={copyPix} title="Copiar PIX">
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
