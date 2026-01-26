import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Car, 
  Loader2, 
  Upload, 
  CheckCircle, 
  FileText, 
  MapPin,
  User,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const ESTADOS_BRASIL = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

const tipoVeiculoLabels: Record<string, string> = {
  truck: 'Truck',
  toco: 'Toco',
  tres_quartos: '3/4',
  vuc: 'VUC',
  carreta: 'Carreta',
  carreta_ls: 'Carreta LS',
  bitrem: 'Bitrem',
  rodotrem: 'Rodotrem',
  vanderleia: 'Vanderleia',
  bitruck: 'Bitruck',
};

const tipoPropriedadeLabels: Record<string, string> = {
  pf: 'Pessoa Física',
  pj: 'Pessoa Jurídica',
};

interface Veiculo {
  id: string;
  placa: string;
  tipo: string;
  carroceria: string;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  renavam: string | null;
  uf: string | null;
  antt_rntrc: string | null;
  documento_veiculo_url: string | null;
  comprovante_endereco_proprietario_url: string | null;
  proprietario_nome: string | null;
  proprietario_cpf_cnpj: string | null;
  tipo_propriedade: 'pf' | 'pj' | null;
  ativo: boolean;
  seguro_ativo: boolean;
  rastreador: boolean;
  capacidade_kg: number | null;
  capacidade_m3: number | null;
  carroceria_integrada: boolean;
}

// Tipos de veículo que tipicamente têm carroceria integrada
const VEICULOS_COM_CARROCERIA_INTEGRADA = ['vuc', 'tres_quartos', 'toco', 'truck', 'bitruck'];

const tipoCarroceriaLabels: Record<string, string> = {
  aberta: 'Aberta',
  fechada_bau: 'Baú',
  graneleira: 'Graneleira',
  tanque: 'Tanque',
  sider: 'Sider',
  frigorifico: 'Frigorífico',
  cegonha: 'Cegonha',
  prancha: 'Prancha',
  container: 'Container',
  graneleiro: 'Graneleiro',
  grade_baixa: 'Grade Baixa',
  cacamba: 'Caçamba',
  plataforma: 'Plataforma',
  bau: 'Baú',
  bau_frigorifico: 'Baú Frigorífico',
  bau_refrigerado: 'Baú Refrigerado',
  silo: 'Silo',
  gaiola: 'Gaiola',
  bug_porta_container: 'Bug Porta Container',
  munk: 'Munk',
  apenas_cavalo: 'Apenas Cavalo',
  cavaqueira: 'Cavaqueira',
  hopper: 'Hopper',
};

interface VeiculoEditDialogProps {
  veiculo: Veiculo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VeiculoEditDialog({ veiculo, open, onOpenChange }: VeiculoEditDialogProps) {
  const queryClient = useQueryClient();
  const documentoInputRef = useRef<HTMLInputElement>(null);
  const enderecoProprietarioInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    placa: '',
    tipo: '',
    carroceria: 'apenas_cavalo',
    marca: '',
    modelo: '',
    ano: '',
    renavam: '',
    uf: '',
    antt_rntrc: '',
    documento_veiculo_url: null as string | null,
    comprovante_endereco_proprietario_url: null as string | null,
    proprietario_nome: '',
    proprietario_cpf_cnpj: '',
    tipo_propriedade: 'pf' as 'pf' | 'pj',
    ativo: true,
    seguro_ativo: false,
    rastreador: false,
    capacidade_kg: '',
    capacidade_m3: '',
    carroceria_integrada: false,
  });

  useEffect(() => {
    if (veiculo) {
      setFormData({
        placa: veiculo.placa || '',
        tipo: veiculo.tipo || '',
        carroceria: veiculo.carroceria || 'apenas_cavalo',
        marca: veiculo.marca || '',
        modelo: veiculo.modelo || '',
        ano: veiculo.ano?.toString() || '',
        renavam: veiculo.renavam || '',
        uf: veiculo.uf || '',
        antt_rntrc: veiculo.antt_rntrc || '',
        documento_veiculo_url: veiculo.documento_veiculo_url,
        comprovante_endereco_proprietario_url: veiculo.comprovante_endereco_proprietario_url,
        proprietario_nome: veiculo.proprietario_nome || '',
        proprietario_cpf_cnpj: veiculo.proprietario_cpf_cnpj || '',
        tipo_propriedade: veiculo.tipo_propriedade || 'pf',
        ativo: veiculo.ativo ?? true,
        seguro_ativo: veiculo.seguro_ativo ?? false,
        rastreador: veiculo.rastreador ?? false,
        capacidade_kg: veiculo.capacidade_kg?.toString() || '',
        capacidade_m3: veiculo.capacidade_m3?.toString() || '',
        carroceria_integrada: veiculo.carroceria_integrada ?? false,
      });
    }
  }, [veiculo]);

  const handleFileUpload = async (
    file: File,
    folder: string,
    fieldName: 'documento_veiculo_url' | 'comprovante_endereco_proprietario_url'
  ) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo deve ter no máximo 5MB');
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `veiculos/${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('notas-fiscais')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('notas-fiscais')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, [fieldName]: urlData.publicUrl }));
      toast.success('Arquivo enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar arquivo');
    }
  };

  const updateVeiculo = useMutation({
    mutationFn: async () => {
      if (!veiculo) return;

      const { error } = await supabase
        .from('veiculos')
        .update({
          placa: formData.placa.toUpperCase(),
          tipo: formData.tipo as any,
          carroceria: formData.carroceria_integrada ? (formData.carroceria as any) : ('apenas_cavalo' as any),
          marca: formData.marca || null,
          modelo: formData.modelo || null,
          ano: formData.ano ? parseInt(formData.ano) : null,
          renavam: formData.renavam || null,
          uf: formData.uf || null,
          antt_rntrc: formData.antt_rntrc || null,
          documento_veiculo_url: formData.documento_veiculo_url,
          comprovante_endereco_proprietario_url: formData.comprovante_endereco_proprietario_url,
          proprietario_nome: formData.proprietario_nome || null,
          proprietario_cpf_cnpj: formData.proprietario_cpf_cnpj || null,
          tipo_propriedade: formData.tipo_propriedade as any,
          ativo: formData.ativo,
          seguro_ativo: formData.seguro_ativo,
          rastreador: formData.rastreador,
          carroceria_integrada: formData.carroceria_integrada,
          capacidade_kg: formData.carroceria_integrada && formData.capacidade_kg ? parseFloat(formData.capacidade_kg) : null,
          capacidade_m3: formData.carroceria_integrada && formData.capacidade_m3 ? parseFloat(formData.capacidade_m3) : null,
        })
        .eq('id', veiculo.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Veículo atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['veiculos_transportadora'] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Erro ao atualizar veículo:', error);
      toast.error('Erro ao atualizar veículo');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.placa || !formData.tipo) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    updateVeiculo.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            Editar Veículo - {veiculo?.placa}
          </DialogTitle>
          <DialogDescription>
            Atualize os dados do veículo, documentação e proprietário
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Básicos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Car className="w-4 h-4" />
              Dados do Veículo
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Placa *</Label>
                <MaskedInput
                  mask="plate"
                  placeholder="ABC-1234"
                  value={formData.placa}
                  onChange={(value) => setFormData({ ...formData, placa: value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Veículo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) => {
                    // Auto-set carroceria_integrada based on vehicle type
                    const hasIntegrated = VEICULOS_COM_CARROCERIA_INTEGRADA.includes(v);
                    setFormData({ 
                      ...formData, 
                      tipo: v,
                      carroceria_integrada: hasIntegrated,
                      carroceria: hasIntegrated ? (formData.carroceria === 'apenas_cavalo' ? 'fechada_bau' : formData.carroceria) : 'apenas_cavalo',
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoVeiculoLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Carroceria Integrada Switch */}
            <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label>Carroceria Integrada</Label>
                <p className="text-xs text-muted-foreground">
                  Marque se o veículo já possui carroceria própria (ex: Toco, Truck com baú)
                </p>
              </div>
              <Switch
                checked={formData.carroceria_integrada}
                onCheckedChange={(checked) => setFormData({ 
                  ...formData, 
                  carroceria_integrada: checked,
                  carroceria: checked ? (formData.carroceria === 'apenas_cavalo' ? 'fechada_bau' : formData.carroceria) : 'apenas_cavalo',
                  capacidade_kg: checked ? formData.capacidade_kg : '',
                  capacidade_m3: checked ? formData.capacidade_m3 : '',
                })}
              />
            </div>

            {/* Campos de carroceria integrada */}
            {formData.carroceria_integrada && (
              <>
                <div className="space-y-2">
                  <Label>Tipo de Carroceria *</Label>
                  <Select
                    value={formData.carroceria}
                    onValueChange={(v) => setFormData({ ...formData, carroceria: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(tipoCarroceriaLabels)
                        .filter(([value]) => value !== 'apenas_cavalo')
                        .map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Capacidade (kg) *</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 8000"
                      value={formData.capacidade_kg}
                      onChange={(e) => setFormData({ ...formData, capacidade_kg: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacidade (m³)</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 45"
                      value={formData.capacidade_m3}
                      onChange={(e) => setFormData({ ...formData, capacidade_m3: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input
                  placeholder="Ex: Volvo"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input
                  placeholder="Ex: FH 540"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Input
                  type="number"
                  placeholder="2024"
                  value={formData.ano}
                  onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Renavam</Label>
                <MaskedInput
                  mask="renavam"
                  placeholder="00000000000"
                  value={formData.renavam}
                  onChange={(value) => setFormData({ ...formData, renavam: value })}
                />
              </div>
              <div className="space-y-2">
                <Label>UF do Veículo</Label>
                <Select
                  value={formData.uf}
                  onValueChange={(v) => setFormData({ ...formData, uf: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BRASIL.map((estado) => (
                      <SelectItem key={estado.value} value={estado.value}>
                        {estado.value} - {estado.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* ANTT e Documentação */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <FileText className="w-4 h-4" />
              ANTT e Documentação
            </div>
            <div className="space-y-2">
              <Label>ANTT / RNTRC *</Label>
              <MaskedInput
                mask="rntrc"
                placeholder="Número do RNTRC"
                value={formData.antt_rntrc}
                onChange={(value) => setFormData({ ...formData, antt_rntrc: value })}
              />
              <p className="text-xs text-muted-foreground">
                Número do Registro Nacional de Transportadores Rodoviários de Cargas
              </p>
            </div>
            <div className="space-y-2">
              <Label>Documento do Veículo (CRLV)</Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => documentoInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4" />
                  {formData.documento_veiculo_url ? 'Substituir' : 'Enviar Documento'}
                </Button>
                {formData.documento_veiculo_url && (
                  <span className="text-sm text-chart-2 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Documento enviado
                  </span>
                )}
                <input
                  ref={documentoInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'documento', 'documento_veiculo_url');
                  }}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Proprietário */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <User className="w-4 h-4" />
              Dados do Proprietário
            </div>
            <div className="space-y-2">
              <Label>Tipo de Propriedade</Label>
              <Select
                value={formData.tipo_propriedade}
                onValueChange={(v) => setFormData({ ...formData, tipo_propriedade: v as 'pf' | 'pj' })}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(tipoPropriedadeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Proprietário</Label>
                <Input
                  placeholder={formData.tipo_propriedade === 'pj' ? 'Razão Social' : 'Nome completo'}
                  value={formData.proprietario_nome}
                  onChange={(e) => setFormData({ ...formData, proprietario_nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{formData.tipo_propriedade === 'pj' ? 'CNPJ' : 'CPF'}</Label>
                <MaskedInput
                  mask={formData.tipo_propriedade === 'pj' ? 'cnpj' : 'cpf'}
                  placeholder={formData.tipo_propriedade === 'pj' ? '00.000.000/0000-00' : '000.000.000-00'}
                  value={formData.proprietario_cpf_cnpj}
                  onChange={(value) => setFormData({ ...formData, proprietario_cpf_cnpj: value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comprovante de Endereço do Proprietário</Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => enderecoProprietarioInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4" />
                  {formData.comprovante_endereco_proprietario_url ? 'Substituir' : 'Enviar Comprovante'}
                </Button>
                {formData.comprovante_endereco_proprietario_url && (
                  <span className="text-sm text-chart-2 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Comprovante enviado
                  </span>
                )}
                <input
                  ref={enderecoProprietarioInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'proprietario', 'comprovante_endereco_proprietario_url');
                  }}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <CreditCard className="w-4 h-4" />
              Status
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <Label>Ativo</Label>
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <Label>Seguro Ativo</Label>
                <Switch
                  checked={formData.seguro_ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, seguro_ativo: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <Label>Rastreador</Label>
                <Switch
                  checked={formData.rastreador}
                  onCheckedChange={(checked) => setFormData({ ...formData, rastreador: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateVeiculo.isPending}>
              {updateVeiculo.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
