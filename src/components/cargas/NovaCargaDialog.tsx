import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserContext } from '@/hooks/useUserContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, MapPin, Truck, Loader2, ClipboardList, Eye, DollarSign, Info } from 'lucide-react';
import type { LocationData } from '@/components/maps/LocationPickerMap';
import type { Database } from '@/integrations/supabase/types';
import { RemetenteSection } from './RemetenteSection';
import { DestinoSection } from './DestinoSection';
import { NecessidadesEspeciais } from './NecessidadesEspeciais';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { ResumoSection } from './ResumoSection';
import { VeiculoCarroceriaSelect, ALL_VEICULOS, ALL_CARROCERIAS } from './VeiculoCarroceriaSelect';

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

const formSchema = z.object({
  // Dados da carga
  descricao: z.string().min(5, 'Descrição deve ter no mínimo 5 caracteres'),
  tipo: z.enum(['granel_solido', 'granel_liquido', 'carga_seca', 'refrigerada', 'congelada', 'perigosa', 'viva', 'indivisivel', 'container'] as const),
  peso_kg: z.coerce.number().min(1, 'Peso deve ser maior que 0'),
  volume_m3: z.coerce.number().optional(),
  quantidade_paletes: z.coerce.number().optional(),
  valor_mercadoria: z.coerce.number().optional(),
  valor_frete_tonelada: z.coerce.number().min(0),
  permite_fracionado: z.boolean().default(true),

  // Características especiais
  carga_fragil: z.boolean().default(false),
  carga_perigosa: z.boolean().default(false),
  carga_viva: z.boolean().default(false),
  empilhavel: z.boolean().default(true),
  requer_refrigeracao: z.boolean().default(false),
  temperatura_min: z.coerce.number().optional(),
  temperatura_max: z.coerce.number().optional(),
  numero_onu: z.string().optional(),

  // Datas
  data_coleta_de: z.string().min(1, 'Data de coleta é obrigatória'),
  data_coleta_ate: z.string().optional(),
  data_entrega_limite: z.string().optional(),

  // Regras de carregamento
  regras_carregamento: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NovaCargaDialogProps {
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export function NovaCargaDialog({ onSuccess, children }: NovaCargaDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('carga');
  const { filialAtiva } = useUserContext();

  const initialLocationData: LocationData = {
    latitude: 0,
    longitude: 0,
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    contato_nome: '',
    contato_telefone: '',
  };

  // Additional state for new fields
  const [necessidadesEspeciais, setNecessidadesEspeciais] = useState<string[]>([]);
  const [pesoMinimoFracionado, setPesoMinimoFracionado] = useState<number | null>(null);

  // Vehicle and body type requirements - start empty (deselected)
  const [veiculosSelecionados, setVeiculosSelecionados] = useState<string[]>([]);
  const [carroceriasSelecionadas, setCarroceriasSelecionadas] = useState<string[]>([]);

  // Location data for origin and destination
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
    setActiveTab('carga');
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descricao: '',
      tipo: 'carga_seca',
      peso_kg: 0,
      valor_frete_tonelada: 0,
      permite_fracionado: true,
      carga_fragil: false,
      carga_perigosa: false,
      carga_viva: false,
      empilhavel: true,
      requer_refrigeracao: false,
      regras_carregamento: '',
    },
  });

  const pesoKg = form.watch('peso_kg');
  const valorFreteTonelada = form.watch('valor_frete_tonelada');

  // Calcular preview do frete total
  const freteTotal = pesoKg && valorFreteTonelada ? (pesoKg / 1000) * valorFreteTonelada : 0;

  const requerRefrigeracao = form.watch('requer_refrigeracao');
  const cargaPerigosa = form.watch('carga_perigosa');

  const validateLocations = (): boolean => {
    if (!origemData.cidade || !origemData.logradouro) {
      toast.error('Verifique os dados do remetente');
      setActiveTab('origem');
      return false;
    }
    if (!destinoData.cidade || !destinoData.logradouro) {
      toast.error('Verifique os dados do destinatário');
      setActiveTab('destino');
      return false;
    }
    return true;
  };

  const onSubmit = async (values: FormValues) => {
    if (!validateLocations()) return;

    // Capturar dados antes de fechar
    const capturedOrigemData = { ...origemData };
    const capturedDestinoData = { ...destinoData };
    const capturedNecessidades = [...necessidadesEspeciais];
    const capturedPesoMinimo = pesoMinimoFracionado;
    const capturedVeiculos = [...veiculosSelecionados];
    const capturedCarrocerias = [...carroceriasSelecionadas];
    const capturedFilialId = filialAtiva?.id || null;

    // Fechar modal imediatamente e mostrar notificação
    resetDialogState();
    setOpen(false);
    toast.loading('Carga sendo criada, aguarde...', { id: 'creating-carga' });

    // Executar criação em background
    createCargaInBackground(
      values,
      capturedOrigemData,
      capturedDestinoData,
      capturedNecessidades,
      capturedNotaFiscalUrl,
      capturedPesoMinimo,
      capturedVeiculos,
      capturedCarrocerias,
      capturedFilialId
    );
  };

  const createCargaInBackground = async (
    values: FormValues,
    origemDataCaptured: LocationData,
    destinoDataCaptured: LocationData,
    necessidadesEspeciaisCaptured: string[],
    notaFiscalUrlCaptured: string | null,
    pesoMinimoFracionadoCaptured: number | null,
    veiculosSelecionadosCaptured: string[],
    carroceriasSelecionadasCaptured: string[],
    filialIdCaptured: number | null
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Você precisa estar logado para criar uma carga', { id: 'creating-carga' });
        return;
      }

      const { data: empresaId, error: empresaError } = await supabase
        .rpc('get_user_empresa_id', { _user_id: user.id });

      if (empresaError || !empresaId) {
        toast.error('Você precisa estar vinculado a uma empresa para criar cargas', { id: 'creating-carga' });
        return;
      }

      // Create the load with filial_id and destinatario fields
      const { data: carga, error: cargaError } = await supabase
        .from('cargas')
        .insert({
          empresa_id: empresaId,
          filial_id: filialIdCaptured,
          descricao: values.descricao,
          tipo: values.tipo,
          peso_kg: values.peso_kg,
          peso_disponivel_kg: values.peso_kg,
          volume_m3: values.volume_m3 || null,
          quantidade_paletes: values.quantidade_paletes || null,
          valor_mercadoria: values.valor_mercadoria || null,
          valor_frete_tonelada: values.valor_frete_tonelada || null,
          permite_fracionado: values.permite_fracionado,
          peso_minimo_fracionado_kg: values.permite_fracionado ? pesoMinimoFracionadoCaptured : null,
          carga_fragil: values.carga_fragil,
          carga_perigosa: values.carga_perigosa,
          carga_viva: values.carga_viva,
          empilhavel: values.empilhavel,
          requer_refrigeracao: values.requer_refrigeracao,
          temperatura_min: values.temperatura_min || null,
          temperatura_max: values.temperatura_max || null,
          numero_onu: values.numero_onu || null,
          // Anexar T12:00:00 para evitar shift de timezone ao salvar em colunas do tipo date
          data_coleta_de: values.data_coleta_de ? `${values.data_coleta_de}T12:00:00` : values.data_coleta_de,
          data_coleta_ate: values.data_coleta_ate ? `${values.data_coleta_ate}T12:00:00` : null,
          data_entrega_limite: values.data_entrega_limite ? `${values.data_entrega_limite}T12:00:00` : null,
          status: 'publicada',
          codigo: null as unknown as string,
          necessidades_especiais: necessidadesEspeciaisCaptured,
          regras_carregamento: values.regras_carregamento || null,
          nota_fiscal_url: notaFiscalUrlCaptured,
          veiculo_requisitos: {
            tipos_veiculo: veiculosSelecionadosCaptured,
            tipos_carroceria: carroceriasSelecionadasCaptured,
          },
          remetente_razao_social: origemDataCaptured.razao_social || null,
          remetente_nome_fantasia: origemDataCaptured.razao_social || null,
          remetente_cnpj: origemDataCaptured.cnpj || null,
          remetente_contato_nome: origemDataCaptured.contato_nome || null,
          remetente_contato_telefone: origemDataCaptured.contato_telefone || null,
          destinatario_razao_social: destinoDataCaptured.razao_social || null,
          destinatario_nome_fantasia: destinoDataCaptured.razao_social || null,
          destinatario_cnpj: destinoDataCaptured.cnpj || null,
          destinatario_contato_nome: destinoDataCaptured.contato_nome || null,
          destinatario_contato_telefone: destinoDataCaptured.contato_telefone || null,
        })
        .select()
        .single();

      if (cargaError) {
        console.error('Erro ao criar carga:', cargaError);
        toast.error('Erro ao criar carga: ' + cargaError.message, { id: 'creating-carga' });
        return;
      }

      // Create origin address
      const { data: origemEndereco, error: origemError } = await supabase
        .from('enderecos_carga')
        .insert({
          carga_id: carga.id,
          tipo: 'origem',
          cep: origemDataCaptured.cep,
          logradouro: origemDataCaptured.logradouro,
          numero: origemDataCaptured.numero || null,
          complemento: origemDataCaptured.complemento || null,
          bairro: origemDataCaptured.bairro || null,
          cidade: origemDataCaptured.cidade,
          estado: origemDataCaptured.estado,
          contato_nome: origemDataCaptured.contato_nome || null,
          contato_telefone: origemDataCaptured.contato_telefone || null,
          latitude: origemDataCaptured.latitude || null,
          longitude: origemDataCaptured.longitude || null,
        })
        .select('id')
        .single();

      if (origemError || !origemEndereco) {
        console.error('Erro ao criar endereço de origem:', origemError);
        toast.error('Erro ao criar endereço de origem', { id: 'creating-carga' });
        return;
      }

      // Create destination address
      const { data: destinoEndereco, error: destinoError } = await supabase
        .from('enderecos_carga')
        .insert({
          carga_id: carga.id,
          tipo: 'destino',
          cep: destinoDataCaptured.cep,
          logradouro: destinoDataCaptured.logradouro,
          numero: destinoDataCaptured.numero || null,
          complemento: destinoDataCaptured.complemento || null,
          bairro: destinoDataCaptured.bairro || null,
          cidade: destinoDataCaptured.cidade,
          estado: destinoDataCaptured.estado,
          contato_nome: destinoDataCaptured.contato_nome || null,
          contato_telefone: destinoDataCaptured.contato_telefone || null,
          latitude: destinoDataCaptured.latitude || null,
          longitude: destinoDataCaptured.longitude || null,
        })
        .select('id')
        .single();

      if (destinoError || !destinoEndereco) {
        console.error('Erro ao criar endereço de destino:', destinoError);
        toast.error('Erro ao criar endereço de destino', { id: 'creating-carga' });
        return;
      }

      // Link addresses to cargo
      const { error: updateCargaError } = await supabase
        .from('cargas')
        .update({
          endereco_origem_id: origemEndereco.id,
          endereco_destino_id: destinoEndereco.id,
        })
        .eq('id', carga.id);

      if (updateCargaError) {
        console.error('Erro ao vincular endereços à carga:', updateCargaError);
        toast.error('Erro ao vincular endereços à carga', { id: 'creating-carga' });
        return;
      }

      // Buscar o código gerado pelo trigger
      const { data: cargaFinal } = await supabase
        .from('cargas')
        .select('codigo')
        .eq('id', carga.id)
        .single();

      const codigoCarga = cargaFinal?.codigo || carga.id.slice(0, 8).toUpperCase();

      toast.success(`Carga criada com sucesso! Código: ${codigoCarga}`, { id: 'creating-carga' });
      onSuccess?.();
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao criar carga', { id: 'creating-carga' });
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetDialogState();
    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Carga
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Nova Carga
          </DialogTitle>
          <DialogDescription>
            Preencha os dados da carga e verifique os locais de origem e destino
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="carga" className="gap-2">
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline">Carga</span>
                </TabsTrigger>
                <TabsTrigger value="requisitos" className="gap-2">
                  <ClipboardList className="w-4 h-4" />
                  <span className="hidden sm:inline">Requisitos</span>
                </TabsTrigger>
                <TabsTrigger value="origem" className="gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="hidden sm:inline">Remetente</span>
                </TabsTrigger>
                <TabsTrigger value="destino" className="gap-2">
                  <Truck className="w-4 h-4" />
                  <span className="hidden sm:inline">Destinatário</span>
                </TabsTrigger>
                <TabsTrigger value="resumo" className="gap-2">
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Resumo</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="carga" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição da Carga *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva a carga (ex: Minério de ferro - Lote A)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Carga *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-popover border-border z-[10000]">
                            {tipoCargaOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="peso_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Peso (kg) *</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="volume_m3"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Volume (m³)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantidade_paletes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qtd. Paletes</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            value={field.value ?? ''} 
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="valor_mercadoria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Mercadoria (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Seção de Frete */}
                <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-4">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Valor do Frete
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="valor_frete_tonelada"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frete por Tonelada (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={field.value ?? ''}
                              onChange={(e) =>
                                field.onChange(e.target.value === '' ? 0 : Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label className="text-sm">Frete Total Estimado</Label>

                      <div className="h-10 px-3 py-2 rounded-md border bg-muted/50 flex items-center">
                        <span className="font-bold text-primary">
                          {freteTotal > 0
                            ? new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(freteTotal)
                            : 'R$ 0,00'}
                        </span>
                      </div>

                      {pesoKg > 0 && valorFreteTonelada > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {(pesoKg / 1000).toFixed(2)}t x R$ {valorFreteTonelada.toFixed(2)}/ton
                        </p>
                      )}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="permite_fracionado"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal text-sm">
                          Permitir transporte fracionado (múltiplos motoristas)
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  {form.watch('permite_fracionado') && (
                    <div className="ml-6 p-3 bg-muted/50 rounded-md border">
                      <Label className="text-sm">Peso Mínimo por Entrega (kg)</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 15000 (15 toneladas)"
                        className="mt-2"
                        value={pesoMinimoFracionado || ''}
                        onChange={(e) => setPesoMinimoFracionado(e.target.value ? Number(e.target.value) : null)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Deixe vazio para não ter limite mínimo
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="data_coleta_de"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Coleta *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data_coleta_ate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coleta Até</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data_entrega_limite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entrega Limite</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Nota Fiscal Upload */}
                <NotaFiscalUpload
                  value={notaFiscalUrl}
                  onChange={setNotaFiscalUrl}
                />
              </TabsContent>

              <TabsContent value="requisitos" className="space-y-6 mt-4">
                <div className="space-y-3">
                  <Label>Características Especiais</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="carga_fragil"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Carga Frágil</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="carga_perigosa"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Carga Perigosa</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="carga_viva"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Carga Viva</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="empilhavel"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Empilhável</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="requer_refrigeracao"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Requer Refrigeração</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {requerRefrigeracao && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="temperatura_min"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Temperatura Mínima (°C)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="-18" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="temperatura_max"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Temperatura Máxima (°C)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="4" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {cargaPerigosa && (
                  <FormField
                    control={form.control}
                    name="numero_onu"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número ONU</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: UN1203" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Veículos e Carrocerias Aceitos */}
                <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-4">
                  <VeiculoCarroceriaSelect
                    veiculosSelecionados={veiculosSelecionados}
                    carroceriasSelecionadas={carroceriasSelecionadas}
                    onVeiculosChange={setVeiculosSelecionados}
                    onCarroceriasChange={setCarroceriasSelecionadas}
                  />
                </div>

                {/* Necessidades Especiais */}
                <NecessidadesEspeciais
                  value={necessidadesEspeciais}
                  onChange={setNecessidadesEspeciais}
                />

                {/* Regras de Carregamento */}
                <FormField
                  control={form.control}
                  name="regras_carregamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regras de Carregamento</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Instruções especiais para carregamento (ex: Não tomblar, manter na vertical, empilhar máximo 3 caixas...)"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="origem" className="mt-4">
                <RemetenteSection
                  initialData={origemData}
                  onLocationChange={setOrigemData}
                />
              </TabsContent>

              <TabsContent value="destino" className="mt-4">
                <DestinoSection
                  initialData={destinoData}
                  onLocationChange={setDestinoData}
                />
              </TabsContent>

              <TabsContent value="resumo" className="mt-4">
                <ResumoSection
                  origemData={origemData}
                  destinoData={destinoData}
                  cargaData={{
                    descricao: form.getValues('descricao'),
                    tipo: form.getValues('tipo'),
                    peso_kg: form.getValues('peso_kg'),
                    volume_m3: form.getValues('volume_m3'),
                    valor_mercadoria: form.getValues('valor_mercadoria'),
                    valor_frete_tonelada: form.getValues('valor_frete_tonelada'),
                    data_coleta_de: form.getValues('data_coleta_de'),
                    data_coleta_ate: form.getValues('data_coleta_ate'),
                    data_entrega_limite: form.getValues('data_entrega_limite'),
                    carga_fragil: form.getValues('carga_fragil'),
                    carga_perigosa: form.getValues('carga_perigosa'),
                    carga_viva: form.getValues('carga_viva'),
                    empilhavel: form.getValues('empilhavel'),
                    requer_refrigeracao: form.getValues('requer_refrigeracao'),
                    temperatura_min: form.getValues('temperatura_min'),
                    temperatura_max: form.getValues('temperatura_max'),
                    numero_onu: form.getValues('numero_onu'),
                    regras_carregamento: form.getValues('regras_carregamento'),
                  }}
                  necessidadesEspeciais={necessidadesEspeciais}
                  notaFiscalUrl={notaFiscalUrl}
                  veiculosSelecionados={veiculosSelecionados}
                  carroceriasSelecionadas={carroceriasSelecionadas}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    Criar Carga
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
