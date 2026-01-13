import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
import { Plus, Package, MapPin, Truck, FileText, Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

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
  
  // Endereço de origem
  origem_cep: z.string().min(8, 'CEP inválido'),
  origem_logradouro: z.string().min(1, 'Logradouro é obrigatório'),
  origem_numero: z.string().optional(),
  origem_complemento: z.string().optional(),
  origem_bairro: z.string().optional(),
  origem_cidade: z.string().min(1, 'Cidade é obrigatória'),
  origem_estado: z.string().min(2, 'Estado é obrigatório'),
  origem_contato_nome: z.string().optional(),
  origem_contato_telefone: z.string().optional(),
  
  // Endereço de destino
  destino_cep: z.string().min(8, 'CEP inválido'),
  destino_logradouro: z.string().min(1, 'Logradouro é obrigatório'),
  destino_numero: z.string().optional(),
  destino_complemento: z.string().optional(),
  destino_bairro: z.string().optional(),
  destino_cidade: z.string().min(1, 'Cidade é obrigatória'),
  destino_estado: z.string().min(2, 'Estado é obrigatório'),
  destino_contato_nome: z.string().optional(),
  destino_contato_telefone: z.string().optional(),
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
      origem_cep: '',
      origem_logradouro: '',
      origem_cidade: '',
      origem_estado: '',
      destino_cep: '',
      destino_logradouro: '',
      destino_cidade: '',
      destino_estado: '',
    },
  });

  const requerRefrigeracao = form.watch('requer_refrigeracao');
  const cargaPerigosa = form.watch('carga_perigosa');

  const buscarCep = async (cep: string, tipo: 'origem' | 'destino') => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        form.setValue(`${tipo}_logradouro`, data.logradouro || '');
        form.setValue(`${tipo}_bairro`, data.bairro || '');
        form.setValue(`${tipo}_cidade`, data.localidade || '');
        form.setValue(`${tipo}_estado`, data.uf || '');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);

    try {
      // Verificar se o usuário está logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Você precisa estar logado para criar uma carga');
        setIsLoading(false);
        return;
      }

      // Buscar a empresa_id do usuário via database function
      const { data: empresaId, error: empresaError } = await supabase
        .rpc('get_user_empresa_id', { _user_id: user.id });

      if (empresaError || !empresaId) {
        toast.error('Você precisa estar vinculado a uma empresa para criar cargas');
        setIsLoading(false);
        return;
      }

      // Criar a carga
      const { data: carga, error: cargaError } = await supabase
        .from('cargas')
        .insert({
          empresa_id: empresaId,
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
          codigo: '', // será gerado pelo trigger
        })
        .select()
        .single();

      if (cargaError) {
        console.error('Erro ao criar carga:', cargaError);
        toast.error('Erro ao criar carga: ' + cargaError.message);
        setIsLoading(false);
        return;
      }

      // Criar endereço de origem
      const { error: origemError } = await supabase
        .from('enderecos_carga')
        .insert({
          carga_id: carga.id,
          tipo: 'origem',
          cep: values.origem_cep,
          logradouro: values.origem_logradouro,
          numero: values.origem_numero || null,
          complemento: values.origem_complemento || null,
          bairro: values.origem_bairro || null,
          cidade: values.origem_cidade,
          estado: values.origem_estado,
          contato_nome: values.origem_contato_nome || null,
          contato_telefone: values.origem_contato_telefone || null,
        });

      if (origemError) {
        console.error('Erro ao criar endereço de origem:', origemError);
        toast.error('Erro ao criar endereço de origem');
        setIsLoading(false);
        return;
      }

      // Criar endereço de destino
      const { error: destinoError } = await supabase
        .from('enderecos_carga')
        .insert({
          carga_id: carga.id,
          tipo: 'destino',
          cep: values.destino_cep,
          logradouro: values.destino_logradouro,
          numero: values.destino_numero || null,
          complemento: values.destino_complemento || null,
          bairro: values.destino_bairro || null,
          cidade: values.destino_cidade,
          estado: values.destino_estado,
          contato_nome: values.destino_contato_nome || null,
          contato_telefone: values.destino_contato_telefone || null,
        });

      if (destinoError) {
        console.error('Erro ao criar endereço de destino:', destinoError);
        toast.error('Erro ao criar endereço de destino');
        setIsLoading(false);
        return;
      }

      toast.success('Carga criada com sucesso!');
      form.reset();
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Nova Carga
          </DialogTitle>
          <DialogDescription>
            Preencha os dados da carga para cadastrá-la no sistema
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="carga" className="gap-2">
                  <Package className="w-4 h-4" />
                  Carga
                </TabsTrigger>
                <TabsTrigger value="origem" className="gap-2">
                  <MapPin className="w-4 h-4" />
                  Origem
                </TabsTrigger>
                <TabsTrigger value="destino" className="gap-2">
                  <Truck className="w-4 h-4" />
                  Destino
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
                          <SelectContent className="bg-popover border-border z-50">
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
                        <FormLabel>Valor da Mercadoria (R$)</FormLabel>
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
              </TabsContent>

              <TabsContent value="origem" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="origem_cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="00000-000" 
                            {...field}
                            onBlur={(e) => {
                              field.onBlur();
                              buscarCep(e.target.value, 'origem');
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="origem_estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado *</FormLabel>
                        <FormControl>
                          <Input placeholder="SP" maxLength={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="origem_cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade *</FormLabel>
                      <FormControl>
                        <Input placeholder="São Paulo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="origem_bairro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input placeholder="Centro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="origem_logradouro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logradouro *</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua, Avenida, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="origem_numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input placeholder="123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="origem_complemento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input placeholder="Galpão 2, Doca 5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="origem_contato_nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contato</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do responsável" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="origem_contato_telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(11) 99999-9999" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="destino" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="destino_cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="00000-000" 
                            {...field}
                            onBlur={(e) => {
                              field.onBlur();
                              buscarCep(e.target.value, 'destino');
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="destino_estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado *</FormLabel>
                        <FormControl>
                          <Input placeholder="SP" maxLength={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="destino_cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade *</FormLabel>
                      <FormControl>
                        <Input placeholder="São Paulo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="destino_bairro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input placeholder="Centro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="destino_logradouro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logradouro *</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua, Avenida, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="destino_numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input placeholder="123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="destino_complemento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input placeholder="Galpão 2, Doca 5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="destino_contato_nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contato</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do responsável" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="destino_contato_telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(11) 99999-9999" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
