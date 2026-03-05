import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Package, MapPin, Truck, Loader2, ClipboardList, DollarSign, Weight, Info } from 'lucide-react';
import type { LocationData } from '@/components/maps/LocationPickerMap';
import type { Database } from '@/integrations/supabase/types';
import { RemetenteSection } from '@/components/cargas/RemetenteSection';
import { DestinoSection } from '@/components/cargas/DestinoSection';
import { NecessidadesEspeciais } from '@/components/cargas/NecessidadesEspeciais';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2">
      <Icon className="w-4 h-4 text-primary" />
      <h3 className="font-semibold text-sm">{title}</h3>
    </div>
  );
}

export default function NovaCarga() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { filialAtiva, empresa, userType } = useUserContext();

  const initialLocationData: LocationData = {
    latitude: 0, longitude: 0, cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', contato_nome: '', contato_telefone: '',
  };

  const [showExitDialog, setShowExitDialog] = useState(false);
  const [necessidadesEspeciais, setNecessidadesEspeciais] = useState<string[]>([]);
  const [pesoMinimoFracionado, setPesoMinimoFracionado] = useState<number | null>(null);
  const [veiculosSelecionados, setVeiculosSelecionados] = useState<string[]>([]);
  const [carroceriasSelecionadas, setCarroceriasSelecionadas] = useState<string[]>([]);
  const [origemData, setOrigemData] = useState<LocationData>(initialLocationData);
  const [destinoData, setDestinoData] = useState<LocationData>(initialLocationData);

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

    setIsLoading(true);
    toast.loading('Carga sendo criada, aguarde...', { id: 'creating-carga' });

    try {
      const { data: carga, error: cargaError } = await supabase
        .from('cargas')
        .insert({
          empresa_id: empresa.id, filial_id: filialAtiva?.id || null,
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
          peso_minimo_fracionado_kg: values.permite_fracionado ? pesoMinimoFracionado : null,
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
          necessidades_especiais: necessidadesEspeciais,
          regras_carregamento: values.regras_carregamento || null,
          nota_fiscal_url: null,
          veiculo_requisitos: { tipos_veiculo: veiculosSelecionados, tipos_carroceria: carroceriasSelecionadas },
          remetente_razao_social: origemData.razao_social || null,
          remetente_nome_fantasia: origemData.razao_social || null,
          remetente_cnpj: origemData.cnpj || null,
          remetente_contato_nome: origemData.contato_nome || null,
          remetente_contato_telefone: origemData.contato_telefone || null,
          destinatario_razao_social: destinoData.razao_social || null,
          destinatario_nome_fantasia: destinoData.razao_social || null,
          destinatario_cnpj: destinoData.cnpj || null,
          destinatario_contato_nome: destinoData.contato_nome || null,
          destinatario_contato_telefone: destinoData.contato_telefone || null,
        })
        .select().single();

      if (cargaError) {
        toast.error('Erro ao criar carga: ' + cargaError.message, { id: 'creating-carga' });
        setIsLoading(false);
        return;
      }

      const { data: origemEndereco, error: origemError } = await supabase
        .from('enderecos_carga')
        .insert({
          carga_id: carga.id, tipo: 'origem', cep: origemData.cep, logradouro: origemData.logradouro,
          numero: origemData.numero || null, complemento: origemData.complemento || null,
          bairro: origemData.bairro || null, cidade: origemData.cidade, estado: origemData.estado,
          contato_nome: origemData.contato_nome || null, contato_telefone: origemData.contato_telefone || null,
          latitude: origemData.latitude || null, longitude: origemData.longitude || null,
        }).select('id').single();

      if (origemError || !origemEndereco) {
        toast.error('Erro ao criar endereço de origem', { id: 'creating-carga' });
        setIsLoading(false);
        return;
      }

      const { data: destinoEndereco, error: destinoError } = await supabase
        .from('enderecos_carga')
        .insert({
          carga_id: carga.id, tipo: 'destino', cep: destinoData.cep, logradouro: destinoData.logradouro,
          numero: destinoData.numero || null, complemento: destinoData.complemento || null,
          bairro: destinoData.bairro || null, cidade: destinoData.cidade, estado: destinoData.estado,
          contato_nome: destinoData.contato_nome || null, contato_telefone: destinoData.contato_telefone || null,
          latitude: destinoData.latitude || null, longitude: destinoData.longitude || null,
        }).select('id').single();

      if (destinoError || !destinoEndereco) {
        toast.error('Erro ao criar endereço de destino', { id: 'creating-carga' });
        setIsLoading(false);
        return;
      }

      await supabase.from('cargas').update({
        endereco_origem_id: origemEndereco.id, endereco_destino_id: destinoEndereco.id,
      }).eq('id', carga.id);

      const { data: cargaFinal } = await supabase.from('cargas').select('codigo').eq('id', carga.id).single();
      toast.success(`Carga criada com sucesso! Código: ${cargaFinal?.codigo || carga.id.slice(0, 8).toUpperCase()}`, { id: 'creating-carga' });
      navigate('/embarcador/ofertas');
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao criar carga', { id: 'creating-carga' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/embarcador/ofertas')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Nova Carga
            </h1>
            <p className="text-sm text-muted-foreground">Preencha os dados e visualize o resumo ao lado</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/embarcador/ofertas')} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>
            {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>) : (<><Package className="w-4 h-4 mr-2" />Criar Carga</>)}
          </Button>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr,400px]">
        {/* Left: Form */}
        <ScrollArea className="h-full">
          <div className="max-w-3xl p-6 space-y-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                {/* ───── Section: Dados da Carga ───── */}
                <section className="space-y-4">
                  <SectionHeader icon={Package} title="Dados da Carga" />
                  <FormField control={form.control} name="descricao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição da Carga *</FormLabel>
                      <FormControl><Textarea placeholder="Descreva a carga (ex: Minério de ferro - Lote A)" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="tipo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Carga *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl>
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
                        <FormLabel>Nº do Pedido</FormLabel>
                        <FormControl><Input placeholder="Opcional" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
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
                        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">A carga será removida automaticamente nesta data. Máximo: 1 ano.</p>
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
                </section>

                <Separator />

                {/* ───── Section: Peso e Dimensões ───── */}
                <section className="space-y-4">
                  <SectionHeader icon={Weight} title="Peso e Dimensões" />
                  <div className="p-3 rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700/30">
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                      <strong>Por que o peso é obrigatório?</strong> O sistema utiliza o peso da carga para verificar a compatibilidade com a capacidade das carrocerias dos motoristas.
                    </p>
                  </div>
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
                  <FormField control={form.control} name="permite_fracionado" render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="font-normal text-sm">Permitir transporte fracionado (múltiplos motoristas)</FormLabel>
                    </FormItem>
                  )} />
                  {form.watch('permite_fracionado') && (
                    <div className="ml-6 p-3 bg-muted/50 rounded-md border">
                      <Label className="text-sm">Peso Mínimo por Entrega (kg)</Label>
                      <WeightInput placeholder="Ex: 15.000 (15 toneladas)" className="mt-2" value={pesoMinimoFracionado || undefined} onValueChange={(v) => setPesoMinimoFracionado(v || null)} />
                      <p className="text-xs text-muted-foreground mt-1">Deixe vazio para não ter limite mínimo</p>
                    </div>
                  )}
                </section>

                <Separator />

                {/* ───── Section: Precificação ───── */}
                <section className="space-y-4">
                  <SectionHeader icon={DollarSign} title="Precificação do Frete" />
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
                  {freteTotal > 0 && (
                    <div className="p-4 rounded-lg border bg-muted/30 space-y-1">
                      <Label className="text-sm text-muted-foreground">Frete Total Estimado</Label>
                      <p className="text-2xl font-bold text-primary">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(freteTotal)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {quantidadePrec} {unidadePrec} × R$ {(valorUnitarioPrec ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/{unidadePrec}
                      </p>
                    </div>
                  )}
                </section>

                <Separator />

                {/* ───── Section: Requisitos ───── */}
                <section className="space-y-4">
                  <SectionHeader icon={ClipboardList} title="Requisitos e Características" />
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
                  <VeiculoCarroceriaSelect
                    veiculosSelecionados={veiculosSelecionados} carroceriasSelecionadas={carroceriasSelecionadas}
                    onVeiculosChange={setVeiculosSelecionados} onCarroceriasChange={setCarroceriasSelecionadas}
                  />
                  <NecessidadesEspeciais value={necessidadesEspeciais} onChange={setNecessidadesEspeciais} />
                  <FormField control={form.control} name="regras_carregamento" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regras de Carregamento</FormLabel>
                      <FormControl><Textarea placeholder="Instruções especiais para carregamento..." className="min-h-[80px]" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </section>

                <Separator />

                {/* ───── Section: Remetente ───── */}
                <section className="space-y-4">
                  <SectionHeader icon={MapPin} title="Remetente (Origem)" />
                  <RemetenteSection initialData={origemData} onLocationChange={setOrigemData} />
                </section>

                <Separator />

                {/* ───── Section: Destinatário ───── */}
                <section className="space-y-4">
                  <SectionHeader icon={Truck} title="Destinatário (Destino)" />
                  <DestinoSection initialData={destinoData} onLocationChange={setDestinoData} />
                </section>

                {/* Bottom spacer for mobile */}
                <div className="h-4" />
              </form>
            </Form>
          </div>
        </ScrollArea>

        {/* Right: Live Summary (hidden on mobile) */}
        <div className="hidden lg:flex flex-col border-l bg-muted/20 overflow-hidden">
          <div className="px-4 py-3 border-b bg-card">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Resumo</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">
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
    </div>
  );
}
