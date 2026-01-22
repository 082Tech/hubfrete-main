import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Truck, Lock, AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

// Import form components from motoristas
import { EtapaDadosPessoais } from '@/components/motoristas/steps/EtapaDadosPessoais';
import { EtapaCredenciais } from '@/components/motoristas/steps/EtapaCredenciais';
import { EtapaAjudante } from '@/components/motoristas/steps/EtapaAjudante';
import { EtapaResumo } from '@/components/motoristas/steps/EtapaResumo';
import { MotoristaFormData, getInitialFormData } from '@/components/motoristas/types';

interface InviteLinkData {
  id: string;
  empresa_id: number;
  codigo_acesso: string;
  max_usos: number;
  usos_realizados: number;
  expira_em: string;
  ativo: boolean;
  nome_link: string | null;
}

interface EmpresaData {
  id: number;
  nome: string;
  logo_url: string | null;
}

const STEPS = [
  { title: 'Dados Pessoais', description: 'Informações básicas e CNH' },
  { title: 'Credenciais', description: 'E-mail e senha para acesso ao app' },
  { title: 'Ajudante', description: 'Dados do ajudante (opcional)' },
  { title: 'Resumo', description: 'Confirme suas informações' },
];

export default function CadastroMotoristaConvite() {
  const { linkId } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  
  const [pageState, setPageState] = useState<'loading' | 'password' | 'form' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [linkData, setLinkData] = useState<InviteLinkData | null>(null);
  const [empresaData, setEmpresaData] = useState<EmpresaData | null>(null);
  
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<MotoristaFormData>(getInitialFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate link on mount
  useEffect(() => {
    async function validateLink() {
      if (!linkId) {
        setErrorMessage('Link inválido');
        setPageState('error');
        return;
      }

      try {
        const { data: link, error } = await supabase
          .from('driver_invite_links')
          .select('*')
          .eq('id', linkId)
          .single();

        if (error || !link) {
          setErrorMessage('Link não encontrado ou inválido');
          setPageState('error');
          return;
        }

        // Check if link is still valid
        if (!link.ativo) {
          setErrorMessage('Este link foi desativado');
          setPageState('error');
          return;
        }

        if (new Date(link.expira_em) < new Date()) {
          setErrorMessage('Este link expirou');
          setPageState('error');
          return;
        }

        if (link.usos_realizados >= link.max_usos) {
          setErrorMessage('Este link atingiu o limite de cadastros');
          setPageState('error');
          return;
        }

        setLinkData(link as InviteLinkData);

        // Fetch empresa data
        const { data: empresa } = await supabase
          .from('empresas')
          .select('id, nome, logo_url')
          .eq('id', link.empresa_id)
          .single();

        if (empresa) {
          setEmpresaData(empresa as EmpresaData);
        }

        setPageState('password');
      } catch (err) {
        setErrorMessage('Erro ao validar link');
        setPageState('error');
      }
    }

    validateLink();
  }, [linkId]);

  const handlePasswordSubmit = () => {
    if (!linkData) return;
    
    setIsValidating(true);
    
    // Simple password validation
    if (passwordInput === linkData.codigo_acesso) {
      setPageState('form');
    } else {
      toast.error('Código de acesso incorreto');
    }
    
    setIsValidating(false);
  };

  const updateFormData = (updates: Partial<MotoristaFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    // Basic validation per step
    if (currentStep === 0) {
      if (!formData.nome_completo || !formData.cpf || !formData.cnh || !formData.categoria_cnh || !formData.validade_cnh) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }
    }
    if (currentStep === 1) {
      if (!formData.auth_email || !formData.auth_password) {
        toast.error('Preencha e-mail e senha');
        return;
      }
      if (formData.auth_password.length < 6) {
        toast.error('A senha deve ter pelo menos 6 caracteres');
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!linkData) return;
    
    setIsSubmitting(true);

    try {
      // Call the create-driver-auth edge function
      const { data, error } = await supabase.functions.invoke('create-driver-auth', {
        body: {
          email: formData.auth_email,
          senha: formData.auth_password,
          nome_completo: formData.nome_completo,
          cpf: formData.cpf,
          telefone: formData.telefone || null,
          uf: formData.uf || null,
          cnh: formData.cnh,
          categoria_cnh: formData.categoria_cnh,
          validade_cnh: formData.validade_cnh,
          cnh_tem_qrcode: formData.cnh_tem_qrcode,
          possui_ajudante: formData.possui_ajudante,
          empresa_id: linkData.empresa_id,
          tipo_cadastro: 'frota',
          // Ajudante data
          ajudante_nome: formData.ajudante_nome || null,
          ajudante_cpf: formData.ajudante_cpf || null,
          ajudante_telefone: formData.ajudante_telefone || null,
          // Referencias
          referencias: formData.referencias,
        },
      });

      if (error) throw new Error(error.message);

      // Increment usage count
      await supabase
        .from('driver_invite_links')
        .update({ usos_realizados: linkData.usos_realizados + 1 })
        .eq('id', linkData.id);

      setPageState('success');
    } catch (err: any) {
      console.error('Error creating driver:', err);
      toast.error(err.message || 'Erro ao realizar cadastro');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Validando link...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
            <h2 className="text-xl font-semibold">Link Inválido</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
            <Button asChild variant="outline">
              <Link to="/">Voltar para o início</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto text-chart-2" />
            <h2 className="text-xl font-semibold">Cadastro realizado!</h2>
            <p className="text-muted-foreground">
              Seu cadastro foi concluído com sucesso. Agora você pode acessar o aplicativo do HubFrete usando o e-mail e senha cadastrados.
            </p>
            <Button asChild>
              <Link to="/login">Ir para Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password validation state
  if (pageState === 'password') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Cadastro de Motorista</CardTitle>
            <CardDescription>
              {empresaData?.nome 
                ? `Convite de ${empresaData.nome}`
                : 'Convite para cadastro'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código de acesso</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="codigo"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite o código fornecido"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="pl-9 pr-10"
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Solicite o código de acesso ao responsável da transportadora
              </p>
            </div>
            
            <Button 
              onClick={handlePasswordSubmit} 
              className="w-full"
              disabled={isValidating || !passwordInput}
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                'Acessar Formulário'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Registration form state
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <Card>
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Truck className="w-6 h-6 text-primary" />
              <span className="font-bold text-lg">HubFrete</span>
            </div>
            <CardTitle>Cadastro de Motorista</CardTitle>
            {empresaData?.nome && (
              <CardDescription>Transportadora: {empresaData.nome}</CardDescription>
            )}
          </CardHeader>
          
          <CardContent className="pt-6">
            {/* Progress */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                {STEPS.map((step, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index < currentStep
                        ? 'bg-primary text-primary-foreground'
                        : index === currentStep
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {index < currentStep ? '✓' : index + 1}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 text-center hidden sm:block">
                      {step.title}
                    </span>
                  </div>
                ))}
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Step content */}
            <div className="min-h-[400px]">
              {currentStep === 0 && (
                <EtapaDadosPessoais
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              {currentStep === 1 && (
                <EtapaCredenciais
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              {currentStep === 2 && (
                <EtapaAjudante
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              {currentStep === 3 && (
                <EtapaResumo formData={formData} />
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t mt-6">
              <Button 
                variant="outline" 
                onClick={currentStep === 0 ? () => setPageState('password') : handlePrev}
              >
                Voltar
              </Button>
              
              {currentStep < STEPS.length - 1 ? (
                <Button onClick={handleNext}>
                  Próximo
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    'Finalizar Cadastro'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
