import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { FileText, Save, Loader2, Building2, Hash, Receipt, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { getCodigoMunicipioIBGE } from '@/lib/ibgeLookup';
import { toast } from 'sonner';

interface ConfigFiscal {
  id?: number;
  empresa_id: number;
  cfop_estadual: string;
  cfop_interestadual: string;
  natureza_operacao: string;
  serie_cte: number;
  proximo_numero_cte: number;
  icms_situacao_tributaria: string;
  icms_aliquota: number;
  tomador_padrao: string;
  tipo_servico: number;
  ambiente: number;
}

interface EmpresaFiscal {
  razao_social: string;
  nome_fantasia: string;
  inscricao_estadual: string;
  telefone: string;
  email: string;
}

interface FilialFiscal {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  codigo_municipio_ibge: string;
}

export function ConfigFiscalTab() {
  const { empresa } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookingUpIbge, setLookingUpIbge] = useState(false);

  const [empresaData, setEmpresaData] = useState<EmpresaFiscal>({
    razao_social: '',
    nome_fantasia: '',
    inscricao_estadual: '',
    telefone: '',
    email: '',
  });

  const [filialData, setFilialData] = useState<FilialFiscal>({
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    codigo_municipio_ibge: '',
  });

  const [filialId, setFilialId] = useState<number | null>(null);
  const [filialCidade, setFilialCidade] = useState('');
  const [filialEstado, setFilialEstado] = useState('');

  const [config, setConfig] = useState<ConfigFiscal>({
    empresa_id: 0,
    cfop_estadual: '5353',
    cfop_interestadual: '6353',
    natureza_operacao: 'PRESTACAO DE SERVICO DE TRANSPORTE',
    serie_cte: 1,
    proximo_numero_cte: 1,
    icms_situacao_tributaria: '00',
    icms_aliquota: 0,
    tomador_padrao: '0',
    tipo_servico: 0,
    ambiente: 2,
  });

  useEffect(() => {
    if (!empresa?.id) return;
    loadData();
  }, [empresa?.id]);

  const loadData = async () => {
    if (!empresa?.id) return;
    setLoading(true);
    try {
      // Load empresa fiscal data
      const { data: emp } = await supabase
        .from('empresas')
        .select('razao_social, nome_fantasia, inscricao_estadual, telefone, email')
        .eq('id', empresa.id)
        .single();

      if (emp) {
        setEmpresaData({
          razao_social: (emp as any).razao_social || '',
          nome_fantasia: (emp as any).nome_fantasia || '',
          inscricao_estadual: (emp as any).inscricao_estadual || '',
          telefone: (emp as any).telefone || '',
          email: (emp as any).email || '',
        });
      }

      // Load filial matriz
      const { data: filial } = await supabase
        .from('filiais')
        .select('id, logradouro, numero, complemento, bairro, codigo_municipio_ibge, cidade, estado')
        .eq('empresa_id', empresa.id)
        .eq('is_matriz', true)
        .single();

      if (filial) {
        setFilialId(filial.id);
        setFilialCidade(filial.cidade || '');
        setFilialEstado(filial.estado || '');
        setFilialData({
          logradouro: (filial as any).logradouro || '',
          numero: (filial as any).numero || '',
          complemento: (filial as any).complemento || '',
          bairro: (filial as any).bairro || '',
          codigo_municipio_ibge: (filial as any).codigo_municipio_ibge || '',
        });
      }

      // Load config_fiscal
      const { data: cfg } = await supabase
        .from('config_fiscal' as any)
        .select('*')
        .eq('empresa_id', empresa.id)
        .single();

      if (cfg) {
        setConfig(cfg as any);
      } else {
        setConfig(prev => ({ ...prev, empresa_id: empresa.id }));
      }
    } catch (err) {
      console.error('Error loading fiscal config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLookupIBGE = async () => {
    if (!filialCidade || !filialEstado) {
      toast.error('Cidade e estado da filial matriz são necessários');
      return;
    }
    setLookingUpIbge(true);
    try {
      const code = await getCodigoMunicipioIBGE(filialCidade, filialEstado);
      if (code) {
        setFilialData(prev => ({ ...prev, codigo_municipio_ibge: code }));
        toast.success(`Código IBGE encontrado: ${code}`);
      } else {
        toast.error('Código IBGE não encontrado para esta cidade/UF');
      }
    } finally {
      setLookingUpIbge(false);
    }
  };

  const handleSave = async () => {
    if (!empresa?.id) return;
    setSaving(true);
    try {
      // Update empresa
      const { error: empError } = await supabase
        .from('empresas')
        .update({
          razao_social: empresaData.razao_social || null,
          nome_fantasia: empresaData.nome_fantasia || null,
          inscricao_estadual: empresaData.inscricao_estadual || null,
          telefone: empresaData.telefone || null,
          email: empresaData.email || null,
        } as any)
        .eq('id', empresa.id);

      if (empError) throw empError;

      // Update filial matriz
      if (filialId) {
        const { error: filError } = await supabase
          .from('filiais')
          .update({
            logradouro: filialData.logradouro || null,
            numero: filialData.numero || null,
            complemento: filialData.complemento || null,
            bairro: filialData.bairro || null,
            codigo_municipio_ibge: filialData.codigo_municipio_ibge || null,
          } as any)
          .eq('id', filialId);

        if (filError) throw filError;
      }

      // Upsert config_fiscal
      const { error: cfgError } = await supabase
        .from('config_fiscal' as any)
        .upsert({
          ...config,
          empresa_id: empresa.id,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: 'empresa_id' });

      if (cfgError) throw cfgError;

      toast.success('Configuração fiscal salva com sucesso!');
    } catch (err) {
      console.error('Error saving fiscal config:', err);
      toast.error('Erro ao salvar configuração fiscal');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Empresa Fiscal Data */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Dados Fiscais da Empresa
          </CardTitle>
          <CardDescription>Informações obrigatórias para emissão de CT-e</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Razão Social *</Label>
              <Input
                value={empresaData.razao_social}
                onChange={e => setEmpresaData(prev => ({ ...prev, razao_social: e.target.value }))}
                placeholder="Razão social completa"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input
                value={empresaData.nome_fantasia}
                onChange={e => setEmpresaData(prev => ({ ...prev, nome_fantasia: e.target.value }))}
                placeholder="Nome fantasia"
              />
            </div>
            <div className="space-y-2">
              <Label>Inscrição Estadual (IE) *</Label>
              <Input
                value={empresaData.inscricao_estadual}
                onChange={e => setEmpresaData(prev => ({ ...prev, inscricao_estadual: e.target.value }))}
                placeholder="123456789"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={empresaData.telefone}
                onChange={e => setEmpresaData(prev => ({ ...prev, telefone: e.target.value }))}
                placeholder="(11) 3000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={empresaData.email}
                onChange={e => setEmpresaData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="fiscal@empresa.com.br"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filial Matriz - Structured Address */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Endereço Fiscal (Filial Matriz)
          </CardTitle>
          <CardDescription>Endereço estruturado para documentos fiscais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filialId ? (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Logradouro</Label>
                  <Input
                    value={filialData.logradouro}
                    onChange={e => setFilialData(prev => ({ ...prev, logradouro: e.target.value }))}
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input
                    value={filialData.numero}
                    onChange={e => setFilialData(prev => ({ ...prev, numero: e.target.value }))}
                    placeholder="123"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input
                    value={filialData.bairro}
                    onChange={e => setFilialData(prev => ({ ...prev, bairro: e.target.value }))}
                    placeholder="Centro"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input
                    value={filialData.complemento}
                    onChange={e => setFilialData(prev => ({ ...prev, complemento: e.target.value }))}
                    placeholder="Sala 101"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Município</Label>
                  <Input value={filialCidade} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input value={filialEstado} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Código IBGE *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={filialData.codigo_municipio_ibge}
                      onChange={e => setFilialData(prev => ({ ...prev, codigo_municipio_ibge: e.target.value }))}
                      placeholder="3550308"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleLookupIBGE}
                      disabled={lookingUpIbge}
                      title="Buscar código IBGE automaticamente"
                    >
                      {lookingUpIbge ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hash className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma filial matriz encontrada. Cadastre uma filial na aba "Transportadora".
            </p>
          )}
        </CardContent>
      </Card>

      {/* CT-e Configuration */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Configuração do CT-e
          </CardTitle>
          <CardDescription>Parâmetros para emissão automática de documentos fiscais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CFOP Estadual</Label>
              <Input
                value={config.cfop_estadual}
                onChange={e => setConfig(prev => ({ ...prev, cfop_estadual: e.target.value }))}
                placeholder="5353"
              />
            </div>
            <div className="space-y-2">
              <Label>CFOP Interestadual</Label>
              <Input
                value={config.cfop_interestadual}
                onChange={e => setConfig(prev => ({ ...prev, cfop_interestadual: e.target.value }))}
                placeholder="6353"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Natureza da Operação</Label>
              <Input
                value={config.natureza_operacao}
                onChange={e => setConfig(prev => ({ ...prev, natureza_operacao: e.target.value }))}
                placeholder="PRESTACAO DE SERVICO DE TRANSPORTE"
              />
            </div>
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Série CT-e</Label>
              <Input
                type="number"
                value={config.serie_cte}
                onChange={e => setConfig(prev => ({ ...prev, serie_cte: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Próximo Número CT-e</Label>
              <Input
                type="number"
                value={config.proximo_numero_cte}
                onChange={e => setConfig(prev => ({ ...prev, proximo_numero_cte: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ICMS - Situação Tributária</Label>
              <Select
                value={config.icms_situacao_tributaria}
                onValueChange={v => setConfig(prev => ({ ...prev, icms_situacao_tributaria: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="00">00 - Tributação normal</SelectItem>
                  <SelectItem value="20">20 - Tributação com BC reduzida</SelectItem>
                  <SelectItem value="40">40 - Isenta</SelectItem>
                  <SelectItem value="41">41 - Não tributada</SelectItem>
                  <SelectItem value="51">51 - Diferimento</SelectItem>
                  <SelectItem value="60">60 - ICMS cobrado por ST</SelectItem>
                  <SelectItem value="90">90 - Outros</SelectItem>
                  <SelectItem value="SN">SN - Simples Nacional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ICMS - Alíquota (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={config.icms_aliquota}
                onChange={e => setConfig(prev => ({ ...prev, icms_aliquota: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tomador Padrão</Label>
              <Select
                value={config.tomador_padrao}
                onValueChange={v => setConfig(prev => ({ ...prev, tomador_padrao: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 - Remetente</SelectItem>
                  <SelectItem value="1">1 - Expedidor</SelectItem>
                  <SelectItem value="2">2 - Recebedor</SelectItem>
                  <SelectItem value="3">3 - Destinatário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Serviço</Label>
              <Select
                value={String(config.tipo_servico)}
                onValueChange={v => setConfig(prev => ({ ...prev, tipo_servico: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 - Normal</SelectItem>
                  <SelectItem value="1">1 - Subcontratação</SelectItem>
                  <SelectItem value="2">2 - Redespacho</SelectItem>
                  <SelectItem value="3">3 - Redespacho Intermediário</SelectItem>
                  <SelectItem value="4">4 - Serviço vinculado multimodal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Ambiente</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={config.ambiente === 2 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setConfig(prev => ({ ...prev, ambiente: 2 }))}
              >
                <Receipt className="w-4 h-4 mr-2" />
                Homologação
              </Button>
              <Button
                type="button"
                variant={config.ambiente === 1 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setConfig(prev => ({ ...prev, ambiente: 1 }))}
              >
                <Receipt className="w-4 h-4 mr-2" />
                Produção
              </Button>
              {config.ambiente === 2 && (
                <Badge variant="secondary">Sem valor fiscal</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Configuração Fiscal
        </Button>
      </div>
    </div>
  );
}
