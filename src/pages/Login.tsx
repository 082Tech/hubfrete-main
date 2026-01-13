import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Mail, Lock, Loader2, CheckCircle, KeyRound, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

type LoginStep = 'credentials' | 'mfa' | 'success';

export default function Login({ setShowSplash }: { setShowSplash: (show: boolean) => void }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, user, loading: authLoading, getRedirectPath } = useAuth();
  
  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  // Check for invite token in URL
  const inviteToken = searchParams.get('invite');

  // NOTE: We intentionally do NOT auto-redirect here when user is already logged in
  // The redirect should only happen after explicit login action via handleLogin
  // This prevents redirect loops when roles aren't loaded yet

  const checkMfaRequirement = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (error) {
        console.error('MFA check error:', error);
        proceedToApp();
        return;
      }

      // If user needs to complete MFA (has enrolled but not verified in this session)
      if (data.nextLevel === 'aal2' && data.nextLevel !== data.currentLevel) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.totp?.[0];
        
        if (totpFactor) {
          setMfaFactorId(totpFactor.id);
          setStep('mfa');
          return;
        }
      }

      proceedToApp();
    } catch (error) {
      console.error('MFA requirement check failed:', error);
      proceedToApp();
    }
  };

  const proceedToApp = async () => {
    setStep('success');
    setShowSplash(true);
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      toast.error('Erro ao obter dados do usuário.');
      navigate('/login');
      return;
    }

    let redirectPath = '/login';

    // Check if user belongs to an embarcador company
    const { data: embarcador } = await supabase
      .from('embarcadores')
      .select('id')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (embarcador) {
      redirectPath = '/embarcador';
    } else {
      // Check if user belongs to a transportadora company
      const { data: transportadora } = await supabase
        .from('transportadoras')
        .select('id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (transportadora) {
        redirectPath = '/transportadora';
      } else {
        // Check if user is a motorista
        const { data: motorista } = await supabase
          .from('motoristas')
          .select('id')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (motorista) {
          redirectPath = '/motorista';
        } else {
          toast.error('Nenhum perfil de empresa encontrado. Contate o suporte.');
          setStep('credentials');
          setShowSplash(false);
          return;
        }
      }
    }

    setTimeout(() => {
      navigate(redirectPath);
    }, 500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email, senha);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Email não confirmado. Verifique sua caixa de entrada.');
        } else {
          toast.error(error.message);
        }
        setLoading(false);
        return;
      }

      // Check MFA requirement will be triggered by useEffect when user state changes
      // But we can also check immediately after login
      await checkMfaRequirement();
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao conectar com o servidor';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async () => {
    if (mfaCode.length !== 6 || !mfaFactorId) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      // Create challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });

      if (challengeError) {
        toast.error('Erro ao iniciar verificação: ' + challengeError.message);
        setLoading(false);
        return;
      }

      // Verify code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });

      if (verifyError) {
        toast.error('Código inválido. Tente novamente.');
        setMfaCode('');
        setLoading(false);
        return;
      }

      toast.success('Verificação concluída!');
      proceedToApp();
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro na verificação';
      toast.error(message);
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderCredentialsStep = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            autoComplete="email"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="senha">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="senha"
            type="password"
            placeholder="••••••••"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="pl-10"
            autoComplete="current-password"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Entrando...
          </>
        ) : (
          'Entrar'
        )}
      </Button>

      <Button
        type="button"
        variant="link"
        className="w-full text-sm"
        asChild
      >
        <Link to="/esqueci-senha">
          <KeyRound className="w-4 h-4 mr-2" />
          Esqueci minha senha
        </Link>
      </Button>
    </form>
  );

  const renderMfaStep = () => (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <p className="text-muted-foreground text-center text-sm">
          Digite o código de 6 dígitos do seu aplicativo autenticador
        </p>
      </div>

      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={mfaCode}
          onChange={(value) => setMfaCode(value)}
          onComplete={handleMfaVerify}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <Button 
        onClick={handleMfaVerify} 
        className="w-full" 
        disabled={loading || mfaCode.length !== 6}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Verificando...
          </>
        ) : (
          'Verificar'
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="w-full text-sm"
        onClick={() => {
          setStep('credentials');
          setMfaCode('');
          setMfaFactorId(null);
        }}
      >
        ← Voltar para login
      </Button>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-primary" />
      </div>
      <p className="text-muted-foreground">Preparando seu ambiente...</p>
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  const getStepTitle = () => {
    switch (step) {
      case 'credentials':
        return 'Entrar na Plataforma';
      case 'mfa':
        return 'Verificação em 2 Etapas';
      case 'success':
        return 'Acesso Autorizado!';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'credentials':
        return inviteToken 
          ? 'Você foi convidado! Entre com suas credenciais.'
          : 'Entre com suas credenciais de usuário';
      case 'mfa':
        return 'Confirme sua identidade para continuar';
      case 'success':
        return 'Redirecionando para o dashboard...';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/30 p-4">
      {/* Background elements */}
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-accent/20 rounded-full blur-2xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="p-2 bg-primary rounded-lg">
            <Truck className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">
            Hub<span className="text-primary">Frete</span>
          </span>
        </Link>

        <Card className="border-border shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{getStepTitle()}</CardTitle>
            <CardDescription>{getStepDescription()}</CardDescription>
          </CardHeader>

          <CardContent>
            {step === 'credentials' && renderCredentialsStep()}
            {step === 'mfa' && renderMfaStep()}
            {step === 'success' && renderSuccessStep()}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/" className="hover:text-primary">
            ← Voltar para o site
          </Link>
        </p>
      </div>
    </div>
  );
}
