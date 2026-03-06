import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserContext } from '@/hooks/useUserContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { WeightInput } from '@/components/ui/weight-input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Package, MapPin, Truck, Loader2, ClipboardList, DollarSign, Weight, Info, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { LocationData } from '@/components/maps/LocationPickerMap';
import type { Database } from '@/integrations/supabase/types';
import { RemetenteSection } from './RemetenteSection';
import { DestinoSection } from './DestinoSection';
import { NecessidadesEspeciais } from './NecessidadesEspeciais';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ResumoSection } from './ResumoSection';
import { VeiculoCarroceriaSelect } from './VeiculoCarroceriaSelect';
import { cn } from '@/lib/utils';

type TipoCarga = Database['public']['Enums']['tipo_carga'];

const tipoCargaOptions: { value: TipoCarga; label: string }[] = [
  { value: 'carga_seca', label: 'Carga Seca' },
  { value: 'granel_solido', label: 'Granel Sólido' },
  { value: 'granel_liquido', label: 'Granel Líquido' },
  { value: 'refrigerada', label: 'Refrigerada' },
  { value: 'congelada', label: 'Congelada' },
  { value: 'perigosa', label: 'Perigosa' },
  { value: 'viva', label: 'Carga Viva' },
  { value: 'indivisivel', label: 'Indivisível' },
  { value: 'container', label: 'Container' },
];

export const UNIDADES_PRECIFICACAO = [
  { value: 'UN', label: 'UN – Unidade' },
  { value: 'KG', label: 'KG – Quilograma' },
  { value: 'TON', label: 'TON – Tonelada' },
  { value: 'CX', label: 'CX – Caixa' },
  { value: 'PC', label: 'PC – Peça' },
  { value: 'PCT', label: 'PCT – Pacote' },
  { value: 'PAL', label: 'PAL – Pallet' },
  { value: 'SC', label: 'SC – Saco' },
  { value: 'LT', label: 'LT – Litro' },
  { value: 'M', label: 'M – Metro' },
  { value: 'M2', label: 'M² – Metro quadrado' },
  { value: 'M3', label: 'M³ – Metro cúbico' },
] as const;

const todayStr = () => new Date().toISOString().split('T')[0];
const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const formSchema = z.object({
  descricao: z.string().min(5, 'Descrição deve ter no mínimo 5 caracteres'),
  tipo: z.enum(['granel_solido', 'granel_liquido', 'carga_seca', 'refrigerada', 'congelada', 'perigosa', 'viva', 'indivisivel', 'container'] as const),
  numero_pedido: z.string().optional(),
  peso_kg: z.coerce.number().min(0.0001, 'Peso deve ser maior que 0'),
  volume_m3: z.coerce.number().optional(),
  quantidade_paletes: z.coerce.number().optional(),
  valor_mercadoria: z.coerce.number().optional(),
  unidade_precificacao: z.string().default('TON'),
  quantidade_precificacao: z.coerce.number().optional(),
  valor_unitario_precificacao: z.coerce.number().optional(),
  permite_fracionado: z.boolean().default(true),
  carga_fragil: z.boolean().default(false),
  carga_perigosa: z.boolean().default(false),
  carga_viva: z.boolean().default(false),
  empilhavel: z.boolean().default(true),
  requer_refrigeracao: z.boolean().default(false),
  temperatura_min: z.coerce.number().optional(),
  temperatura_max: z.coerce.number().optional(),
  numero_onu: z.string().optional(),
  data_coleta_de: z.string().min(1, 'Data de coleta é obrigatória'),
  data_coleta_ate: z.string().optional(),
  data_entrega_limite: z.string().optional(),
  expira_em: z.string().min(1, 'Data de expiração é obrigatória'),
  regras_carregamento: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2">
      <Icon className="w-4 h-4 text-primary" />
      <h3 className="font-semibold text-sm">{title}</h3>
    </div>
  );
}

// ─── Tab definitions ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'dados', label: 'Dados', icon: Package },
  { id: 'peso', label: 'Peso', icon: Weight },
  { id: 'preco', label: 'Preço', icon: DollarSign },
  { id: 'requisitos', label: 'Requisitos', icon: ClipboardList },
  { id: 'origem', label: 'Origem', icon: MapPin },
  { id: 'destino', label: 'Destino', icon: Truck },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface NovaCargaDialogProps {
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export function NovaCargaDialog({ onSuccess, children }: NovaCargaDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('dados');
  const { filialAtiva, empresa, userType } = useUserContext();

  const [showExitDialog, setShowExitDialog] = useState(false);

  const initialLocationData: LocationData = {
    latitude: 0, longitude: 0, cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', contato_nome: '', contato_telefone: '',
  };

  const [necessidadesEspeciais, setNecessidadesEspeciais] = useState<string[]>([]);
  const [pesoMinimoFracionado, setPesoMinimoFracionado] = useState<number | null>(null);
  const [veiculosSelecionados, setVeiculosSelecionados] = useState<string[]>([]);
  const [carroceriasSelecionadas, setCarroceriasSelecionadas] = useState<string[]>([]);
  const [origemData, setOrigemData] = useState<LocationData>(initialLocationData);
  const [destinoData, setDestinoData] = useState<LocationData>(initialLocationData);

  const resetDialogState = () => {
    form.reset();
    setNecessidadesEspeciais([]);
    setPesoMinimoFracionado(null);
    setVeiculosSelecionados([]);
    setCarroceriasSelecionadas([]);
    setOrigemData(initialLocationData);
    setDestinoData(initialLocationData);
    setActiveTab('dados');
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descricao: '', tipo: 'carga_seca', peso_kg: 0, unidade_precificacao: 'TON',
      quantidade_precificacao: undefined, valor_unitario_precificacao: undefined,
      permite_fracionado: true, carga_fragil: false, carga_perigosa: false, carga_viva: false,
      empilhavel: true, requer_refrigeracao: false, regras_carregamento: '', expira_em: addDays(30), numero_pedido: '',
    },
  });

  const pesoKg = form.watch('peso_kg');
  const quantidadePrec = form.watch('quantidade_precificacao');
  const valorUnitarioPrec = form.watch('valor_unitario_precificacao');
  const unidadePrec = form.watch('unidade_precificacao');
  const requerRefrigeracao = form.watch('requer_refrigeracao');
  const cargaPerigosa = form.watch('carga_perigosa');

  const isWeightUnit = unidadePrec === 'KG' || unidadePrec === 'TON';

  useEffect(() => {
    if (isWeightUnit && pesoKg > 0) {
      const val = unidadePrec === 'TON' ? Math.round((pesoKg / 1000) * 10000) / 10000 : pesoKg;
      form.setValue('quantidade_precificacao', val);
    }
  }, [pesoKg, unidadePrec, isWeightUnit, form]);

  const freteTotal = (quantidadePrec ?? 0) > 0 && (valorUnitarioPrec ?? 0) > 0
    ? Math.round((quantidadePrec ?? 0) * (valorUnitarioPrec ?? 0) * 100) / 100
    : 0;

  const validateLocations = (): boolean => {
    if (!origemData.cidade || !origemData.logradouro) {
      toast.error('Verifique os dados do remetente');
      return false;
    }
    if (!destinoData.cidade || !destinoData.logradouro) {
      toast.error('Verifique os dados do destinatário');
      return false;
    }
    return true;
  };

  // ─── Tab navigation ────────────────────────────────────────────────────────
  const currentTabIndex = TABS.findIndex((t) => t.id === activeTab);
  const isLastTab = currentTabIndex === TABS.length - 1;
  const isFirstTab = currentTabIndex === 0;

  const validateCurrentTab = async (): Promise<boolean> => {
    switch (activeTab) {
      case 'dados': {
        const result = await form.trigger(['descricao', 'tipo', 'data_coleta_de', 'expira_em']);
        if (!result) toast.error('Preencha os campos obrigatórios desta etapa');
        return result;
      }
      case 'peso': {
        const result = await form.trigger(['peso_kg']);
        if (!result) toast.error('Peso é obrigatório');
        return result;
      }
      case 'preco':
        return true;
      case 'requisitos':
        return true;
      case 'origem': {
        if (!origemData.cidade || !origemData.logradouro) {
          toast.error('Verifique os dados do remetente');
          return false;
        }
        return true;
      }
      case 'destino':
        return validateLocations();
      default:
        return true;
    }
  };

  const goNext = async () => {
    const valid = await validateCurrentTab();
    if (!valid) return;
    if (!isLastTab) {
      setActiveTab(TABS[currentTabIndex + 1].id);
    }
  };

  const goPrev = () => {
    if (!isFirstTab) {
      setActiveTab(TABS[currentTabIndex - 1].id);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (userType !== 'embarcador') {
      toast.error('Somente embarcadores podem publicar cargas.');
      return;
    }
    if (!empresa?.id) {
      toast.error('Nenhuma empresa selecionada. Faça login novamente.');
      return;
    }
    if (!validateLocations()) return;

    const capturedOrigemData = { ...origemData };
    const capturedDestinoData = { ...destinoData };
    const capturedNecessidades = [...necessidadesEspeciais];
    const capturedPesoMinimo = pesoMinimoFracionado;
    const capturedVeiculos = [...veiculosSelecionados];
    const capturedCarrocerias = [...carroceriasSelecionadas];
    const capturedFilialId = filialAtiva?.id || null;
    const capturedEmpresaId = empresa.id;

    resetDialogState();
    setOpen(false);
    toast.loading('Carga sendo criada, aguarde...', { id: 'creating-carga' });

    createCargaInBackground(values, capturedOrigemData, capturedDestinoData, capturedNecessidades, capturedPesoMinimo, capturedVeiculos, capturedCarrocerias, capturedFilialId, capturedEmpresaId);
  };

  const createCargaInBackground = async (
    values: FormValues, origemD: LocationData, destinoD: LocationData,
    necessidades: string[], pesoMinimo: number | null,
    veiculos: string[], carrocerias: string[],
    filialId: number | null, empresaId: number,
  ) => {
    try {
      const { data: carga, error: cargaError } = await supabase
        .from('cargas')
        .insert({
          empresa_id: empresaId, filial_id: filialId,
          descricao: values.descricao, tipo: values.tipo,
          peso_kg: values.peso_kg, peso_disponivel_kg: values.peso_kg,
          volume_m3: values.volume_m3 || null, quantidade_paletes: values.quantidade_paletes || null,
          valor_mercadoria: values.valor_mercadoria || null,
          unidade_precificacao: values.unidade_precificacao || 'TON',
          quantidade_precificacao: values.quantidade_precificacao || null,
          valor_unitario_precificacao: values.valor_unitario_precificacao || null,
          tipo_precificacao: 'por_tonelada',
          valor_frete_tonelada: freteTotal > 0 ? freteTotal : null,
          permite_fracionado: values.permite_fracionado,
          peso_minimo_fracionado_kg: values.permite_fracionado ? pesoMinimo : null,
          carga_fragil: values.carga_fragil, carga_perigosa: values.carga_perigosa,
          carga_viva: values.carga_viva, empilhavel: values.empilhavel,
          requer_refrigeracao: values.requer_refrigeracao,
          temperatura_min: values.temperatura_min || null, temperatura_max: values.temperatura_max || null,
          numero_onu: values.numero_onu || null,
          data_coleta_de: values.data_coleta_de ? `${values.data_coleta_de}T12:00:00` : values.data_coleta_de,
          data_coleta_ate: values.data_coleta_ate ? `${values.data_coleta_ate}T12:00:00` : null,
          data_entrega_limite: values.data_entrega_limite ? `${values.data_entrega_limite}T12:00:00` : null,
          expira_em: `${values.expira_em}T23:59:59`,
          status: 'publicada', codigo: null as unknown as string,
          numero_pedido: values.numero_pedido || null,
          necessidades_especiais: necessidades,
          regras_carregamento: values.regras_carregamento || null,
          nota_fiscal_url: null,
          veiculo_requisitos: { tipos_veiculo: veiculos, tipos_carroceria: carrocerias },
          remetente_razao_social: origemD.razao_social || null,
          remetente_nome_fantasia: origemD.razao_social || null,
          remetente_cnpj: origemD.cnpj || null,
          remetente_contato_nome: origemD.contato_nome || null,
          remetente_contato_telefone: origemD.contato_telefone || null,
          destinatario_razao_social: destinoD.razao_social || null,
          destinatario_nome_fantasia: destinoD.razao_social || null,
          destinatario_cnpj: destinoD.cnpj || null,
          destinatario_contato_nome: destinoD.contato_nome || null,
          destinatario_contato_telefone: destinoD.contato_telefone || null,
        }).select().single();

      if (cargaError) { toast.error('Erro ao criar carga: ' + cargaError.message, { id: 'creating-carga' }); return; }

      const { data: origemEndereco, error: origemError } = await supabase
        .from('enderecos_carga')
        .insert({
          carga_id: carga.id, tipo: 'origem', cep: origemD.cep, logradouro: origemD.logradouro,
          numero: origemD.numero || null, complemento: origemD.complemento || null,
          bairro: origemD.bairro || null, cidade: origemD.cidade, estado: origemD.estado,
          contato_nome: origemD.contato_nome || null, contato_telefone: origemD.contato_telefone || null,
          latitude: origemD.latitude || null, longitude: origemD.longitude || null,
        }).select('id').single();

      if (origemError || !origemEndereco) { toast.error('Erro ao criar endereço de origem', { id: 'creating-carga' }); return; }

      const { data: destinoEndereco, error: destinoError } = await supabase
        .from('enderecos_carga')
        .insert({
          carga_id: carga.id, tipo: 'destino', cep: destinoD.cep, logradouro: destinoD.logradouro,
          numero: destinoD.numero || null, complemento: destinoD.complemento || null,
          bairro: destinoD.bairro || null, cidade: destinoD.cidade, estado: destinoD.estado,
          contato_nome: destinoD.contato_nome || null, contato_telefone: destinoD.contato_telefone || null,
          latitude: destinoD.latitude || null, longitude: destinoD.longitude || null,
        }).select('id').single();

      if (destinoError || !destinoEndereco) { toast.error('Erro ao criar endereço de destino', { id: 'creating-carga' }); return; }

      await supabase.from('cargas').update({
        endereco_origem_id: origemEndereco.id, endereco_destino_id: destinoEndereco.id,
      }).eq('id', carga.id);

      const { data: cargaFinal } = await supabase.from('cargas').select('codigo').eq('id', carga.id).single();
      toast.success(`Carga criada com sucesso! Código: ${cargaFinal?.codigo || carga.id.slice(0, 8).toUpperCase()}`, { id: 'creating-carga' });
      onSuccess?.();
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao criar carga', { id: 'creating-carga' });
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setShowExitDialog(true);
      return;
    }
    setOpen(nextOpen);
  };

  const confirmClose = () => {
    setShowExitDialog(false);
    resetDialogState();
    setOpen(false);
  };

  // ─── Render tab content ────────────────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dados':
        return (
          <div className="space-y-4">
            <FormField control={form.control} name="descricao" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição da Carga *</FormLabel>
                <FormControl><Textarea placeholder="Descreva a carga (ex: Minério de ferro - Lote A)" className="min-h-[60px]" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-3 gap-3">
              <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent className="bg-popover border-border">
                      {tipoCargaOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="numero_pedido" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nº Pedido</FormLabel>
                  <FormControl><Input placeholder="Opcional" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="valor_mercadoria" render={({ field }) => (
                <FormItem><FormLabel>Valor Mercadoria</FormLabel><FormControl><CurrencyInput placeholder="0,00" value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField control={form.control} name="data_coleta_de" render={({ field }) => (
                <FormItem><FormLabel>Coleta Em *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="data_coleta_ate" render={({ field }) => (
                <FormItem><FormLabel>Coleta Até</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="data_entrega_limite" render={({ field }) => (
                <FormItem><FormLabel>Entrega Limite</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="volume_m3" render={({ field }) => (
                <FormItem><FormLabel>Volume (m³)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="expira_em" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiração *</FormLabel>
                  <FormControl><Input type="date" min={todayStr()} max={addDays(365)} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>
        );

      case 'peso':
        return (
          <div className="space-y-5">
            <Alert className="border-primary/20 bg-primary/5">
              <Weight className="w-4 h-4 text-primary" />
              <AlertDescription className="text-xs leading-relaxed">
                <strong>Por que o peso é essencial?</strong> Nosso sistema utiliza o peso para validar automaticamente a compatibilidade com a capacidade física das carrocerias dos motoristas no momento do aceite. Sem peso, não é possível garantir que o veículo suporta a carga — é a base de toda a operação logística.
              </AlertDescription>
            </Alert>
            <FormField control={form.control} name="peso_kg" render={({ field }) => (
              <FormItem>
                <FormLabel>Peso Total da Carga (kg) *</FormLabel>
                <FormControl><WeightInput placeholder="Ex: 25.000" value={field.value} onValueChange={field.onChange} /></FormControl>
                {pesoKg >= 1000 && <p className="text-xs text-muted-foreground">≈ {parseFloat((pesoKg / 1000).toFixed(4))} toneladas</p>}
                <FormMessage />
              </FormItem>
            )} />
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <FormField control={form.control} name="permite_fracionado" render={({ field }) => (
                <FormItem className="flex items-start space-x-3 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" /></FormControl>
                  <div className="space-y-1">
                    <FormLabel className="font-medium text-sm">Permitir transporte fracionado (LTL)</FormLabel>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ao ativar, múltiplos motoristas podem aceitar frações do peso total, respeitando o limite mínimo definido abaixo e a capacidade do veículo.
                    </p>
                  </div>
                </FormItem>
              )} />
              {form.watch('permite_fracionado') && (
                <div className="ml-7 pt-1">
                  <Label className="text-sm">Peso Mínimo por Fração (kg)</Label>
                  <WeightInput placeholder="Ex: 5.000" className="mt-1.5 max-w-[260px]" value={pesoMinimoFracionado || undefined} onValueChange={(v) => setPesoMinimoFracionado(v || null)} />
                  <p className="text-[11px] text-muted-foreground mt-1">Cada motorista deve aceitar pelo menos este peso.</p>
                </div>
              )}
            </div>
            <FormField control={form.control} name="quantidade_paletes" render={({ field }) => (
              <FormItem>
                <FormLabel>Qtd. Paletes</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" className="max-w-[200px]" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        );

      case 'preco':
        return (
          <div className="space-y-4">
            <FormField control={form.control} name="unidade_precificacao" render={({ field }) => (
              <FormItem>
                <FormLabel>Unidade de Precificação *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent className="bg-popover border-border">
                    {UNIDADES_PRECIFICACAO.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="quantidade_precificacao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade ({unidadePrec})</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" placeholder="0" readOnly={isWeightUnit} className={isWeightUnit ? 'bg-muted' : ''} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                  </FormControl>
                  {isWeightUnit && <p className="text-xs text-muted-foreground">Preenchido pelo peso</p>}
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="valor_unitario_precificacao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (R$/{unidadePrec})</FormLabel>
                  <FormControl><CurrencyInput placeholder="0,00" value={field.value} onValueChange={field.onChange} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            {freteTotal > 0 && (
              <div className="p-3 rounded-lg border bg-muted/30 space-y-0.5">
                <Label className="text-xs text-muted-foreground">Frete Total Estimado</Label>
                <p className="text-xl font-bold text-primary">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(freteTotal)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {quantidadePrec} {unidadePrec} × R$ {(valorUnitarioPrec ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/{unidadePrec}
                </p>
              </div>
            )}
          </div>
        );

      case 'requisitos':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Características Especiais</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(['carga_fragil', 'carga_perigosa', 'carga_viva', 'empilhavel', 'requer_refrigeracao'] as const).map((name) => {
                  const labels: Record<string, string> = {
                    carga_fragil: 'Frágil', carga_perigosa: 'Perigosa', carga_viva: 'Carga Viva',
                    empilhavel: 'Empilhável', requer_refrigeracao: 'Refrigeração',
                  };
                  return (
                    <FormField key={name} control={form.control} name={name} render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="font-normal text-sm">{labels[name]}</FormLabel>
                      </FormItem>
                    )} />
                  );
                })}
              </div>
            </div>
            {requerRefrigeracao && (
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="temperatura_min" render={({ field }) => (
                  <FormItem><FormLabel>Temp. Mín (°C)</FormLabel><FormControl><Input type="number" placeholder="-18" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="temperatura_max" render={({ field }) => (
                  <FormItem><FormLabel>Temp. Máx (°C)</FormLabel><FormControl><Input type="number" placeholder="4" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            )}
            {cargaPerigosa && (
              <FormField control={form.control} name="numero_onu" render={({ field }) => (
                <FormItem><FormLabel>Número ONU</FormLabel><FormControl><Input placeholder="Ex: UN1203" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            )}
            <VeiculoCarroceriaSelect
              veiculosSelecionados={veiculosSelecionados} carroceriasSelecionadas={carroceriasSelecionadas}
              onVeiculosChange={setVeiculosSelecionados} onCarroceriasChange={setCarroceriasSelecionadas}
            />
            <NecessidadesEspeciais value={necessidadesEspeciais} onChange={setNecessidadesEspeciais} />
            <FormField control={form.control} name="regras_carregamento" render={({ field }) => (
              <FormItem>
                <FormLabel>Regras de Carregamento</FormLabel>
                <FormControl><Textarea placeholder="Instruções especiais..." className="min-h-[60px]" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        );

      case 'origem':
        return (
          <RemetenteSection initialData={origemData} onLocationChange={setOrigemData} />
        );

      case 'destino':
        return (
          <DestinoSection initialData={destinoData} onLocationChange={setDestinoData} />
        );
    }
  };

  return (
    <>
    <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deseja sair?</AlertDialogTitle>
          <AlertDialogDescription>
            Os dados preenchidos serão perdidos. Deseja voltar ou continuar criando a oferta de carga?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continuar criando</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmClose}>
            Sair sem salvar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Oferta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] max-h-[90vh] p-0 flex flex-col overflow-hidden" hideCloseButton>
        {/* 2-column layout — no separate header */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr,360px]">
          {/* Left: Form */}
          <div className="flex flex-col overflow-hidden">
            {/* Title + Step indicators merged */}
            <div className="flex items-center gap-3 px-5 py-3 bg-card shrink-0 overflow-x-auto border-b">
              <DialogHeader className="space-y-0 shrink-0">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Package className="w-4 h-4 text-primary" />
                  Nova Oferta
                </DialogTitle>
              </DialogHeader>
              <div className="h-5 w-px bg-border shrink-0" />
              <div className="flex items-center gap-1">
                {TABS.map((tab, i) => {
                  const Icon = tab.icon;
                  const isActive = tab.id === activeTab;
                  const isPast = i < currentTabIndex;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        if (i <= currentTabIndex) setActiveTab(tab.id);
                      }}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                        isActive && 'bg-primary text-primary-foreground shadow-sm',
                        isPast && !isActive && 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20',
                        !isActive && !isPast && 'text-muted-foreground cursor-default',
                      )}
                    >
                      {isPast && !isActive ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="max-w-3xl p-5">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="[&_input]:bg-background [&_textarea]:bg-background [&_select]:bg-background [&_[role=combobox]]:bg-background">
                    {renderTabContent()}
                  </form>
                </Form>
              </div>
            </ScrollArea>

            {/* Fixed footer */}
            <div className="border-t bg-card px-5 py-2.5 flex items-center justify-between gap-2 shrink-0">
              <div>
                {!isFirstTab && (
                  <Button type="button" variant="outline" size="sm" onClick={goPrev} disabled={isLoading}>
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Voltar
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowExitDialog(true)} disabled={isLoading}>
                  Cancelar
                </Button>
                {isLastTab ? (
                  <Button size="sm" onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>
                    {isLoading ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin" />Salvando...</>) : (<><Package className="w-4 h-4 mr-1" />Criar Oferta</>)}
                  </Button>
                ) : (
                  <Button type="button" size="sm" onClick={goNext}>
                    Próximo
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Right: Live Summary (hidden on mobile) */}
          <div className="hidden lg:flex flex-col border-l bg-muted/20 overflow-hidden">
            <div className="px-4 py-3 border-b bg-card flex items-center min-h-[49px]">
              <h2 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Resumo</h2>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3">
                <ResumoSection
                  origemData={origemData}
                  destinoData={destinoData}
                  cargaData={{
                    descricao: form.watch('descricao'),
                    tipo: form.watch('tipo'),
                    peso_kg: form.watch('peso_kg'),
                    volume_m3: form.watch('volume_m3'),
                    valor_mercadoria: form.watch('valor_mercadoria'),
                    unidade_precificacao: form.watch('unidade_precificacao'),
                    quantidade_precificacao: form.watch('quantidade_precificacao'),
                    valor_unitario_precificacao: form.watch('valor_unitario_precificacao'),
                    data_coleta_de: form.watch('data_coleta_de'),
                    data_coleta_ate: form.watch('data_coleta_ate'),
                    data_entrega_limite: form.watch('data_entrega_limite'),
                    carga_fragil: form.watch('carga_fragil'),
                    carga_perigosa: form.watch('carga_perigosa'),
                    carga_viva: form.watch('carga_viva'),
                    empilhavel: form.watch('empilhavel'),
                    requer_refrigeracao: form.watch('requer_refrigeracao'),
                    temperatura_min: form.watch('temperatura_min'),
                    temperatura_max: form.watch('temperatura_max'),
                    numero_onu: form.watch('numero_onu'),
                    regras_carregamento: form.watch('regras_carregamento'),
                  }}
                  necessidadesEspeciais={necessidadesEspeciais}
                  notaFiscalUrl={null}
                  veiculosSelecionados={veiculosSelecionados}
                  carroceriasSelecionadas={carroceriasSelecionadas}
                />
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
