import { AlertTriangle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ExpiringDocument {
  id: string;
  tipo: string;
  numero: string;
  data_vencimento: string;
  vinculado: string;
  dias_restantes: number;
}

interface ExpiringDocumentsAlertProps {
  documents: ExpiringDocument[];
}

const tipoLabels: Record<string, string> = {
  cnh: 'CNH',
  crlv: 'CRLV',
  antt: 'ANTT',
  seguro: 'Seguro',
};

export function ExpiringDocumentsAlert({ documents }: ExpiringDocumentsAlertProps) {
  if (documents.length === 0) return null;

  const expired = documents.filter((d) => d.dias_restantes < 0);
  const expiringSoon = documents.filter((d) => d.dias_restantes >= 0 && d.dias_restantes <= 30);

  return (
    <Card className="border-chart-4/30 bg-chart-4/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-chart-4">
          <AlertTriangle className="w-4 h-4" />
          Alertas de Vencimento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Expired documents */}
          {expired.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-destructive uppercase tracking-wide">
                Vencidos ({expired.length})
              </p>
              {expired.slice(0, 3).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-[10px] h-5">
                      {tipoLabels[doc.tipo] || doc.tipo.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-foreground">{doc.vinculado}</span>
                  </div>
                  <span className="text-xs text-destructive font-medium">
                    Venceu há {Math.abs(doc.dias_restantes)} dias
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Expiring soon */}
          {expiringSoon.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-chart-4 uppercase tracking-wide">
                Vencendo em breve ({expiringSoon.length})
              </p>
              {expiringSoon.slice(0, 3).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-chart-4/10 border border-chart-4/20"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-5 border-chart-4/30 text-chart-4">
                      {tipoLabels[doc.tipo] || doc.tipo.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-foreground">{doc.vinculado}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-chart-4">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {doc.dias_restantes === 0
                        ? 'Hoje'
                        : `${doc.dias_restantes} dias`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(expired.length > 3 || expiringSoon.length > 3) && (
            <p className="text-xs text-muted-foreground text-center">
              E mais {Math.max(0, expired.length - 3) + Math.max(0, expiringSoon.length - 3)} documento(s)...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
