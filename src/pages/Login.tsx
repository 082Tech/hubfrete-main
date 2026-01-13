import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Truck, Mail, Lock, Loader2, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { loginUser, verifyCode, setAuthToken, setAuthUser } from '@/lib/api';
import { setUserSession, UserType, getRedirectByUserType } from '@/lib/userSession';

type LoginStep = 'credentials' | 'verification' | 'success';

export default function Login({ setShowSplash }: { setShowSplash: (show: boolean) => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const response = await loginUser(email, senha);
      const output = (response?.data?.output || '').trim();

      // Muitos webhooks respondem vazio mesmo com sucesso.
      if (response.status === 200) {
        toast.success(response.data?.output || 'Se o email estiver correto, o código 2FA foi enviado.');
        setStep('verification');
        return;
      }

      // Caso retorne uma mensagem de erro explícita
      toast.error(output);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao conectar com o servidor';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast.error('Digite o código completo');
      return;
    }

    setLoading(true);
    try {
      const response = await verifyCode(email, parseInt(code));
      const token = response?.data?.jwttoken;
      // User type should come from the API response
      const userType = ((response?.data as any)?.tipo || 'embarcador') as UserType;

      if (token) {
        setAuthToken(token);
        setAuthUser(email);
        setUserSession({ email, tipo: userType });
        setStep('success');
        toast.success('Login realizado com sucesso!');
        setShowSplash(true);
        navigate(getRedirectByUserType(userType));
      } else {
        toast.error((response?.data?.output || 'Código inválido').trim());
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao verificar código';
      toast.error(message);
    } finally {
      setLoading(false);
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
            <CardTitle className="text-2xl">
              {step === 'credentials' && 'Entrar na Plataforma'}
              {step === 'verification' && 'Verificação 2FA'}
              {step === 'success' && 'Acesso Autorizado!'}
            </CardTitle>
            <CardDescription>
              {step === 'credentials' && 'Entre com suas credenciais de usuário'}
              {step === 'verification' && `Digite o código enviado para ${email}`}
              {step === 'success' && 'Redirecionando para o dashboard...'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === 'credentials' && (
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
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verificando...
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
            )}

            {step === 'verification' && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={setCode}
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
                  onClick={handleVerifyCode}
                  className="w-full"
                  disabled={loading || code.length !== 6}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Verificar Código'
                  )}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep('credentials')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </div>
            )}

            {step === 'success' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground">Preparando seu ambiente...</p>
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
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