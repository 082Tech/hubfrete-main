export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cargas: {
        Row: {
          carga_fragil: boolean | null
          carga_perigosa: boolean | null
          carga_viva: boolean | null
          codigo: string
          comercial: Json | null
          created_at: string | null
          data_coleta_ate: string | null
          data_coleta_de: string | null
          data_entrega_limite: string | null
          descricao: string
          documentacao: Json | null
          empilhavel: boolean | null
          empresa_id: number | null
          filial_id: number | null
          id: string
          necessidades_especiais: string[] | null
          nota_fiscal_url: string | null
          numero_onu: string | null
          peso_kg: number
          publicada_em: string | null
          quantidade: number | null
          regras_carregamento: string | null
          requer_refrigeracao: boolean | null
          status: Database["public"]["Enums"]["status_carga"] | null
          temperatura_max: number | null
          temperatura_min: number | null
          tipo: Database["public"]["Enums"]["tipo_carga"]
          updated_at: string | null
          valor_mercadoria: number | null
          veiculo_requisitos: Json | null
          volume_m3: number | null
        }
        Insert: {
          carga_fragil?: boolean | null
          carga_perigosa?: boolean | null
          carga_viva?: boolean | null
          codigo: string
          comercial?: Json | null
          created_at?: string | null
          data_coleta_ate?: string | null
          data_coleta_de?: string | null
          data_entrega_limite?: string | null
          descricao: string
          documentacao?: Json | null
          empilhavel?: boolean | null
          empresa_id?: number | null
          filial_id?: number | null
          id?: string
          necessidades_especiais?: string[] | null
          nota_fiscal_url?: string | null
          numero_onu?: string | null
          peso_kg: number
          publicada_em?: string | null
          quantidade?: number | null
          regras_carregamento?: string | null
          requer_refrigeracao?: boolean | null
          status?: Database["public"]["Enums"]["status_carga"] | null
          temperatura_max?: number | null
          temperatura_min?: number | null
          tipo: Database["public"]["Enums"]["tipo_carga"]
          updated_at?: string | null
          valor_mercadoria?: number | null
          veiculo_requisitos?: Json | null
          volume_m3?: number | null
        }
        Update: {
          carga_fragil?: boolean | null
          carga_perigosa?: boolean | null
          carga_viva?: boolean | null
          codigo?: string
          comercial?: Json | null
          created_at?: string | null
          data_coleta_ate?: string | null
          data_coleta_de?: string | null
          data_entrega_limite?: string | null
          descricao?: string
          documentacao?: Json | null
          empilhavel?: boolean | null
          empresa_id?: number | null
          filial_id?: number | null
          id?: string
          necessidades_especiais?: string[] | null
          nota_fiscal_url?: string | null
          numero_onu?: string | null
          peso_kg?: number
          publicada_em?: string | null
          quantidade?: number | null
          regras_carregamento?: string | null
          requer_refrigeracao?: boolean | null
          status?: Database["public"]["Enums"]["status_carga"] | null
          temperatura_max?: number | null
          temperatura_min?: number | null
          tipo?: Database["public"]["Enums"]["tipo_carga"]
          updated_at?: string | null
          valor_mercadoria?: number | null
          veiculo_requisitos?: Json | null
          volume_m3?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cargas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invites: {
        Row: {
          accepted_at: string | null
          company_id: string
          company_type: string
          created_at: string
          email: string
          expires_at: string
          filial_id: number | null
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["usuario_cargo"]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          company_type: string
          created_at?: string
          email: string
          expires_at?: string
          filial_id?: number | null
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["usuario_cargo"]
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          company_type?: string
          created_at?: string
          email?: string
          expires_at?: string
          filial_id?: number | null
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["usuario_cargo"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invites_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos_destino: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string
          complemento: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string | null
          empresa_id: number
          estado: string | null
          id: string
          latitude: number | null
          logradouro: string | null
          longitude: number | null
          nome_fantasia: string | null
          numero: string | null
          razao_social: string
          updated_at: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          complemento?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string | null
          empresa_id: number
          estado?: string | null
          id?: string
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social: string
          updated_at?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          complemento?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string | null
          empresa_id?: number
          estado?: string | null
          id?: string
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_destino_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          classe: Database["public"]["Enums"]["classe_empresa"]
          created_at: string
          id: number
          tipo: Database["public"]["Enums"]["tipo_empresa"]
        }
        Insert: {
          classe: Database["public"]["Enums"]["classe_empresa"]
          created_at?: string
          id?: number
          tipo: Database["public"]["Enums"]["tipo_empresa"]
        }
        Update: {
          classe?: Database["public"]["Enums"]["classe_empresa"]
          created_at?: string
          id?: number
          tipo?: Database["public"]["Enums"]["tipo_empresa"]
        }
        Relationships: []
      }
      enderecos_carga: {
        Row: {
          bairro: string | null
          carga_id: string
          cep: string
          cidade: string
          complemento: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string | null
          estado: string
          horario_funcionamento_fim: string | null
          horario_funcionamento_inicio: string | null
          id: string
          latitude: number | null
          logradouro: string
          longitude: number | null
          numero: string | null
          observacoes: string | null
          opera_domingo: boolean | null
          opera_sabado: boolean | null
          tipo: Database["public"]["Enums"]["tipo_endereco"]
          updated_at: string | null
        }
        Insert: {
          bairro?: string | null
          carga_id: string
          cep: string
          cidade: string
          complemento?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string | null
          estado: string
          horario_funcionamento_fim?: string | null
          horario_funcionamento_inicio?: string | null
          id?: string
          latitude?: number | null
          logradouro: string
          longitude?: number | null
          numero?: string | null
          observacoes?: string | null
          opera_domingo?: boolean | null
          opera_sabado?: boolean | null
          tipo: Database["public"]["Enums"]["tipo_endereco"]
          updated_at?: string | null
        }
        Update: {
          bairro?: string | null
          carga_id?: string
          cep?: string
          cidade?: string
          complemento?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string | null
          estado?: string
          horario_funcionamento_fim?: string | null
          horario_funcionamento_inicio?: string | null
          id?: string
          latitude?: number | null
          logradouro?: string
          longitude?: number | null
          numero?: string | null
          observacoes?: string | null
          opera_domingo?: boolean | null
          opera_sabado?: boolean | null
          tipo?: Database["public"]["Enums"]["tipo_endereco"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enderecos_carga_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "cargas"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas: {
        Row: {
          assinatura_recebedor: string | null
          carga_id: string
          coletado_em: string | null
          cotacao_id: string | null
          created_at: string | null
          documento_recebedor: string | null
          empresa_id: number | null
          entregue_em: string | null
          foto_comprovante_coleta: string | null
          foto_comprovante_entrega: string | null
          id: string
          latitude_atual: number | null
          longitude_atual: number | null
          motorista_id: string | null
          nome_recebedor: string | null
          observacoes: string | null
          status: Database["public"]["Enums"]["status_entrega"] | null
          ultima_atualizacao_localizacao: string | null
          updated_at: string | null
          veiculo_id: string | null
        }
        Insert: {
          assinatura_recebedor?: string | null
          carga_id: string
          coletado_em?: string | null
          cotacao_id?: string | null
          created_at?: string | null
          documento_recebedor?: string | null
          empresa_id?: number | null
          entregue_em?: string | null
          foto_comprovante_coleta?: string | null
          foto_comprovante_entrega?: string | null
          id?: string
          latitude_atual?: number | null
          longitude_atual?: number | null
          motorista_id?: string | null
          nome_recebedor?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_entrega"] | null
          ultima_atualizacao_localizacao?: string | null
          updated_at?: string | null
          veiculo_id?: string | null
        }
        Update: {
          assinatura_recebedor?: string | null
          carga_id?: string
          coletado_em?: string | null
          cotacao_id?: string | null
          created_at?: string | null
          documento_recebedor?: string | null
          empresa_id?: number | null
          entregue_em?: string | null
          foto_comprovante_coleta?: string | null
          foto_comprovante_entrega?: string | null
          id?: string
          latitude_atual?: number | null
          longitude_atual?: number | null
          motorista_id?: string | null
          nome_recebedor?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_entrega"] | null
          ultima_atualizacao_localizacao?: string | null
          updated_at?: string | null
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entregas_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: true
            referencedRelation: "cargas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      filiais: {
        Row: {
          ativa: boolean | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          empresa_id: number | null
          endereco: string | null
          estado: string | null
          id: number
          is_matriz: boolean | null
          nome: string | null
          responsavel: string | null
          telefone: string | null
        }
        Insert: {
          ativa?: boolean | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: number | null
          endereco?: string | null
          estado?: string | null
          id?: number
          is_matriz?: boolean | null
          nome?: string | null
          responsavel?: string | null
          telefone?: string | null
        }
        Update: {
          ativa?: boolean | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: number | null
          endereco?: string | null
          estado?: string | null
          id?: number
          is_matriz?: boolean | null
          nome?: string | null
          responsavel?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Filiais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      localizações: {
        Row: {
          email_motorista: string | null
          id: number
          latitude: number | null
          longitude: number | null
          precisao: number | null
          timestamp: number | null
        }
        Insert: {
          email_motorista?: string | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          precisao?: number | null
          timestamp?: number | null
        }
        Update: {
          email_motorista?: string | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          precisao?: number | null
          timestamp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "localizações_email_motorista_fkey"
            columns: ["email_motorista"]
            isOneToOne: true
            referencedRelation: "motoristas"
            referencedColumns: ["email"]
          },
        ]
      }
      motoristas: {
        Row: {
          ativo: boolean | null
          categoria_cnh: string
          cnh: string
          cpf: string
          created_at: string | null
          email: string | null
          empresa_id: number | null
          foto_url: string | null
          id: string
          jwt: string | null
          nome_completo: string
          senha: string | null
          telefone: string | null
          updated_at: string | null
          user_id: string
          validade_cnh: string
        }
        Insert: {
          ativo?: boolean | null
          categoria_cnh: string
          cnh: string
          cpf: string
          created_at?: string | null
          email?: string | null
          empresa_id?: number | null
          foto_url?: string | null
          id?: string
          jwt?: string | null
          nome_completo: string
          senha?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id: string
          validade_cnh: string
        }
        Update: {
          ativo?: boolean | null
          categoria_cnh?: string
          cnh?: string
          cpf?: string
          created_at?: string | null
          email?: string | null
          empresa_id?: number | null
          foto_url?: string | null
          id?: string
          jwt?: string | null
          nome_completo?: string
          senha?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string
          validade_cnh?: string
        }
        Relationships: [
          {
            foreignKeyName: "motoristas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          email: string | null
          id: number
          imagem_url: string | null
          jwt: string | null
          nome: string | null
          senha: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: number
          imagem_url?: string | null
          jwt?: string | null
          nome?: string | null
          senha?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: number
          imagem_url?: string | null
          jwt?: string | null
          nome?: string | null
          senha?: string | null
        }
        Relationships: []
      }
      tracking_historico: {
        Row: {
          created_at: string | null
          entrega_id: string
          id: string
          latitude: number | null
          longitude: number | null
          observacao: string | null
          status: Database["public"]["Enums"]["status_entrega"]
        }
        Insert: {
          created_at?: string | null
          entrega_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          observacao?: string | null
          status: Database["public"]["Enums"]["status_entrega"]
        }
        Update: {
          created_at?: string | null
          entrega_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_entrega"]
        }
        Relationships: [
          {
            foreignKeyName: "tracking_historico_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          auth_user_id: string | null
          cargo: Database["public"]["Enums"]["usuario_cargo"] | null
          created_at: string
          email: string | null
          id: number
          imagemUrl: string | null
          jwt: string | null
          motorista_autonomo: boolean
          nome: string | null
          senha: string | null
        }
        Insert: {
          auth_user_id?: string | null
          cargo?: Database["public"]["Enums"]["usuario_cargo"] | null
          created_at?: string
          email?: string | null
          id?: number
          imagemUrl?: string | null
          jwt?: string | null
          motorista_autonomo?: boolean
          nome?: string | null
          senha?: string | null
        }
        Update: {
          auth_user_id?: string | null
          cargo?: Database["public"]["Enums"]["usuario_cargo"] | null
          created_at?: string
          email?: string | null
          id?: number
          imagemUrl?: string | null
          jwt?: string | null
          motorista_autonomo?: boolean
          nome?: string | null
          senha?: string | null
        }
        Relationships: []
      }
      usuarios_filiais: {
        Row: {
          cargo_na_filial: Database["public"]["Enums"]["usuario_cargo"] | null
          created_at: string
          filial_id: number | null
          id: number
          usuario_id: number | null
        }
        Insert: {
          cargo_na_filial?: Database["public"]["Enums"]["usuario_cargo"] | null
          created_at?: string
          filial_id?: number | null
          id?: number
          usuario_id?: number | null
        }
        Update: {
          cargo_na_filial?: Database["public"]["Enums"]["usuario_cargo"] | null
          created_at?: string
          filial_id?: number | null
          id?: number
          usuario_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "Usuarios_Filiais_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Usuarios_Filiais_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      v2f: {
        Row: {
          code: number
          created_at: string
          email: string | null
          id: number
        }
        Insert: {
          code: number
          created_at?: string
          email?: string | null
          id?: number
        }
        Update: {
          code?: number
          created_at?: string
          email?: string | null
          id?: number
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          ano: number | null
          ativo: boolean | null
          capacidade_kg: number | null
          capacidade_m3: number | null
          carroceria: Database["public"]["Enums"]["tipo_carroceria"]
          created_at: string | null
          empresa_id: number | null
          id: string
          marca: string | null
          modelo: string | null
          motorista_id: string | null
          placa: string
          rastreador: boolean | null
          renavam: string | null
          seguro_ativo: boolean | null
          tipo: Database["public"]["Enums"]["tipo_veiculo"]
          updated_at: string | null
        }
        Insert: {
          ano?: number | null
          ativo?: boolean | null
          capacidade_kg?: number | null
          capacidade_m3?: number | null
          carroceria: Database["public"]["Enums"]["tipo_carroceria"]
          created_at?: string | null
          empresa_id?: number | null
          id?: string
          marca?: string | null
          modelo?: string | null
          motorista_id?: string | null
          placa: string
          rastreador?: boolean | null
          renavam?: string | null
          seguro_ativo?: boolean | null
          tipo: Database["public"]["Enums"]["tipo_veiculo"]
          updated_at?: string | null
        }
        Update: {
          ano?: number | null
          ativo?: boolean | null
          capacidade_kg?: number | null
          capacidade_m3?: number | null
          carroceria?: Database["public"]["Enums"]["tipo_carroceria"]
          created_at?: string | null
          empresa_id?: number | null
          id?: string
          marca?: string | null
          modelo?: string | null
          motorista_id?: string | null
          placa?: string
          rastreador?: boolean | null
          renavam?: string | null
          seguro_ativo?: boolean | null
          tipo?: Database["public"]["Enums"]["tipo_veiculo"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_empresa_id: { Args: { _user_id: string }; Returns: number }
      get_user_empresa_tipo: { Args: { _user_id: string }; Returns: string }
      get_user_filial_ids: { Args: { _user_id: string }; Returns: number[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_belongs_to_empresa: {
        Args: { _empresa_id: number; _user_id: string }
        Returns: boolean
      }
      user_belongs_to_filial: {
        Args: { _filial_id: number; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "embarcador" | "transportadora" | "motorista"
      classe_empresa: "INDÚSTRIA" | "LOJA" | "COMÉRCIO"
      forma_pagamento:
        | "a_vista"
        | "faturado_7"
        | "faturado_14"
        | "faturado_21"
        | "faturado_30"
      status_carga:
        | "rascunho"
        | "publicada"
        | "em_cotacao"
        | "aceita"
        | "em_coleta"
        | "em_transito"
        | "entregue"
        | "cancelada"
      status_entrega:
        | "aguardando_coleta"
        | "em_coleta"
        | "coletado"
        | "em_transito"
        | "em_entrega"
        | "entregue"
        | "problema"
        | "devolvida"
      tipo_carga:
        | "granel_solido"
        | "granel_liquido"
        | "carga_seca"
        | "refrigerada"
        | "congelada"
        | "perigosa"
        | "viva"
        | "indivisivel"
        | "container"
      tipo_carroceria:
        | "aberta"
        | "fechada_bau"
        | "graneleira"
        | "tanque"
        | "sider"
        | "frigorifico"
        | "cegonha"
        | "prancha"
        | "container"
      tipo_empresa: "EMBARCADOR" | "TRANSPORTADORA"
      tipo_endereco: "origem" | "destino"
      tipo_frete: "cif" | "fob"
      tipo_veiculo:
        | "truck"
        | "toco"
        | "tres_quartos"
        | "vuc"
        | "carreta"
        | "carreta_ls"
        | "bitrem"
        | "rodotrem"
        | "vanderleia"
      usuario_cargo: "ADMIN" | "OPERADOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "embarcador", "transportadora", "motorista"],
      classe_empresa: ["INDÚSTRIA", "LOJA", "COMÉRCIO"],
      forma_pagamento: [
        "a_vista",
        "faturado_7",
        "faturado_14",
        "faturado_21",
        "faturado_30",
      ],
      status_carga: [
        "rascunho",
        "publicada",
        "em_cotacao",
        "aceita",
        "em_coleta",
        "em_transito",
        "entregue",
        "cancelada",
      ],
      status_entrega: [
        "aguardando_coleta",
        "em_coleta",
        "coletado",
        "em_transito",
        "em_entrega",
        "entregue",
        "problema",
        "devolvida",
      ],
      tipo_carga: [
        "granel_solido",
        "granel_liquido",
        "carga_seca",
        "refrigerada",
        "congelada",
        "perigosa",
        "viva",
        "indivisivel",
        "container",
      ],
      tipo_carroceria: [
        "aberta",
        "fechada_bau",
        "graneleira",
        "tanque",
        "sider",
        "frigorifico",
        "cegonha",
        "prancha",
        "container",
      ],
      tipo_empresa: ["EMBARCADOR", "TRANSPORTADORA"],
      tipo_endereco: ["origem", "destino"],
      tipo_frete: ["cif", "fob"],
      tipo_veiculo: [
        "truck",
        "toco",
        "tres_quartos",
        "vuc",
        "carreta",
        "carreta_ls",
        "bitrem",
        "rodotrem",
        "vanderleia",
      ],
      usuario_cargo: ["ADMIN", "OPERADOR"],
    },
  },
} as const
