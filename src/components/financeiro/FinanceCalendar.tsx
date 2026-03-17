import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, addMonths, subMonths, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/reportExport';

interface Recebivel {
  id: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: string;
  valor_frete: number;
  valor_liquido: number;
  valor_comissao: number;
  antecipado: boolean;
  valor_taxa_antecipacao?: number;
  entregas?: {
    codigo: string | null;
    cargas?: { codigo: string; descricao: string } | null;
    motoristas?: { nome_completo: string } | null;
  } | null;
  empresa_embarcadora?: { nome: string | null; nome_fantasia: string | null } | null;
  empresa_transportadora?: { nome: string | null; nome_fantasia: string | null } | null;
  empresa_embarcadora_id?: number | null;
}

interface FinanceCalendarProps {
  recebiveis: Recebivel[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  /** Which date field to use for dot placement */
  dateField?: 'data_vencimento' | 'data_pagamento';
  /** Show antecipação button */
  onAntecipar?: (r: Recebivel) => void;
  canAntecipar?: (r: Recebivel) => boolean;
  /** perspective: embarcador shows "a pagar", transportadora shows "a receber" */
  perspective?: 'embarcador' | 'transportadora';
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function FinanceCalendar({
  recebiveis,
  currentMonth,
  onMonthChange,
  dateField = 'data_vencimento',
  onAntecipar,
  canAntecipar,
  perspective = 'transportadora',
}: FinanceCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Build a map: dateString -> recebiveis[]
  const dayMap = useMemo(() => {
    const map: Record<string, Recebivel[]> = {};
    for (const r of recebiveis) {
      const dateStr = r[dateField];
      if (!dateStr) continue;
      const key = format(new Date(dateStr), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [recebiveis, dateField]);

  // Selected day items
  const selectedItems = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, 'yyyy-MM-dd');
    return dayMap[key] || [];
  }, [selectedDay, dayMap]);

  // Stats for the month
  const totalPendente = recebiveis.filter(r => r.status === 'pendente').reduce((s, r) => s + Number(perspective === 'embarcador' ? r.valor_frete : r.valor_liquido), 0);
  const totalPago = recebiveis.filter(r => r.status === 'pago').reduce((s, r) => s + Number(perspective === 'embarcador' ? r.valor_frete : r.valor_liquido), 0);
  const totalAntecipados = recebiveis.filter(r => r.antecipado).length;

  // Offset for the first day of the month
  const startDayOfWeek = getDay(monthStart);

  const getDotInfo = (day: Date) => {
    const key = format(day, 'yyyy-MM-dd');
    const items = dayMap[key];
    if (!items || items.length === 0) return null;
    const hasPago = items.some(r => r.status === 'pago');
    const hasPendente = items.some(r => r.status === 'pendente');
    const hasAntecipado = items.some(r => r.antecipado);
    const total = items.reduce((s, r) => s + Number(perspective === 'embarcador' ? r.valor_frete : r.valor_liquido), 0);
    return { count: items.length, hasPago, hasPendente, hasAntecipado, total };
  };

  const nomeEmpresa = (emp: { nome: string | null; nome_fantasia: string | null } | null | undefined) =>
    emp?.nome_fantasia || emp?.nome || '—';

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalPendente)}</p>
            <p className="text-[11px] text-muted-foreground">{perspective === 'embarcador' ? 'A Pagar' : 'A Receber'}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-chart-2">{formatCurrency(totalPago)}</p>
            <p className="text-[11px] text-muted-foreground">{perspective === 'embarcador' ? 'Pago' : 'Recebido'}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-chart-4">{totalAntecipados}</p>
            <p className="text-[11px] text-muted-foreground">Antecipados</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border overflow-hidden">
        <CardContent className="p-0">
          {/* Month header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMonthChange(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <p className="text-sm font-semibold capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </p>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMonthChange(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center py-2 text-[11px] font-medium text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {/* Empty cells for offset */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square border-b border-r border-border last:border-r-0" />
            ))}

            {daysInMonth.map((day, idx) => {
              const dot = getDotInfo(day);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const today = isToday(day);

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={cn(
                    'aspect-square relative flex flex-col items-center justify-center gap-0.5 border-b border-r border-border transition-colors hover:bg-muted/50',
                    isSelected && 'bg-primary/10 ring-1 ring-primary',
                    today && !isSelected && 'bg-accent/50',
                  )}
                >
                  <span className={cn(
                    'text-xs font-medium',
                    today && 'text-primary font-bold',
                    !today && 'text-foreground',
                  )}>
                    {format(day, 'd')}
                  </span>

                  {dot && (
                    <div className="flex items-center gap-0.5">
                      {dot.hasPendente && <span className="w-1.5 h-1.5 rounded-full bg-chart-4" />}
                      {dot.hasPago && <span className="w-1.5 h-1.5 rounded-full bg-chart-2" />}
                      {dot.hasAntecipado && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </div>
                  )}

                  {dot && dot.count > 0 && (
                    <span className="text-[9px] text-muted-foreground leading-none">
                      {dot.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-muted/20">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-chart-4" />
              Pendente
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-chart-2" />
              {perspective === 'embarcador' ? 'Pago' : 'Recebido'}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Antecipado
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected day details */}
      {selectedDay && (
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground">
                {format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
              </p>
              <Badge variant="outline" className="text-xs">
                {selectedItems.length} {selectedItems.length === 1 ? 'registro' : 'registros'}
              </Badge>
            </div>

            {selectedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro neste dia</p>
            ) : (
              <div className="space-y-2">
                {selectedItems.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{r.entregas?.codigo || '—'}</p>
                        {r.antecipado && (
                          <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">Antecipado</Badge>
                        )}
                        <Badge variant={r.status === 'pago' ? 'default' : 'secondary'} className={cn(
                          'text-[10px] px-1.5 py-0',
                          r.status === 'pago' && 'bg-chart-2 text-white',
                        )}>
                          {r.status === 'pago'
                            ? (perspective === 'embarcador' ? 'Pago' : 'Recebido')
                            : (perspective === 'embarcador' ? 'A Pagar' : 'Pendente')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {perspective === 'transportadora'
                          ? nomeEmpresa(r.empresa_embarcadora)
                          : nomeEmpresa(r.empresa_transportadora)}
                        {r.entregas?.cargas?.codigo && ` · ${r.entregas.cargas.codigo}`}
                      </p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-bold">
                        {formatCurrency(perspective === 'embarcador' ? r.valor_frete : r.valor_liquido)}
                      </p>
                      {r.antecipado && r.valor_taxa_antecipacao && Number(r.valor_taxa_antecipacao) > 0 && (
                        <p className="text-[10px] text-chart-4">taxa: {formatCurrency(Number(r.valor_taxa_antecipacao))}</p>
                      )}
                      {onAntecipar && canAntecipar?.(r) && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-chart-4 mt-1" onClick={() => onAntecipar(r)}>
                          <Zap className="w-3 h-3 mr-0.5" /> Antecipar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
