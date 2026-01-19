import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  CreditCard,
  FileText,
  Upload,
  Phone,
  Building2,
  Link2,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import { MotoristaFormData, ESTADOS_BRASIL, CATEGORIAS_CNH } from '../types';

interface EtapaDadosPessoaisProps {
  formData: MotoristaFormData;
  updateFormData: (updates: Partial<MotoristaFormData>) => void;
}

export function EtapaDadosPessoais({ formData, updateFormData }: EtapaDadosPessoaisProps) {
  const cnhInputRef = useRef<HTMLInputElement>(null);
  const enderecoInputRef = useRef<HTMLInputElement>(null);
  const titularDocInputRef = useRef<HTMLInputElement>(null);
  const vinculoInputRef = useRef<HTMLInputElement>(null);

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
      const filePath = `motoristas/${folder}/${fileName}`;

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

  const updateReferencia = (tipo: 'pessoal' | 'comercial', ordem: number, field: string, value: string) => {
    const newRefs = formData.referencias.map(r => {
      if (r.tipo === tipo && r.ordem === ordem) {
        return { ...r, [field]: value };
      }
      return r;
    });
    updateFormData({ referencias: newRefs });
  };

  return (
    <div className="space-y-6">
      {/* Tipo de Cadastro */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <User className="w-4 h-4" />
          Tipo de Cadastro
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de Motorista *</Label>
            <Select
              value={formData.tipo_cadastro}
              onValueChange={(v) => updateFormData({ tipo_cadastro: v as 'autonomo' | 'frota' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="autonomo">Autônomo</SelectItem>
                <SelectItem value="frota">Frota (Empresa)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>UF do Motorista *</Label>
            <Select
              value={formData.uf}
              onValueChange={(v) => updateFormData({ uf: v })}
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

      {/* Dados Pessoais */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <User className="w-4 h-4" />
          Dados Pessoais
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome Completo *</Label>
            <Input
              placeholder="Nome do motorista"
              value={formData.nome_completo}
              onChange={(e) => updateFormData({ nome_completo: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>CPF *</Label>
            <Input
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChange={(e) => updateFormData({ cpf: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={formData.email}
              onChange={(e) => updateFormData({ email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              placeholder="(00) 00000-0000"
              value={formData.telefone}
              onChange={(e) => updateFormData({ telefone: e.target.value })}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* CNH */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <CreditCard className="w-4 h-4" />
          Carteira de Habilitação (CNH)
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Número CNH *</Label>
            <Input
              placeholder="00000000000"
              value={formData.cnh}
              onChange={(e) => updateFormData({ cnh: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria *</Label>
            <Select
              value={formData.categoria_cnh}
              onValueChange={(v) => updateFormData({ categoria_cnh: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS_CNH.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Validade CNH *</Label>
            <Input
              type="date"
              value={formData.validade_cnh}
              onChange={(e) => updateFormData({ validade_cnh: e.target.value })}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="cnh_qrcode"
            checked={formData.cnh_tem_qrcode}
            onCheckedChange={(checked) => updateFormData({ cnh_tem_qrcode: checked as boolean })}
          />
          <Label htmlFor="cnh_qrcode" className="text-sm">
            CNH Digital possui QR Code válido
          </Label>
        </div>

        {/* CNH Upload */}
        <div className="space-y-2">
          <Label>CNH Digital (arquivo/imagem/PDF)</Label>
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => cnhInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              {formData.cnh_digital_url ? 'Substituir' : 'Enviar CNH'}
            </Button>
            {formData.cnh_digital_url && (
              <span className="text-sm text-chart-2 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Arquivo enviado
              </span>
            )}
            <input
              ref={cnhInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, 'cnh', 'cnh_digital_url');
              }}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Comprovante de Endereço */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <FileText className="w-4 h-4" />
          Comprovante de Endereço
        </div>
        
        <div className="space-y-2">
          <Label>Comprovante de Endereço</Label>
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => enderecoInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              {formData.comprovante_endereco_url ? 'Substituir' : 'Enviar Comprovante'}
            </Button>
            {formData.comprovante_endereco_url && (
              <span className="text-sm text-chart-2 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Arquivo enviado
              </span>
            )}
            <input
              ref={enderecoInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, 'endereco', 'comprovante_endereco_url');
              }}
            />
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-4">
          <p className="text-sm text-muted-foreground">
            Se o comprovante estiver em nome de outra pessoa, preencha os dados do titular:
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Titular do Comprovante</Label>
              <Input
                placeholder="Nome do titular"
                value={formData.comprovante_endereco_titular_nome}
                onChange={(e) => updateFormData({ comprovante_endereco_titular_nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Documento do Titular</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => titularDocInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4" />
                  {formData.comprovante_endereco_titular_doc_url ? 'Substituir' : 'Enviar'}
                </Button>
                {formData.comprovante_endereco_titular_doc_url && (
                  <span className="text-xs text-chart-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Enviado
                  </span>
                )}
                <input
                  ref={titularDocInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'titular', 'comprovante_endereco_titular_doc_url');
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comprovante de Vínculo (se frota) */}
      {formData.tipo_cadastro === 'frota' && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Link2 className="w-4 h-4" />
              Comprovante de Vínculo com a Empresa
            </div>
            <div className="space-y-2">
              <Label>Comprovante de Vínculo *</Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => vinculoInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4" />
                  {formData.comprovante_vinculo_url ? 'Substituir' : 'Enviar Comprovante'}
                </Button>
                {formData.comprovante_vinculo_url && (
                  <span className="text-sm text-chart-2 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Arquivo enviado
                  </span>
                )}
                <input
                  ref={vinculoInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'vinculo', 'comprovante_vinculo_url');
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Obrigatório para motoristas de frota
              </p>
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Referências */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Phone className="w-4 h-4" />
          Referências Pessoais (2 contatos)
        </div>
        <div className="grid grid-cols-2 gap-4">
          {formData.referencias.filter(r => r.tipo === 'pessoal').map((ref) => (
            <div key={`pessoal-${ref.ordem}`} className="space-y-2 p-3 border border-border rounded-lg">
              <p className="text-sm font-medium">Referência Pessoal {ref.ordem}</p>
              <Input
                placeholder="Nome"
                value={ref.nome}
                onChange={(e) => updateReferencia('pessoal', ref.ordem, 'nome', e.target.value)}
              />
              <Input
                placeholder="Telefone"
                value={ref.telefone}
                onChange={(e) => updateReferencia('pessoal', ref.ordem, 'telefone', e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Building2 className="w-4 h-4" />
          Referências Comerciais (2 contatos)
        </div>
        <p className="text-xs text-muted-foreground">
          Preferência por referência do ramo de transporte; em último caso, comércio local
        </p>
        <div className="grid grid-cols-2 gap-4">
          {formData.referencias.filter(r => r.tipo === 'comercial').map((ref) => (
            <div key={`comercial-${ref.ordem}`} className="space-y-2 p-3 border border-border rounded-lg">
              <p className="text-sm font-medium">Referência Comercial {ref.ordem}</p>
              <Input
                placeholder="Empresa/Nome"
                value={ref.nome}
                onChange={(e) => updateReferencia('comercial', ref.ordem, 'nome', e.target.value)}
              />
              <Input
                placeholder="Telefone"
                value={ref.telefone}
                onChange={(e) => updateReferencia('comercial', ref.ordem, 'telefone', e.target.value)}
              />
              <Input
                placeholder="Ramo (opcional)"
                value={ref.ramo || ''}
                onChange={(e) => updateReferencia('comercial', ref.ordem, 'ramo', e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
