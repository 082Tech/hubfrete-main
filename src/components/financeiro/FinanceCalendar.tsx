import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Zap, DollarSign, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, addMonths, subMonths, isToday, isBefore, startOfDay } from 'date-fns';
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
  dateField?: 'data_vencimento' | 'data_pagamento';
  onAntecipar?: (r: Recebivel) => void;
  canAntecipar?: (r: Recebivel) => boolean;
  perspective?: 'embarcador' | 'transportadora';
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const PAGE_SIZE = 10;

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
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const today = startOfDay(new Date());

  const isEmbarcador = perspective === 'embarcador';

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

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

  const selectedItems = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, 'yyyy-MM-dd');
    return dayMap[key] || [];
  }, [selectedDay, dayMap]);

  // Reset page when day changes
  const handleSelectDay = (day: Date) => {
    const isSelected = selectedDay && isSameDay(day, selectedDay);
    setSelectedDay(isSelected ? null : day);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(selectedItems.length / PAGE_SIZE));
  const paginatedItems = selectedItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const startDayOfWeek = getDay(monthStart);

  const getDotInfo = (day: Date) => {
    const key = format(day, 'yyyy-MM-dd');
    const items = dayMap[key];
    if (!items || items.length === 0) return null;
    const hasPago = items.some(r => r.status === 'pago');
    const hasPendente = items.some(r => r.status === 'pendente');
    const hasAntecipado = !isEmbarcador && items.some(r => r.antecipado);
    const hasVencido = isEmbarcador && items.some(r => r.status === 'pendente' && r.data_vencimento && isBefore(new Date(r.data_vencimento), today));
    const total = items.reduce((s, r) => s + Number(isEmbarcador ? r.valor_frete : r.valor_liquido), 0);
    return { count: items.length, hasPago, hasPendente: hasPendente && !hasVencido, hasAntecipado, hasVencido, total };
  };

  const nomeEmpresa = (emp: { nome: string | null; nome_fantasia: string | null } | null | undefined) =>
    emp?.nome_fantasia || emp?.nome || '—';

  const renderDayDetail = () => {
    if (!selectedDay) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <DollarSign className="w-10 h-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">Selecione um dia no calendário para ver os detalhes</p>
        </div>
      );
    }

    const dayTotal = selectedItems.reduce((s, r) => s + Number(isEmbarcador ? r.valor_frete : r.valor_liquido), 0);

    return (
      <div className="p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-foreground">
            {format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
          </p>
          <Badge variant="outline" className="text-[10px]">
            {selectedItems.length} {selectedItems.length === 1 ? 'registro' : 'registros'}
          </Badge>
        </div>
        {selectedItems.length > 0 && (
          <p className="text-lg font-bold text-foreground mb-3">{formatCurrency(dayTotal)}</p>
        )}

        {selectedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro neste dia</p>
        ) : (
          <>
            <div className="space-y-2 flex-1 overflow-y-auto">
              {paginatedItems.map(r => (
                <div key={r.id} className="p-3 rounded-lg bg-muted/40 border border-border">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium truncate">{r.entregas?.codigo || '—'}</p>
                        <Badge variant={r.status === 'pago' ? 'default' : 'secondary'} className={cn(
                          'text-[9px] px-1 py-0',
                          r.status === 'pago' && 'bg-chart-2 text-white',
                          !isEmbarcador && r.antecipado && r.status !== 'pago' && 'bg-primary text-primary-foreground',
                          isEmbarcador && r.status === 'pendente' && r.data_vencimento && isBefore(new Date(r.data_vencimento), today) && 'bg-destructive text-destructive-foreground',
                        )}>
                          {r.status === 'pago'
                            ? (isEmbarcador ? 'Pago' : 'Recebido')
                            : (!isEmbarcador && r.antecipado)
                              ? 'Antecipado'
                              : (isEmbarcador && r.data_vencimento && isBefore(new Date(r.data_vencimento), today))
                                ? 'Vencido'
                                : (isEmbarcador ? 'A Pagar' : 'Pendente')}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {perspective === 'transportadora'
                          ? nomeEmpresa(r.empresa_embarcadora)
                          : nomeEmpresa(r.empresa_transportadora)}
                        {r.entregas?.cargas?.codigo && ` · ${r.entregas.cargas.codigo}`}
                      </p>
                    </div>
                    <div className="text-right ml-2 shrink-0 flex items-center gap-1.5">
                      <div>
                        <p className="text-sm font-bold">
                          {formatCurrency(isEmbarcador ? r.valor_frete : r.valor_liquido)}
                        </p>
                        {!isEmbarcador && r.antecipado && r.valor_taxa_antecipacao && Number(r.valor_taxa_antecipacao) > 0 && (
                          <p className="text-[10px] text-chart-4">taxa: {formatCurrency(Number(r.valor_taxa_antecipacao))}</p>
                        )}
                      </div>
                      {r.entregas?.cargas?.codigo && (
                        <button
                          onClick={() => {
                            const basePath = isEmbarcador ? '/embarcador/historico' : '/transportadora/historico';
                            navigate(`${basePath}?carga=${r.entregas.cargas.codigo}`);
                          }}
                          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="Ver detalhes da carga"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {onAntecipar && canAntecipar?.(r) && (
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-chart-4 mt-1.5 w-full justify-start" onClick={() => onAntecipar(r)}>
                      <Zap className="w-3 h-3 mr-0.5" /> Solicitar Antecipação
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, selectedItems.length)} de {selectedItems.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-[11px] text-muted-foreground px-2">
                    {page}/{totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-4">
        {/* Left: Calendar */}
        <Card className="border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMonthChange(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <p className="text-sm font-semibold capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </p>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMonthChange(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 border-b border-border">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center py-1.5 text-[11px] font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
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
                    onClick={() => handleSelectDay(day)}
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
                        {dot.hasVencido && <span className="w-1.5 h-1.5 rounded-full bg-destructive" />}
                        {dot.hasPendente && <span className="w-1.5 h-1.5 rounded-full bg-chart-4" />}
                        {dot.hasPago && <span className="w-1.5 h-1.5 rounded-full bg-chart-2" />}
                        {dot.hasAntecipado && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </div>
                    )}

                    {dot && dot.count > 0 && (
                      <span className="text-[8px] text-muted-foreground leading-none">
                        {dot.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-3 py-1.5 border-t border-border bg-muted/20">
              {isEmbarcador && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  Vencido
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-chart-4" />
                Pendente
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-chart-2" />
                {isEmbarcador ? 'Pago' : 'Recebido'}
              </div>
              {!isEmbarcador && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Antecipado
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Day details */}
        <Card className="border-border overflow-hidden max-h-[500px]">
          <CardContent className="p-0 h-full">
            {renderDayDetail()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
