import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Package, ArrowLeft, Building2, Phone, Mail, User, Info, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function PreCadastroEmbarcador() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cnpj: '',
    nomeEmpresa: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('pre_cadastros')
        .insert({
          tipo: 'embarcador',
          nome: formData.nome,
          email: formData.email,
          telefone: formData.telefone,
          cnpj: formData.cnpj,
          nome_empresa: formData.nomeEmpresa,
        });

      if (error) throw error;
      
      setIsSuccess(true);
      toast({
        title: "Solicitação enviada!",
        description: "Seu pré-cadastro foi recebido. Entraremos em contato em breve.",
      });
    } catch (error: any) {
      console.error('Erro no pré-cadastro:', error);
      toast({
        title: "Erro ao enviar",
        description: error.message || "Ocorreu um erro ao enviar sua solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-border/50 shadow-xl">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit mb-6">
              <CheckCircle className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Solicitação Recebida!</h2>
            <p className="text-muted-foreground mb-6">
              Recebemos seu pré-cadastro como embarcador. Nossa equipe irá analisar 
              suas informações e entrar em contato pelo e-mail informado.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Tempo médio de resposta: <strong>até 24 horas úteis</strong>
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Link>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Pré-Cadastro de Embarcador</CardTitle>
            <CardDescription>
              Solicite acesso à plataforma para publicar suas cargas
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="bg-primary/5 border-primary/20">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">Pré-cadastro para análise</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                Este é um formulário de pré-cadastro. Após enviar, nossa equipe irá 
                analisar sua solicitação e, se aprovada, você receberá um convite 
                por e-mail para completar seu cadastro e acessar a plataforma.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome do Responsável
                </Label>
                <Input
                  id="nome"
                  name="nome"
                  placeholder="Seu nome completo"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  E-mail
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefone / WhatsApp
                </Label>
                <MaskedInput
                  id="telefone"
                  mask="phone"
                  placeholder="(00) 00000-0000"
                  value={formData.telefone}
                  onChange={(value) => setFormData(prev => ({ ...prev, telefone: value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nomeEmpresa" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Nome da Empresa
                </Label>
                <Input
                  id="nomeEmpresa"
                  name="nomeEmpresa"
                  placeholder="Nome da sua empresa"
                  value={formData.nomeEmpresa}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <MaskedInput
                  id="cnpj"
                  mask="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpj}
                  onChange={(value) => setFormData(prev => ({ ...prev, cnpj: value }))}
                  required
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Enviando..." : "Enviar Solicitação"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Fazer login
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
