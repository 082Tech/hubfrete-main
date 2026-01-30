import { useState } from 'react';
import { FileText, Clock, CheckCircle, XCircle, Eye, ExternalLink } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface DocumentoValidacao {
  id: string;
  tipo: string;
  numero: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  url: string | null;
  data_emissao: string | null;
  data_vencimento: string | null;
  motorista_id: string | null;
  motorista_nome?: string;
  veiculo_id: string | null;
  veiculo_placa?: string;
  carroceria_id: string | null;
  carroceria_placa?: string;
}

interface DocumentQueueProps {
  documents: DocumentoValidacao[];
  isLoading?: boolean;
  onSelectDocument: (doc: DocumentoValidacao) => void;
  onPreviewDocument: (url: string) => void;
}

const statusConfig = {
  pendente: {
    label: 'Pendente',
    icon: Clock,
    className: 'bg-chart-4/10 text-chart-4 border-chart-4/30',
  },
  aprovado: {
    label: 'Aprovado',
    icon: CheckCircle,
    className: 'bg-chart-2/10 text-chart-2 border-chart-2/30',
  },
  rejeitado: {
    label: 'Rejeitado',
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
};

const tipoLabels: Record<string, string> = {
  cnh: 'CNH',
  crlv: 'CRLV',
  antt: 'ANTT',
  seguro: 'Seguro',
  comprovante_endereco: 'Comprovante de Endereço',
  outros: 'Outros',
};

export function DocumentQueue({
  documents,
  isLoading = false,
  onSelectDocument,
  onPreviewDocument,
}: DocumentQueueProps) {
  if (isLoading) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        Carregando documentos...
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2">
        <FileText className="w-12 h-12 text-muted-foreground/50" />
        <p>Nenhum documento encontrado</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Tipo</TableHead>
            <TableHead>Número</TableHead>
            <TableHead>Vinculado a</TableHead>
            <TableHead className="text-center">Validade</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const config = statusConfig[doc.status];
            const StatusIcon = config.icon;
            const isExpired = doc.data_vencimento && new Date(doc.data_vencimento) < new Date();
            const isExpiringSoon = doc.data_vencimento && 
              new Date(doc.data_vencimento) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
              new Date(doc.data_vencimento) >= new Date();

            const vinculadoA = doc.motorista_nome 
              ? `Motorista: ${doc.motorista_nome}`
              : doc.veiculo_placa
              ? `Veículo: ${doc.veiculo_placa}`
              : doc.carroceria_placa
              ? `Carroceria: ${doc.carroceria_placa}`
              : 'N/A';

            return (
              <TableRow key={doc.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {tipoLabels[doc.tipo] || doc.tipo.toUpperCase()}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{doc.numero}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{vinculadoA}</TableCell>
                <TableCell className="text-center">
                  {doc.data_vencimento ? (
                    <span
                      className={cn(
                        'text-sm',
                        isExpired && 'text-destructive font-medium',
                        isExpiringSoon && 'text-chart-4 font-medium'
                      )}
                    >
                      {format(new Date(doc.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                      {isExpired && ' (Vencido)'}
                      {isExpiringSoon && ' (Em breve)'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={cn('gap-1', config.className)}>
                    <StatusIcon className="w-3 h-3" />
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {doc.url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onPreviewDocument(doc.url!)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectDocument(doc)}
                    >
                      Validar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
