import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CATEGORIA_ANTT_LABEL, type CategoriaAntt } from '@/lib/antt';

interface PisoRow {
  id: string;
  categoria_carga: CategoriaAntt;
  numero_eixos: number;
  valor_por_km: number;
  valor_por_km_carga_lotacao: number | null;
  vigente_desde: string;
  ativo: boolean;
  observacao: string | null;
}

const CATEGORIAS: CategoriaAntt[] = [
  'geral', 'granel_solido', 'granel_liquido', 'frigorificada',
  'perigosa', 'neogranel', 'florestal', 'conteinerizada',
];

export default function TabelaANTT() {
  const [rows, setRows] = useState<PisoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [edited, setEdited] = useState<Record<string, Partial<PisoRow>>>({});
  const [activeTab, setActiveTab] = useState<CategoriaAntt>('geral');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('antt_pisos' as any)
      .select('*')
      .order('categoria_carga')
      .order('numero_eixos');
    if (error) {
      toast.error('Erro ao carregar tabela ANTT: ' + error.message);
    } else {
      setRows((data || []) as unknown as PisoRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setField = (id: string, patch: Partial<PisoRow>) => {
    setEdited((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const handleSave = async (row: PisoRow) => {
    const patch = edited[row.id];
    if (!patch) return;
    setSaving(row.id);
    const { error } = await supabase
      .from('antt_pisos' as any)
      .update({
        valor_por_km: patch.valor_por_km ?? row.valor_por_km,
        valor_por_km_carga_lotacao: patch.valor_por_km_carga_lotacao ?? row.valor_por_km_carga_lotacao,
        ativo: patch.ativo ?? row.ativo,
        observacao: patch.observacao ?? row.observacao,
      })
      .eq('id', row.id);
    setSaving(null);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      toast.success('Atualizado');
      setEdited((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      load();
    }
  };

  const filteredRows = rows.filter((r) => r.categoria_carga === activeTab);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Tabela ANTT — Frete Mínimo</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os coeficientes oficiais da Resolução ANTT por categoria de carga e número de eixos.
          </p>
        </div>

        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription className="text-xs">
            Os valores aqui definidos são usados para calcular o piso mínimo de frete no
            momento da publicação de ofertas pelo embarcador. Sempre que a ANTT publicar
            uma nova resolução, atualize os valores <strong>R$/km (CCD)</strong>.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coeficientes vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoriaAntt)}>
              <TabsList className="flex-wrap h-auto">
                {CATEGORIAS.map((c) => (
                  <TabsTrigger key={c} value={c} className="text-xs">
                    {CATEGORIA_ANTT_LABEL[c]}
                  </TabsTrigger>
                ))}
              </TabsList>

              {CATEGORIAS.map((c) => (
                <TabsContent key={c} value={c} className="mt-4">
                  {loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Eixos</TableHead>
                          <TableHead>R$/km (CCD)</TableHead>
                          <TableHead>R$/km (CC) — opcional</TableHead>
                          <TableHead>Vigente desde</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.map((row) => {
                          const patch = edited[row.id] || {};
                          const dirty = Object.keys(patch).length > 0;
                          return (
                            <TableRow key={row.id}>
                              <TableCell className="font-medium">{row.numero_eixos}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.0001"
                                  className="h-8 max-w-[120px]"
                                  value={patch.valor_por_km ?? row.valor_por_km}
                                  onChange={(e) => setField(row.id, { valor_por_km: parseFloat(e.target.value) })}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.0001"
                                  className="h-8 max-w-[120px]"
                                  value={patch.valor_por_km_carga_lotacao ?? row.valor_por_km_carga_lotacao ?? ''}
                                  onChange={(e) => setField(row.id, { valor_por_km_carga_lotacao: e.target.value === '' ? null : parseFloat(e.target.value) })}
                                />
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(row.vigente_desde).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell>
                                {row.ativo ? (
                                  <Badge variant="default">Ativo</Badge>
                                ) : (
                                  <Badge variant="outline">Inativo</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant={dirty ? 'default' : 'outline'}
                                  disabled={!dirty || saving === row.id}
                                  onClick={() => handleSave(row)}
                                  className="h-8"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
