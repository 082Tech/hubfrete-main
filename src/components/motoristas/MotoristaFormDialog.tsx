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
import { ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { MotoristaFormData, getInitialFormData } from './types';
import { EtapaDadosPessoais } from './steps/EtapaDadosPessoais';
import { EtapaCredenciais } from './steps/EtapaCredenciais';
import { EtapaAjudante } from './steps/EtapaAjudante';
import { EtapaResumo } from './steps/EtapaResumo';

interface MotoristaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: number;
  editingMotorista?: any; // For edit mode
}

const STEPS = [
  { id: 1, title: 'Dados Pessoais', description: 'Informações e documentos do motorista' },
  { id: 2, title: 'Credenciais', description: 'Acesso ao aplicativo mobile' },
  { id: 3, title: 'Ajudante', description: 'Cadastro de ajudante (opcional)' },
  { id: 4, title: 'Resumo', description: 'Confirme as informações' },
];



export function MotoristaFormDialog({
  open,
  onOpenChange,
  empresaId,
  editingMotorista,
}: MotoristaFormDialogProps) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<MotoristaFormData>(getInitialFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = (updates: Partial<MotoristaFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate step 1 - only essential fields
      if (!formData.nome_completo || !formData.cpf || !formData.cnh || !formData.categoria_cnh || !formData.validade_cnh || !formData.uf) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }
      // References and comprovante_vinculo are optional in web registration
    }

    if (currentStep === 2) {
      if (!formData.auth_email || !formData.auth_password) {
        toast.error('E-mail e senha são obrigatórios para acesso ao app');
        return;
      }
      if (formData.auth_password !== formData.auth_password_confirm) {
        toast.error('As senhas não coincidem');
        return;
      }
      if (formData.auth_password.length < 6) {
        toast.error('A senha deve ter no mínimo 6 caracteres');
        return;
      }
    }

    if (currentStep === 3) {
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

    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    const nextStep = STEPS[currentIndex + 1];
    if (nextStep) {
      setCurrentStep(nextStep.id);
    }
  };

  const handlePrev = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    const prevStep = STEPS[currentIndex - 1];
    if (prevStep) {
      setCurrentStep(prevStep.id);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Use Edge Function for auth creation
        const response = await supabase.functions.invoke('create-driver-auth', {
          body: {
            email: formData.auth_email,
            password: formData.auth_password,
            nome_completo: formData.nome_completo,
            cpf: formData.cpf.replace(/\D/g, ''),
            telefone: formData.telefone || null,
            uf: formData.uf,
            tipo_cadastro: formData.tipo_cadastro,
            foto_url: formData.foto_url,
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
            ajudante_nome: formData.ajudante_nome,
            ajudante_cpf: formData.ajudante_cpf,
            ajudante_telefone: formData.ajudante_telefone,
            ajudante_tipo_cadastro: formData.ajudante_tipo_cadastro,
            ajudante_comprovante_vinculo_url: formData.ajudante_comprovante_vinculo_url,
            referencias: formData.referencias.filter(r => r.nome && r.telefone),
          },
        });

        if (response.error instanceof FunctionsHttpError) {
          const context = response.error.context;
          if (context) {
            const text = await context.text();
            let parsed: any = null;
            try { parsed = JSON.parse(text); } catch { parsed = null; }
            if (parsed) {
              if (typeof parsed.error === 'string') throw new Error(parsed.error);
              if (typeof parsed.error === 'object') {
                throw new Error(parsed.error.message || parsed.error.cpf || parsed.error.email || Object.values(parsed.error)[0] as string || 'Erro ao criar motorista');
              }
              if (typeof parsed.message === 'string') throw new Error(parsed.message);
            }
            if (text) throw new Error(text);
          }
          throw new Error('Erro retornado pela função');
        }

        const dataError = (response.data as any)?.error;
        if (dataError) {
          if (typeof dataError === 'string') throw new Error(dataError);
          if (typeof dataError === 'object') {
            throw new Error(dataError.message || dataError.cpf || dataError.email || Object.values(dataError)[0] as string || 'Erro ao criar motorista');
          }
        }

      toast.success('Motorista cadastrado com sucesso! Credenciais: ' + formData.auth_email);

      queryClient.invalidateQueries({ queryKey: ['motoristas_transportadora'] });
      setFormData(getInitialFormData());
      setCurrentStep(1);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao cadastrar motorista:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao cadastrar motorista';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(getInitialFormData());
    setCurrentStep(1);
    onOpenChange(false);
  };

  const isTerceirizado = formData.tipo_cadastro === 'terceirizado';
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const currentStepData = STEPS.find(s => s.id === currentStep);
  const isLastStep = currentStepIndex === STEPS.length - 1;
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {editingMotorista ? 'Editar Motorista' : 'Cadastrar Motorista'}
          </DialogTitle>
          <DialogDescription>
            Etapa {currentStepIndex + 1} de {STEPS.length}: {currentStepData?.description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            {STEPS.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`hover:text-primary transition-colors cursor-pointer ${currentStep >= step.id ? 'text-primary font-medium' : ''
                  }`}
              >
                {step.title}
              </button>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {currentStep === 1 && (
            <EtapaDadosPessoais formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 2 && (
            <EtapaCredenciais formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 3 && (
            <EtapaAjudante formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 4 && (
            <EtapaResumo formData={formData} />
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

          {!isLastStep ? (
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
