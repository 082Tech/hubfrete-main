import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ArrowLeft, Building2, Phone, Mail, FileText, MapPin, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CadastroEmbarcador() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    email: '',
    telefone: '',
    responsavel: '',
    cidade: '',
    estado: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Integrar com API de cadastro de embarcador
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Cadastro realizado!",
        description: "Seu cadastro foi enviado para análise. Em breve entraremos em contato.",
      });
      
      navigate('/login');
    } catch (error) {
      toast({
        title: "Erro no cadastro",
        description: "Ocorreu um erro ao enviar seu cadastro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
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
            <CardTitle className="text-2xl font-bold">Cadastro de Embarcador</CardTitle>
            <CardDescription>
              Preencha os dados da sua empresa para publicar cargas na plataforma
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="razaoSocial" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Razão Social
                  </Label>
                  <Input
                    id="razaoSocial"
                    name="razaoSocial"
                    placeholder="Razão social da empresa"
                    value={formData.razaoSocial}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                  <Input
                    id="nomeFantasia"
                    name="nomeFantasia"
                    placeholder="Nome fantasia"
                    value={formData.nomeFantasia}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    CNPJ
                  </Label>
                  <Input
                    id="cnpj"
                    name="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsavel" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Responsável
                  </Label>
                  <Input
                    id="responsavel"
                    name="responsavel"
                    placeholder="Nome do responsável"
                    value={formData.responsavel}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    E-mail Comercial
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="comercial@empresa.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Telefone Comercial
                  </Label>
                  <Input
                    id="telefone"
                    name="telefone"
                    placeholder="(00) 0000-0000"
                    value={formData.telefone}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Cidade
                  </Label>
                  <Input
                    id="cidade"
                    name="cidade"
                    placeholder="Cidade da empresa"
                    value={formData.cidade}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    name="estado"
                    placeholder="Ex: SP"
                    value={formData.estado}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Enviando..." : "Cadastrar Empresa"}
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
