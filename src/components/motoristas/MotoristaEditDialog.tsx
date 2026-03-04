import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, User, CreditCard, FileText, Upload, CheckCircle, Trash2, Camera, X } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

import { MotoristaCompleto, ESTADOS_BRASIL, CATEGORIAS_CNH } from './types';

interface MotoristaEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista: MotoristaCompleto | null;
}

export function MotoristaEditDialog({ open, onOpenChange, motorista }: MotoristaEditDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // File refs
  const fotoRef = useRef<HTMLInputElement>(null);
  const cnhDigitalRef = useRef<HTMLInputElement>(null);
  const comprovanteEnderecoRef = useRef<HTMLInputElement>(null);
  const comprovanteVinculoRef = useRef<HTMLInputElement>(null);
  const docTitularRef = useRef<HTMLInputElement>(null);
  const ajudanteVinculoRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    email: '',
    telefone: '',
    uf: '',
    tipo_cadastro: 'frota' as 'autonomo' | 'frota',
    foto_url: '',
    cnh: '',
    categoria_cnh: '',
    validade_cnh: '',
    cnh_tem_qrcode: false,
    cnh_digital_url: '',
    comprovante_endereco_url: '',
    comprovante_endereco_em_nome_proprio: true,
    comprovante_endereco_titular_nome: '',
    comprovante_endereco_titular_doc_url: '',
    comprovante_vinculo_url: '',
    possui_ajudante: false,
    ajudante_id: '' as string,
    ajudante_nome: '',
    ajudante_cpf: '',
    ajudante_telefone: '',
    ajudante_tipo_cadastro: 'autonomo' as 'autonomo' | 'frota',
    ajudante_comprovante_vinculo_url: '',
    ativo: true,
  });

  useEffect(() => {
    if (motorista) {
      const ajudante = motorista.ajudantes?.[0] ?? null;
      setFormData({
        nome_completo: motorista.nome_completo,
        cpf: motorista.cpf,
        email: motorista.email || '',
        telefone: motorista.telefone || '',
        uf: motorista.uf || '',
        tipo_cadastro: motorista.tipo_cadastro || 'frota',
        foto_url: motorista.foto_url || '',
        cnh: motorista.cnh,
        categoria_cnh: motorista.categoria_cnh,
        validade_cnh: motorista.validade_cnh,
        cnh_tem_qrcode: motorista.cnh_tem_qrcode || false,
        cnh_digital_url: motorista.cnh_digital_url || '',
        comprovante_endereco_url: motorista.comprovante_endereco_url || '',
        comprovante_endereco_em_nome_proprio: !motorista.comprovante_endereco_titular_nome,
        comprovante_endereco_titular_nome: motorista.comprovante_endereco_titular_nome || '',
        comprovante_endereco_titular_doc_url: motorista.comprovante_endereco_titular_doc_url || '',
        comprovante_vinculo_url: motorista.comprovante_vinculo_url || '',
        possui_ajudante: motorista.possui_ajudante || false,
        ajudante_id: ajudante?.id || '',
        ajudante_nome: ajudante?.nome || '',
        ajudante_cpf: ajudante?.cpf || '',
        ajudante_telefone: ajudante?.telefone || '',
        ajudante_tipo_cadastro: ajudante?.tipo_cadastro || 'autonomo',
        ajudante_comprovante_vinculo_url: ajudante?.comprovante_vinculo_url || '',
        ativo: motorista.ativo,
      });
    }
  }, [motorista]);

  const handleFileUpload = async (
    file: File,
    field:
      | 'cnh_digital_url'
      | 'comprovante_endereco_url'
      | 'comprovante_vinculo_url'
      | 'comprovante_endereco_titular_doc_url'
      | 'ajudante_comprovante_vinculo_url'
  ) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${motorista?.id}/${field}_${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('motoristas')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('motoristas')
        .getPublicUrl(data.path);

      setFormData(prev => ({ ...prev, [field]: publicUrlData.publicUrl }));
      toast.success('Arquivo enviado com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar arquivo');
    }
  };

  const handleFotoUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Foto deve ter no máximo 5MB.');
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `motoristas/fotos/${motorista?.id}_${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('fotos-frota')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('fotos-frota')
        .getPublicUrl(data.path);

      setFormData(prev => ({ ...prev, foto_url: publicUrlData.publicUrl }));
      toast.success('Foto enviada com sucesso!');
    } catch (error) {
      console.error('Erro no upload da foto:', error);
      toast.error('Erro ao enviar foto');
    }
  };

  const handleSubmit = async () => {
    if (!motorista) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('motoristas')
        .update({
          nome_completo: formData.nome_completo,
          cpf: formData.cpf.replace(/\D/g, ''),
          email: formData.email || null,
          telefone: formData.telefone || null,
          uf: formData.uf || null,
          tipo_cadastro: formData.tipo_cadastro,
          foto_url: formData.foto_url || null,
          cnh: formData.cnh,
          categoria_cnh: formData.categoria_cnh,
          validade_cnh: formData.validade_cnh,
          cnh_tem_qrcode: formData.cnh_tem_qrcode,
          cnh_digital_url: formData.cnh_digital_url || null,
          comprovante_endereco_url: formData.comprovante_endereco_url || null,
          comprovante_endereco_titular_nome: formData.comprovante_endereco_em_nome_proprio ? null : formData.comprovante_endereco_titular_nome,
          comprovante_endereco_titular_doc_url: formData.comprovante_endereco_em_nome_proprio ? null : formData.comprovante_endereco_titular_doc_url,
          comprovante_vinculo_url: formData.comprovante_vinculo_url || null,
          possui_ajudante: formData.possui_ajudante,
          ativo: formData.ativo,
        })
        .eq('id', motorista.id);

      if (error) throw error;

      // Ajudante (mostrar/editar no portal)
      if (formData.possui_ajudante) {
        // Campos só aparecem quando possui_ajudante=true, então aqui garantimos dados mínimos
        if (!formData.ajudante_nome || !formData.ajudante_cpf) {
          toast.error('Preencha nome e CPF do ajudante');
          setIsSubmitting(false);
          return;
        }

        if (formData.ajudante_id) {
          const { error: ajudanteUpdateError } = await supabase
            .from('ajudantes')
            .update({
              nome: formData.ajudante_nome,
              cpf: formData.ajudante_cpf.replace(/\D/g, ''),
              telefone: formData.ajudante_telefone || null,
              tipo_cadastro: formData.ajudante_tipo_cadastro,
              comprovante_vinculo_url: formData.ajudante_comprovante_vinculo_url || null,
              ativo: true,
            })
            .eq('id', formData.ajudante_id);
          if (ajudanteUpdateError) throw ajudanteUpdateError;
        } else {
          const { data: ajudanteInserted, error: ajudanteInsertError } = await supabase
            .from('ajudantes')
            .insert({
              motorista_id: motorista.id,
              nome: formData.ajudante_nome,
              cpf: formData.ajudante_cpf.replace(/\D/g, ''),
              telefone: formData.ajudante_telefone || null,
              tipo_cadastro: formData.ajudante_tipo_cadastro,
              comprovante_vinculo_url: formData.ajudante_comprovante_vinculo_url || null,
              ativo: true,
            })
            .select('id')
            .single();
          if (ajudanteInsertError) throw ajudanteInsertError;

          setFormData((prev) => ({ ...prev, ajudante_id: ajudanteInserted.id }));
        }
      } else if (formData.ajudante_id) {
        // Se desmarcou "possui ajudante", desativa o ajudante existente (sem deletar)
        const { error: ajudanteDeactivateError } = await supabase
          .from('ajudantes')
          .update({ ativo: false })
          .eq('id', formData.ajudante_id);
        if (ajudanteDeactivateError) throw ajudanteDeactivateError;
      }

      toast.success('Motorista atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['motoristas_transportadora'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar motorista:', error);
      toast.error('Erro ao atualizar motorista');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!motorista) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Motorista</DialogTitle>
          <DialogDescription>
            Atualize as informações do motorista
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dados" className="gap-2">
              <User className="w-4 h-4" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="cnh" className="gap-2">
              <CreditCard className="w-4 h-4" />
              CNH
            </TabsTrigger>
            <TabsTrigger value="documentos" className="gap-2">
              <FileText className="w-4 h-4" />
              Documentos
            </TabsTrigger>
          </TabsList>

          {/* TAB: Dados Pessoais */}
          <TabsContent value="dados" className="space-y-4 mt-4">
            {/* Foto do Motorista */}
            <div className="flex items-center gap-6 p-4 bg-muted/30 rounded-lg">
              <div className="relative">
                <Avatar className="w-20 h-20 border-2 border-dashed border-border">
                  <AvatarImage src={formData.foto_url || undefined} alt={formData.nome_completo} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {formData.nome_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || <User className="w-8 h-8" />}
                  </AvatarFallback>
                </Avatar>
                {formData.foto_url && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                    onClick={() => setFormData({ ...formData, foto_url: '' })}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Foto do Motorista</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => fotoRef.current?.click()}
                >
                  <Camera className="w-4 h-4" />
                  {formData.foto_url ? 'Alterar Foto' : 'Enviar Foto'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG ou WebP. Máximo 5MB.
                </p>
                <input
                  ref={fotoRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFotoUpload(file);
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Status do Motorista</p>
                <p className="text-sm text-muted-foreground">
                  {formData.ativo ? 'Ativo' : 'Inativo'}
                </p>
              </div>
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={formData.nome_completo}
                  onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CPF *</Label>
                <MaskedInput
                  mask="cpf"
                  value={formData.cpf}
                  onChange={(value) => setFormData({ ...formData, cpf: value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <MaskedInput
                  mask="phone"
                  value={formData.telefone}
                  onChange={(value) => setFormData({ ...formData, telefone: value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>UF</Label>
                <Select
                  value={formData.uf}
                  onValueChange={(v) => setFormData({ ...formData, uf: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BRASIL.map((estado) => (
                      <SelectItem key={estado.value} value={estado.value}>
                        {estado.value} - {estado.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Cadastro</Label>
                <Select
                  value={formData.tipo_cadastro}
                  onValueChange={(v) => setFormData({ ...formData, tipo_cadastro: v as 'autonomo' | 'frota' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frota">Frota</SelectItem>
                    {/* Mostrar autônomo apenas se já for o valor atual (read-only display) */}
                    {formData.tipo_cadastro === 'autonomo' && (
                      <SelectItem value="autonomo" disabled>Autônomo</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="possui_ajudante"
                checked={formData.possui_ajudante}
                onCheckedChange={(checked) => setFormData({ ...formData, possui_ajudante: checked })}
              />
              <Label htmlFor="possui_ajudante">Possui Ajudante</Label>
            </div>

            {formData.possui_ajudante && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Dados do Ajudante</p>
                    <p className="text-sm text-muted-foreground">
                      Informe os dados do ajudante vinculado ao motorista
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <Input
                      value={formData.ajudante_nome}
                      onChange={(e) => setFormData({ ...formData, ajudante_nome: e.target.value })}
                      placeholder="Nome do ajudante"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CPF *</Label>
                    <MaskedInput
                      mask="cpf"
                      value={formData.ajudante_cpf}
                      onChange={(value) => setFormData({ ...formData, ajudante_cpf: value })}
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <MaskedInput
                      mask="phone"
                      value={formData.ajudante_telefone}
                      onChange={(value) => setFormData({ ...formData, ajudante_telefone: value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo do Ajudante</Label>
                    <Select
                      value={formData.ajudante_tipo_cadastro}
                      onValueChange={(v) =>
                        setFormData({
                          ...formData,
                          ajudante_tipo_cadastro: v as 'autonomo' | 'frota',
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="autonomo">Autônomo</SelectItem>
                        <SelectItem value="frota">Frota (Empresa)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.ajudante_tipo_cadastro === 'frota' && (
                  <div className="space-y-2">
                    <Label>Comprovante de Vínculo do Ajudante</Label>
                    <p className="text-sm text-muted-foreground">Opcional</p>
                    <input
                      ref={ajudanteVinculoRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'ajudante_comprovante_vinculo_url');
                      }}
                    />
                    {formData.ajudante_comprovante_vinculo_url ? (
                      <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-primary" />
                        <span className="text-sm text-primary flex-1">Comprovante anexado</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(formData.ajudante_comprovante_vinculo_url, '_blank')}
                        >
                          Ver
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({ ...formData, ajudante_comprovante_vinculo_url: '' })}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => ajudanteVinculoRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Anexar Comprovante do Ajudante
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* TAB: CNH */}
          <TabsContent value="cnh" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Número CNH *</Label>
                <Input
                  value={formData.cnh}
                  onChange={(e) => setFormData({ ...formData, cnh: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select
                  value={formData.categoria_cnh}
                  onValueChange={(v) => setFormData({ ...formData, categoria_cnh: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_CNH.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Validade *</Label>
                <Input
                  type="date"
                  value={formData.validade_cnh}
                  onChange={(e) => setFormData({ ...formData, validade_cnh: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="cnh_qrcode"
                checked={formData.cnh_tem_qrcode}
                onCheckedChange={(checked) => setFormData({ ...formData, cnh_tem_qrcode: checked })}
              />
              <Label htmlFor="cnh_qrcode">CNH Digital possui QR Code válido</Label>
            </div>

            {/* CNH Digital Upload */}
            <div className="space-y-2">
              <Label>CNH Digital (PDF ou Imagem)</Label>
              <input
                ref={cnhDigitalRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'cnh_digital_url');
                }}
              />
              {formData.cnh_digital_url ? (
                <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span className="text-sm text-primary flex-1">CNH Digital anexada</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(formData.cnh_digital_url, '_blank')}
                  >
                    Ver
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, cnh_digital_url: '' })}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => cnhDigitalRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Anexar CNH Digital
                </Button>
              )}
            </div>
          </TabsContent>

          {/* TAB: Documentos */}
          <TabsContent value="documentos" className="space-y-6 mt-4">
            {/* Comprovante de Endereço */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Comprovante de Endereço</Label>
              <input
                ref={comprovanteEnderecoRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'comprovante_endereco_url');
                }}
              />
              {formData.comprovante_endereco_url ? (
                <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span className="text-sm text-primary flex-1">Comprovante anexado</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(formData.comprovante_endereco_url, '_blank')}
                  >
                    Ver
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, comprovante_endereco_url: '' })}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => comprovanteEnderecoRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Anexar Comprovante de Endereço
                </Button>
              )}

              {/* Titular diferente */}
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id="nome_proprio"
                  checked={formData.comprovante_endereco_em_nome_proprio}
                  onCheckedChange={(checked) => setFormData({ ...formData, comprovante_endereco_em_nome_proprio: !!checked })}
                />
                <Label htmlFor="nome_proprio" className="text-sm">Comprovante em nome do motorista</Label>
              </div>

              {!formData.comprovante_endereco_em_nome_proprio && (
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label>Nome do Titular</Label>
                    <Input
                      value={formData.comprovante_endereco_titular_nome}
                      onChange={(e) => setFormData({ ...formData, comprovante_endereco_titular_nome: e.target.value })}
                      placeholder="Nome completo do titular"
                    />
                  </div>
                  <input
                    ref={docTitularRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'comprovante_endereco_titular_doc_url');
                    }}
                  />
                  {formData.comprovante_endereco_titular_doc_url ? (
                    <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm text-primary flex-1">Documento do titular anexado</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, comprovante_endereco_titular_doc_url: '' })}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => docTitularRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Anexar Documento do Titular
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Comprovante de Vínculo */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Comprovante de Vínculo com a Empresa</Label>
              <p className="text-sm text-muted-foreground">Opcional - Contrato, declaração ou outro documento</p>
              <input
                ref={comprovanteVinculoRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'comprovante_vinculo_url');
                }}
              />
              {formData.comprovante_vinculo_url ? (
                <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span className="text-sm text-primary flex-1">Comprovante de vínculo anexado</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(formData.comprovante_vinculo_url, '_blank')}
                  >
                    Ver
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, comprovante_vinculo_url: '' })}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => comprovanteVinculoRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Anexar Comprovante de Vínculo
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}