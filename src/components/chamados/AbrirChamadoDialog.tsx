import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, Loader2, CheckCircle, Headphones } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useToast } from '@/hooks/use-toast';

interface AbrirChamadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillTitulo?: string;
  prefillDescricao?: string;
  prefillCategoria?: string;
}

type CategoriaLabel = {
  value: string;
  label: string;
};

const categorias: CategoriaLabel[] = [
  { value: 'suporte_tecnico', label: 'Suporte Técnico' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'operacional', label: 'Operacional' },
  { value: 'reclamacao', label: 'Reclamação' },
  { value: 'sugestao', label: 'Sugestão' },
  { value: 'outros', label: 'Outros' },
];

interface ChamadoMensagem {
  id: string;
  conteudo: string;
  sender_nome: string;
  sender_tipo: string;
  created_at: string;
}

export function AbrirChamadoDialog({ open, onOpenChange }: AbrirChamadoDialogProps) {
  const location = useLocation();
  const isTransportadora = location.pathname.startsWith('/transportadora');
  const { empresa } = useUserContext();
  const { toast } = useToast();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Fetch user info
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        const { data } = await supabase
          .from('usuarios')
          .select('nome')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        setUserName(data?.nome || user.email || 'Usuário');
      }
    };
    fetchUser();
  }, []);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('suporte_tecnico');
  const [descricao, setDescricao] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chat state (after chamado is created)
  const [chamadoId, setChamadoId] = useState<string | null>(null);
  const [chamadoCodigo, setChamadoCodigo] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<ChamadoMensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTitulo('');
      setCategoria('suporte_tecnico');
      setDescricao('');
      setChamadoId(null);
      setChamadoCodigo(null);
      setMensagens([]);
      setNovaMensagem('');
    }
  }, [open]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [mensagens]);

  // Subscribe to new messages
  useEffect(() => {
    if (!chamadoId) return;

    const channel = supabase
      .channel(`chamado-msgs-${chamadoId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chamado_mensagens',
        filter: `chamado_id=eq.${chamadoId}`,
      }, (payload) => {
        const newMsg = payload.new as ChamadoMensagem;
        setMensagens(prev => {
          // Skip if already present (real or optimistic replaced)
          if (prev.some(m => m.id === newMsg.id)) return prev;
          // Also remove any temp messages with same content (optimistic already replaced)
          return [...prev.filter(m => !m.id.startsWith('temp-')), newMsg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chamadoId]);

  const handleSubmit = async () => {
    if (!titulo.trim() || !descricao.trim()) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const codigo = `CHM-${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase
        .from('chamados')
        .insert({
          codigo,
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          categoria: categoria as any,
          prioridade: 'media' as any,
          solicitante_user_id: user.id,
          solicitante_nome: userName || user.email || 'Usuário',
          solicitante_email: userEmail || user.email || '',
          solicitante_tipo: isTransportadora ? 'transportadora' : 'embarcador',
          empresa_id: empresa?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert initial message from the description
      const { error: msgError } = await supabase
        .from('chamado_mensagens')
        .insert({
          chamado_id: data.id,
          conteudo: descricao.trim(),
          sender_id: user.id,
          sender_nome: userName || 'Usuário',
          sender_tipo: isTransportadora ? 'transportadora' : 'embarcador',
        });

      if (msgError) console.error('Error inserting first message:', msgError);

      setChamadoId(data.id);
      setChamadoCodigo(codigo);

      // Fetch messages
      const { data: msgs } = await supabase
        .from('chamado_mensagens')
        .select('id, conteudo, sender_nome, sender_tipo, created_at')
        .eq('chamado_id', data.id)
        .order('created_at', { ascending: true });

      setMensagens(msgs || []);

      toast({ title: 'Chamado aberto com sucesso!', description: `Código: ${codigo}` });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao abrir chamado', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!novaMensagem.trim() || !chamadoId) return;

    const msgContent = novaMensagem.trim();
    setIsSendingMsg(true);
    setNovaMensagem('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const senderNome = userName || 'Usuário';
      const senderTipo = isTransportadora ? 'transportadora' : 'embarcador';

      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: ChamadoMensagem = {
        id: tempId,
        conteudo: msgContent,
        sender_nome: senderNome,
        sender_tipo: senderTipo,
        created_at: new Date().toISOString(),
      };
      setMensagens(prev => [...prev, optimisticMsg]);

      const { data, error } = await supabase
        .from('chamado_mensagens')
        .insert({
          chamado_id: chamadoId,
          conteudo: msgContent,
          sender_id: user.id,
          sender_nome: senderNome,
          sender_tipo: senderTipo,
        })
        .select('id, conteudo, sender_nome, sender_tipo, created_at')
        .single();

      if (error) throw error;

      // Replace optimistic with real message
      if (data) {
        setMensagens(prev => prev.map(m => m.id === tempId ? data : m));
      }
    } catch (err: any) {
      // Remove optimistic message on error
      setMensagens(prev => prev.filter(m => !m.id.startsWith('temp-')));
      setNovaMensagem(msgContent);
      toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' });
    } finally {
      setIsSendingMsg(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            {chamadoId ? `Chamado ${chamadoCodigo}` : 'Abrir Chamado de Suporte'}
          </DialogTitle>
        </DialogHeader>

        {!chamadoId ? (
          /* ── Form ── */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Assunto *</Label>
              <Input
                id="titulo"
                placeholder="Descreva brevemente o problema..."
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Textarea
                id="descricao"
                placeholder="Explique com detalhes o que está acontecendo..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={5}
              />
            </div>

            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full gap-2">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar Chamado
            </Button>
          </div>
        ) : (
          /* ── Chat after creation ── */
          <div className="flex-1 flex flex-col min-h-0 gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">
                Chamado aberto! Acompanhe a conversa aqui ou em Mensagens &gt; Suporte.
              </span>
            </div>

            <ScrollArea className="flex-1 max-h-[40vh] border rounded-lg p-3" ref={scrollRef}>
              <div className="space-y-3">
                {mensagens.map(msg => {
                  const isSupport = msg.sender_tipo === 'suporte' || msg.sender_tipo === 'admin';
                  return (
                    <div key={msg.id} className={`flex flex-col ${isSupport ? 'items-start' : 'items-end'}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        isSupport
                          ? 'bg-muted text-foreground'
                          : 'bg-primary text-primary-foreground'
                      }`}>
                        <p className="font-medium text-xs mb-0.5 opacity-70">{msg.sender_nome}</p>
                        <p className="whitespace-pre-wrap">{msg.conteudo}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5">{formatTime(msg.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex gap-2 shrink-0">
              <Input
                placeholder="Digite uma mensagem..."
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              />
              <Button size="icon" onClick={handleSendMessage} disabled={isSendingMsg || !novaMensagem.trim()}>
                {isSendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
