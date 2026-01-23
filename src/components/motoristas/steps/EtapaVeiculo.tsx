import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Car, Container, Upload, CheckCircle, FileText, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import { MotoristaFormData, VeiculoSimples, CarroceriaSimples, tipoVeiculoLabels, tipoCarroceriaLabels } from '../types';

interface EtapaVeiculoProps {
  formData: MotoristaFormData;
  updateFormData: (updates: Partial<MotoristaFormData>) => void;
  veiculosDisponiveis: VeiculoSimples[];
  carroceriasDisponiveis: CarroceriaSimples[];
}

export function EtapaVeiculo({
  formData,
  updateFormData,
  veiculosDisponiveis,
  carroceriasDisponiveis,
}: EtapaVeiculoProps) {
  const docVeiculoInputRef = useRef<HTMLInputElement>(null);
  const enderecoProprietarioInputRef = useRef<HTMLInputElement>(null);

  const veiculosSemMotorista = veiculosDisponiveis.filter(v => !v.motorista_id);
  const carroceriasSemMotorista = carroceriasDisponiveis.filter(c => !c.motorista_id);

  const selectedVeiculo = veiculosDisponiveis.find(v => v.id === formData.veiculo_id);
  const selectedCarroceria = carroceriasDisponiveis.find(c => c.id === formData.carroceria_id);

  const handleFileUpload = async (
    file: File,
    folder: string,
    fieldName: keyof MotoristaFormData
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

      updateFormData({ [fieldName]: urlData.publicUrl });
      toast.success('Arquivo enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar arquivo');
    }
  };

  return (
    <div className="space-y-6">
      {/* Seleção de Veículo */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Car className="w-4 h-4" />
          Veículo (Cavalo)
        </div>
        
        <div className="space-y-2">
          <Label>Selecione o Veículo</Label>
          <Select
            value={formData.veiculo_id}
            onValueChange={(v) => {
              updateFormData({ veiculo_id: v });
              // Auto-fill UF if vehicle has one
              const veiculo = veiculosDisponiveis.find(ve => ve.id === v);
              if (veiculo?.uf) {
                updateFormData({ veiculo_uf: veiculo.uf });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um veículo disponível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhum veículo</SelectItem>
              {veiculosSemMotorista.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.placa} - {tipoVeiculoLabels[v.tipo] || v.tipo}
                  {v.marca && ` (${v.marca})`}
                  {v.uf && ` - ${v.uf}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Apenas veículos sem motorista atribuído
          </p>
        </div>
      </div>

      {/* Documentos do Veículo PF */}
      {formData.veiculo_id && (
        <>
          <Separator />
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <FileText className="w-4 h-4" />
              Documentação do Veículo (PF)
            </div>

            {/* Veículo selecionado info */}
            {selectedVeiculo && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">
                  <strong>Veículo:</strong> {selectedVeiculo.placa} - {tipoVeiculoLabels[selectedVeiculo.tipo] || selectedVeiculo.tipo}
                  {selectedVeiculo.marca && ` ${selectedVeiculo.marca}`}
                  {selectedVeiculo.modelo && ` ${selectedVeiculo.modelo}`}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ANTT/RNTRC</Label>
                <Input
                  placeholder="Número RNTRC"
                  value={formData.veiculo_antt_rntrc}
                  onChange={(e) => updateFormData({ veiculo_antt_rntrc: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Documento do Veículo (CRLV)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => docVeiculoInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4" />
                    {formData.veiculo_documento_url ? 'Substituir' : 'Enviar'}
                  </Button>
                  {formData.veiculo_documento_url && (
                    <span className="text-xs text-chart-2 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Enviado
                    </span>
                  )}
                  <input
                    ref={docVeiculoInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'documento', 'veiculo_documento_url');
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Dados do Proprietário */}
            <div className="space-y-4 p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="w-4 h-4" />
                Dados do Proprietário
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Proprietário</Label>
                  <Input
                    placeholder="Nome completo"
                    value={formData.veiculo_proprietario_nome}
                    onChange={(e) => updateFormData({ veiculo_proprietario_nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF/CNPJ do Proprietário</Label>
                  <MaskedInput
                    mask="cpfCnpj"
                    placeholder="000.000.000-00"
                    value={formData.veiculo_proprietario_cpf_cnpj}
                    onChange={(value) => updateFormData({ veiculo_proprietario_cpf_cnpj: value })}
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
                    {formData.veiculo_comprovante_endereco_proprietario_url ? 'Substituir' : 'Enviar'}
                  </Button>
                  {formData.veiculo_comprovante_endereco_proprietario_url && (
                    <span className="text-sm text-chart-2 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Arquivo enviado
                    </span>
                  )}
                  <input
                    ref={enderecoProprietarioInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'proprietario', 'veiculo_comprovante_endereco_proprietario_url');
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Seleção de Carroceria */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Container className="w-4 h-4" />
          Carroceria (Implemento)
        </div>
        
        <div className="space-y-2">
          <Label>Selecione a Carroceria</Label>
          <Select
            value={formData.carroceria_id}
            onValueChange={(v) => updateFormData({ carroceria_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma carroceria disponível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhuma carroceria</SelectItem>
              {carroceriasSemMotorista.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.placa} - {tipoCarroceriaLabels[c.tipo] || c.tipo}
                  {c.marca && ` (${c.marca})`}
                  {c.capacidade_kg && ` - ${c.capacidade_kg.toLocaleString()}kg`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Apenas carrocerias sem motorista atribuído
          </p>
        </div>

        {/* Carroceria selecionada info */}
        {selectedCarroceria && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm">
              <strong>Carroceria:</strong> {selectedCarroceria.placa} - {tipoCarroceriaLabels[selectedCarroceria.tipo] || selectedCarroceria.tipo}
              {selectedCarroceria.marca && ` ${selectedCarroceria.marca}`}
              {selectedCarroceria.modelo && ` ${selectedCarroceria.modelo}`}
            </p>
            {(selectedCarroceria.capacidade_kg || selectedCarroceria.capacidade_m3) && (
              <p className="text-sm text-muted-foreground">
                Capacidade: {selectedCarroceria.capacidade_kg?.toLocaleString()}kg 
                {selectedCarroceria.capacidade_m3 && ` / ${selectedCarroceria.capacidade_m3}m³`}
              </p>
            )}
          </div>
        )}
      </div>

      {!formData.veiculo_id && !formData.carroceria_id && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Car className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Selecione um veículo e/ou carroceria para vincular ao motorista.
            Você pode cadastrar novos equipamentos em "Minha Frota".
          </p>
        </div>
      )}
    </div>
  );
}
