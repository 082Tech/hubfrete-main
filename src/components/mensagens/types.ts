export interface Chat {
  id: string;
  entrega_id: string;
  created_at: string;
  updated_at: string;
  // Joined data
  entrega?: {
    id: string;
    status: string;
    peso_alocado_kg?: number;
    valor_frete?: number;
    carga: {
      id: string;
      codigo: string;
      descricao: string;
      peso_kg?: number;
      tipo?: string;
      data_entrega_limite?: string;
      empresa: {
        id: number;
        nome: string;
        logo_url?: string;
      };
      endereco_origem?: {
        cidade: string;
        estado: string;
        logradouro?: string;
      };
      endereco_destino?: {
        cidade: string;
        estado: string;
        logradouro?: string;
      };
    };
    motorista?: {
      id: string;
      nome_completo: string;
      telefone?: string;
      foto_url?: string;
      empresa?: {
        id: number;
        nome: string;
        logo_url?: string;
      };
    };
    veiculo?: {
      placa: string;
      tipo: string;
    };
  };
  participantes?: ChatParticipante[];
  ultima_mensagem?: Mensagem;
  mensagens_nao_lidas?: number;
}

export interface ChatParticipante {
  id: string;
  chat_id: string;
  user_id: string;
  tipo_participante: 'embarcador' | 'transportadora' | 'motorista';
  empresa_id?: number;
  motorista_id?: string;
  created_at: string;
  // Joined data
  usuario?: {
    nome: string;
    imagemUrl?: string;
  };
  empresa?: {
    nome: string;
    logo_url?: string;
  };
  motorista?: {
    nome_completo: string;
    foto_url?: string;
  };
}

export interface Mensagem {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_nome: string;
  sender_tipo: 'embarcador' | 'transportadora' | 'motorista';
  conteudo: string;
  lida: boolean;
  created_at: string;
  // Extra data for avatar
  sender_avatar?: string;
}
