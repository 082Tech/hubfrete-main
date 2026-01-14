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
import { Plus, Package, MapPin, Truck, Loader2, ClipboardList } from 'lucide-react';
import type { LocationData } from '@/components/maps/LocationPickerMap';
import type { Database } from '@/integrations/supabase/types';
import { OrigemSection } from './OrigemSection';
import { DestinoSection } from './DestinoSection';
import { NecessidadesEspeciais } from './NecessidadesEspeciais';
import { NotaFiscalUpload } from './NotaFiscalUpload';

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
  quantidade: z.coerce.number().min(1).default(1),
  valor_mercadoria: z.coerce.number().optional(),
  
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
  
  // Additional state for new fields
  const [necessidadesEspeciais, setNecessidadesEspeciais] = useState<string[]>([]);
  const [notaFiscalUrl, setNotaFiscalUrl] = useState<string | null>(null);
  
  // Location data for origin and destination
  const [origemData, setOrigemData] = useState<LocationData>({
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
  });
  
  const [destinoData, setDestinoData] = useState<LocationData>({
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
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descricao: '',
      tipo: 'carga_seca',
      peso_kg: 0,
      quantidade: 1,
      carga_fragil: false,
      carga_perigosa: false,
      carga_viva: false,
      empilhavel: true,
      requer_refrigeracao: false,
      regras_carregamento: '',
    },
  });

  const requerRefrigeracao = form.watch('requer_refrigeracao');
  const cargaPerigosa = form.watch('carga_perigosa');

  const validateLocations = (): boolean => {
    if (!origemData.cidade || !origemData.logradouro) {
      toast.error('Verifique os dados de origem');
      setActiveTab('origem');
      return false;
    }
    if (!destinoData.cidade || !destinoData.logradouro) {
      toast.error('Selecione o local de destino no mapa');
      setActiveTab('destino');
      return false;
    }
    return true;
  };

  const onSubmit = async (values: FormValues) => {
    if (!validateLocations()) return;
    
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Você precisa estar logado para criar uma carga');
        setIsLoading(false);
        return;
      }

      const { data: empresaId, error: empresaError } = await supabase
        .rpc('get_user_empresa_id', { _user_id: user.id });

      if (empresaError || !empresaId) {
        toast.error('Você precisa estar vinculado a uma empresa para criar cargas');
        setIsLoading(false);
        return;
      }

      // Create the load with filial_id
      const { data: carga, error: cargaError } = await supabase
        .from('cargas')
        .insert({
          empresa_id: empresaId,
          filial_id: filialAtiva?.id || null,
          descricao: values.descricao,
          tipo: values.tipo,
          peso_kg: values.peso_kg,
          volume_m3: values.volume_m3 || null,
          quantidade: values.quantidade,
          valor_mercadoria: values.valor_mercadoria || null,
          carga_fragil: values.carga_fragil,
          carga_perigosa: values.carga_perigosa,
          carga_viva: values.carga_viva,
          empilhavel: values.empilhavel,
          requer_refrigeracao: values.requer_refrigeracao,
          temperatura_min: values.temperatura_min || null,
          temperatura_max: values.temperatura_max || null,
          numero_onu: values.numero_onu || null,
          data_coleta_de: values.data_coleta_de,
          data_coleta_ate: values.data_coleta_ate || null,
          data_entrega_limite: values.data_entrega_limite || null,
          status: 'rascunho',
          codigo: '',
          // New fields
          necessidades_especiais: necessidadesEspeciais,
          regras_carregamento: values.regras_carregamento || null,
          nota_fiscal_url: notaFiscalUrl,
        })
        .select()
        .single();

      if (cargaError) {
        console.error('Erro ao criar carga:', cargaError);
        toast.error('Erro ao criar carga: ' + cargaError.message);
        setIsLoading(false);
        return;
      }

      // Create origin address with coordinates
      const { error: origemError } = await supabase
        .from('enderecos_carga')
        .insert({
          carga_id: carga.id,
          tipo: 'origem',
          cep: origemData.cep,
          logradouro: origemData.logradouro,
          numero: origemData.numero || null,
          complemento: origemData.complemento || null,
          bairro: origemData.bairro || null,
          cidade: origemData.cidade,
          estado: origemData.estado,
          contato_nome: origemData.contato_nome || null,
          contato_telefone: origemData.contato_telefone || null,
          latitude: origemData.latitude || null,
          longitude: origemData.longitude || null,
        });

      if (origemError) {
        console.error('Erro ao criar endereço de origem:', origemError);
        toast.error('Erro ao criar endereço de origem');
        setIsLoading(false);
        return;
      }

      // Create destination address with coordinates
      const { error: destinoError } = await supabase
        .from('enderecos_carga')
        .insert({
          carga_id: carga.id,
          tipo: 'destino',
          cep: destinoData.cep,
          logradouro: destinoData.logradouro,
          numero: destinoData.numero || null,
          complemento: destinoData.complemento || null,
          bairro: destinoData.bairro || null,
          cidade: destinoData.cidade,
          estado: destinoData.estado,
          contato_nome: destinoData.contato_nome || null,
          contato_telefone: destinoData.contato_telefone || null,
          latitude: destinoData.latitude || null,
          longitude: destinoData.longitude || null,
        });

      if (destinoError) {
        console.error('Erro ao criar endereço de destino:', destinoError);
        toast.error('Erro ao criar endereço de destino');
        setIsLoading(false);
        return;
      }

      toast.success('Carga criada com sucesso!');
      form.reset();
      setNecessidadesEspeciais([]);
      setNotaFiscalUrl(null);
      setOrigemData({
        latitude: 0, longitude: 0, cep: '', logradouro: '', numero: '',
        complemento: '', bairro: '', cidade: '', estado: '',
        contato_nome: '', contato_telefone: '',
      });
      setDestinoData({
        latitude: 0, longitude: 0, cep: '', logradouro: '', numero: '',
        complemento: '', bairro: '', cidade: '', estado: '',
        contato_nome: '', contato_telefone: '',
      });
      setOpen(false);
      setActiveTab('carga');
      onSuccess?.();
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao criar carga');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              <TabsList className="grid w-full grid-cols-4">
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
                  <span className="hidden sm:inline">Origem</span>
                </TabsTrigger>
                <TabsTrigger value="destino" className="gap-2">
                  <Truck className="w-4 h-4" />
                  <span className="hidden sm:inline">Destino</span>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    name="quantidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="1" {...field} />
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
                        <FormLabel>Valor (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                <OrigemSection
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
