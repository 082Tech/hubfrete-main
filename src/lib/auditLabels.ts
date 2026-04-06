// Human-readable labels for audit log fields and values

/** Field labels by table — maps DB column names to Portuguese labels */
export const fieldLabels: Record<string, Record<string, string>> = {
  entregas: {
    status: 'Status',
    motorista_id: 'Motorista',
    veiculo_id: 'Veículo',
    carroceria_id: 'Carroceria',
    peso_alocado_kg: 'Peso Alocado (kg)',
    valor_frete: 'Valor do Frete',
    codigo: 'Código',
    carga_id: 'Carga',
    coletado_em: 'Coletado em',
    entregue_em: 'Entregue em',
    nome_recebedor: 'Nome do Recebedor',
    documento_recebedor: 'Doc. do Recebedor',
    observacoes: 'Observações',
    previsao_coleta: 'Previsão de Coleta',
    tracking_code: 'Código de Rastreio',
    canhoto_url: 'Canhoto',
    notas_fiscais_urls: 'Notas Fiscais',
    comprovante_entrega_url: 'Comprovante de Entrega',
    foto_comprovante_coleta: 'Foto Comprovante Coleta',
    foto_comprovante_entrega: 'Foto Comprovante Entrega',
  },
  cargas: {
    status: 'Status',
    codigo: 'Código',
    descricao: 'Descrição',
    peso_kg: 'Peso (kg)',
    volume_m3: 'Volume (m³)',
    quantidade: 'Quantidade',
    valor_mercadoria: 'Valor da Mercadoria',
    tipo: 'Tipo',
    empresa_id: 'Empresa',
    filial_id: 'Filial',
    data_coleta_de: 'Coleta De',
    data_coleta_ate: 'Coleta Até',
    data_entrega_limite: 'Entrega Limite',
    peso_disponivel_kg: 'Peso Disponível (kg)',
    tipo_precificacao: 'Tipo de Precificação',
    valor_frete_tonelada: 'Frete por Tonelada',
    valor_frete_m3: 'Frete por m³',
    valor_frete_fixo: 'Frete Fixo',
    valor_frete_km: 'Frete por km',
    numero_pedido: 'Nº Pedido',
    publicada_em: 'Publicada em',
    expira_em: 'Expira em',
  },
  viagens: {
    status: 'Status',
    codigo: 'Código',
    motorista_id: 'Motorista',
    veiculo_id: 'Veículo',
    carroceria_id: 'Carroceria',
    km_total: 'Km Total',
    tempo_total_minutos: 'Tempo Total (min)',
    started_at: 'Início',
    ended_at: 'Fim',
    fim_em: 'Finalizada em',
    rota_planejada_polyline: 'Rota Planejada',
  },
  empresas: {
    nome: 'Nome',
    nome_fantasia: 'Nome Fantasia',
    razao_social: 'Razão Social',
    cnpj_matriz: 'CNPJ',
    tipo: 'Tipo',
    classe: 'Classe',
    status: 'Status',
    email: 'Email',
    telefone: 'Telefone',
    inscricao_estadual: 'Inscrição Estadual',
    comissao_hubfrete_percent: 'Comissão HubFrete (%)',
    dados_bancarios: 'Dados Bancários',
  },
  motoristas: {
    nome_completo: 'Nome',
    cpf: 'CPF',
    cnh: 'CNH',
    categoria_cnh: 'Categoria CNH',
    validade_cnh: 'Validade CNH',
    telefone: 'Telefone',
    email: 'Email',
    ativo: 'Ativo',
    tipo_cadastro: 'Tipo de Cadastro',
    empresa_id: 'Empresa',
  },
  veiculos: {
    placa: 'Placa',
    marca: 'Marca',
    modelo: 'Modelo',
    ano: 'Ano',
    tipo: 'Tipo',
    ativo: 'Ativo',
    capacidade_kg: 'Capacidade (kg)',
    capacidade_m3: 'Capacidade (m³)',
    renavam: 'RENAVAM',
    empresa_id: 'Empresa',
  },
  carrocerias: {
    placa: 'Placa',
    tipo: 'Tipo',
    marca: 'Marca',
    modelo: 'Modelo',
    ano: 'Ano',
    capacidade_kg: 'Capacidade (kg)',
    capacidade_m3: 'Capacidade (m³)',
    ativo: 'Ativo',
    renavam: 'RENAVAM',
    empresa_id: 'Empresa',
    veiculo_id: 'Veículo Vinculado',
  },
  financeiro_entregas: {
    status: 'Status',
    valor_frete: 'Valor do Frete',
    valor_comissao: 'Valor da Comissão',
    valor_liquido: 'Valor Líquido',
    valor_final: 'Valor Final',
    data_pagamento: 'Data de Pagamento',
    data_vencimento: 'Data de Vencimento',
    metodo_pagamento: 'Método de Pagamento',
    observacoes: 'Observações',
    antecipado: 'Antecipado',
    tipo_beneficiario: 'Tipo de Beneficiário',
    entrega_id: 'Entrega',
    empresa_embarcadora_id: 'Embarcador',
    empresa_transportadora_id: 'Transportadora',
    motorista_id: 'Motorista',
  },
  filiais: {
    nome: 'Nome',
    cnpj: 'CNPJ',
    cidade: 'Cidade',
    estado: 'Estado',
    ativa: 'Ativa',
    is_matriz: 'É Matriz',
    responsavel: 'Responsável',
    email: 'Email',
    telefone: 'Telefone',
    empresa_id: 'Empresa',
  },
  usuarios: {
    nome: 'Nome',
    email: 'Email',
    cargo: 'Cargo',
    ativo: 'Ativo',
  },
  usuarios_filiais: {
    usuario_id: 'Usuário',
    filial_id: 'Filial',
    cargo_na_filial: 'Cargo na Filial',
  },
  documentos_validacao: {
    tipo: 'Tipo',
    numero: 'Número',
    status: 'Status',
    data_emissao: 'Data de Emissão',
    data_vencimento: 'Data de Vencimento',
    motorista_id: 'Motorista',
    veiculo_id: 'Veículo',
    carroceria_id: 'Carroceria',
  },
  ctes: {
    numero: 'Número',
    serie: 'Série',
    chave_acesso: 'Chave de Acesso',
    valor: 'Valor',
    focus_status: 'Status Focus',
    entrega_id: 'Entrega',
    empresa_id: 'Empresa',
  },
  company_invites: {
    email: 'Email',
    role: 'Cargo',
    status: 'Status',
    company_type: 'Tipo de Empresa',
    company_id: 'Empresa',
  },
  cargo_permissoes: {
    escopo: 'Escopo',
    cargo: 'Cargo',
    permissao: 'Permissão',
    permitido: 'Permitido',
  },
  entrega_eventos: {
    tipo: 'Tipo',
    observacao: 'Observação',
    entrega_id: 'Entrega',
    user_nome: 'Usuário',
  },
  chats: {
    entrega_id: 'Entrega',
  },
  geofences: {
    nome: 'Nome',
    tipo: 'Tipo',
    raio_metros: 'Raio (m)',
    ativo: 'Ativo',
  },
};

/** Get a human-readable field label */
export function getFieldLabel(tabela: string, campo: string): string {
  return fieldLabels[tabela]?.[campo] || campo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/** Maps for common enum/status values → human-readable labels */
export const enumLabels: Record<string, string> = {
  // Status Entrega
  aguardando: 'Aguardando',
  saiu_para_coleta: 'Saiu para Coleta',
  em_transito: 'Em Trânsito',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
  
  // Status Carga
  publicada: 'Publicada',
  parcialmente_alocada: 'Parcialmente Alocada',
  totalmente_alocada: 'Totalmente Alocada',
  em_andamento: 'Em Andamento',
  finalizada: 'Finalizada',
  expirada: 'Expirada',
  
  // Status Viagem
  programada: 'Programada',
  em_carregamento: 'Em Carregamento',
  concluida: 'Concluída',
  
  // Status Financeiro
  pendente: 'Pendente',
  pago: 'Pago',
  cancelado: 'Cancelado',
  vencido: 'Vencido',
  
  // Status Documentos
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  
  // Status Chamados
  aberto: 'Aberto',
  em_atendimento: 'Em Atendimento',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
  
  // Booleanos
  true: 'Sim',
  false: 'Não',

  // Tipos empresa
  embarcador: 'Embarcador',
  transportadora: 'Transportadora',

  // Cargos
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  super_admin: 'Super Admin',
  admin: 'Admin',
  suporte: 'Suporte',

  // Tipo cadastro
  autonomo: 'Autônomo',
  vinculado: 'Vinculado',

  // Tipo beneficiario
  motorista: 'Motorista',

  // Company invite status
  pending: 'Pendente',
  accepted: 'Aceito',
  expired: 'Expirado',
};

/** Format a raw value into a human-readable string */
export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'string') {
    // Try enum lookup
    if (enumLabels[value]) return enumLabels[value];
    // Truncate long strings (UUIDs, URLs, etc.)
    if (value.length > 80) return value.slice(0, 40) + '…';
    return value;
  }
  if (typeof value === 'number') {
    return value.toLocaleString('pt-BR');
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return `[${value.length} item(ns)]`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/** Common fields to hide from diff (noise) */
export const hiddenFields = new Set([
  'id', 'created_at', 'updated_at', 'created_by', 'updated_by',
]);
