import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, AlertCircle, FileSearch } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface NfeValidationStatusProps {
  entregaId: string;
}

export function NfeValidationStatus({ entregaId }: NfeValidationStatusProps) {
  const [nfes, setNfes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNfes = async () => {
      const { data, error } = await supabase
        .from('nfes')
        .select('*')
        .eq('entrega_id', entregaId);
      
      if (!error && data) {
        setNfes(data);
      }
      setLoading(false);
    };

    fetchNfes();

    // Subscribe to changes
    const channel = supabase
      .channel('nfe-status-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'nfes', filter: `entrega_id=eq.${entregaId}` }, 
        (payload) => {
          fetchNfes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entregaId]);

  if (loading) return <div className="text-sm text-muted-foreground">Carregando status fiscal...</div>;
  if (nfes.length === 0) return null;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'autorizada':
        return { color: 'bg-green-500/10 text-green-600', icon: CheckCircle2, label: 'Autorizada' };
      case 'rejeitada':
        return { color: 'bg-red-500/10 text-red-600', icon: XCircle, label: 'Rejeitada' };
      case 'validando':
        return { color: 'bg-blue-500/10 text-blue-600', icon: Clock, label: 'Validando' };
      case 'cancelada':
        return { color: 'bg-gray-500/10 text-gray-600', icon: AlertCircle, label: 'Cancelada' };
      default:
        return { color: 'bg-muted text-muted-foreground', icon: FileSearch, label: 'Pendente' };
    }
  };

  return (
    <div className="space-y-3 mt-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <FileSearch className="w-4 h-4" />
        Status Fiscal das Notas
      </h4>
      <div className="grid gap-2">
        {nfes.map((nfe) => {
          const config = getStatusConfig(nfe.status_validacao);
          const StatusIcon = config.icon;
          
          return (
            <Card key={nfe.id} className="border-none bg-muted/50">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-muted-foreground">
                    Chave: {nfe.chave_acesso?.slice(0, 4)}...{nfe.chave_acesso?.slice(-4)}
                  </span>
                  <span className="text-sm font-medium">NF-e nº {nfe.numero || '---'}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className={`${config.color} border-none`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                  {nfe.valor_total && (
                    <span className="text-xs font-semibold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nfe.valor_total)}
                    </span>
                  )}
                </div>
              </CardContent>
              {nfe.erro_validacao && (
                <div className="px-3 pb-2 text-[10px] text-red-500 italic">
                  Erro: {nfe.erro_validacao}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
