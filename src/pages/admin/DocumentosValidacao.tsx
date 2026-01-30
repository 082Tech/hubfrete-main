import { useState, useEffect, useMemo } from 'react';
import { FileCheck, Search, Filter, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import {
  DocumentQueue,
  DocumentoValidacao,
  ValidationDialog,
  ExpiringDocumentsAlert,
  DocumentPreview,
} from '@/components/admin/documentos';

export default function DocumentosValidacao() {
  const [documents, setDocuments] = useState<DocumentoValidacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<DocumentoValidacao | null>(null);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Fetch documents
  useEffect(() => {
    async function fetchDocuments() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('documentos_validacao')
          .select(`
            *,
            motoristas (id, nome_completo),
            veiculos (id, placa),
            carrocerias (id, placa)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mapped: DocumentoValidacao[] = (data || []).map((d) => ({
          id: d.id,
          tipo: d.tipo,
          numero: d.numero,
          status: d.status as 'pendente' | 'aprovado' | 'rejeitado',
          url: d.url,
          data_emissao: d.data_emissao,
          data_vencimento: d.data_vencimento,
          motorista_id: d.motorista_id,
          motorista_nome: (d.motoristas as any)?.nome_completo,
          veiculo_id: d.veiculo_id,
          veiculo_placa: (d.veiculos as any)?.placa,
          carroceria_id: d.carroceria_id,
          carroceria_placa: (d.carrocerias as any)?.placa,
        }));

        setDocuments(mapped);
      } catch (error) {
        console.error('Error fetching documents:', error);
        toast.error('Erro ao carregar documentos');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocuments();
  }, []);

  // Filter and search
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      // Search filter
      if (search) {
        const term = search.toLowerCase();
        const matches =
          doc.numero.toLowerCase().includes(term) ||
          doc.motorista_nome?.toLowerCase().includes(term) ||
          doc.veiculo_placa?.toLowerCase().includes(term) ||
          doc.carroceria_placa?.toLowerCase().includes(term);
        if (!matches) return false;
      }

      // Tipo filter
      if (filterTipo !== 'all' && doc.tipo !== filterTipo) return false;

      // Status filter
      if (filterStatus !== 'all' && doc.status !== filterStatus) return false;

      return true;
    });
  }, [documents, search, filterTipo, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    const pending = documents.filter((d) => d.status === 'pendente').length;
    const approved = documents.filter((d) => d.status === 'aprovado').length;
    const rejected = documents.filter((d) => d.status === 'rejeitado').length;
    const expiring = documents.filter((d) => {
      if (!d.data_vencimento) return false;
      const days = differenceInDays(new Date(d.data_vencimento), new Date());
      return days >= 0 && days <= 30;
    }).length;

    return { pending, approved, rejected, expiring };
  }, [documents]);

  // Expiring documents for alert
  const expiringDocuments = useMemo(() => {
    return documents
      .filter((d) => d.data_vencimento)
      .map((d) => ({
        id: d.id,
        tipo: d.tipo,
        numero: d.numero,
        data_vencimento: d.data_vencimento!,
        vinculado: d.motorista_nome || d.veiculo_placa || d.carroceria_placa || 'N/A',
        dias_restantes: differenceInDays(new Date(d.data_vencimento!), new Date()),
      }))
      .filter((d) => d.dias_restantes <= 30)
      .sort((a, b) => a.dias_restantes - b.dias_restantes);
  }, [documents]);

  // Handlers
  const handleSelectDocument = (doc: DocumentoValidacao) => {
    setSelectedDoc(doc);
    setIsValidationOpen(true);
  };

  const handlePreviewDocument = (url: string) => {
    setPreviewUrl(url);
    setIsPreviewOpen(true);
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('documentos_validacao')
      .update({ status: 'aprovado' })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao aprovar documento');
      throw error;
    }

    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'aprovado' as const } : d))
    );
    toast.success('Documento aprovado com sucesso!');
  };

  const handleReject = async (id: string, motivo: string) => {
    const { error } = await supabase
      .from('documentos_validacao')
      .update({ status: 'rejeitado' })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao rejeitar documento');
      throw error;
    }

    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'rejeitado' as const } : d))
    );
    toast.success('Documento rejeitado');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileCheck className="w-7 h-7 text-primary" />
          Validação de Documentos
        </h1>
        <p className="text-sm text-muted-foreground">
          Aprove ou rejeite documentos de motoristas, veículos e carrocerias
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-4/10 rounded-lg">
              <Clock className="w-5 h-5 text-chart-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-2/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.approved}</p>
              <p className="text-xs text-muted-foreground">Aprovados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <XCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.rejected}</p>
              <p className="text-xs text-muted-foreground">Rejeitados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-1/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-chart-1" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.expiring}</p>
              <p className="text-xs text-muted-foreground">Vencendo em breve</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Alert */}
      {expiringDocuments.length > 0 && (
        <ExpiringDocumentsAlert documents={expiringDocuments} />
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, motorista, placa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[150px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="cnh">CNH</SelectItem>
            <SelectItem value="crlv">CRLV</SelectItem>
            <SelectItem value="antt">ANTT</SelectItem>
            <SelectItem value="seguro">Seguro</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="rejeitado">Rejeitado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Document Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todos ({documents.length})</TabsTrigger>
          <TabsTrigger value="pending">Pendentes ({stats.pending})</TabsTrigger>
          <TabsTrigger value="approved">Aprovados ({stats.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejeitados ({stats.rejected})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <DocumentQueue
            documents={filteredDocs}
            isLoading={isLoading}
            onSelectDocument={handleSelectDocument}
            onPreviewDocument={handlePreviewDocument}
          />
        </TabsContent>

        <TabsContent value="pending">
          <DocumentQueue
            documents={filteredDocs.filter((d) => d.status === 'pendente')}
            isLoading={isLoading}
            onSelectDocument={handleSelectDocument}
            onPreviewDocument={handlePreviewDocument}
          />
        </TabsContent>

        <TabsContent value="approved">
          <DocumentQueue
            documents={filteredDocs.filter((d) => d.status === 'aprovado')}
            isLoading={isLoading}
            onSelectDocument={handleSelectDocument}
            onPreviewDocument={handlePreviewDocument}
          />
        </TabsContent>

        <TabsContent value="rejected">
          <DocumentQueue
            documents={filteredDocs.filter((d) => d.status === 'rejeitado')}
            isLoading={isLoading}
            onSelectDocument={handleSelectDocument}
            onPreviewDocument={handlePreviewDocument}
          />
        </TabsContent>
      </Tabs>

      {/* Validation Dialog */}
      <ValidationDialog
        document={selectedDoc}
        isOpen={isValidationOpen}
        onClose={() => {
          setIsValidationOpen(false);
          setSelectedDoc(null);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Document Preview */}
      <DocumentPreview
        url={previewUrl}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewUrl(null);
        }}
      />
    </div>
  );
}
