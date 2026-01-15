import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, Container, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Tipos de veículos organizados por categoria
const VEICULOS_CONFIG = {
  pesados: {
    label: 'Pesados',
    items: [
      { value: 'carreta', label: 'Carreta' },
      { value: 'carreta_ls', label: 'Carreta LS' },
      { value: 'vanderleia', label: 'Vanderléia' },
      { value: 'bitrem', label: 'Bitrem' },
      { value: 'rodotrem', label: 'Rodotrem' },
    ],
  },
  medios: {
    label: 'Médios',
    items: [
      { value: 'truck', label: 'Truck' },
      { value: 'bitruck', label: 'Bitruck' },
    ],
  },
  leves: {
    label: 'Leves',
    items: [
      { value: 'toco', label: 'Toco' },
      { value: 'tres_quartos', label: '3/4' },
      { value: 'vuc', label: 'VUC' },
    ],
  },
};

// Tipos de carroceria organizados por categoria
const CARROCERIAS_CONFIG = {
  abertas: {
    label: 'Abertas',
    items: [
      { value: 'graneleiro', label: 'Graneleiro' },
      { value: 'grade_baixa', label: 'Grade Baixa' },
      { value: 'prancha', label: 'Prancha' },
      { value: 'cacamba', label: 'Caçamba' },
      { value: 'plataforma', label: 'Plataforma' },
    ],
  },
  fechadas: {
    label: 'Fechadas',
    items: [
      { value: 'sider', label: 'Sider' },
      { value: 'bau', label: 'Baú' },
      { value: 'bau_frigorifico', label: 'Baú Frigorífico' },
      { value: 'bau_refrigerado', label: 'Baú Refrigerado' },
    ],
  },
  especiais: {
    label: 'Especiais',
    items: [
      { value: 'silo', label: 'Silo' },
      { value: 'cegonheiro', label: 'Cegonheiro' },
      { value: 'gaiola', label: 'Gaiola' },
      { value: 'tanque', label: 'Tanque' },
      { value: 'bug_porta_container', label: 'Bug Porta Container' },
      { value: 'munk', label: 'Munk' },
      { value: 'apenas_cavalo', label: 'Apenas Cavalo' },
      { value: 'cavaqueira', label: 'Cavaqueira' },
      { value: 'hopper', label: 'Hopper' },
    ],
  },
};

// Get all vehicle values
const ALL_VEICULOS = Object.values(VEICULOS_CONFIG).flatMap(cat => cat.items.map(i => i.value));
const ALL_CARROCERIAS = Object.values(CARROCERIAS_CONFIG).flatMap(cat => cat.items.map(i => i.value));

interface VeiculoCarroceriaSelectProps {
  veiculosSelecionados: string[];
  carroceriasSelecionadas: string[];
  onVeiculosChange: (value: string[]) => void;
  onCarroceriasChange: (value: string[]) => void;
}

export function VeiculoCarroceriaSelect({
  veiculosSelecionados,
  carroceriasSelecionadas,
  onVeiculosChange,
  onCarroceriasChange,
}: VeiculoCarroceriaSelectProps) {
  const [veiculosOpen, setVeiculosOpen] = useState(true);
  const [carroceriasOpen, setCarroceriasOpen] = useState(true);

  // Check if all are selected
  const todosVeiculosSelecionados = ALL_VEICULOS.every(v => veiculosSelecionados.includes(v));
  const todasCarroceriasSelecionadas = ALL_CARROCERIAS.every(c => carroceriasSelecionadas.includes(c));

  const handleToggleVeiculo = (value: string) => {
    if (veiculosSelecionados.includes(value)) {
      onVeiculosChange(veiculosSelecionados.filter(v => v !== value));
    } else {
      onVeiculosChange([...veiculosSelecionados, value]);
    }
  };

  const handleToggleCarroceria = (value: string) => {
    if (carroceriasSelecionadas.includes(value)) {
      onCarroceriasChange(carroceriasSelecionadas.filter(c => c !== value));
    } else {
      onCarroceriasChange([...carroceriasSelecionadas, value]);
    }
  };

  const handleSelectAllVeiculos = () => {
    if (todosVeiculosSelecionados) {
      onVeiculosChange([]);
    } else {
      onVeiculosChange([...ALL_VEICULOS]);
    }
  };

  const handleSelectAllCarrocerias = () => {
    if (todasCarroceriasSelecionadas) {
      onCarroceriasChange([]);
    } else {
      onCarroceriasChange([...ALL_CARROCERIAS]);
    }
  };

  // Check if all in category are selected
  const isCategoryFullySelected = (items: { value: string }[], selected: string[]) => {
    return items.every(item => selected.includes(item.value));
  };

  const handleToggleCategory = (
    items: { value: string }[],
    selected: string[],
    onChange: (value: string[]) => void
  ) => {
    const allSelected = isCategoryFullySelected(items, selected);
    if (allSelected) {
      // Remove all from this category
      onChange(selected.filter(s => !items.find(i => i.value === s)));
    } else {
      // Add all from this category
      const newValues = [...selected];
      items.forEach(item => {
        if (!newValues.includes(item.value)) {
          newValues.push(item.value);
        }
      });
      onChange(newValues);
    }
  };

  return (
    <div className="space-y-6">
      {/* Veículos */}
      <Collapsible open={veiculosOpen} onOpenChange={setVeiculosOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto hover:bg-transparent">
              <Truck className="w-4 h-4 text-primary" />
              <Label className="text-sm font-medium cursor-pointer">Tipos de Veículo Aceitos</Label>
              {veiculosOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
          <Button
            type="button"
            variant={todosVeiculosSelecionados ? "default" : "outline"}
            size="sm"
            onClick={handleSelectAllVeiculos}
            className="gap-1.5 h-8"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {todosVeiculosSelecionados ? 'Todos Selecionados' : 'Selecionar Todos'}
          </Button>
        </div>

        <CollapsibleContent className="mt-3 space-y-4">
          {Object.entries(VEICULOS_CONFIG).map(([key, category]) => {
            const categorySelected = isCategoryFullySelected(category.items, veiculosSelecionados);
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={categorySelected}
                    onCheckedChange={() => handleToggleCategory(category.items, veiculosSelecionados, onVeiculosChange)}
                  />
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer"
                    onClick={() => handleToggleCategory(category.items, veiculosSelecionados, onVeiculosChange)}
                  >
                    {category.label}
                  </Label>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-6">
                  {category.items.map((item) => (
                    <div
                      key={item.value}
                      className={`flex items-center space-x-2 p-2 rounded-md border cursor-pointer transition-colors ${
                        veiculosSelecionados.includes(item.value)
                          ? 'bg-primary/10 border-primary/30'
                          : 'border-border hover:bg-accent/50'
                      }`}
                      onClick={() => handleToggleVeiculo(item.value)}
                    >
                      <Checkbox
                        checked={veiculosSelecionados.includes(item.value)}
                        onCheckedChange={() => handleToggleVeiculo(item.value)}
                        className="pointer-events-none"
                      />
                      <Label className="font-normal cursor-pointer text-sm">
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CollapsibleContent>

        {!veiculosOpen && veiculosSelecionados.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {todosVeiculosSelecionados ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Todos os veículos
              </Badge>
            ) : (
              veiculosSelecionados.slice(0, 5).map(v => {
                const item = ALL_VEICULOS.includes(v) 
                  ? Object.values(VEICULOS_CONFIG).flatMap(c => c.items).find(i => i.value === v)
                  : null;
                return item ? (
                  <Badge key={v} variant="secondary" className="text-xs">
                    {item.label}
                  </Badge>
                ) : null;
              })
            )}
            {!todosVeiculosSelecionados && veiculosSelecionados.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{veiculosSelecionados.length - 5}
              </Badge>
            )}
          </div>
        )}
      </Collapsible>

      {/* Carrocerias */}
      <Collapsible open={carroceriasOpen} onOpenChange={setCarroceriasOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto hover:bg-transparent">
              <Container className="w-4 h-4 text-primary" />
              <Label className="text-sm font-medium cursor-pointer">Tipos de Carroceria Aceitas</Label>
              {carroceriasOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
          <Button
            type="button"
            variant={todasCarroceriasSelecionadas ? "default" : "outline"}
            size="sm"
            onClick={handleSelectAllCarrocerias}
            className="gap-1.5 h-8"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {todasCarroceriasSelecionadas ? 'Todas Selecionadas' : 'Selecionar Todas'}
          </Button>
        </div>

        <CollapsibleContent className="mt-3 space-y-4">
          {Object.entries(CARROCERIAS_CONFIG).map(([key, category]) => {
            const categorySelected = isCategoryFullySelected(category.items, carroceriasSelecionadas);
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={categorySelected}
                    onCheckedChange={() => handleToggleCategory(category.items, carroceriasSelecionadas, onCarroceriasChange)}
                  />
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer"
                    onClick={() => handleToggleCategory(category.items, carroceriasSelecionadas, onCarroceriasChange)}
                  >
                    {category.label}
                  </Label>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-6">
                  {category.items.map((item) => (
                    <div
                      key={item.value}
                      className={`flex items-center space-x-2 p-2 rounded-md border cursor-pointer transition-colors ${
                        carroceriasSelecionadas.includes(item.value)
                          ? 'bg-primary/10 border-primary/30'
                          : 'border-border hover:bg-accent/50'
                      }`}
                      onClick={() => handleToggleCarroceria(item.value)}
                    >
                      <Checkbox
                        checked={carroceriasSelecionadas.includes(item.value)}
                        onCheckedChange={() => handleToggleCarroceria(item.value)}
                        className="pointer-events-none"
                      />
                      <Label className="font-normal cursor-pointer text-sm">
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CollapsibleContent>

        {!carroceriasOpen && carroceriasSelecionadas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {todasCarroceriasSelecionadas ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Todas as carrocerias
              </Badge>
            ) : (
              carroceriasSelecionadas.slice(0, 5).map(c => {
                const item = ALL_CARROCERIAS.includes(c)
                  ? Object.values(CARROCERIAS_CONFIG).flatMap(cat => cat.items).find(i => i.value === c)
                  : null;
                return item ? (
                  <Badge key={c} variant="secondary" className="text-xs">
                    {item.label}
                  </Badge>
                ) : null;
              })
            )}
            {!todasCarroceriasSelecionadas && carroceriasSelecionadas.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{carroceriasSelecionadas.length - 5}
              </Badge>
            )}
          </div>
        )}
      </Collapsible>
    </div>
  );
}

// Export constants for use in other components
export { VEICULOS_CONFIG, CARROCERIAS_CONFIG, ALL_VEICULOS, ALL_CARROCERIAS };
