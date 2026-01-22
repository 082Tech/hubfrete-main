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
      // Validate credentials
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
      // Use Edge Function to create driver with authentication
      const response = await supabase.functions.invoke('create-driver-auth', {
        body: {
          email: formData.auth_email,
          password: formData.auth_password,
          nome: formData.nome_completo,
          cpf: formData.cpf.replace(/\D/g, ''),
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
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao criar motorista');
      }

      const { motorista_id } = response.data;

      // 2. Create references
      const refsToInsert = formData.referencias
        .filter(r => r.nome && r.telefone)
        .map(r => ({
          motorista_id,
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
            motorista_id,
            nome: formData.ajudante_nome,
            cpf: formData.ajudante_cpf.replace(/\D/g, ''),
            telefone: formData.ajudante_telefone || null,
            tipo_cadastro: formData.ajudante_tipo_cadastro,
            comprovante_vinculo_url: formData.ajudante_comprovante_vinculo_url,
            ativo: true,
          });
        if (ajudanteError) console.error('Erro ao salvar ajudante:', ajudanteError);
      }

      toast.success('Motorista cadastrado com sucesso! Credenciais: ' + formData.auth_email);
      queryClient.invalidateQueries({ queryKey: ['motoristas_transportadora'] });
      
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
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`hover:text-primary transition-colors cursor-pointer ${
                  currentStep >= step.id ? 'text-primary font-medium' : ''
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
