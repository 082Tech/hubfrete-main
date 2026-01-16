import { useMemo, useState } from 'react';
import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/hooks/useUserContext';
import type { Database } from '@/integrations/supabase/types';
import { Building2, Calendar, Package, Search, Truck } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

type StatusEntrega = Database['public']['Enums']['status_entrega'];

interface EntregaHistorico {
  id: string;
  status: StatusEntrega | null;
  updated_at: string | null;
  entregue_em: string | null;
  carga: {
    codigo: string;
    descricao: string;
    destinatario_nome_fantasia: string | null;
    destinatario_razao_social: string | null;
    empresa: { nome: string | null } | null;
    endereco_origem: { cidade: string; estado: string } | null;
    endereco_destino: { cidade: string; estado: string } | null;
  };
}

const finalizedStatuses: StatusEntrega[] = ['entregue', 'devolvida', 'problema'];

export default function HistoricoEntregas() {
  const { empresa } = useUserContext();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: entregas = [], isLoading } = useQuery({
    queryKey: ['historico_entregas_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data: motoristasData, error: motoristasError } = await supabase
        .from('motoristas')
        .select('id')
        .eq('empresa_id', empresa.id);

      if (motoristasError) throw motoristasError;

      const motoristaIds = (motoristasData || []).map((m) => m.id);
      if (motoristaIds.length === 0) return [];

      const { data, error } = await supabase
        .from('entregas')
        .select(
          `
          id,
          status,
          updated_at,
          entregue_em,
          carga:cargas(
            codigo,
            descricao,
            destinatario_nome_fantasia,
            destinatario_razao_social,
            endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado),
            endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado),
            empresa:empresas!cargas_empresa_id_fkey(nome)
          )
        `
        )
        .in('motorista_id', motoristaIds)
        .in('status', finalizedStatuses)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as EntregaHistorico[];
    },
    enabled: !!empresa?.id,
  });

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return entregas;

    return entregas.filter((e) => {
      const destinatario = (e.carga.destinatario_nome_fantasia || e.carga.destinatario_razao_social || '').toLowerCase();
      return (
        e.carga.codigo.toLowerCase().includes(q) ||
        e.carga.descricao.toLowerCase().includes(q) ||
        destinatario.includes(q) ||
        (e.carga.empresa?.nome || '').toLowerCase().includes(q)
      );
    });
  }, [entregas, searchTerm]);

  return (
    <PortalLayout expectedUserType="transportadora">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Histórico de Entregas</h1>
            <p className="text-sm text-muted-foreground">Entregas finalizadas e ocorrências</p>
          </div>
          <Badge variant="outline">{filtered.length} registros</Badge>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Buscar por código, destinatário, embarcador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Entregas finalizadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold min-w-[120px] sticky left-0 bg-muted/50 z-10">Código</TableHead>
                    <TableHead className="font-semibold min-w-[180px]">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        Embarcador
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold min-w-[220px]">Rota</TableHead>
                    <TableHead className="font-semibold min-w-[140px]">Destinatário</TableHead>
                    <TableHead className="font-semibold min-w-[140px]">Status</TableHead>
                    <TableHead className="font-semibold min-w-[120px]">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Encerrada em
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((e) => {
                      const origem = e.carga.endereco_origem;
                      const destino = e.carga.endereco_destino;
                      return (
                        <TableRow key={e.id} className="hover:bg-muted/30">
                          <TableCell className="sticky left-0 bg-background z-10">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{e.carga.codigo}</span>
                            </div>
                          </TableCell>
                          <TableCell>{e.carga.empresa?.nome || '-'}</TableCell>
                          <TableCell>
                            {origem?.cidade}/{origem?.estado} → {destino?.cidade}/{destino?.estado}
                          </TableCell>
                          <TableCell className="truncate max-w-[220px]">
                            {e.carga.destinatario_nome_fantasia || e.carga.destinatario_razao_social || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{e.status || '-'}</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(e.entregue_em || e.updated_at || Date.now()).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
