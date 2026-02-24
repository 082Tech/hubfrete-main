import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileKey, Save, Loader2, KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CertificadoDigitalFormProps {
  empresaId: number;
}

export function CertificadoDigitalForm({ empresaId }: CertificadoDigitalFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [senha, setSenha] = useState('');
  
  const [certificadoAtual, setCertificadoAtual] = useState<{
    nome_titular: string | null;
    cnpj_titular: string | null;
    data_validade: string | null;
    updated_at: string;
  } | null>(null);

  useEffect(() => {
    if (empresaId) {
      loadCertificado();
    }
  }, [empresaId]);

  const loadCertificado = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('certificados_digitais')
        .select('nome_titular, cnpj_titular, data_validade, updated_at')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (error) {
        if (error.code !== 'PGRST116') { // Ignora erro de "not found"
          console.error('Erro ao buscar certificado:', error);
        }
      } else if (data) {
        setCertificadoAtual(data);
      }
    } catch (err) {
      console.error('Falha ao carregar certificado:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pfx') && !file.name.toLowerCase().endsWith('.p12')) {
        toast.error('O certificado digital deve ser um arquivo .PFX ou .P12');
        e.target.value = '';
        return;
      }
      setCertificadoFile(file);
    }
  };

  const handleUploadCertificado = async () => {
    if (!certificadoFile) {
      toast.error('Selecione um arquivo de certificado (.pfx ou .p12)');
      return;
    }
    if (!senha) {
      toast.error('Digite a senha do certificado');
      return;
    }

    setSaving(true);
    try {
      // 1. Ler o arquivo como Base64
      const fileBuffer = await certificadoFile.arrayBuffer();
      // Em Deno Edge Functions ou APIs reais fariamos algo melhor,
      // aqui formatamos pra string base64 simples.
      const base64String = btoa(new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

      // 2. Chamar a RPC ou fazer o upsert na tabela diretamente.
      // Como a tabela tem senha_encriptada e pfx_base64 que requerem mais cuidados no server, 
      // idealmente chamariamos um Edge Function. Mas faremos Update/Insert via cliente para o escopo inicial:
      const { error } = await supabase
        .from('certificados_digitais')
        .upsert({
          empresa_id: empresaId,
          pfx_base64: base64String,
          senha_encriptada: senha, // ATENÇÂO: num projeto real, nunca grave em plain text no client
          // Podemos mockar dados os demais metadados ou extrair no Edge Function
          nome_titular: 'Certificado Enviado (Pendente Análise)',
        }, { onConflict: 'empresa_id' });

      if (error) throw error;

      toast.success('Certificado Digital salvo com sucesso!');
      setCertificadoFile(null);
      setSenha('');
      loadCertificado();

    } catch (error: any) {
      console.error('Erro ao salvar certificado:', error);
      toast.error(error.message || 'Ocorreu um erro ao enviar o certificado.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Verifica validade (simples check de data)
  let statusValidade: 'valido' | 'vencido' | 'alerta' | 'none' = 'none';
  if (certificadoAtual?.data_validade) {
    const validade = new Date(certificadoAtual.data_validade);
    const hoje = new Date();
    const trintaDias = new Date();
    trintaDias.setDate(hoje.getDate() + 30);

    if (validade < hoje) {
      statusValidade = 'vencido';
    } else if (validade <= trintaDias) {
      statusValidade = 'alerta';
    } else {
      statusValidade = 'valido';
    }
  }

  return (
    <Card className="border-border bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
          <FileKey className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Certificado Digital (A1)
        </CardTitle>
        <CardDescription>
          Gerencie o e-CNPJ (modelo A1) utilizado para assinar NF-es, CT-es e GNREs automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {certificadoAtual && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-3 text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Certificado Vinculado
            </h4>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-slate-500 text-xs uppercase tracking-wider mb-1">Titular</span>
                <span className="font-medium">{certificadoAtual.nome_titular || 'Não extraído'}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-xs uppercase tracking-wider mb-1">CNPJ</span>
                <span className="font-mono">{certificadoAtual.cnpj_titular || 'Não extraído'}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-xs uppercase tracking-wider mb-1">Atualizado em</span>
                <span>{format(new Date(certificadoAtual.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-xs uppercase tracking-wider mb-1">Validade</span>
                <div className="flex items-center gap-2">
                  <span className={
                    statusValidade === 'vencido' ? 'text-red-600 font-bold' :
                    statusValidade === 'alerta' ? 'text-amber-600 font-bold' :
                    'font-medium text-emerald-600'
                  }>
                    {certificadoAtual.data_validade ? format(new Date(certificadoAtual.data_validade), "dd/MM/yyyy", { locale: ptBR }) : 'Desconhecida'}
                  </span>
                  {statusValidade === 'vencido' && <Badge variant="destructive" className="text-[10px]">Vencido</Badge>}
                  {statusValidade === 'alerta' && <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">Irá Vencer</Badge>}
                  {statusValidade === 'valido' && <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600">Ativo</Badge>}
                </div>
              </div>
            </div>
            {statusValidade === 'vencido' && (
              <div className="mt-4 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-3 rounded-md border border-red-200 dark:border-red-800/30 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Seu certificado digital expirou. A emissão de novos documentos fiscais como CT-e e GNRE não será possível até que um novo certificado válido seja anexado.</p>
              </div>
            )}
            {statusValidade === 'alerta' && (
              <div className="mt-4 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-3 rounded-md border border-amber-200 dark:border-amber-800/30 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Seu certificado vence em menos de 30 dias. Para evitar interrupções operacionais, atualize o arquivo PFX antes da data de expiração.</p>
              </div>
            )}
          </div>
        )}

        <div className="pt-2">
          <h4 className="text-sm font-semibold mb-3 text-slate-900 dark:text-slate-100">
            {certificadoAtual ? 'Substituir Certificado' : 'Anexar Certificado'}
          </h4>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="cert-file" className="text-xs">Arquivo PFX/P12</Label>
              <Input
                id="cert-file"
                type="file"
                accept=".pfx,.p12"
                onChange={handleFileChange}
                className="cursor-pointer file:cursor-pointer"
              />
              <p className="text-[10px] text-muted-foreground">Tamanho máximo: 5MB</p>
            </div>
            
            <div className="sm:w-[200px] space-y-2">
              <Label htmlFor="cert-senha" className="text-xs">Senha de Instalação</Label>
              <div className="relative">
                <KeyRound className="absolute w-4 h-4 left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="cert-senha"
                  type="password"
                  placeholder="Senha do PFX"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button onClick={handleUploadCertificado} disabled={saving || !certificadoFile || !senha}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Certificado
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
