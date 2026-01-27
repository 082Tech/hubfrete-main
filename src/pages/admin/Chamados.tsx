import { AlertTriangle, MessageSquare, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Chamados() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-8 h-8 text-chart-4" />
          Chamados
        </h1>
        <p className="text-muted-foreground">Suporte e tickets de atendimento</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-chart-4/10 rounded-lg">
                <Clock className="w-5 h-5 text-chart-4" />
              </div>
            </div>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Abertos</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <MessageSquare className="w-5 h-5 text-chart-2" />
              </div>
            </div>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Em Andamento</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-chart-1/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-chart-1" />
              </div>
            </div>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Resolvidos</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
            </div>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Urgentes</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed border-2 min-h-[400px] flex items-center justify-center">
        <CardContent className="text-center">
          <MessageSquare className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-muted-foreground mb-2">
            Central de Chamados
          </h3>
          <p className="text-muted-foreground max-w-md">
            Esta funcionalidade está em desenvolvimento. Em breve você poderá 
            gerenciar tickets de suporte e atendimento aos usuários da plataforma.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
