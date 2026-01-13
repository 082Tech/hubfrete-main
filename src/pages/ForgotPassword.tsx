import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Truck, Mail, Lock, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { forgotPasswordRequest, forgotPasswordConfirm } from '@/lib/api';

type ForgotStep = 'email' | 'code' | 'success';

export default function ForgotPassword() {
  const [step, setStep] = useState<ForgotStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [loading, setLoading] = useState(false);

  // Etapa 1: Solicitar código enviando apenas email
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Preencha o email');
      return;
    }

    setLoading(true);
    try {
      const response = await forgotPasswordRequest(email);

      if (response.status === 200) {
        toast.success(response.data?.output || 'Código enviado para seu email');
        setStep('code');
        return;
      }

      toast.error(response.data?.output || 'Erro ao solicitar recuperação');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao conectar com o servidor';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Etapa 2: Confirmar código + nova senha
  const handleConfirmPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      toast.error('Digite o código completo');
      return;
    }
    if (!novaSenha || !confirmSenha) {
      toast.error('Preencha todos os campos de senha');
      return;
    }
    if (novaSenha !== confirmSenha) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (novaSenha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const response = await forgotPasswordConfirm(email, parseInt(code), novaSenha);
      const output = (response?.data?.output || '').trim();

      if (!output || output.toLowerCase().includes('sucesso') || output.toLowerCase().includes('alterada')) {
        setStep('success');
        toast.success('Senha alterada com sucesso!');
        return;
      }

      toast.error(output || 'Código inválido');
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
              {step === 'email' && 'Recuperar Senha'}
              {step === 'code' && 'Confirmar Código'}
              {step === 'success' && 'Senha Alterada!'}
            </CardTitle>
            <CardDescription>
              {step === 'email' && 'Digite seu email para receber o código'}
              {step === 'code' && 'Insira o código e defina sua nova senha'}
              {step === 'success' && 'Você pode fazer login com sua nova senha'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === 'email' && (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Código'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  asChild
                >
                  <Link to="/login">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Login
                  </Link>
                </Button>
              </form>
            )}

            {step === 'code' && (
              <form onSubmit={handleConfirmPassword} className="space-y-4">
                {/* Email bloqueado */}
                <div className="space-y-2">
                  <Label htmlFor="forgot-code-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="forgot-code-email"
                      type="email"
                      value={email}
                      disabled
                      className="pl-10 bg-muted cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Código OTP */}
                <div className="space-y-2">
                  <Label>Código de Verificação</Label>
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
                </div>

                {/* Nova Senha */}
                <div className="space-y-2">
                  <Label htmlFor="novaSenha">Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="novaSenha"
                      type="password"
                      placeholder="••••••••"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Confirmar Senha */}
                <div className="space-y-2">
                  <Label htmlFor="confirmSenha">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmSenha"
                      type="password"
                      placeholder="••••••••"
                      value={confirmSenha}
                      onChange={(e) => setConfirmSenha(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    'Confirmar Nova Senha'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setCode('');
                    setNovaSenha('');
                    setConfirmSenha('');
                    setStep('email');
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </form>
            )}

            {step === 'success' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground">Sua senha foi alterada com sucesso!</p>
                <Button className="w-full" asChild>
                  <Link to="/login">Fazer Login</Link>
                </Button>
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