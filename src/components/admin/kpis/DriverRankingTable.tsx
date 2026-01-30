import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Minus, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DriverKPI {
  motorista_id: string;
  nome: string;
  foto_url: string | null;
  empresa_nome: string | null;
  entregas_finalizadas: number;
  entregas_atrasadas: number;
  km_rodado: number;
  taxa_atraso: number;
  tempo_medio_entrega: number; // in minutes
  custo_estimado: number;
}

interface DriverRankingTableProps {
  drivers: DriverKPI[];
  sortBy: 'entregas' | 'taxa_atraso' | 'km_rodado';
  isLoading?: boolean;
}

export function DriverRankingTable({
  drivers,
  sortBy,
  isLoading = false,
}: DriverRankingTableProps) {
  const sortedDrivers = useMemo(() => {
    const sorted = [...drivers];
    switch (sortBy) {
      case 'entregas':
        return sorted.sort((a, b) => b.entregas_finalizadas - a.entregas_finalizadas);
      case 'taxa_atraso':
        return sorted.sort((a, b) => a.taxa_atraso - b.taxa_atraso); // Lower is better
      case 'km_rodado':
        return sorted.sort((a, b) => b.km_rodado - a.km_rodado);
      default:
        return sorted;
    }
  }, [drivers, sortBy]);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-chart-4" />;
    if (index === 1) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (index === 2) return <Award className="w-5 h-5 text-chart-1" />;
    return <span className="w-5 h-5 text-center text-muted-foreground font-medium">{index + 1}</span>;
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  if (isLoading) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        Carregando ranking...
      </div>
    );
  }

  if (drivers.length === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground gap-2">
        <Truck className="w-12 h-12 text-muted-foreground/50" />
        <p>Nenhum dado de performance encontrado</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12">#</TableHead>
            <TableHead>Motorista</TableHead>
            <TableHead className="text-center">Entregas</TableHead>
            <TableHead className="text-center">Taxa Atraso</TableHead>
            <TableHead className="text-center">Km Rodado</TableHead>
            <TableHead className="text-center">Tempo Médio</TableHead>
            <TableHead className="text-right">Performance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedDrivers.slice(0, 10).map((driver, index) => {
            // Calculate performance score (simple formula: higher entregas, lower atraso = better)
            const performanceScore = Math.max(
              0,
              Math.min(100, (driver.entregas_finalizadas * 10) - (driver.taxa_atraso * 2))
            );

            return (
              <TableRow key={driver.motorista_id}>
                <TableCell className="text-center">{getRankIcon(index)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={driver.foto_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {driver.nome.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{driver.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {driver.empresa_nome || 'Autônomo'}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-foreground">
                      {driver.entregas_finalizadas}
                    </span>
                    {driver.entregas_atrasadas > 0 && (
                      <span className="text-xs text-destructive">
                        {driver.entregas_atrasadas} atrasadas
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={
                      driver.taxa_atraso <= 5
                        ? 'default'
                        : driver.taxa_atraso <= 15
                        ? 'secondary'
                        : 'destructive'
                    }
                    className={cn(
                      driver.taxa_atraso <= 5 && 'bg-chart-2 text-white'
                    )}
                  >
                    {driver.taxa_atraso.toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-medium">
                  {driver.km_rodado.toLocaleString('pt-BR')} km
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {formatTime(driver.tempo_medio_entrega)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Progress value={performanceScore} className="w-16 h-2" />
                    <span className="text-sm font-medium text-foreground w-8">
                      {Math.round(performanceScore)}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
