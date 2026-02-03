import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SlidersHorizontal, Calendar as CalendarIcon, X, RotateCcw } from 'lucide-react';

export interface AdvancedFilters {
  codigo?: string;
  motorista?: string;
  cidadeOrigem?: string;
  cidadeDestino?: string;
  destinatario?: string;
  embarcador?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface AdvancedFiltersPopoverProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  showMotorista?: boolean;
  showEmbarcador?: boolean;
  showDestinatario?: boolean;
  motoristas?: { id: string; nome: string }[];
}

export function AdvancedFiltersPopover({
  filters,
  onFiltersChange,
  showMotorista = true,
  showEmbarcador = false,
  showDestinatario = true,
  motoristas = [],
}: AdvancedFiltersPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [dateFromOpen, setDateFromOpen] = React.useState(false);
  const [dateToOpen, setDateToOpen] = React.useState(false);

  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined && v !== '').length;

  const updateFilter = <K extends keyof AdvancedFilters>(key: K, value: AdvancedFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value || undefined });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros Avançados
          {activeFiltersCount > 0 && (
            <span className="ml-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filtros Avançados</h4>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={clearFilters}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Código */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Código</Label>
            <Input
              placeholder="Ex: CRG-001 ou ENT-001"
              value={filters.codigo || ''}
              onChange={(e) => updateFilter('codigo', e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Motorista */}
          {showMotorista && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Motorista</Label>
              {motoristas.length > 0 ? (
                <Select
                  value={filters.motorista || '__all__'}
                  onValueChange={(value) => updateFilter('motorista', value === '__all__' ? undefined : value)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Selecione um motorista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {motoristas
                      .filter((m) => m.nome && m.nome.trim() !== '')
                      .map((m) => (
                        <SelectItem key={m.id} value={m.nome}>
                          {m.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Nome do motorista"
                  value={filters.motorista || ''}
                  onChange={(e) => updateFilter('motorista', e.target.value)}
                  className="h-8 text-sm"
                />
              )}
            </div>
          )}

          {/* Embarcador */}
          {showEmbarcador && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Embarcador</Label>
              <Input
                placeholder="Nome do embarcador"
                value={filters.embarcador || ''}
                onChange={(e) => updateFilter('embarcador', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          )}

          {/* Destinatário */}
          {showDestinatario && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Destinatário</Label>
              <Input
                placeholder="Nome do destinatário"
                value={filters.destinatario || ''}
                onChange={(e) => updateFilter('destinatario', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          )}

          {/* Cidade Origem */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cidade Origem</Label>
            <Input
              placeholder="Ex: São Paulo"
              value={filters.cidadeOrigem || ''}
              onChange={(e) => updateFilter('cidadeOrigem', e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Cidade Destino */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cidade Destino</Label>
            <Input
              placeholder="Ex: Rio de Janeiro"
              value={filters.cidadeDestino || ''}
              onChange={(e) => updateFilter('cidadeDestino', e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'w-full justify-start text-left font-normal h-8 text-xs',
                      !filters.dateFrom && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {filters.dateFrom ? format(filters.dateFrom, 'dd/MM/yy') : 'Início'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={(date) => {
                      updateFilter('dateFrom', date);
                      setDateFromOpen(false);
                    }}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'w-full justify-start text-left font-normal h-8 text-xs',
                      !filters.dateTo && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {filters.dateTo ? format(filters.dateTo, 'dd/MM/yy') : 'Fim'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={(date) => {
                      updateFilter('dateTo', date);
                      setDateToOpen(false);
                    }}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button
            className="w-full mt-2"
            size="sm"
            onClick={() => setOpen(false)}
          >
            Aplicar Filtros
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
