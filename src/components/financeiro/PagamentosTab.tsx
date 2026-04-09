import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ChevronLeft, ChevronRight, AlertTriangle, Clock, CheckCircle,
  CreditCard, QrCode, FileText, Copy, Check, ExternalLink,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isBefore, isToday, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/reportExport';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PagamentosTabProps {
  empresaId: number;
}

export function PagamentosTab({ empresaId }: PagamentosTabProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [payDialog, setPayDialog] = useState(false);
  const [payMethod, setPayMethod] = useState<'pix' | 'boleto' | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const today = startOfDay(new Date());

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['embarcador-pagamentos', empresaId, monthStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financeiro_entregas')
        .select(`
          *,
          entregas!inner(codigo, carga_id,
            cargas(codigo, descricao),
            motoristas(nome_completo)
          ),
          empresa_transportadora:empresas!financeiro_entregas_empresa_transportadora_id_fkey(nome, nome_fantasia)
        `)
        .eq('empresa_embarcadora_id', empresaId)
        .gte('data_vencimento', monthStart.toISOString().slice(0, 10))
        .lte('data_vencimento', monthEnd.toISOString().slice(0, 10))
        .order('data_vencimento', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!empresaId,
  });

  const pendentes = useMemo(() => registros.filter(r => r.status === 'pendente'), [registros]);
  const pagos = useMemo(() => registros.filter(r => r.status === 'pago'), [registros]);

  const vencidos = useMemo(() =>
    pendentes.filter(r => r.data_vencimento && isBefore(new Date(r.data_vencimento), today)),
    [pendentes, today]
  );
  const aVencer = useMemo(() =>
    pendentes.filter(r => r.data_vencimento && !isBefore(new Date(r.data_vencimento), today)),
    [pendentes, today]
  );

  const totalVencidos = vencidos.reduce((s, r) => s + Number(r.valor_frete), 0);
  const totalAVencer = aVencer.reduce((s, r) => s + Number(r.valor_frete), 0);

  const selectedTotal = useMemo(() => {
    return pendentes.filter(r => selectedIds.has(r.id)).reduce((s, r) => s + Number(r.valor_frete), 0);
  }, [pendentes, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendentes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendentes.map(r => r.id)));
    }
  };

  const payMutation = useMutation({
    mutationFn: async () => {
      // Fictitious payment - just update status
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('financeiro_entregas')
        .update({
          status: 'pago',
          data_pagamento: new Date().toISOString().slice(0, 10),
          metodo_pagamento: payMethod,
        } as any)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['embarcador-pagamentos'] });
      queryClient.invalidateQueries({ queryKey: ['embarcador-financeiro'] });
      setShowConfirmation(true);
    },
    onError: () => toast.error('Erro ao processar pagamento'),
  });

  const handlePay = () => {
    if (selectedIds.size === 0) {
      toast.warning('Selecione pelo menos um pagamento');
      return;
    }
    setPayDialog(true);
    setPayMethod(null);
    setShowConfirmation(false);
    setCopiedPix(false);
  };

  const handleConfirmPayment = () => {
    payMutation.mutate();
  };

  const handleCloseDialog = () => {
    setPayDialog(false);
    setPayMethod(null);
    setShowConfirmation(false);
    setSelectedIds(new Set());
    setCopiedPix(false);
  };

  const fakePix = '00020126580014br.gov.bcb.pix0136hubfrete-pagamentos@hubfrete.com.br5204000053039865802BR5913HUBFRETE LTDA6008BRASILIA62070503***6304ABCD';
  const fakeBoleto = '23793.38128 60000.000003 00000.000408 1 ' + 
    (90000000 + Math.floor(selectedTotal * 100)).toString();

  const nomeTransportadora = (r: any) => r.empresa_transportadora?.nome_fantasia || r.empresa_transportadora?.nome || '—';

  const renderRow = (r: any, showCheckbox: boolean) => {
    const isVencido = r.data_vencimento && isBefore(new Date(r.data_vencimento), today);

    return (
      <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border hover:bg-muted/60 transition-colors">
        {showCheckbox && (
          <Checkbox
            checked={selectedIds.has(r.id)}
            onCheckedChange={() => toggleSelect(r.id)}
            className="shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium truncate">{r.entregas?.codigo || '—'}</p>
            {isVencido && r.status === 'pendente' && (
              <Badge variant="destructive" className="text-[9px] px-1 py-0">
                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Vencido
              </Badge>
            )}
            {!isVencido && r.status === 'pendente' && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0">A Pagar</Badge>
            )}
            {r.status === 'pago' && (
              <Badge className="text-[9px] px-1 py-0 bg-chart-2 text-white">Pago</Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {nomeTransportadora(r)}
            {r.entregas?.cargas?.codigo && ` · ${r.entregas.cargas.codigo}`}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Venc: {r.data_vencimento ? format(new Date(r.data_vencimento), 'dd/MM/yyyy') : '—'}
            {r.data_pagamento && ` · Pago: ${format(new Date(r.data_pagamento), 'dd/MM/yyyy')}`}
          </p>
        </div>
        <div className="text-right shrink-0 flex items-center gap-1.5">
          <p className="text-sm font-bold">{formatCurrency(Number(r.valor_frete))}</p>
          {r.entregas?.cargas?.codigo && (
            <button
              onClick={() => navigate(`/embarcador/cargas/historico?carga=${r.entregas.cargas.codigo}`)}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Ver detalhes da carga"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCurrentMonth(m => subMonths(m, 1)); setSelectedIds(new Set()); }}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <p className="text-sm font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </p>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCurrentMonth(m => addMonths(m, 1)); setSelectedIds(new Set()); }}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className={cn("border-border", vencidos.length > 0 && "border-destructive/30")}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-base font-bold text-destructive">{formatCurrency(totalVencidos)}</p>
              <p className="text-[10px] text-muted-foreground">{vencidos.length} vencido{vencidos.length !== 1 ? 's' : ''}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-chart-4/10 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-chart-4" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">{formatCurrency(totalAVencer)}</p>
              <p className="text-[10px] text-muted-foreground">{aVencer.length} a vencer</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selection bar */}
      {pendentes.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === pendentes.length && pendentes.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-xs text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} selecionado${selectedIds.size > 1 ? 's' : ''} · ${formatCurrency(selectedTotal)}` : 'Selecionar todos'}
            </span>
          </div>
          <Button
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={handlePay}
            className="gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Pagar {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
        </div>
      )}

      {/* Lists */}
      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Carregando...</div>
      ) : pendentes.length === 0 && pagos.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-chart-2/30" />
          <p className="text-sm text-muted-foreground">Nenhum registro neste mês</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Vencidos */}
          {vencidos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-destructive uppercase tracking-wider">Vencidos ({vencidos.length})</p>
              {vencidos.map(r => renderRow(r, true))}
            </div>
          )}

          {/* A vencer */}
          {aVencer.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-chart-4 uppercase tracking-wider">A Vencer ({aVencer.length})</p>
              {aVencer.map(r => renderRow(r, true))}
            </div>
          )}

          {/* Pagos */}
          {pagos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-chart-2 uppercase tracking-wider">Pagos ({pagos.length})</p>
              {pagos.map(r => renderRow(r, false))}
            </div>
          )}
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={payDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              {showConfirmation ? 'Pagamento Realizado' : 'Realizar Pagamento'}
            </DialogTitle>
          </DialogHeader>

          {showConfirmation ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-chart-2/10 mx-auto flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-chart-2" />
              </div>
              <p className="text-sm font-medium">Pagamento registrado com sucesso!</p>
              <p className="text-xs text-muted-foreground">
                {selectedIds.size} fatura{selectedIds.size > 1 ? 's' : ''} paga{selectedIds.size > 1 ? 's' : ''} · Total: {formatCurrency(selectedTotal)}
              </p>
              <Button className="w-full mt-4" onClick={handleCloseDialog}>Fechar</Button>
            </div>
          ) : !payMethod ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm font-medium">{selectedIds.size} fatura{selectedIds.size > 1 ? 's' : ''} selecionada{selectedIds.size > 1 ? 's' : ''}</p>
                <p className="text-lg font-bold text-primary mt-0.5">{formatCurrency(selectedTotal)}</p>
              </div>

              <p className="text-sm text-muted-foreground">Selecione a forma de pagamento:</p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPayMethod('pix')}
                  className="p-4 rounded-lg border-2 border-border hover:border-primary transition-colors flex flex-col items-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <QrCode className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">PIX</span>
                  <span className="text-[10px] text-muted-foreground">Pagamento instantâneo</span>
                </button>

                <button
                  onClick={() => setPayMethod('boleto')}
                  className="p-4 rounded-lg border-2 border-border hover:border-primary transition-colors flex flex-col items-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-chart-4/10 flex items-center justify-center group-hover:bg-chart-4/20 transition-colors">
                    <FileText className="w-5 h-5 text-chart-4" />
                  </div>
                  <span className="text-sm font-medium">Boleto</span>
                  <span className="text-[10px] text-muted-foreground">Compens. em 1-2 dias</span>
                </button>
              </div>
            </div>
          ) : payMethod === 'pix' ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">Valor total</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(selectedTotal)}</p>
              </div>

              <div className="border border-border rounded-lg p-4 text-center space-y-3">
                <div className="w-32 h-32 mx-auto bg-muted rounded-lg flex items-center justify-center border border-dashed border-muted-foreground/30">
                  <QrCode className="w-16 h-16 text-muted-foreground/40" />
                </div>
                <p className="text-[10px] text-muted-foreground">QR Code fictício — integração bancária em breve</p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Chave PIX copia e cola:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[10px] bg-muted p-2 rounded border border-border break-all leading-relaxed">
                    {fakePix.slice(0, 60)}...
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(fakePix);
                      setCopiedPix(true);
                      setTimeout(() => setCopiedPix(false), 2000);
                    }}
                  >
                    {copiedPix ? <Check className="w-3.5 h-3.5 text-chart-2" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setPayMethod(null)} className="flex-1">Voltar</Button>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={payMutation.isPending}
                  className="flex-1"
                >
                  {payMutation.isPending ? 'Processando...' : 'Confirmar Pagamento'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">Valor total</p>
                <p className="text-xl font-bold text-chart-4">{formatCurrency(selectedTotal)}</p>
              </div>

              <div className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-chart-4" />
                  <span className="text-sm font-medium">Boleto Bancário</span>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Linha digitável:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[10px] bg-muted p-2 rounded border border-border break-all font-mono">
                      {fakeBoleto}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(fakeBoleto);
                        toast.success('Linha digitável copiada!');
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">Boleto fictício — integração bancária em breve</p>
              </div>

              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setPayMethod(null)} className="flex-1">Voltar</Button>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={payMutation.isPending}
                  className="flex-1"
                >
                  {payMutation.isPending ? 'Processando...' : 'Confirmar Pagamento'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
