import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Truck,
  Mail,
  Lock,
  Loader2,
  CheckCircle,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

type LoginStep = 'credentials' | 'mfa' | 'success';

export default function Login({
  setShowSplash,
}: {
  setShowSplash: (show: boolean) => void;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, loading: authLoading } = useAuth();

  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  const inviteToken = searchParams.get('invite');

  /* =======================
     REDIRECT FINAL
  ======================= */
  const proceedToApp = async () => {
    setStep('success');
    setShowSplash(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    let redirectPath = '/login';

    if (roles?.length) {
      switch (roles[0].role) {
        case 'embarcador':
          redirectPath = '/embarcador';
          break;
        case 'transportadora':
          redirectPath = '/transportadora';
          break;
        case 'motorista':
          redirectPath = '/motorista';
          break;
        case 'admin':
          redirectPath = '/admin';
          break;
      }
    }

    setTimeout(() => navigate(redirectPath), 500);
  };

  /* =======================
     LOGIN
  ======================= */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !senha) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signIn(email, senha);

      if (error || !data) {
        toast.error(error?.message ?? 'Erro ao autenticar');
        return;
      }

      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aal.currentLevel === 'aal2') {
        proceedToApp();
        return;
      }

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];

      if (totpFactor) {
        setMfaFactorId(totpFactor.id);
        setStep('mfa');
        return;
      }

      proceedToApp();
    } catch (err) {
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     MFA VERIFY
  ======================= */
  const handleMfaVerify = async () => {
    if (!mfaFactorId || mfaCode.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }

    setLoading(true);

    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({
          factorId: mfaFactorId,
        });

      if (challengeError) {
        toast.error(challengeError.message);
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: mfaCode,
      });

      if (verifyError) {
        toast.error('Código inválido');
        setMfaCode('');
        return;
      }

      toast.success('Verificação concluída');
      proceedToApp();
    } catch {
      toast.error('Erro ao verificar MFA');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  /* =======================
     UI STEPS
  ======================= */
  const renderCredentialsStep = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label>Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
          <Input
            type="email"
            className="pl-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
          <Input
            type="password"
            className="pl-10"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>
      </div>

      <Button className="w-full" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </Button>

      <Button asChild variant="link" className="w-full">
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
        <ShieldCheck className="w-10 h-10 text-primary" />
        <p className="text-sm text-muted-foreground text-center">
          Digite o código do seu aplicativo autenticador
        </p>
      </div>

      <InputOTP maxLength={6} value={mfaCode} onChange={setMfaCode}>
        <InputOTPGroup>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <InputOTPSlot key={i} index={i} />
          ))}
        </InputOTPGroup>
      </InputOTP>

      <Button
        onClick={handleMfaVerify}
        disabled={loading || mfaCode.length !== 6}
        className="w-full"
      >
        {loading ? 'Verificando...' : 'Verificar'}
      </Button>

      <Button
        variant="ghost"
        className="w-full"
        onClick={() => {
          setStep('credentials');
          setMfaCode('');
          setMfaFactorId(null);
        }}
      >
        ← Voltar
      </Button>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="flex flex-col items-center gap-4 py-8">
      <CheckCircle className="w-8 h-8 text-primary" />
      <p className="text-muted-foreground">Preparando ambiente...</p>
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex justify-center mb-6 gap-2">
          <Truck className="w-6 h-6 text-primary" />
          <span className="font-bold text-xl">
            Hub<span className="text-primary">Frete</span>
          </span>
        </Link>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>
              {step === 'credentials'
                ? 'Entrar'
                : step === 'mfa'
                  ? 'Verificação em 2 Etapas'
                  : 'Acesso Autorizado'}
            </CardTitle>
            <CardDescription>
              {inviteToken && step === 'credentials'
                ? 'Você foi convidado'
                : null}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === 'credentials' && renderCredentialsStep()}
            {step === 'mfa' && renderMfaStep()}
            {step === 'success' && renderSuccessStep()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}