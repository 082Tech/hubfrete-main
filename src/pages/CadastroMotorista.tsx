import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, ArrowLeft, User, Phone, Mail, FileText, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CadastroMotorista() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    cnh: '',
    categoriaCnh: '',
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
      // TODO: Integrar com API de cadastro de motorista
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
              <Truck className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Cadastro de Motorista</CardTitle>
            <CardDescription>
              Preencha seus dados para se cadastrar como motorista parceiro
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nome Completo
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
                  <Label htmlFor="cpf" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    CPF
                  </Label>
                  <MaskedInput
                    id="cpf"
                    mask="cpf"
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={(value) => setFormData(prev => ({ ...prev, cpf: value }))}
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
                  <Label htmlFor="cnh">Número da CNH</Label>
                  <MaskedInput
                    id="cnh"
                    mask="cnh"
                    placeholder="00000000000"
                    value={formData.cnh}
                    onChange={(value) => setFormData(prev => ({ ...prev, cnh: value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoriaCnh">Categoria CNH</Label>
                  <Input
                    id="categoriaCnh"
                    name="categoriaCnh"
                    placeholder="Ex: C, D, E"
                    value={formData.categoriaCnh}
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
                    placeholder="Sua cidade"
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
                {isLoading ? "Enviando..." : "Cadastrar como Motorista"}
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
