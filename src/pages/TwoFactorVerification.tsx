import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Truck, ShieldCheck, Loader2, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function TwoFactorVerification({ setShowSplash }: { setShowSplash: (show: boolean) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get email from location state (passed from login)
  const email = location.state?.email;

  // Redirect if no email in state (user came directly to this page)
  useEffect(() => {
    if (!authLoading && !email) {
      navigate('/login');
    }
  }, [email, authLoading, navigate]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      // Verify the 2FA code with n8n workflow
      const response = await fetch('https://hubfrete.app.n8n.cloud/webhook/v2f-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.output || 'Código inválido ou expirado');
        setCode('');
        return;
      }

      setSuccess(true);
      toast.success('Verificação concluída!');
      setShowSplash(true);

      // Redirect to embarcador portal (default for now)
      setTimeout(() => {
        navigate('/embarcador');
      }, 500);
      
    } catch (error) {
      console.error('2FA verification error:', error);
      toast.error('Erro ao verificar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      // Call the login workflow again to resend the code
      const response = await fetch('https://hubfrete.app.n8n.cloud/webhook/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          resend: true,
        }),
      });

      if (response.ok) {
        toast.success('Novo código enviado para seu email!');
      } else {
        toast.error('Erro ao reenviar código');
      }
    } catch (error) {
      toast.error('Erro ao reenviar código');
    } finally {
      setResending(false);
    }
  };

  // Auto-submit when code is complete
  useEffect(() => {
    if (code.length === 6) {
      handleVerify();
    }
  }, [code]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              {success ? (
                <CheckCircle className="w-8 h-8 text-primary" />
              ) : (
                <ShieldCheck className="w-8 h-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {success ? 'Verificado!' : 'Verificação em 2 Etapas'}
            </CardTitle>
            <CardDescription>
              {success 
                ? 'Redirecionando para o portal...' 
                : `Digite o código de 6 dígitos enviado para ${email?.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Preparando seu ambiente...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={setCode}
                    disabled={loading}
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
                  onClick={handleVerify} 
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

                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    Não recebeu o código?
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleResendCode}
                    disabled={resending}
                  >
                    {resending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Reenviando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reenviar código
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/login" className="hover:text-primary flex items-center justify-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
