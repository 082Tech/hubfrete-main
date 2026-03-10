import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, MapPin, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import type { Tables } from '@/integrations/supabase/types';

type Filial = Tables<'filiais'>;

export default function DadosEmpresa() {
  const { companyInfo, empresa } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [filiais, setFiliais] = useState<Filial[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (empresa?.id) {
          const { data: filiaisData } = await supabase
            .from('filiais')
            .select('*')
            .eq('empresa_id', empresa.id)
            .order('is_matriz', { ascending: false });
          setFiliais(filiaisData || []);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados da empresa');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [empresa?.id]);

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4 md:p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dados da Empresa</h1>
          <p className="text-muted-foreground">Informações da empresa vinculada</p>
        </div>

        {/* Company Data */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Informações Gerais
            </CardTitle>
            <CardDescription>Dados cadastrais da empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Section */}
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-lg bg-muted border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden shrink-0">
                  {companyInfo?.logo_url ? (
                    <img src={companyInfo.logo_url} alt="Logo da Empresa" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-8 h-8 text-muted-foreground/50" />
                  )}
                </div>
                <Label
                  htmlFor="logo-upload"
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer rounded-lg"
                >
                  <Plus className="w-6 h-6 text-white mb-1" />
                  <span className="text-[10px] text-white font-medium uppercase tracking-wider">Alterar</span>
                </Label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !companyInfo?.id) return;
                    try {
                      const fileExt = file.name.split('.').pop();
                      const filePath = `${companyInfo.id}-${Math.random()}.${fileExt}`;
                      toast.loading('Fazendo upload da logo...', { id: 'upload-logo' });
                      const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, file);
                      if (uploadError) throw uploadError;
                      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath);
                      const { error: updateError } = await supabase.from('empresas').update({ logo_url: publicUrl }).eq('id', Number(companyInfo.id));
                      if (updateError) throw updateError;
                      toast.success('Logo atualizada com sucesso!', { id: 'upload-logo' });
                      window.location.reload();
                    } catch (error: any) {
                      console.error(error);
                      toast.error(`Erro: ${error.message || 'Falha desconhecida'}`, { id: 'upload-logo' });
                    }
                  }}
                />
              </div>
              <div>
                <h3 className="font-medium">Logo da Empresa</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Recomendado: 512x512px (PNG ou JPG, max 2MB). Esta logo será exibida no tracking para seus clientes.
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Razão Social</Label>
                <Input value={companyInfo?.razao_social || 'Não informado'} disabled />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={companyInfo?.cnpj || 'Não informado'} disabled />
              </div>
              {companyInfo?.nome_fantasia && (
                <div className="space-y-2">
                  <Label>Nome Fantasia</Label>
                  <Input value={companyInfo.nome_fantasia} disabled />
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Para alterar dados da empresa, entre em contato com o administrador.
            </p>
          </CardContent>
        </Card>

        {/* Branches */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Filiais
            </CardTitle>
            <CardDescription>
              {filiais.length > 0
                ? `${filiais.length} filial(is) vinculada(s) à sua empresa`
                : 'Nenhuma filial cadastrada'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filiais.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma filial encontrada para sua empresa.</p>
              ) : (
                filiais.map((filial) => (
                  <div key={filial.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${filial.ativa ? 'bg-primary/10' : 'bg-muted'}`}>
                        <MapPin className={`w-5 h-5 ${filial.ativa ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {filial.is_matriz ? '🏢 ' : ''}{filial.nome || 'Filial sem nome'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {[filial.endereco, filial.cidade, filial.estado].filter(Boolean).join(' - ') || 'Endereço não informado'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {filial.is_matriz && <Badge variant="outline">Matriz</Badge>}
                      <Badge variant={filial.ativa ? 'default' : 'secondary'}>
                        {filial.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
