import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, FileText, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Relatorios() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-primary" />
            Relatórios
          </h1>
          <p className="text-muted-foreground">Análises e métricas da plataforma</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="p-3 bg-chart-1/10 rounded-xl w-fit">
                <FileText className="w-6 h-6 text-chart-1" />
              </div>
              <CardTitle className="text-lg mt-4">Relatório de Operações</CardTitle>
              <p className="text-sm text-muted-foreground">
                Volume de cargas, entregas e performance operacional
              </p>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                <Download className="w-4 h-4 mr-2" />
                Em breve
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="p-3 bg-chart-2/10 rounded-xl w-fit">
                <TrendingUp className="w-6 h-6 text-chart-2" />
              </div>
              <CardTitle className="text-lg mt-4">Relatório de Crescimento</CardTitle>
              <p className="text-sm text-muted-foreground">
                Evolução de cadastros e adesão à plataforma
              </p>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                <Download className="w-4 h-4 mr-2" />
                Em breve
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="p-3 bg-chart-3/10 rounded-xl w-fit">
                <Calendar className="w-6 h-6 text-chart-3" />
              </div>
              <CardTitle className="text-lg mt-4">Relatório Mensal</CardTitle>
              <p className="text-sm text-muted-foreground">
                Resumo consolidado do mês
              </p>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                <Download className="w-4 h-4 mr-2" />
                Em breve
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-dashed border-2 min-h-[300px] flex items-center justify-center">
          <CardContent className="text-center">
            <TrendingUp className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              Central de Relatórios
            </h3>
            <p className="text-muted-foreground max-w-md">
              Em breve você poderá gerar e exportar relatórios detalhados 
              sobre todas as operações da plataforma.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
