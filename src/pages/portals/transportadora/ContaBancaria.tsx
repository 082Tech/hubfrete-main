import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Landmark, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ContaBancaria() {
  const { empresa } = useUserContext();
  const [bankForm, setBankForm] = useState({ banco: '', agencia: '', conta: '', tipo_conta: 'corrente', pix: '', titular: '' });
  const [bankLoaded, setBankLoaded] = useState(false);

  useQuery({
    queryKey: ['empresa-dados-bancarios', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return null;
      const { data } = await supabase.from('empresas').select('dados_bancarios').eq('id', empresa.id).single();
      if (data?.dados_bancarios) {
        const db = data.dados_bancarios as any;
        setBankForm({ banco: db.banco || '', agencia: db.agencia || '', conta: db.conta || '', tipo_conta: db.tipo_conta || 'corrente', pix: db.pix || '', titular: db.titular || '' });
      }
      setBankLoaded(true);
      return data;
    },
    enabled: !!empresa?.id,
  });

  const saveBankMutation = useMutation({
    mutationFn: async () => {
      if (!empresa?.id) throw new Error('No empresa');
      const { error } = await supabase.from('empresas').update({ dados_bancarios: bankForm as any }).eq('id', empresa.id);
      if (error) throw error;
    },
    onSuccess: () => toast.success('Dados bancários salvos!'),
    onError: () => toast.error('Erro ao salvar dados bancários'),
  });

  return (
    <div className="h-full overflow-auto p-4 md:p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conta Bancária</h1>
          <p className="text-sm text-muted-foreground">Dados bancários para recebimento de fretes</p>
        </div>

        <Card className="border-border max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="w-5 h-5" /> Dados Bancários para Recebimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Titular da Conta</Label>
              <Input value={bankForm.titular} onChange={(e) => setBankForm(f => ({ ...f, titular: e.target.value }))} placeholder="Nome completo ou razão social" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Banco</Label>
                <Input value={bankForm.banco} onChange={(e) => setBankForm(f => ({ ...f, banco: e.target.value }))} placeholder="Ex: Bradesco" />
              </div>
              <div>
                <Label>Tipo de Conta</Label>
                <Select value={bankForm.tipo_conta} onValueChange={(v) => setBankForm(f => ({ ...f, tipo_conta: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Agência</Label>
                <Input value={bankForm.agencia} onChange={(e) => setBankForm(f => ({ ...f, agencia: e.target.value }))} placeholder="0001" />
              </div>
              <div>
                <Label>Conta</Label>
                <Input value={bankForm.conta} onChange={(e) => setBankForm(f => ({ ...f, conta: e.target.value }))} placeholder="12345-6" />
              </div>
            </div>
            <div>
              <Label>Chave PIX</Label>
              <Input value={bankForm.pix} onChange={(e) => setBankForm(f => ({ ...f, pix: e.target.value }))} placeholder="CPF, e-mail, celular ou chave aleatória" />
            </div>
            <Button className="w-full" onClick={() => saveBankMutation.mutate()} disabled={saveBankMutation.isPending}>
              <Save className="w-4 h-4 mr-2" /> {saveBankMutation.isPending ? 'Salvando...' : 'Salvar Dados Bancários'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
