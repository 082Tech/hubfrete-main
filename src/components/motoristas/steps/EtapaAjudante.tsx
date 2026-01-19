import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Upload, CheckCircle, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import { MotoristaFormData } from '../types';

interface EtapaAjudanteProps {
  formData: MotoristaFormData;
  updateFormData: (updates: Partial<MotoristaFormData>) => void;
}

export function EtapaAjudante({ formData, updateFormData }: EtapaAjudanteProps) {
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
      const filePath = `ajudantes/${folder}/${fileName}`;

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
      {/* Toggle Possui Ajudante */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <UserPlus className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium">Possui Ajudante?</p>
            <p className="text-sm text-muted-foreground">
              Cadastre um ajudante vinculado a este motorista
            </p>
          </div>
        </div>
        <Switch
          checked={formData.possui_ajudante}
          onCheckedChange={(checked) => updateFormData({ possui_ajudante: checked })}
        />
      </div>

      {formData.possui_ajudante && (
        <>
          <Separator />

          {/* Tipo de Cadastro do Ajudante */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <UserPlus className="w-4 h-4" />
              Dados do Ajudante
            </div>
            
            <div className="space-y-2">
              <Label>Tipo do Ajudante *</Label>
              <Select
                value={formData.ajudante_tipo_cadastro}
                onValueChange={(v) => updateFormData({ ajudante_tipo_cadastro: v as 'autonomo' | 'frota' })}
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
          </div>

          {/* Dados Pessoais do Ajudante */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input
                  placeholder="Nome do ajudante"
                  value={formData.ajudante_nome}
                  onChange={(e) => updateFormData({ ajudante_nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CPF *</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={formData.ajudante_cpf}
                  onChange={(e) => updateFormData({ ajudante_cpf: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={formData.ajudante_telefone}
                onChange={(e) => updateFormData({ ajudante_telefone: e.target.value })}
              />
            </div>
          </div>

          {/* Comprovante de Vínculo (se frota) */}
          {formData.ajudante_tipo_cadastro === 'frota' && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Link2 className="w-4 h-4" />
                  Comprovante de Vínculo do Ajudante
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
                      {formData.ajudante_comprovante_vinculo_url ? 'Substituir' : 'Enviar Comprovante'}
                    </Button>
                    {formData.ajudante_comprovante_vinculo_url && (
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
                        if (file) handleFileUpload(file, 'vinculo', 'ajudante_comprovante_vinculo_url');
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Obrigatório para ajudantes de frota
                  </p>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {!formData.possui_ajudante && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <UserPlus className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Sem Ajudante
          </h3>
          <p className="text-muted-foreground max-w-md">
            Ative a opção acima se o motorista trabalha com um ajudante.
            Você poderá cadastrar os dados e documentos do ajudante.
          </p>
        </div>
      )}
    </div>
  );
}
