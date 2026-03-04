import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Mail, AlertCircle, Smartphone } from 'lucide-react';
import { MotoristaFormData } from '../types';

interface EtapaCredenciaisProps {
  formData: MotoristaFormData;
  updateFormData: (updates: Partial<MotoristaFormData>) => void;
}

export function EtapaCredenciais({ formData, updateFormData }: EtapaCredenciaisProps) {
  const passwordsMatch = formData.auth_password === formData.auth_password_confirm;
  const passwordTooShort = formData.auth_password.length > 0 && formData.auth_password.length < 6;

  return (
    <div className="space-y-6">
      <Alert className="border-primary/30 bg-primary/5">
        <Smartphone className="h-4 w-4 text-primary" />
        <AlertDescription className="text-foreground">
          <strong>Acesso ao Aplicativo Mobile</strong>
          <p className="text-sm text-muted-foreground mt-1">
            Essas credenciais serão utilizadas pelo motorista para acessar o aplicativo de entregas.
            Anote a senha pois ela não poderá ser visualizada depois.
          </p>
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Lock className="w-4 h-4" />
          Credenciais de Acesso
        </div>

        <div className="space-y-2">
          <Label htmlFor="auth_email">Email de Login *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="auth_email"
              type="email"
              placeholder="motorista@exemplo.com"
              value={formData.auth_email}
              onChange={(e) => updateFormData({ auth_email: e.target.value })}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Será usado como login no aplicativo
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="auth_password">Senha *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <PasswordInput
                id="auth_password"
                placeholder="Mínimo 6 caracteres"
                value={formData.auth_password}
                onChange={(e) => updateFormData({ auth_password: e.target.value })}
                className="pl-10"
              />
            </div>
            {passwordTooShort && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Mínimo 6 caracteres
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth_password_confirm">Confirmar Senha *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <PasswordInput
                id="auth_password_confirm"
                placeholder="Repita a senha"
                value={formData.auth_password_confirm}
                onChange={(e) => updateFormData({ auth_password_confirm: e.target.value })}
                className="pl-10"
              />
            </div>
            {formData.auth_password_confirm && !passwordsMatch && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                As senhas não coincidem
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
        <p className="text-sm font-medium text-foreground">Requisitos da senha:</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li className={formData.auth_password.length >= 6 ? 'text-green-600' : ''}>
            • Mínimo 6 caracteres
          </li>
          <li className={passwordsMatch && formData.auth_password_confirm ? 'text-green-600' : ''}>
            • Confirmação de senha coincide
          </li>
        </ul>
      </div>
    </div>
  );
}
