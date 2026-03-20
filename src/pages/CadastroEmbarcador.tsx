import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, ArrowLeft, Building2, Phone, Mail, FileText, MapPin, User, Lock, Info, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function CadastroEmbarcador() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    inscricaoEstadual: '',
    email: '',
    telefone: '',
    responsavel: '',
    cidade: '',
    estado: '',
    endereco: '',
    cep: '',
    senha: '',
    confirmarSenha: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.senha !== formData.confirmarSenha) {
      toast({ title: 'Senhas não coincidem', variant: 'destructive' });
      return;
    }
    if (formData.senha.length < 6) {
      toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('signup-empresa', {
        body: {
          email: formData.email,
          password: formData.senha,
          nome: formData.responsavel,
          razaoSocial: formData.razaoSocial,
          nomeFantasia: formData.nomeFantasia,
          cnpj: formData.cnpj,
          inscricaoEstadual: formData.inscricaoEstadual,
          telefone: formData.telefone,
          cidade: formData.cidade,
          estado: formData.estado,
          endereco: formData.endereco,
          cep: formData.cep,
          tipo: 'embarcador',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setIsSuccess(true);
    } catch (error: any) {
      toast({
        title: 'Erro no cadastro',
        description: error.message || 'Ocorreu um erro ao processar seu cadastro.',
        variant: 'destructive',
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
            <h2 className="text-2xl font-bold mb-3">Cadastro Realizado!</h2>
            <p className="text-muted-foreground mb-2">
              Sua conta foi criada com sucesso. Você já pode fazer login.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Seu acesso estará em <strong>modo de análise</strong> até nossa equipe validar seus dados.
              Você será notificado quando a aprovação for concluída.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full" size="lg">
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Link 
          to="/comecar" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Cadastro de Embarcador</CardTitle>
            <CardDescription>
              Preencha os dados da sua empresa para publicar cargas na plataforma
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Alert className="mb-6 bg-primary/5 border-primary/20">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-muted-foreground">
                Após o cadastro, sua conta passará por uma análise rápida. Você poderá fazer login imediatamente, 
                mas terá acesso completo após a aprovação.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="razaoSocial" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Razão Social *
                  </Label>
                  <Input id="razaoSocial" name="razaoSocial" placeholder="Razão social da empresa" value={formData.razaoSocial} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                  <Input id="nomeFantasia" name="nomeFantasia" placeholder="Nome fantasia" value={formData.nomeFantasia} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" /> CNPJ *
                  </Label>
                  <MaskedInput id="cnpj" mask="cnpj" placeholder="00.000.000/0000-00" value={formData.cnpj} onChange={(v) => setFormData(prev => ({ ...prev, cnpj: v }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                  <Input id="inscricaoEstadual" name="inscricaoEstadual" placeholder="Inscrição estadual" value={formData.inscricaoEstadual} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="responsavel" className="flex items-center gap-2">
                    <User className="w-4 h-4" /> Responsável *
                  </Label>
                  <Input id="responsavel" name="responsavel" placeholder="Nome do responsável" value={formData.responsavel} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Telefone *
                  </Label>
                  <MaskedInput id="telefone" mask="phone" placeholder="(00) 00000-0000" value={formData.telefone} onChange={(v) => setFormData(prev => ({ ...prev, telefone: v }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" /> E-mail *
                  </Label>
                  <Input id="email" name="email" type="email" placeholder="comercial@empresa.com" value={formData.email} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> CEP
                  </Label>
                  <MaskedInput id="cep" mask="cep" placeholder="00000-000" value={formData.cep} onChange={(v) => setFormData(prev => ({ ...prev, cep: v }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input id="endereco" name="endereco" placeholder="Rua, número, bairro" value={formData.endereco} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade *</Label>
                  <Input id="cidade" name="cidade" placeholder="Cidade" value={formData.cidade} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado *</Label>
                  <Input id="estado" name="estado" placeholder="Ex: SP" value={formData.estado} onChange={handleChange} required maxLength={2} />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Credenciais de acesso
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="senha">Senha *</Label>
                    <PasswordInput id="senha" placeholder="Mínimo 6 caracteres" value={formData.senha} onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmarSenha">Confirmar Senha *</Label>
                    <PasswordInput id="confirmarSenha" placeholder="Repita a senha" value={formData.confirmarSenha} onChange={(e) => setFormData(prev => ({ ...prev, confirmarSenha: e.target.value }))} required />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Criando conta...</> : 'Criar Conta'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link to="/login" className="text-primary hover:underline">Fazer login</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}