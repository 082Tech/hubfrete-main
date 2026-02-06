import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  User,
  CreditCard,
  FileText,
  UserPlus,
  Phone,
  CheckCircle,
  XCircle,
} from 'lucide-react';

import { MotoristaFormData, ESTADOS_BRASIL } from '../types';

interface EtapaResumoProps {
  formData: MotoristaFormData;
}

export function EtapaResumo({ formData }: EtapaResumoProps) {
  const estadoLabel = ESTADOS_BRASIL.find(e => e.value === formData.uf)?.label || formData.uf;

  const DocumentStatus = ({ uploaded }: { uploaded: boolean }) => (
    uploaded ? (
      <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20 gap-1">
        <CheckCircle className="w-3 h-3" />
        Enviado
      </Badge>
    ) : (
      <Badge variant="secondary" className="gap-1">
        <XCircle className="w-3 h-3" />
        Não enviado
      </Badge>
    )
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Revise as informações antes de cadastrar o motorista.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* Dados Pessoais */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nome:</span>
              <span className="font-medium">{formData.nome_completo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CPF:</span>
              <span>{formData.cpf}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">UF:</span>
              <span>{estadoLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <Badge variant={formData.tipo_cadastro === 'frota' ? 'default' : formData.tipo_cadastro === 'terceirizado' ? 'outline' : 'secondary'}>
                {formData.tipo_cadastro === 'frota' ? 'Frota' : formData.tipo_cadastro === 'terceirizado' ? 'Terceirizado' : 'Autônomo'}
              </Badge>
            </div>
            {formData.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="text-xs">{formData.email}</span>
              </div>
            )}
            {formData.telefone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefone:</span>
                <span>{formData.telefone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CNH */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              CNH
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Número:</span>
              <span>{formData.cnh}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Categoria:</span>
              <Badge variant="outline">{formData.categoria_cnh}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Validade:</span>
              <span>{new Date(formData.validade_cnh).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">QR Code:</span>
              {formData.cnh_tem_qrcode ? (
                <CheckCircle className="w-4 h-4 text-chart-2" />
              ) : (
                <XCircle className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">CNH Digital:</span>
              <DocumentStatus uploaded={!!formData.cnh_digital_url} />
            </div>
          </CardContent>
        </Card>

        {/* Documentos */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Documentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Comprov. Endereço:</span>
              <DocumentStatus uploaded={!!formData.comprovante_endereco_url} />
            </div>
            {formData.comprovante_endereco_titular_nome && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Titular:</span>
                <span className="text-xs">{formData.comprovante_endereco_titular_nome}</span>
              </div>
            )}
            {formData.tipo_cadastro === 'frota' && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Comprov. Vínculo:</span>
                <DocumentStatus uploaded={!!formData.comprovante_vinculo_url} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ajudante */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Ajudante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {formData.possui_ajudante ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nome:</span>
                  <span className="font-medium">{formData.ajudante_nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPF:</span>
                  <span>{formData.ajudante_cpf}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <Badge variant={formData.ajudante_tipo_cadastro === 'frota' ? 'default' : 'secondary'}>
                    {formData.ajudante_tipo_cadastro === 'frota' ? 'Frota' : 'Autônomo'}
                  </Badge>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-2">
                Sem ajudante cadastrado
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Referências Pessoais */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Phone className="w-4 h-4 text-primary" />
          Referências Pessoais
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {formData.referencias.filter(r => r.tipo === 'pessoal').map((ref, i) => (
            <div key={i} className="text-sm p-2 bg-muted/50 rounded">
              <p className="font-medium">{ref.nome || '-'}</p>
              <p className="text-muted-foreground">{ref.telefone || '-'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
