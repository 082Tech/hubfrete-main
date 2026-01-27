import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  SlidersHorizontal,
  X,
  MapPin,
  Package,
  Building2,
  Hash,
} from 'lucide-react';

export interface AdvancedSearchFilters {
  codigo: string;
  cidadeOrigem: string;
  estadoOrigem: string;
  cidadeDestino: string;
  estadoDestino: string;
  embarcador: string;
  destinatario: string;
  cnpjDestinatario: string;
}

const estadosBrasil = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const emptyFilters: AdvancedSearchFilters = {
  codigo: '',
  cidadeOrigem: '',
  estadoOrigem: '',
  cidadeDestino: '',
  estadoDestino: '',
  embarcador: '',
  destinatario: '',
  cnpjDestinatario: '',
};

interface AdvancedSearchPopoverProps {
  filters: AdvancedSearchFilters;
  onFiltersChange: (filters: AdvancedSearchFilters) => void;
}

export function AdvancedSearchPopover({ filters, onFiltersChange }: AdvancedSearchPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<AdvancedSearchFilters>(filters);

  // Sync local filters when external filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const activeFilterCount = Object.values(filters).filter(v => v.length > 0).length;

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleClear = () => {
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const handleRemoveFilter = (key: keyof AdvancedSearchFilters) => {
    const newFilters = { ...filters, [key]: '' };
    onFiltersChange(newFilters);
    setLocalFilters(newFilters);
  };

  const getFilterLabel = (key: keyof AdvancedSearchFilters, value: string): string => {
    const labels: Record<keyof AdvancedSearchFilters, string> = {
      codigo: 'Código',
      cidadeOrigem: 'Origem',
      estadoOrigem: 'UF Origem',
      cidadeDestino: 'Destino',
      estadoDestino: 'UF Destino',
      embarcador: 'Embarcador',
      destinatario: 'Destinatário',
      cnpjDestinatario: 'CNPJ',
    };
    return `${labels[key]}: ${value}`;
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      {/* Trigger Button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 h-10"
          >
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Busca avançada...</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[400px] p-4 bg-popover border-border" 
          align="start"
          sideOffset={8}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Search className="w-4 h-4" />
                Busca Avançada
              </h4>
              {activeFilterCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClear}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar tudo
                </Button>
              )}
            </div>

            {/* Código da Carga */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Hash className="w-3 h-3" />
                Código da Carga
              </Label>
              <Input
                placeholder="Ex: CRG-001"
                value={localFilters.codigo}
                onChange={(e) => setLocalFilters({ ...localFilters, codigo: e.target.value })}
                className="h-9"
              />
            </div>

            {/* Origem */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-chart-1" />
                Origem
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Input
                    placeholder="Cidade"
                    value={localFilters.cidadeOrigem}
                    onChange={(e) => setLocalFilters({ ...localFilters, cidadeOrigem: e.target.value })}
                    className="h-9"
                  />
                </div>
                <Select 
                  value={localFilters.estadoOrigem} 
                  onValueChange={(v) => setLocalFilters({ ...localFilters, estadoOrigem: v === 'all' ? '' : v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {estadosBrasil.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Destino */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-chart-2" />
                Destino
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Input
                    placeholder="Cidade"
                    value={localFilters.cidadeDestino}
                    onChange={(e) => setLocalFilters({ ...localFilters, cidadeDestino: e.target.value })}
                    className="h-9"
                  />
                </div>
                <Select 
                  value={localFilters.estadoDestino} 
                  onValueChange={(v) => setLocalFilters({ ...localFilters, estadoDestino: v === 'all' ? '' : v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {estadosBrasil.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Embarcador */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Building2 className="w-3 h-3" />
                Embarcador
              </Label>
              <Input
                placeholder="Nome do embarcador"
                value={localFilters.embarcador}
                onChange={(e) => setLocalFilters({ ...localFilters, embarcador: e.target.value })}
                className="h-9"
              />
            </div>

            {/* Destinatário */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Package className="w-3 h-3" />
                Destinatário
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Nome"
                  value={localFilters.destinatario}
                  onChange={(e) => setLocalFilters({ ...localFilters, destinatario: e.target.value })}
                  className="h-9"
                />
                <Input
                  placeholder="CNPJ"
                  value={localFilters.cnpjDestinatario}
                  onChange={(e) => setLocalFilters({ ...localFilters, cnpjDestinatario: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                size="sm" 
                onClick={handleApply}
                className="gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filters Badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(filters) as [keyof AdvancedSearchFilters, string][])
            .filter(([_, value]) => value.length > 0)
            .map(([key, value]) => (
              <Badge 
                key={key} 
                variant="secondary" 
                className="gap-1 pr-1 text-xs"
              >
                {getFilterLabel(key, value)}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => handleRemoveFilter(key)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
}

export { emptyFilters };
