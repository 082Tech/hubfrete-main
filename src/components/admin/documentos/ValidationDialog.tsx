import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, FileText, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DocumentoValidacao } from './DocumentQueue';

interface ValidationDialogProps {
  document: DocumentoValidacao | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, motivo: string) => Promise<void>;
}

const tipoLabels: Record<string, string> = {
  cnh: 'CNH',
  crlv: 'CRLV',
  antt: 'ANTT',
  seguro: 'Seguro',
  comprovante_endereco: 'Comprovante de Endereço',
  outros: 'Outros',
};

export function ValidationDialog({
  document,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: ValidationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const handleApprove = async () => {
    if (!document) return;
    setIsLoading(true);
    setAction('approve');
    try {
      await onApprove(document.id);
      onClose();
    } finally {
      setIsLoading(false);
      setAction(null);
    }
  };

  const handleReject = async () => {
    if (!document || !motivo.trim()) return;
    setIsLoading(true);
    setAction('reject');
    try {
      await onReject(document.id, motivo);
      onClose();
      setMotivo('');
    } finally {
      setIsLoading(false);
      setAction(null);
    }
  };

  if (!document) return null;

  const vinculadoA = document.motorista_nome 
    ? `Motorista: ${document.motorista_nome}`
    : document.veiculo_placa
    ? `Veículo: ${document.veiculo_placa}`
    : document.carroceria_placa
    ? `Carroceria: ${document.carroceria_placa}`
    : 'N/A';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Validar Documento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="font-medium">{tipoLabels[document.tipo] || document.tipo.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Número</p>
              <p className="font-medium">{document.numero}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vinculado a</p>
              <p className="font-medium text-sm">{vinculadoA}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Validade</p>
              <p className="font-medium">
                {document.data_vencimento 
                  ? format(new Date(document.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })
                  : 'Não informada'}
              </p>
            </div>
          </div>

          {/* Preview button */}
          {document.url && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(document.url!, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Documento
            </Button>
          )}

          {/* Current status */}
          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
            <span className="text-sm text-muted-foreground">Status atual:</span>
            <Badge
              variant={
                document.status === 'aprovado'
                  ? 'default'
                  : document.status === 'rejeitado'
                  ? 'destructive'
                  : 'secondary'
              }
              className={document.status === 'aprovado' ? 'bg-chart-2' : ''}
            >
              {document.status === 'pendente' && 'Pendente'}
              {document.status === 'aprovado' && 'Aprovado'}
              {document.status === 'rejeitado' && 'Rejeitado'}
            </Badge>
          </div>

          {/* Rejection reason */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da rejeição (obrigatório para rejeitar)</Label>
            <Textarea
              id="motivo"
              placeholder="Informe o motivo caso queira rejeitar o documento..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isLoading || !motivo.trim()}
          >
            {isLoading && action === 'reject' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <XCircle className="w-4 h-4 mr-2" />
            Rejeitar
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isLoading}
            className="bg-chart-2 hover:bg-chart-2/90"
          >
            {isLoading && action === 'approve' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <CheckCircle className="w-4 h-4 mr-2" />
            Aprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
