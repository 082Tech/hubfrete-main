import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserContext } from '@/hooks/useUserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { WeightInput } from '@/components/ui/weight-input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Package, MapPin, Truck, Loader2, ClipboardList, Eye, DollarSign, Pencil, Weight as WeightIcon, Info } from 'lucide-react';
import type { LocationData } from '@/components/maps/LocationPickerMap';
import type { Database } from '@/integrations/supabase/types';
import { RemetenteSection } from '@/components/cargas/RemetenteSection';
import { DestinoSection } from '@/components/cargas/DestinoSection';
import { NecessidadesEspeciais } from '@/components/cargas/NecessidadesEspeciais';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ResumoSection } from '@/components/cargas/ResumoSection';
import { VeiculoCarroceriaSelect } from '@/components/cargas/VeiculoCarroceriaSelect';
import { UNIDADES_PRECIFICACAO } from '@/components/cargas/NovaCargaDialog';

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

export default function EditarCarga() {
  const navigate = useNavigate();
  const { id: cargaId } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('carga');
  const [cargaCodigo, setCargaCodigo] = useState('');
  const [originalPesoKg, setOriginalPesoKg] = useState(0);
  const [originalPesoDisponivel, setOriginalPesoDisponivel] = useState<number | null>(null);
  const { filialAtiva } = useUserContext();

  const initialLocationData: LocationData = {
    latitude: 0, longitude: 0, cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', contato_nome: '', contato_telefone: '',
  };

  const [necessidadesEspeciais, setNecessidadesEspeciais] = useState<string[]>([]);
  const [notaFiscalUrl, setNotaFiscalUrl] = useState<string | null>(null);
  const [veiculosSelecionados, setVeiculosSelecionados] = useState<string[]>([]);
  const [carroceriasSelecionadas, setCarroceriasSelecionadas] = useState<string[]>([]);
  const [origemData, setOrigemData] = useState<LocationData>(initialLocationData);
  const [destinoData, setDestinoData] = useState<LocationData>(initialLocationData);
  const [enderecoOrigemId, setEnderecoOrigemId] = useState<string | null>(null);
  const [enderecoDestinoId, setEnderecoDestinoId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descricao: '', tipo: 'carga_seca', peso_kg: 0, unidade_precificacao: 'TON',
      permite_fracionado: true, carga_fragil: false, carga_perigosa: false, carga_viva: false,
      empilhavel: true, requer_refrigeracao: false, regras_carregamento: '', expira_em: addDays(30),
    },
  });

  // Load cargo data
  useEffect(() => {
    if (!cargaId) return;
    
    const loadCarga = async () => {
      setIsLoadingData(true);
      const { data: carga, error } = await supabase
        .from('cargas')
        .select(`
          *,
          endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(*),
          endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(*)
        `)
        .eq('id', cargaId)
        .single();

      if (error || !carga) {
        toast.error('Carga não encontrada');
        navigate('/embarcador/ofertas');
        return;
      }

      setCargaCodigo(carga.codigo);
      setOriginalPesoKg(carga.peso_kg);
      setOriginalPesoDisponivel(carga.peso_disponivel_kg);

      form.reset({
        descricao: carga.descricao || '',
        tipo: (carga.tipo as TipoCarga) || 'carga_seca',
        peso_kg: carga.peso_kg || 0,
        volume_m3: carga.volume_m3 || undefined,
        quantidade_paletes: carga.quantidade_paletes || undefined,
        valor_mercadoria: carga.valor_mercadoria || undefined,
        numero_pedido: carga.numero_pedido || '',
        unidade_precificacao: carga.unidade_precificacao || 'TON',
        quantidade_precificacao: carga.quantidade_precificacao || undefined,
        valor_unitario_precificacao: carga.valor_unitario_precificacao || undefined,
        permite_fracionado: carga.permite_fracionado ?? true,
        carga_fragil: carga.carga_fragil ?? false,
        carga_perigosa: carga.carga_perigosa ?? false,
        carga_viva: carga.carga_viva ?? false,
        empilhavel: carga.empilhavel ?? true,
        requer_refrigeracao: carga.requer_refrigeracao ?? false,
        temperatura_min: carga.temperatura_min || undefined,
        temperatura_max: carga.temperatura_max || undefined,
        numero_onu: carga.numero_onu || '',
        data_coleta_de: carga.data_coleta_de ? carga.data_coleta_de.split('T')[0] : todayStr(),
        data_coleta_ate: carga.data_coleta_ate ? carga.data_coleta_ate.split('T')[0] : undefined,
        data_entrega_limite: carga.data_entrega_limite ? carga.data_entrega_limite.split('T')[0] : undefined,
        expira_em: carga.expira_em ? carga.expira_em.split('T')[0] : addDays(30),
        regras_carregamento: carga.regras_carregamento || '',
      });

      setNecessidadesEspeciais(carga.necessidades_especiais || []);
      setNotaFiscalUrl(carga.nota_fiscal_url || null);
      const vReq = carga.veiculo_requisitos as any;
      setVeiculosSelecionados(vReq?.tipos_veiculo || []);
      setCarroceriasSelecionadas(vReq?.tipos_carroceria || []);

      const origem = carga.endereco_origem as any;
      if (origem) {
        setEnderecoOrigemId(origem.id);
        setOrigemData({
          latitude: origem.latitude || 0, longitude: origem.longitude || 0,
          cep: origem.cep || '', logradouro: origem.logradouro || '',
          numero: origem.numero || '', complemento: origem.complemento || '',
          bairro: origem.bairro || '', cidade: origem.cidade || '',
          estado: origem.estado || '', contato_nome: origem.contato_nome || '',
          contato_telefone: origem.contato_telefone || '',
        });
      }

      const destino = carga.endereco_destino as any;
      if (destino) {
        setEnderecoDestinoId(destino.id);
        setDestinoData({
          latitude: destino.latitude || 0, longitude: destino.longitude || 0,
          cep: destino.cep || '', logradouro: destino.logradouro || '',
          numero: destino.numero || '', complemento: destino.complemento || '',
          bairro: destino.bairro || '', cidade: destino.cidade || '',
          estado: destino.estado || '',
          contato_nome: carga.destinatario_contato_nome || destino.contato_nome || '',
          contato_telefone: carga.destinatario_contato_telefone || destino.contato_telefone || '',
          razao_social: carga.destinatario_razao_social || '',
          cnpj: carga.destinatario_cnpj || '',
        });
      }

      setIsLoadingData(false);
    };

    loadCarga();
  }, [cargaId, form, navigate]);

  const pesoKg = form.watch('peso_kg');
  const unidadePrec = form.watch('unidade_precificacao');
  const quantidadePrec = form.watch('quantidade_precificacao');
  const valorUnitarioPrec = form.watch('valor_unitario_precificacao');

  const freteTotal = (quantidadePrec ?? 0) > 0 && (valorUnitarioPrec ?? 0) > 0
    ? Math.round((quantidadePrec ?? 0) * (valorUnitarioPrec ?? 0) * 100) / 100
    : 0;

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
    if (!cargaId || !validateLocations()) return;
    setIsLoading(true);

    try {
      const weightDiff = values.peso_kg - originalPesoKg;
      const newPesoDisponivel = Math.max(0, (originalPesoDisponivel ?? originalPesoKg) + weightDiff);

      const { error: cargaError } = await supabase
        .from('cargas')
        .update({
          descricao: values.descricao, tipo: values.tipo,
          peso_kg: values.peso_kg, peso_disponivel_kg: newPesoDisponivel,
          volume_m3: values.volume_m3 || null, quantidade_paletes: values.quantidade_paletes || null,
          valor_mercadoria: values.valor_mercadoria || null,
          numero_pedido: values.numero_pedido || null,
          unidade_precificacao: values.unidade_precificacao || 'TON',
          quantidade_precificacao: values.quantidade_precificacao || null,
          valor_unitario_precificacao: values.valor_unitario_precificacao || null,
          tipo_precificacao: 'por_tonelada',
          valor_frete_tonelada: freteTotal > 0 ? freteTotal : null,
          valor_frete_m3: null, valor_frete_fixo: null, valor_frete_km: null,
          permite_fracionado: values.permite_fracionado,
          carga_fragil: values.carga_fragil, carga_perigosa: values.carga_perigosa,
          carga_viva: values.carga_viva, empilhavel: values.empilhavel,
          requer_refrigeracao: values.requer_refrigeracao,
          temperatura_min: values.temperatura_min || null, temperatura_max: values.temperatura_max || null,
          numero_onu: values.numero_onu || null,
          data_coleta_de: values.data_coleta_de ? `${values.data_coleta_de}T12:00:00` : values.data_coleta_de,
          data_coleta_ate: values.data_coleta_ate ? `${values.data_coleta_ate}T12:00:00` : null,
          data_entrega_limite: values.data_entrega_limite ? `${values.data_entrega_limite}T12:00:00` : null,
          expira_em: `${values.expira_em}T23:59:59`,
          necessidades_especiais: necessidadesEspeciais,
          regras_carregamento: values.regras_carregamento || null,
          nota_fiscal_url: notaFiscalUrl,
          veiculo_requisitos: { tipos_veiculo: veiculosSelecionados, tipos_carroceria: carroceriasSelecionadas },
          destinatario_razao_social: destinoData.razao_social || null,
          destinatario_nome_fantasia: destinoData.razao_social || null,
          destinatario_cnpj: destinoData.cnpj || null,
          destinatario_contato_nome: destinoData.contato_nome || null,
          destinatario_contato_telefone: destinoData.contato_telefone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cargaId);

      if (cargaError) {
        toast.error('Erro ao atualizar carga: ' + cargaError.message);
        setIsLoading(false);
        return;
      }

      if (enderecoOrigemId) {
        await supabase.from('enderecos_carga').update({
          cep: origemData.cep, logradouro: origemData.logradouro, numero: origemData.numero || null,
          complemento: origemData.complemento || null, bairro: origemData.bairro || null,
          cidade: origemData.cidade, estado: origemData.estado,
          contato_nome: origemData.contato_nome || null, contato_telefone: origemData.contato_telefone || null,
          latitude: origemData.latitude || null, longitude: origemData.longitude || null,
          updated_at: new Date().toISOString(),
        }).eq('id', enderecoOrigemId);
      }

      if (enderecoDestinoId) {
        await supabase.from('enderecos_carga').update({
          cep: destinoData.cep, logradouro: destinoData.logradouro, numero: destinoData.numero || null,
          complemento: destinoData.complemento || null, bairro: destinoData.bairro || null,
          cidade: destinoData.cidade, estado: destinoData.estado,
          contato_nome: destinoData.contato_nome || null, contato_telefone: destinoData.contato_telefone || null,
          latitude: destinoData.latitude || null, longitude: destinoData.longitude || null,
          updated_at: new Date().toISOString(),
        }).eq('id', enderecoDestinoId);
      }

      toast.success('Carga atualizada com sucesso!');
      navigate('/embarcador/ofertas');
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao atualizar carga');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('/embarcador/ofertas')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Editar Carga - {cargaCodigo}
          </h1>
          <p className="text-sm text-muted-foreground">Atualize os dados da carga</p>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="carga" className="gap-1 text-xs sm:text-sm">
                    <Package className="w-4 h-4" />
                    <span className="hidden sm:inline">Carga</span>
                  </TabsTrigger>
                  <TabsTrigger value="peso" className="gap-1 text-xs sm:text-sm">
                    <WeightIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Peso</span>
                  </TabsTrigger>
                  <TabsTrigger value="precificacao" className="gap-1 text-xs sm:text-sm">
                    <DollarSign className="w-4 h-4" />
                    <span className="hidden sm:inline">Preço</span>
                  </TabsTrigger>
                  <TabsTrigger value="requisitos" className="gap-1 text-xs sm:text-sm">
                    <ClipboardList className="w-4 h-4" />
                    <span className="hidden sm:inline">Requisitos</span>
                  </TabsTrigger>
                  <TabsTrigger value="origem" className="gap-1 text-xs sm:text-sm">
                    <MapPin className="w-4 h-4" />
                    <span className="hidden sm:inline">Remetente</span>
                  </TabsTrigger>
                  <TabsTrigger value="destino" className="gap-1 text-xs sm:text-sm">
                    <Truck className="w-4 h-4" />
                    <span className="hidden sm:inline">Destinatário</span>
                  </TabsTrigger>
                  <TabsTrigger value="resumo" className="gap-1 text-xs sm:text-sm">
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">Resumo</span>
                  </TabsTrigger>
                </TabsList>

                {/* ===== CARGA ===== */}
                <TabsContent value="carga" className="space-y-4 mt-4">
                  <FormField control={form.control} name="descricao" render={({ field }) => (
                    <FormItem><FormLabel>Descrição da Carga *</FormLabel><FormControl><Textarea placeholder="Descreva a carga" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="tipo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Carga *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent className="bg-popover border-border">
                            {tipoCargaOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="numero_pedido" render={({ field }) => (
                      <FormItem><FormLabel>Nº do Pedido</FormLabel><FormControl><Input placeholder="Opcional" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="data_coleta_de" render={({ field }) => (
                      <FormItem><FormLabel>Data de Coleta *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="data_coleta_ate" render={({ field }) => (
                      <FormItem><FormLabel>Coleta Até</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="data_entrega_limite" render={({ field }) => (
                      <FormItem><FormLabel>Entrega Limite</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10">
                    <FormField control={form.control} name="expira_em" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-amber-800 dark:text-amber-300 font-medium">Expiração da Publicação</FormLabel>
                        <FormControl><Input type="date" min={todayStr()} max={addDays(365)} {...field} /></FormControl>
                        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">A carga será removida automaticamente nesta data.</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
                      As Notas Fiscais (NF-e) serão solicitadas quando as entregas forem geradas para esta carga.
                    </AlertDescription>
                  </Alert>
                </TabsContent>

                {/* ===== PESO ===== */}
                <TabsContent value="peso" className="space-y-4 mt-4">
                  <div className="p-3 rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700/30">
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                      <strong>Por que o peso é obrigatório?</strong> O sistema utiliza o peso da carga para verificar a compatibilidade com a capacidade das carrocerias dos motoristas. Sem essa informação, não é possível validar se o veículo suporta a carga.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-4">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <WeightIcon className="w-4 h-4 text-primary" />
                      Peso e Dimensões
                    </h4>
                    <FormField control={form.control} name="peso_kg" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Peso Total (kg) *</FormLabel>
                        <FormControl><WeightInput placeholder="0" value={field.value} onValueChange={field.onChange} /></FormControl>
                        <p className="text-xs text-muted-foreground">
                          {pesoKg > 0 && pesoKg >= 1000 ? `≈ ${(pesoKg / 1000).toFixed(2)} toneladas` : 'Peso obrigatório — principal critério do sistema'}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="volume_m3" render={({ field }) => (
                        <FormItem><FormLabel>Volume (m³)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="valor_mercadoria" render={({ field }) => (
                        <FormItem><FormLabel>Valor Mercadoria</FormLabel><FormControl><CurrencyInput placeholder="0,00" value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                  <FormField control={form.control} name="permite_fracionado" render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="font-normal text-sm">Permitir transporte fracionado (múltiplos motoristas)</FormLabel>
                    </FormItem>
                  )} />
                </TabsContent>

                {/* ===== PRECIFICAÇÃO ===== */}
                <TabsContent value="precificacao" className="space-y-4 mt-4">
                  <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-4">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      Precificação do Frete
                    </h4>
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
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="quantidade_precificacao" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade ({unidadePrec})</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="valor_unitario_precificacao" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Unitário (R$/{unidadePrec})</FormLabel>
                          <FormControl><CurrencyInput placeholder="0,00" value={field.value} onValueChange={field.onChange} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                      <Label className="text-sm text-muted-foreground">Frete Total Estimado</Label>
                      <p className="text-2xl font-bold text-primary">
                        {freteTotal > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(freteTotal) : 'R$ 0,00'}
                      </p>
                      {(quantidadePrec ?? 0) > 0 && (valorUnitarioPrec ?? 0) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {quantidadePrec} {unidadePrec} × R$ {(valorUnitarioPrec ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/{unidadePrec}
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* ===== REQUISITOS ===== */}
                <TabsContent value="requisitos" className="space-y-6 mt-4">
                  <FormField control={form.control} name="quantidade_paletes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qtd. Paletes</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" className="max-w-[200px]" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="space-y-3">
                    <Label>Características Especiais</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {(['carga_fragil', 'carga_perigosa', 'carga_viva', 'empilhavel', 'requer_refrigeracao'] as const).map((name) => {
                        const labels: Record<string, string> = {
                          carga_fragil: 'Carga Frágil', carga_perigosa: 'Carga Perigosa', carga_viva: 'Carga Viva',
                          empilhavel: 'Empilhável', requer_refrigeracao: 'Requer Refrigeração',
                        };
                        return (
                          <FormField key={name} control={form.control} name={name} render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel className="font-normal">{labels[name]}</FormLabel>
                            </FormItem>
                          )} />
                        );
                      })}
                    </div>
                  </div>

                  {requerRefrigeracao && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="temperatura_min" render={({ field }) => (
                        <FormItem><FormLabel>Temperatura Mínima (°C)</FormLabel><FormControl><Input type="number" placeholder="-18" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="temperatura_max" render={({ field }) => (
                        <FormItem><FormLabel>Temperatura Máxima (°C)</FormLabel><FormControl><Input type="number" placeholder="4" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  )}

                  {cargaPerigosa && (
                    <FormField control={form.control} name="numero_onu" render={({ field }) => (
                      <FormItem><FormLabel>Número ONU</FormLabel><FormControl><Input placeholder="Ex: UN1203" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  )}

                  <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-4">
                    <VeiculoCarroceriaSelect
                      veiculosSelecionados={veiculosSelecionados} carroceriasSelecionadas={carroceriasSelecionadas}
                      onVeiculosChange={setVeiculosSelecionados} onCarroceriasChange={setCarroceriasSelecionadas}
                    />
                  </div>

                  <NecessidadesEspeciais value={necessidadesEspeciais} onChange={setNecessidadesEspeciais} />

                  <FormField control={form.control} name="regras_carregamento" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regras de Carregamento</FormLabel>
                      <FormControl><Textarea placeholder="Instruções especiais para carregamento..." className="min-h-[100px]" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </TabsContent>

                <TabsContent value="origem" className="mt-4">
                  <RemetenteSection initialData={origemData} onLocationChange={setOrigemData} />
                </TabsContent>

                <TabsContent value="destino" className="mt-4">
                  <DestinoSection initialData={destinoData} onLocationChange={setDestinoData} />
                </TabsContent>

                <TabsContent value="resumo" className="mt-4">
                  <ResumoSection
                    origemData={origemData} destinoData={destinoData}
                    cargaData={{
                      descricao: form.getValues('descricao'), tipo: form.getValues('tipo'),
                      peso_kg: form.getValues('peso_kg'), volume_m3: form.getValues('volume_m3'),
                      valor_mercadoria: form.getValues('valor_mercadoria'),
                      unidade_precificacao: form.getValues('unidade_precificacao'),
                      quantidade_precificacao: form.getValues('quantidade_precificacao'),
                      valor_unitario_precificacao: form.getValues('valor_unitario_precificacao'),
                      data_coleta_de: form.getValues('data_coleta_de'), data_coleta_ate: form.getValues('data_coleta_ate'),
                      data_entrega_limite: form.getValues('data_entrega_limite'),
                      carga_fragil: form.getValues('carga_fragil'), carga_perigosa: form.getValues('carga_perigosa'),
                      carga_viva: form.getValues('carga_viva'), empilhavel: form.getValues('empilhavel'),
                      requer_refrigeracao: form.getValues('requer_refrigeracao'),
                      temperatura_min: form.getValues('temperatura_min'), temperatura_max: form.getValues('temperatura_max'),
                      numero_onu: form.getValues('numero_onu'), regras_carregamento: form.getValues('regras_carregamento'),
                    }}
                    necessidadesEspeciais={necessidadesEspeciais}
                    notaFiscalUrl={notaFiscalUrl}
                    veiculosSelecionados={veiculosSelecionados}
                    carroceriasSelecionadas={carroceriasSelecionadas}
                  />
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => navigate('/embarcador/ofertas')} disabled={isLoading}>Cancelar</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>) : (<><Pencil className="w-4 h-4 mr-2" />Salvar Alterações</>)}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </ScrollArea>
    </div>
  );
}
