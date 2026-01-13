import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Mail, Lock, Loader2, CheckCircle, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function Login({ setShowSplash }: { setShowSplash: (show: boolean) => void }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, user, loading: authLoading, getRedirectPath } = useAuth();
  
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Check for invite token in URL
  const inviteToken = searchParams.get('invite');

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      const redirectPath = getRedirectPath();
      navigate(redirectPath);
    }
  }, [user, authLoading, navigate, getRedirectPath]);

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

      // Call n8n workflow to send 2FA code
      try {
        const n8nResponse = await fetch('https://hubfrete.app.n8n.cloud/webhook/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            senha,
          }),
        });

        const n8nData = await n8nResponse.json();

        if (!n8nResponse.ok) {
          toast.error(n8nData.output || 'Erro ao enviar código de verificação');
          setLoading(false);
          return;
        }

        setSuccess(true);
        toast.success('Código de verificação enviado para seu email!');
        
        // Redirect to 2FA page
        setTimeout(() => {
          navigate('/v2f', { state: { email } });
        }, 500);
        
      } catch (n8nError) {
        console.error('n8n 2FA error:', n8nError);
        // If n8n fails, still allow login but skip 2FA (fallback)
        toast.warning('Verificação em 2 etapas indisponível');
        setShowSplash(true);
        setTimeout(() => {
          navigate('/embarcador');
        }, 500);
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao conectar com o servidor';
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
              {success ? 'Acesso Autorizado!' : 'Entrar na Plataforma'}
            </CardTitle>
            <CardDescription>
              {success 
                ? 'Redirecionando para o dashboard...' 
                : inviteToken 
                  ? 'Você foi convidado! Entre com suas credenciais.'
                  : 'Entre com suas credenciais de usuário'
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground">Preparando seu ambiente...</p>
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
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