export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      ajudantes: {
        Row: {
          ativo: boolean | null
          cpf: string
          created_at: string
          data_nascimento: string | null
          email: string | null
          empresa_id: string | null
          id: string
          nome_completo: string
          rg: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          cpf: string
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string | null
          id?: string
          nome_completo: string
          rg?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          cpf?: string
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string | null
          id?: string
          nome_completo?: string
          rg?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ajudantes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cargas: {
        Row: {
          codigo: string | null
          comprimento_m: number | null
          created_at: string
          data_entrega_limite: string | null
          descricao: string | null
          destinatario_documento: string | null
          destinatario_nome_fantasia: string | null
          destinatario_razao_social: string | null
          empresa_id: string | null
          endereco_destino_id: string | null
          endereco_origem_id: string | null
          filial_id: string | null
          id: string
          largura_m: number | null
          peso_kg: number
          quantidade: number | null
          remetente_documento: string | null
          remetente_nome_fantasia: string | null
          remetente_razao_social: string | null
          status: Database["public"]["Enums"]["status_carga"] | null
          tipo: string | null
          updated_at: string
          valor_mercadoria: number | null
          volume_m3: number | null
        }
        Insert: {
          codigo?: string | null
          comprimento_m?: number | null
          created_at?: string
          data_entrega_limite?: string | null
          descricao?: string | null
          destinatario_documento?: string | null
          destinatario_nome_fantasia?: string | null
          destinatario_razao_social?: string | null
          empresa_id?: string | null
          endereco_destino_id?: string | null
          endereco_origem_id?: string | null
          filial_id?: string | null
          id?: string
          largura_m?: number | null
          peso_kg: number
          quantidade?: number | null
          remetente_documento?: string | null
          remetente_nome_fantasia?: string | null
          remetente_razao_social?: string | null
          status?: Database["public"]["Enums"]["status_carga"] | null
          tipo?: string | null
          updated_at?: string
          valor_mercadoria?: number | null
          volume_m3?: number | null
        }
        Update: {
          codigo?: string | null
          comprimento_m?: number | null
          created_at?: string
          data_entrega_limite?: string | null
          descricao?: string | null
          destinatario_documento?: string | null
          destinatario_nome_fantasia?: string | null
          destinatario_razao_social?: string | null
          empresa_id?: string | null
          endereco_destino_id?: string | null
          endereco_origem_id?: string | null
          filial_id?: string | null
          id?: string
          largura_m?: number | null
          peso_kg?: number
          quantidade?: number | null
          remetente_documento?: string | null
          remetente_nome_fantasia?: string | null
          remetente_razao_social?: string | null
          status?: Database["public"]["Enums"]["status_carga"] | null
          tipo?: string | null
          updated_at?: string
          valor_mercadoria?: number | null
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
            foreignKeyName: "cargas_endereco_destino_id_fkey"
            columns: ["endereco_destino_id"]
            isOneToOne: false
            referencedRelation: "enderecos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_endereco_origem_id_fkey"
            columns: ["endereco_origem_id"]
            isOneToOne: false
            referencedRelation: "enderecos"
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
      carrocerias: {
        Row: {
          ativo: boolean | null
          capacidade_kg: number
          capacidade_m3: number | null
          created_at: string
          empresa_id: string | null
          id: string
          placa: string
          rntrc: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          capacidade_kg: number
          capacidade_m3?: number | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          placa: string
          rntrc?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          capacidade_kg?: number
          capacidade_m3?: number | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          placa?: string
          rntrc?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carrocerias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      configs_integracao: {
        Row: {
          api_key: string | null
          api_secret: string | null
          api_token: string | null
          ativo: boolean | null
          configuracoes: Json | null
          created_at: string
          empresa_id: string | null
          environment: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          api_token?: string | null
          ativo?: boolean | null
          configuracoes?: Json | null
          created_at?: string
          empresa_id?: string | null
          environment?: string | null
          id?: string
          nome: string
          tipo: string
          updated_at?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          api_token?: string | null
          ativo?: boolean | null
          configuracoes?: Json | null
          created_at?: string
          empresa_id?: string | null
          environment?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configs_integracao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos_salvos: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          empresa_id: string
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          empresa_id: string
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contatos_salvos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ctes: {
        Row: {
          chave_acesso: string | null
          created_at: string
          data_emissao: string | null
          entrega_id: string | null
          id: string
          numero: string
          pdf_url: string | null
          serie: string | null
          status: string | null
          updated_at: string
          valor_total: number | null
          xml_url: string | null
        }
        Insert: {
          chave_acesso?: string | null
          created_at?: string
          data_emissao?: string | null
          entrega_id?: string | null
          id?: string
          numero: string
          pdf_url?: string | null
          serie?: string | null
          status?: string | null
          updated_at?: string
          valor_total?: number | null
          xml_url?: string | null
        }
        Update: {
          chave_acesso?: string | null
          created_at?: string
          data_emissao?: string | null
          entrega_id?: string | null
          id?: string
          numero?: string
          pdf_url?: string | null
          serie?: string | null
          status?: string | null
          updated_at?: string
          valor_total?: number | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ctes_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativo: boolean | null
          cnpj: string
          created_at: string
          endereco_id: string | null
          id: string
          logo_url: string | null
          nome: string
          plano: string | null
          tipo: Database["public"]["Enums"]["tipo_empresa"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          cnpj: string
          created_at?: string
          endereco_id?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          plano?: string | null
          tipo: Database["public"]["Enums"]["tipo_empresa"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          cnpj?: string
          created_at?: string
          endereco_id?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          plano?: string | null
          tipo?: Database["public"]["Enums"]["tipo_empresa"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_endereco_id_fkey"
            columns: ["endereco_id"]
            isOneToOne: false
            referencedRelation: "enderecos"
            referencedColumns: ["id"]
          },
        ]
      }
      enderecos: {
        Row: {
          bairro: string | null
          cep: string
          cidade: string
          complemento: string | null
          created_at: string
          estado: string
          id: string
          latitude: number | null
          logradouro: string
          longitude: number | null
          numero: string | null
          pais: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep: string
          cidade: string
          complemento?: string | null
          created_at?: string
          estado: string
          id?: string
          latitude?: number | null
          logradouro: string
          longitude?: number | null
          numero?: string | null
          pais?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string
          cidade?: string
          complemento?: string | null
          created_at?: string
          estado?: string
          id?: string
          latitude?: number | null
          logradouro?: string
          longitude?: number | null
          numero?: string | null
          pais?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      entrega_eventos: {
        Row: {
          created_at: string
          created_by: string | null
          entrega_id: string
          id: string
          latitude: number | null
          longitude: number | null
          observacao: string
          tipo: Database["public"]["Enums"]["tipo_evento_entrega"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entrega_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          observacao: string
          tipo: Database["public"]["Enums"]["tipo_evento_entrega"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entrega_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          observacao?: string
          tipo?: Database["public"]["Enums"]["tipo_evento_entrega"]
        }
        Relationships: [
          {
            foreignKeyName: "entrega_eventos_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas: {
        Row: {
          canhoto_url: string | null
          carga_id: string
          carroceria_id: string | null
          codigo: string | null
          coletado_em: string | null
          created_at: string
          entregue_em: string | null
          id: string
          motorista_id: string | null
          nfe_id: string | null
          peso_alocado_kg: number | null
          status: Database["public"]["Enums"]["status_entrega"] | null
          tracking_code: string
          updated_at: string
          valor_frete: number | null
          veiculo_id: string | null
        }
        Insert: {
          canhoto_url?: string | null
          carga_id: string
          carroceria_id?: string | null
          codigo?: string | null
          coletado_em?: string | null
          created_at?: string
          entregue_em?: string | null
          id?: string
          motorista_id?: string | null
          nfe_id?: string | null
          peso_alocado_kg?: number | null
          status?: Database["public"]["Enums"]["status_entrega"] | null
          tracking_code?: string
          updated_at?: string
          valor_frete?: number | null
          veiculo_id?: string | null
        }
        Update: {
          canhoto_url?: string | null
          carga_id?: string
          carroceria_id?: string | null
          codigo?: string | null
          coletado_em?: string | null
          created_at?: string
          entregue_em?: string | null
          id?: string
          motorista_id?: string | null
          nfe_id?: string | null
          peso_alocado_kg?: number | null
          status?: Database["public"]["Enums"]["status_entrega"] | null
          tracking_code?: string
          updated_at?: string
          valor_frete?: number | null
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entregas_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "cargas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_carroceria_id_fkey"
            columns: ["carroceria_id"]
            isOneToOne: false
            referencedRelation: "carrocerias"
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
            foreignKeyName: "entregas_nfe_id_fkey"
            columns: ["nfe_id"]
            isOneToOne: false
            referencedRelation: "nfes"
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
          ativo: boolean | null
          cnpj: string | null
          codigo: string | null
          created_at: string
          empresa_id: string
          endereco_id: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          cnpj?: string | null
          codigo?: string | null
          created_at?: string
          empresa_id: string
          endereco_id?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          cnpj?: string | null
          codigo?: string | null
          created_at?: string
          empresa_id?: string
          endereco_id?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "filiais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filiais_endereco_id_fkey"
            columns: ["endereco_id"]
            isOneToOne: false
            referencedRelation: "enderecos"
            referencedColumns: ["id"]
          },
        ]
      }
      geofences: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          empresa_id: string | null
          entrega_id: string | null
          id: string
          latitude: number
          longitude: number
          nome: string
          raio_metros: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          entrega_id?: string | null
          id?: string
          latitude: number
          longitude: number
          nome: string
          raio_metros: number
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          entrega_id?: string | null
          id?: string
          latitude?: number
          longitude?: number
          nome?: string
          raio_metros?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofences_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofences_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          battery_level: number | null
          created_at: string | null
          device_id: string | null
          heading: number | null
          id: number
          latitude: number | null
          longitude: number | null
          motorista_id: string | null
          speed: number | null
          timestamp: string
          updated_at: string | null
        }
        Insert: {
          battery_level?: number | null
          created_at?: string | null
          device_id?: string | null
          heading?: number | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          motorista_id?: string | null
          speed?: number | null
          timestamp: string
          updated_at?: string | null
        }
        Update: {
          battery_level?: number | null
          created_at?: string | null
          device_id?: string | null
          heading?: number | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          motorista_id?: string | null
          speed?: number | null
          timestamp?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      logs: {
        Row: {
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          level: string
          message: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          level?: string
          message: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          level?: string
          message?: string
          user_id?: string | null
        }
        Relationships: []
      }
      mensagens: {
        Row: {
          anexo_url: string | null
          content: string
          created_at: string
          id: string
          lida: boolean | null
          receiver_id: string
          sender_id: string
          tipo: string
        }
        Insert: {
          anexo_url?: string | null
          content: string
          created_at?: string
          id?: string
          lida?: boolean | null
          receiver_id: string
          sender_id: string
          tipo?: string
        }
        Update: {
          anexo_url?: string | null
          content?: string
          created_at?: string
          id?: string
          lida?: boolean | null
          receiver_id?: string
          sender_id?: string
          tipo?: string
        }
        Relationships: []
      }
      motoristas: {
        Row: {
          ativo: boolean | null
          cnh: string
          cnh_categoria: string
          cnh_url: string | null
          cnh_validade: string
          cpf: string
          created_at: string
          data_nascimento: string
          email: string | null
          empresa_id: string | null
          foto_url: string | null
          id: string
          nome_completo: string
          status: string | null
          telefone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          cnh: string
          cnh_categoria: string
          cnh_url?: string | null
          cnh_validade: string
          cpf: string
          created_at?: string
          data_nascimento: string
          email?: string | null
          empresa_id?: string | null
          foto_url?: string | null
          id?: string
          nome_completo: string
          status?: string | null
          telefone: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          cnh?: string
          cnh_categoria?: string
          cnh_url?: string | null
          cnh_validade?: string
          cpf?: string
          created_at?: string
          data_nascimento?: string
          email?: string | null
          empresa_id?: string | null
          foto_url?: string | null
          id?: string
          nome_completo?: string
          status?: string | null
          telefone?: string
          updated_at?: string
          user_id?: string | null
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
      nfes: {
        Row: {
          chave_acesso: string | null
          created_at: string
          data_emissao: string | null
          destinatario_documento: string | null
          destinatario_razao_social: string | null
          entrega_id: string | null
          id: string
          numero: string
          pdf_url: string | null
          remetente_documento: string | null
          remetente_razao_social: string | null
          serie: string | null
          status: string | null
          updated_at: string
          valor_total: number | null
          xml_url: string | null
        }
        Insert: {
          chave_acesso?: string | null
          created_at?: string
          data_emissao?: string | null
          destinatario_documento?: string | null
          destinatario_razao_social?: string | null
          entrega_id?: string | null
          id?: string
          numero: string
          pdf_url?: string | null
          remetente_documento?: string | null
          remetente_razao_social?: string | null
          serie?: string | null
          status?: string | null
          updated_at?: string
          valor_total?: number | null
          xml_url?: string | null
        }
        Update: {
          chave_acesso?: string | null
          created_at?: string
          data_emissao?: string | null
          destinatario_documento?: string | null
          destinatario_razao_social?: string | null
          entrega_id?: string | null
          id?: string
          numero?: string
          pdf_url?: string | null
          remetente_documento?: string | null
          remetente_razao_social?: string | null
          serie?: string | null
          status?: string | null
          updated_at?: string
          valor_total?: number | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfes_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string
          id: string
          lida: boolean | null
          link: string | null
          mensagem: string
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean | null
          link?: string | null
          mensagem: string
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean | null
          link?: string | null
          mensagem?: string
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_role: Database["public"]["Enums"]["user_role"] | null
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          active_role?: Database["public"]["Enums"]["user_role"] | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          active_role?: Database["public"]["Enums"]["user_role"] | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tracking_historico: {
        Row: {
          created_at: string
          event_type: string | null
          heading: number | null
          id: string
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          speed: number | null
          status: string | null
          tracked_at: string | null
          viagem_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          heading?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          speed?: number | null
          status?: string | null
          tracked_at?: string | null
          viagem_id: string
        }
        Update: {
          created_at?: string
          event_type?: string | null
          heading?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          speed?: number | null
          status?: string | null
          tracked_at?: string | null
          viagem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_historico_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "viagens"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          ativo: boolean | null
          capacidade_kg: number
          capacidade_m3: number | null
          carroceria: string | null
          carroceria_id: string | null
          carroceria_integrada: boolean | null
          created_at: string
          empresa_id: string | null
          id: string
          marca: string
          modelo: string
          placa: string
          rntrc: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          capacidade_kg: number
          capacidade_m3?: number | null
          carroceria?: string | null
          carroceria_id?: string | null
          carroceria_integrada?: boolean | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          marca: string
          modelo: string
          placa: string
          rntrc?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          capacidade_kg?: number
          capacidade_m3?: number | null
          carroceria?: string | null
          carroceria_id?: string | null
          carroceria_integrada?: boolean | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          marca?: string
          modelo?: string
          placa?: string
          rntrc?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_carroceria_id_fkey"
            columns: ["carroceria_id"]
            isOneToOne: false
            referencedRelation: "carrocerias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos_motoristas: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          motorista_id: string
          responsavel: boolean | null
          updated_at: string
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          motorista_id: string
          responsavel?: boolean | null
          updated_at?: string
          veiculo_id: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          motorista_id?: string
          responsavel?: boolean | null
          updated_at?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_motoristas_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_motoristas_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      viagem_entregas: {
        Row: {
          created_at: string
          entrega_id: string
          id: string
          ordem: number
          status: string | null
          viagem_id: string
        }
        Insert: {
          created_at?: string
          entrega_id: string
          id?: string
          ordem: number
          status?: string | null
          viagem_id: string
        }
        Update: {
          created_at?: string
          entrega_id?: string
          id?: string
          ordem?: number
          status?: string | null
          viagem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viagem_entregas_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagem_entregas_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "viagens"
            referencedColumns: ["id"]
          },
        ]
      }
      viagens: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          empresa_id: string | null
          id: string
          motorista_id: string | null
          status: string
          updated_at: string
          veiculo_id: string | null
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id?: string | null
          id?: string
          motorista_id?: string | null
          status: string
          updated_at?: string
          veiculo_id?: string | null
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id?: string | null
          id?: string
          motorista_id?: string | null
          status?: string
          updated_at?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "viagens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagens_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagens_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_tracking_info: {
        Args: {
          _tracking_code: string
        }
        Returns: Json
      }
    }
    Enums: {
      status_carga: "disponivel" | "alocada" | "em_transito" | "entregue" | "cancelada"
      status_entrega:
      | "aguardando"
      | "programado"
      | "saiu_para_coleta"
      | "coletado"
      | "saiu_para_entrega"
      | "tentativa_falha"
      | "entregue"
      | "cancelada"
      tipo_empresa: "embarcador" | "transportadora" | "admin"
      tipo_evento_entrega:
      | "criado"
      | "agendado"
      | "inicio_coleta"
      | "coletado"
      | "inicio_transporte"
      | "chegada_destino"
      | "tentativa_entrega"
      | "entregue"
      | "problema"
      | "cancelado"
      | "comentario"
      | "foto"
      user_role: "admin" | "embarcador" | "transportadora" | "motorista"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
