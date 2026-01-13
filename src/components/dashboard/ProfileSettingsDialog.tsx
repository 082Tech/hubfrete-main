import { useState } from 'react';
import { KeyRound, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { changePassword, forgotPasswordRequest, forgotPasswordConfirm, getAuthUser } from '@/lib/api';

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ForgotStep = 'request' | 'code' | 'success';

export function ProfileSettingsDialog({ open, onOpenChange }: ProfileSettingsDialogProps) {
  const userEmail = getAuthUser() || '';
  
  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  
  // Forgot password state
  const [forgotStep, setForgotStep] = useState<ForgotStep>('request');
  const [forgotEmail, setForgotEmail] = useState(userEmail);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  const resetChangeForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const resetForgotForm = () => {
    setForgotStep('request');
    setForgotEmail(userEmail);
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setVerificationCode('');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmNewPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    setIsChanging(true);
    try {
      await changePassword(userEmail, currentPassword, newPassword);
      toast.success('Senha alterada com sucesso!');
      resetChangeForm();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar senha');
    } finally {
      setIsChanging(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotEmail) {
      toast.error('Informe o e-mail');
      return;
    }
    
    if (forgotNewPassword !== forgotConfirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    
    if (forgotNewPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    setIsForgotLoading(true);
    try {
      await forgotPasswordRequest(forgotEmail);
      toast.success('Código de verificação enviado para o e-mail!');
      setForgotStep('code');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar código');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleForgotConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (verificationCode.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }
    
    setIsForgotLoading(true);
    try {
      await forgotPasswordConfirm(forgotEmail, parseInt(verificationCode, 10), forgotNewPassword);
      toast.success('Senha alterada com sucesso!');
      setForgotStep('success');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Código inválido');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleClose = () => {
    resetChangeForm();
    resetForgotForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações do Perfil</DialogTitle>
          <DialogDescription>
            Gerencie suas configurações de conta e segurança
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold text-lg">
                {userEmail?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div>
              <p className="font-medium">{userEmail || 'Usuário'}</p>
              <p className="text-sm text-muted-foreground">Administrador</p>
            </div>
          </div>

          <Tabs defaultValue="change" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="change" className="flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                Alterar Senha
              </TabsTrigger>
              <TabsTrigger value="forgot" className="flex items-center gap-2" onClick={resetForgotForm}>
                <Mail className="w-4 h-4" />
                Esqueci Senha
              </TabsTrigger>
            </TabsList>

            {/* Change Password Tab */}
            <TabsContent value="change" className="space-y-4 mt-4">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="Digite sua senha atual"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Digite a nova senha"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmNewPassword"
                      type="password"
                      placeholder="Confirme a nova senha"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isChanging}>
                  {isChanging ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </form>
            </TabsContent>

            {/* Forgot Password Tab */}
            <TabsContent value="forgot" className="space-y-4 mt-4">
              {forgotStep === 'request' && (
                <form onSubmit={handleForgotRequest} className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Um código de verificação será enviado para o seu e-mail.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="forgotEmail">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="forgotEmail"
                        type="email"
                        placeholder="seu@email.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="forgotNewPassword">Nova Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="forgotNewPassword"
                        type={showForgotPassword ? 'text' : 'password'}
                        placeholder="Digite a nova senha"
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowForgotPassword(!showForgotPassword)}
                      >
                        {showForgotPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="forgotConfirmPassword">Confirmar Nova Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="forgotConfirmPassword"
                        type="password"
                        placeholder="Confirme a nova senha"
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isForgotLoading}>
                    {isForgotLoading ? 'Enviando...' : 'Enviar Código de Verificação'}
                  </Button>
                </form>
              )}

              {forgotStep === 'code' && (
                <form onSubmit={handleForgotConfirm} className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Digite o código de 6 dígitos enviado para<br />
                    <strong>{forgotEmail}</strong>
                  </p>

                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={verificationCode}
                      onChange={setVerificationCode}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <Button type="submit" className="w-full" disabled={isForgotLoading}>
                    {isForgotLoading ? 'Verificando...' : 'Confirmar e Alterar Senha'}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setForgotStep('request')}
                  >
                    Voltar
                  </Button>
                </form>
              )}

              {forgotStep === 'success' && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                    <KeyRound className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Senha Alterada!</h3>
                    <p className="text-sm text-muted-foreground">
                      Sua senha foi alterada com sucesso.
                    </p>
                  </div>
                  <Button onClick={handleClose} className="w-full">
                    Fechar
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
