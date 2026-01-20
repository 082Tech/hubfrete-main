export interface Chat {
  id: string;
  entrega_id: string;
  created_at: string;
  updated_at: string;
  // Joined data
  entrega?: {
    id: string;
    status: string;
    carga: {
      id: string;
      codigo: string;
      descricao: string;
      empresa: {
        id: number;
        nome: string;
      };
    };
    motorista?: {
      id: string;
      nome_completo: string;
      foto_url?: string;
      empresa?: {
        id: number;
        nome: string;
      };
    };
  };
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
}
