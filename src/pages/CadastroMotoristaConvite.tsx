import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PasswordInput } from '@/components/ui/password-input';
import { MaskedInput } from '@/components/ui/masked-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2, Truck, Lock, AlertTriangle, Clock, ShieldCheck, Eye, EyeOff,
  User, CreditCard, Mail, AlertCircle, CheckCircle, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { ESTADOS_BRASIL, CATEGORIAS_CNH } from '@/components/motoristas/types';

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
  { title: 'Criar Conta', description: 'Dados pessoais e acesso' },
  { title: 'CNH', description: 'Carteira de habilitação' },
  { title: 'Resumo', description: 'Confirme suas informações' },
];

interface SimpleFormData {
  nome_completo: string;
  cpf: string;
  telefone: string;
  auth_email: string;
  auth_password: string;
  auth_password_confirm: string;
  cnh: string;
  categoria_cnh: string;
  validade_cnh: string;
}

const getInitialSimpleForm = (): SimpleFormData => ({
  nome_completo: '',
  cpf: '',
  telefone: '',
  auth_email: '',
  auth_password: '',
  auth_password_confirm: '',
  cnh: '',
  categoria_cnh: '',
  validade_cnh: '',
});

export default function CadastroMotoristaConvite() {
  const { linkId } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const safeDecodeURIComponent = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const extractUuidFromPossiblyDirtyText = (value: string) => {
    const decoded = safeDecodeURIComponent(value)
      .trim()
      .normalize('NFKC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[\u2010-\u2015\u2212\uFE63\uFF0D]/g, '-');

    const uuidHyphenRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const uuidNoHyphenRegex = /[0-9a-f]{32}/i;

    const hyphenMatch = decoded.match(uuidHyphenRegex);
    const noHyphenMatch = hyphenMatch ? null : decoded.match(uuidNoHyphenRegex);

    const toHyphenatedUuid = (hex32: string) =>
      `${hex32.slice(0, 8)}-${hex32.slice(8, 12)}-${hex32.slice(12, 16)}-${hex32.slice(16, 20)}-${hex32.slice(20)}`;

    const uuid = hyphenMatch?.[0] ?? (noHyphenMatch ? toHyphenatedUuid(noHyphenMatch[0]) : null);
    return { decoded, uuid };
  };

  const [pageState, setPageState] = useState<'loading' | 'password' | 'form' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [linkData, setLinkData] = useState<InviteLinkData | null>(null);
  const [empresaData, setEmpresaData] = useState<EmpresaData | null>(null);

  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<SimpleFormData>(getInitialSimpleForm());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate link on mount
  useEffect(() => {
    async function validateLink() {
      const rawFromQuery =
        searchParams.get('linkId') ??
        searchParams.get('id') ??
        searchParams.get('token') ??
        '';
      const raw = linkId ?? rawFromQuery;
      const { uuid } = extractUuidFromPossiblyDirtyText(raw);

      if (!uuid) {
        setErrorMessage('Link inválido');
        setPageState('error');
        return;
      }

      try {
        const { data: link, error } = await supabase
          .from('driver_invite_links')
          .select('*')
          .eq('id', uuid)
          .single();

        if (error || !link) {
          setErrorMessage('Link não encontrado ou inválido');
          setPageState('error');
          return;
        }

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
  }, [linkId, searchParams]);

  const handlePasswordSubmit = () => {
    if (!linkData) return;
    setIsValidating(true);
    if (passwordInput === linkData.codigo_acesso) {
      setPageState('form');
    } else {
      toast.error('Código de acesso incorreto');
    }
    setIsValidating(false);
  };

  const updateFormData = (updates: Partial<SimpleFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!formData.nome_completo || !formData.cpf) {
        toast.error('Preencha nome e CPF');
        return;
      }
      if (!formData.auth_email || !formData.auth_password) {
        toast.error('Preencha e-mail e senha para criar sua conta');
        return;
      }
      if (formData.auth_password.length < 6) {
        toast.error('A senha deve ter pelo menos 6 caracteres');
        return;
      }
      if (formData.auth_password !== formData.auth_password_confirm) {
        toast.error('As senhas não coincidem');
        return;
      }
    }
    if (currentStep === 1) {
      if (!formData.cnh || !formData.categoria_cnh || !formData.validade_cnh) {
        toast.error('Preencha os dados da CNH');
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
      const { data, error } = await supabase.functions.invoke('create-driver-auth', {
        body: {
          email: formData.auth_email,
          senha: formData.auth_password,
          nome_completo: formData.nome_completo,
          cpf: formData.cpf,
          telefone: formData.telefone || null,
          uf: null,
          cnh: formData.cnh,
          categoria_cnh: formData.categoria_cnh,
          validade_cnh: formData.validade_cnh,
          cnh_tem_qrcode: false,
          possui_ajudante: false,
          empresa_id: linkData.empresa_id,
          tipo_cadastro: 'frota',
          ajudante_nome: null,
          ajudante_cpf: null,
          ajudante_telefone: null,
          referencias: [],
        },
      });

      if (error) throw new Error(error.message);

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
            <Clock className="w-12 h-12 mx-auto text-amber-500" />
            <h2 className="text-xl font-semibold">Cadastro enviado para análise!</h2>
            <p className="text-muted-foreground">
              Seu cadastro foi recebido com sucesso e está sendo analisado pela equipe do HubFrete.
              Você será notificado assim que a aprovação for concluída.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg p-3">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              Tempo médio de aprovação: até 24 horas úteis
            </div>
            <Button asChild variant="outline">
              <Link to="/">Voltar para o início</Link>
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

  const passwordsMatch = formData.auth_password === formData.auth_password_confirm;
  const passwordTooShort = formData.auth_password.length > 0 && formData.auth_password.length < 6;

  // Registration form state
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-4 py-8">
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
                      index <= currentStep
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
            <div className="min-h-[350px]">
              {/* === STEP 1: Criar Conta === */}
              {currentStep === 0 && (
                <div className="space-y-5">
                  {/* Dados Pessoais */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <User className="w-4 h-4" />
                      Seus Dados
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Nome Completo *</Label>
                        <Input
                          placeholder="Seu nome completo"
                          value={formData.nome_completo}
                          onChange={(e) => updateFormData({ nome_completo: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>CPF *</Label>
                          <MaskedInput
                            mask="cpf"
                            placeholder="000.000.000-00"
                            value={formData.cpf}
                            onChange={(value) => updateFormData({ cpf: value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Telefone</Label>
                          <MaskedInput
                            mask="phone"
                            placeholder="(00) 00000-0000"
                            value={formData.telefone}
                            onChange={(value) => updateFormData({ telefone: value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Credenciais */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Lock className="w-4 h-4" />
                      Criar Conta
                    </div>
                    <p className="text-xs text-muted-foreground -mt-2">
                      Use esses dados para entrar no aplicativo de entregas.
                    </p>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>E-mail *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="seuemail@exemplo.com"
                            value={formData.auth_email}
                            onChange={(e) => updateFormData({ auth_email: e.target.value })}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Senha *</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                            <PasswordInput
                              placeholder="Mínimo 6 caracteres"
                              value={formData.auth_password}
                              onChange={(e) => updateFormData({ auth_password: e.target.value })}
                              className="pl-10"
                            />
                          </div>
                          {passwordTooShort && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Mínimo 6 caracteres
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Confirmar Senha *</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                            <PasswordInput
                              placeholder="Repita a senha"
                              value={formData.auth_password_confirm}
                              onChange={(e) => updateFormData({ auth_password_confirm: e.target.value })}
                              className="pl-10"
                            />
                          </div>
                          {formData.auth_password_confirm && !passwordsMatch && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              As senhas não coincidem
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* === STEP 2: CNH === */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <CreditCard className="w-4 h-4" />
                    Carteira de Habilitação (CNH)
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Número da CNH *</Label>
                      <MaskedInput
                        mask="cnh"
                        placeholder="00000000000"
                        value={formData.cnh}
                        onChange={(value) => updateFormData({ cnh: value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
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
                        <Label>Validade *</Label>
                        <Input
                          type="date"
                          value={formData.validade_cnh}
                          onChange={(e) => updateFormData({ validade_cnh: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* === STEP 3: Resumo === */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Revise as informações antes de finalizar.
                  </p>

                  <Card className="border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        Dados Pessoais
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nome:</span>
                        <span className="font-medium">{formData.nome_completo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CPF:</span>
                        <span>{formData.cpf}</span>
                      </div>
                      {formData.telefone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Telefone:</span>
                          <span>{formData.telefone}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">E-mail:</span>
                        <span className="text-xs">{formData.auth_email}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        CNH
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Número:</span>
                        <span>{formData.cnh}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Categoria:</span>
                        <Badge variant="outline">{formData.categoria_cnh}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Validade:</span>
                        <span>{formData.validade_cnh ? new Date(formData.validade_cnh).toLocaleDateString('pt-BR') : '-'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
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
