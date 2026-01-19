import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Loader2, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

import { MotoristaFormData, VeiculoSimples, CarroceriaSimples, getInitialFormData } from './types';
import { EtapaDadosPessoais } from './steps/EtapaDadosPessoais';
import { EtapaAjudante } from './steps/EtapaAjudante';
import { EtapaVeiculo } from './steps/EtapaVeiculo';
import { EtapaResumo } from './steps/EtapaResumo';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MotoristaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: number;
  veiculosDisponiveis: VeiculoSimples[];
  carroceriasDisponiveis: CarroceriaSimples[];
  editingMotorista?: any; // For edit mode
}

const STEPS = [
  { id: 1, title: 'Dados Pessoais', description: 'Informações e documentos do motorista' },
  { id: 2, title: 'Ajudante', description: 'Cadastro de ajudante (opcional)' },
  { id: 3, title: 'Veículo', description: 'Vinculação de veículo e carroceria' },
  { id: 4, title: 'Resumo', description: 'Confirme as informações' },
];

export function MotoristaFormDialog({
  open,
  onOpenChange,
  empresaId,
  veiculosDisponiveis,
  carroceriasDisponiveis,
  editingMotorista,
}: MotoristaFormDialogProps) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<MotoristaFormData>(getInitialFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ufWarning, setUfWarning] = useState(false);

  // Check UF mismatch
  const checkUfMismatch = () => {
    const selectedVeiculo = veiculosDisponiveis.find(v => v.id === formData.veiculo_id);
    if (formData.uf && selectedVeiculo?.uf && formData.uf !== selectedVeiculo.uf) {
      setUfWarning(true);
    } else {
      setUfWarning(false);
    }
  };

  const updateFormData = (updates: Partial<MotoristaFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate step 1
      if (!formData.nome_completo || !formData.cpf || !formData.cnh || !formData.categoria_cnh || !formData.validade_cnh || !formData.uf) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }
      // Check references
      const refPessoais = formData.referencias.filter(r => r.tipo === 'pessoal');
      const refComerciais = formData.referencias.filter(r => r.tipo === 'comercial');
      if (refPessoais.some(r => !r.nome || !r.telefone) || refComerciais.some(r => !r.nome || !r.telefone)) {
        toast.error('Preencha todas as referências pessoais e comerciais');
        return;
      }
      if (formData.tipo_cadastro === 'frota' && !formData.comprovante_vinculo_url) {
        toast.error('Motorista de frota requer comprovante de vínculo');
        return;
      }
    }
    
    if (currentStep === 2) {
      // Validate ajudante if exists
      if (formData.possui_ajudante) {
        if (!formData.ajudante_nome || !formData.ajudante_cpf) {
          toast.error('Preencha os dados do ajudante');
          return;
        }
        if (formData.ajudante_tipo_cadastro === 'frota' && !formData.ajudante_comprovante_vinculo_url) {
          toast.error('Ajudante de frota requer comprovante de vínculo');
          return;
        }
      }
    }

    if (currentStep === 3) {
      checkUfMismatch();
    }

    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Create motorista
      const { data: motoristaData, error: motoristaError } = await supabase
        .from('motoristas')
        .insert({
          nome_completo: formData.nome_completo,
          cpf: formData.cpf.replace(/\D/g, ''),
          email: formData.email || null,
          telefone: formData.telefone || null,
          uf: formData.uf,
          tipo_cadastro: formData.tipo_cadastro,
          cnh: formData.cnh,
          categoria_cnh: formData.categoria_cnh,
          validade_cnh: formData.validade_cnh,
          cnh_tem_qrcode: formData.cnh_tem_qrcode,
          cnh_digital_url: formData.cnh_digital_url,
          comprovante_endereco_url: formData.comprovante_endereco_url,
          comprovante_endereco_titular_nome: formData.comprovante_endereco_titular_nome || null,
          comprovante_endereco_titular_doc_url: formData.comprovante_endereco_titular_doc_url,
          comprovante_vinculo_url: formData.comprovante_vinculo_url,
          possui_ajudante: formData.possui_ajudante,
          empresa_id: empresaId,
          user_id: session?.user?.id || crypto.randomUUID(),
          ativo: true,
        })
        .select('id')
        .single();

      if (motoristaError) throw motoristaError;

      const motoristaId = motoristaData.id;

      // 2. Create references
      const refsToInsert = formData.referencias
        .filter(r => r.nome && r.telefone)
        .map(r => ({
          motorista_id: motoristaId,
          tipo: r.tipo,
          ordem: r.ordem,
          nome: r.nome,
          telefone: r.telefone,
          empresa: r.empresa || null,
          ramo: r.ramo || null,
        }));

      if (refsToInsert.length > 0) {
        const { error: refsError } = await supabase
          .from('motorista_referencias')
          .insert(refsToInsert);
        if (refsError) console.error('Erro ao salvar referências:', refsError);
      }

      // 3. Create ajudante if exists
      if (formData.possui_ajudante && formData.ajudante_nome) {
        const { error: ajudanteError } = await supabase
          .from('ajudantes')
          .insert({
            motorista_id: motoristaId,
            nome: formData.ajudante_nome,
            cpf: formData.ajudante_cpf.replace(/\D/g, ''),
            telefone: formData.ajudante_telefone || null,
            tipo_cadastro: formData.ajudante_tipo_cadastro,
            comprovante_vinculo_url: formData.ajudante_comprovante_vinculo_url,
            ativo: true,
          });
        if (ajudanteError) console.error('Erro ao salvar ajudante:', ajudanteError);
      }

      // 4. Link vehicle
      if (formData.veiculo_id) {
        const veiculoUpdates: any = { motorista_id: motoristaId };
        if (formData.veiculo_antt_rntrc) veiculoUpdates.antt_rntrc = formData.veiculo_antt_rntrc;
        if (formData.veiculo_documento_url) veiculoUpdates.documento_veiculo_url = formData.veiculo_documento_url;
        if (formData.veiculo_comprovante_endereco_proprietario_url) veiculoUpdates.comprovante_endereco_proprietario_url = formData.veiculo_comprovante_endereco_proprietario_url;
        if (formData.veiculo_proprietario_nome) veiculoUpdates.proprietario_nome = formData.veiculo_proprietario_nome;
        if (formData.veiculo_proprietario_cpf_cnpj) veiculoUpdates.proprietario_cpf_cnpj = formData.veiculo_proprietario_cpf_cnpj;

        const { error: veiculoError } = await supabase
          .from('veiculos')
          .update(veiculoUpdates)
          .eq('id', formData.veiculo_id);
        if (veiculoError) console.error('Erro ao vincular veículo:', veiculoError);
      }

      // 5. Link carroceria
      if (formData.carroceria_id) {
        const { error: carroceriaError } = await supabase
          .from('carrocerias')
          .update({ motorista_id: motoristaId })
          .eq('id', formData.carroceria_id);
        if (carroceriaError) console.error('Erro ao vincular carroceria:', carroceriaError);
      }

      toast.success('Motorista cadastrado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['motoristas_transportadora'] });
      queryClient.invalidateQueries({ queryKey: ['veiculos_disponiveis'] });
      queryClient.invalidateQueries({ queryKey: ['carrocerias_disponiveis'] });
      
      // Reset and close
      setFormData(getInitialFormData());
      setCurrentStep(1);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao cadastrar motorista:', error);
      toast.error('Erro ao cadastrar motorista');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(getInitialFormData());
    setCurrentStep(1);
    setUfWarning(false);
    onOpenChange(false);
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {editingMotorista ? 'Editar Motorista' : 'Cadastrar Motorista'}
          </DialogTitle>
          <DialogDescription>
            Etapa {currentStep} de {STEPS.length}: {STEPS[currentStep - 1].description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            {STEPS.map((step) => (
              <span
                key={step.id}
                className={currentStep >= step.id ? 'text-primary font-medium' : ''}
              >
                {step.title}
              </span>
            ))}
          </div>
        </div>

        {/* UF Warning */}
        {ufWarning && (
          <Alert variant="destructive" className="bg-chart-4/10 border-chart-4/30">
            <AlertTriangle className="h-4 w-4 text-chart-4" />
            <AlertDescription className="text-chart-4">
              <strong>Atenção:</strong> UF do motorista ({formData.uf}) é diferente da UF do veículo. 
              Isso não é recomendado mas pode prosseguir.
            </AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {currentStep === 1 && (
            <EtapaDadosPessoais formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 2 && (
            <EtapaAjudante formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 3 && (
            <EtapaVeiculo
              formData={formData}
              updateFormData={updateFormData}
              veiculosDisponiveis={veiculosDisponiveis}
              carroceriasDisponiveis={carroceriasDisponiveis}
            />
          )}
          {currentStep === 4 && (
            <EtapaResumo
              formData={formData}
              veiculosDisponiveis={veiculosDisponiveis}
              carroceriasDisponiveis={carroceriasDisponiveis}
            />
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 1 ? handleClose : handlePrev}
            disabled={isSubmitting}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {currentStep === 1 ? 'Cancelar' : 'Voltar'}
          </Button>

          {currentStep < STEPS.length ? (
            <Button onClick={handleNext} disabled={isSubmitting}>
              Próximo
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Cadastrar Motorista
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
