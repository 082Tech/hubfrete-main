import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, RefreshCw, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Invite {
  id: string;
  email: string;
  status: string;
  role: string | null;
  created_at: string;
}

interface ManageInvitesCardProps {
  invites: Invite[];
  onRefresh: () => void;
}

export function ManageInvitesCard({ invites, onRefresh }: ManageInvitesCardProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const pendingInvites = invites.filter(i => i.status === 'pending');

  if (pendingInvites.length === 0) return null;

  const handleCancelInvite = async (inviteId: string) => {
    setLoadingId(inviteId);
    try {
      const { error } = await supabase
        .from('company_invites')
        .update({ status: 'cancelled' })
        .eq('id', inviteId);

      if (error) throw error;

      toast.success('Convite cancelado');
      onRefresh();
    } catch (error) {
      console.error('Error cancelling invite:', error);
      toast.error('Erro ao cancelar convite');
    } finally {
      setLoadingId(null);
    }
  };

  const handleResendInvite = async (invite: Invite) => {
    setLoadingId(invite.id);
    try {
      toast.info('Para reenviar, cancele este convite e envie um novo');
    } finally {
      setLoadingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
        onClick={() => setOpen(true)}
      >
        <Mail className="w-4 h-4" />
        Convites Pendentes
        <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 text-xs px-1.5 py-0">
          {pendingInvites.length}
        </Badge>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-600" />
              Convites Pendentes ({pendingInvites.length})
            </DialogTitle>
            <DialogDescription>
              Convites enviados aguardando aceitação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {invite.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                      {invite.role === 'ADMIN' ? 'Administrador' : 'Operador'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(invite.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleResendInvite(invite)}
                    disabled={loadingId === invite.id}
                    title="Reenviar convite"
                  >
                    {loadingId === invite.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleCancelInvite(invite.id)}
                    disabled={loadingId === invite.id}
                    title="Cancelar convite"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
