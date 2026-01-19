import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Wrench, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OPCOES_NECESSIDADES = [
  { value: 'cinta', label: 'Cintas' },
  { value: 'lona', label: 'Lona' },
  { value: 'cantoneira', label: 'Cantoneiras' },
  { value: 'palete', label: 'Paletes' },
  { value: 'empilhadeira', label: 'Empilhadeira' },
  { value: 'guindaste', label: 'Guindaste' },
  { value: 'munck', label: 'Munck' },
  { value: 'talha', label: 'Talha' },
  { value: 'rampa', label: 'Rampa de acesso' },
  { value: 'doca', label: 'Doca niveladora' },
];

interface NecessidadesEspeciaisProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function NecessidadesEspeciais({ value, onChange }: NecessidadesEspeciaisProps) {
  const [customValue, setCustomValue] = useState('');

  const handleToggle = (item: string) => {
    if (value.includes(item)) {
      onChange(value.filter(v => v !== item));
    } else {
      onChange([...value, item]);
    }
  };

  const handleAddCustom = () => {
    if (customValue.trim() && !value.includes(customValue.trim().toLowerCase())) {
      onChange([...value, customValue.trim().toLowerCase()]);
      setCustomValue('');
    }
  };

  const handleRemoveCustom = (item: string) => {
    onChange(value.filter(v => v !== item));
  };

  // Get custom items (those not in predefined list)
  const customItems = value.filter(v => !OPCOES_NECESSIDADES.find(o => o.value === v));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wrench className="w-4 h-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Necessidades Especiais</Label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {OPCOES_NECESSIDADES.map((opcao) => (
          <div
            key={opcao.value}
            className="flex items-center space-x-2 p-2 rounded-md border border-border hover:bg-accent/50 transition-colors"
          >
            <Checkbox
              id={`opcao-${opcao.value}`}
              checked={value.includes(opcao.value)}
              onCheckedChange={(checked) => {
                if (checked === true) {
                  onChange([...value, opcao.value]);
                } else {
                  onChange(value.filter(v => v !== opcao.value));
                }
              }}
            />

            <Label
              htmlFor={`opcao-${opcao.value}`}
              className="font-normal text-sm cursor-pointer"
            >
              {opcao.label}
            </Label>
          </div>
        ))}
      </div>

      {/* Custom items */}
      {customItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {customItems.map(item => (
            <Badge key={item} variant="secondary" className="gap-1 pr-1">
              {item}
              <button
                type="button"
                onClick={() => handleRemoveCustom(item)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add custom */}
      <div className="flex gap-2">
        <Input
          placeholder="Adicionar outro..."
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustom())}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAddCustom}
          disabled={!customValue.trim()}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
