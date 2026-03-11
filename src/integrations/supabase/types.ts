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
      ai_chat: {
        Row: {
          created_at: string
          id: number
          sessionid: string
          title: string | null
          user_id: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          sessionid: string
          title?: string | null
          user_id?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          sessionid?: string
          title?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          author: Database["public"]["Enums"]["user_ai"] | null
          chat_id: number
          created_at: string
          id: number
          message: string | null
          sessionid: string | null
        }
        Insert: {
          author?: Database["public"]["Enums"]["user_ai"] | null
          chat_id: number
          created_at?: string
          id?: number
          message?: string | null
          sessionid?: string | null
        }
        Update: {
          author?: Database["public"]["Enums"]["user_ai"] | null
          chat_id?: number
          created_at?: string
          id?: number
          message?: string | null
          sessionid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_sessionid_fkey"
            columns: ["sessionid"]
            isOneToOne: false
            referencedRelation: "ai_chat"
            referencedColumns: ["sessionid"]
          },
        ]
      }
      ajudantes: {
        Row: {
          ativo: boolean | null
          comprovante_vinculo_url: string | null
          cpf: string
          created_at: string | null
          id: string
          motorista_id: string
          nome: string
          telefone: string | null
          tipo_cadastro: Database["public"]["Enums"]["tipo_cadastro_motorista"]
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          comprovante_vinculo_url?: string | null
          cpf: string
          created_at?: string | null
          id?: string
          motorista_id: string
          nome: string
          telefone?: string | null
          tipo_cadastro?: Database["public"]["Enums"]["tipo_cadastro_motorista"]
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          comprovante_vinculo_url?: string | null
          cpf?: string
          created_at?: string | null
          id?: string
          motorista_id?: string
          nome?: string
          telefone?: string | null
          tipo_cadastro?: Database["public"]["Enums"]["tipo_cadastro_motorista"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ajudantes_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_logs: {
        Row: {
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          operacao: string
          registro_id: string
          tabela: string
          timestamp: string
          usuario_id: string | null
        }
        Insert: {
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          operacao: string
          registro_id: string
          tabela: string
          timestamp?: string
          usuario_id?: string | null
        }
        Update: {
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          operacao?: string
          registro_id?: string
          tabela?: string
          timestamp?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      cargas: {
        Row: {
          carga_fragil: boolean | null
          carga_perigosa: boolean | null
          carga_viva: boolean | null
          codigo: string
          comercial: Json | null
          contato_destino_id: string | null
          created_at: string | null
          data_coleta_ate: string | null
          data_coleta_de: string | null
          data_entrega_limite: string | null
          descricao: string
          destinatario_cnpj: string | null
          destinatario_contato_email: string | null
          destinatario_contato_nome: string | null
          destinatario_contato_telefone: string | null
          destinatario_inscricao_estadual: string | null
          destinatario_nome_fantasia: string | null
          destinatario_razao_social: string | null
          documentacao: Json | null
          empilhavel: boolean | null
          empresa_id: number | null
          endereco_destino_id: string | null
          endereco_origem_id: string | null
          expira_em: string | null
          filial_id: number | null
          id: string
          necessidades_especiais: string[] | null
          nota_fiscal_url: string | null
          numero_onu: string | null
          numero_pedido: string | null
          permite_fracionado: boolean | null
          peso_disponivel_kg: number | null
          peso_kg: number
          peso_minimo_fracionado_kg: number | null
          publicada_em: string | null
          quantidade: number | null
          quantidade_paletes: number | null
          regras_carregamento: string | null
          remetente_cnpj: string | null
          remetente_contato_nome: string | null
          remetente_contato_telefone: string | null
          remetente_inscricao_estadual: string | null
          remetente_nome_fantasia: string | null
          remetente_razao_social: string | null
          requer_refrigeracao: boolean | null
          status: Database["public"]["Enums"]["status_carga"] | null
          temperatura_max: number | null
          temperatura_min: number | null
          tipo: Database["public"]["Enums"]["tipo_carga"]
          tipo_precificacao: Database["public"]["Enums"]["tipo_precificacao"]
          updated_at: string | null
          valor_frete_fixo: number | null
          valor_frete_km: number | null
          valor_frete_m3: number | null
          valor_frete_tonelada: number | null
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
          contato_destino_id?: string | null
          created_at?: string | null
          data_coleta_ate?: string | null
          data_coleta_de?: string | null
          data_entrega_limite?: string | null
          descricao: string
          destinatario_cnpj?: string | null
          destinatario_contato_email?: string | null
          destinatario_contato_nome?: string | null
          destinatario_contato_telefone?: string | null
          destinatario_inscricao_estadual?: string | null
          destinatario_nome_fantasia?: string | null
          destinatario_razao_social?: string | null
          documentacao?: Json | null
          empilhavel?: boolean | null
          empresa_id?: number | null
          endereco_destino_id?: string | null
          endereco_origem_id?: string | null
          expira_em?: string | null
          filial_id?: number | null
          id?: string
          necessidades_especiais?: string[] | null
          nota_fiscal_url?: string | null
          numero_onu?: string | null
          numero_pedido?: string | null
          permite_fracionado?: boolean | null
          peso_disponivel_kg?: number | null
          peso_kg: number
          peso_minimo_fracionado_kg?: number | null
          publicada_em?: string | null
          quantidade?: number | null
          quantidade_paletes?: number | null
          regras_carregamento?: string | null
          remetente_cnpj?: string | null
          remetente_contato_nome?: string | null
          remetente_contato_telefone?: string | null
          remetente_inscricao_estadual?: string | null
          remetente_nome_fantasia?: string | null
          remetente_razao_social?: string | null
          requer_refrigeracao?: boolean | null
          status?: Database["public"]["Enums"]["status_carga"] | null
          temperatura_max?: number | null
          temperatura_min?: number | null
          tipo: Database["public"]["Enums"]["tipo_carga"]
          tipo_precificacao?: Database["public"]["Enums"]["tipo_precificacao"]
          updated_at?: string | null
          valor_frete_fixo?: number | null
          valor_frete_km?: number | null
          valor_frete_m3?: number | null
          valor_frete_tonelada?: number | null
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
          contato_destino_id?: string | null
          created_at?: string | null
          data_coleta_ate?: string | null
          data_coleta_de?: string | null
          data_entrega_limite?: string | null
          descricao?: string
          destinatario_cnpj?: string | null
          destinatario_contato_email?: string | null
          destinatario_contato_nome?: string | null
          destinatario_contato_telefone?: string | null
          destinatario_inscricao_estadual?: string | null
          destinatario_nome_fantasia?: string | null
          destinatario_razao_social?: string | null
          documentacao?: Json | null
          empilhavel?: boolean | null
          empresa_id?: number | null
          endereco_destino_id?: string | null
          endereco_origem_id?: string | null
          expira_em?: string | null
          filial_id?: number | null
          id?: string
          necessidades_especiais?: string[] | null
          nota_fiscal_url?: string | null
          numero_onu?: string | null
          numero_pedido?: string | null
          permite_fracionado?: boolean | null
          peso_disponivel_kg?: number | null
          peso_kg?: number
          peso_minimo_fracionado_kg?: number | null
          publicada_em?: string | null
          quantidade?: number | null
          quantidade_paletes?: number | null
          regras_carregamento?: string | null
          remetente_cnpj?: string | null
          remetente_contato_nome?: string | null
          remetente_contato_telefone?: string | null
          remetente_inscricao_estadual?: string | null
          remetente_nome_fantasia?: string | null
          remetente_razao_social?: string | null
          requer_refrigeracao?: boolean | null
          status?: Database["public"]["Enums"]["status_carga"] | null
          temperatura_max?: number | null
          temperatura_min?: number | null
          tipo?: Database["public"]["Enums"]["tipo_carga"]
          tipo_precificacao?: Database["public"]["Enums"]["tipo_precificacao"]
          updated_at?: string | null
          valor_frete_fixo?: number | null
          valor_frete_km?: number | null
          valor_frete_m3?: number | null
          valor_frete_tonelada?: number | null
          valor_mercadoria?: number | null
          veiculo_requisitos?: Json | null
          volume_m3?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cargas_contato_destino_id_fkey"
            columns: ["contato_destino_id"]
            isOneToOne: false
            referencedRelation: "contatos_destino"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_endereco_destino_fkey"
            columns: ["endereco_destino_id"]
            isOneToOne: false
            referencedRelation: "enderecos_carga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_endereco_destino_id_fkey"
            columns: ["endereco_destino_id"]
            isOneToOne: false
            referencedRelation: "enderecos_carga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_endereco_origem_fkey"
            columns: ["endereco_origem_id"]
            isOneToOne: false
            referencedRelation: "enderecos_carga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_endereco_origem_id_fkey"
            columns: ["endereco_origem_id"]
            isOneToOne: false
            referencedRelation: "enderecos_carga"
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
          ano: number | null
          ativo: boolean | null
          capacidade_kg: number | null
          capacidade_m3: number | null
          created_at: string | null
          created_by: string | null
          empresa_id: number | null
          foto_url: string | null
          fotos_urls: string[] | null
          id: string
          marca: string | null
          modelo: string | null
          placa: string
          renavam: string | null
          tipo: string
          updated_at: string | null
          updated_by: string | null
          veiculo_id: string | null
        }
        Insert: {
          ano?: number | null
          ativo?: boolean | null
          capacidade_kg?: number | null
          capacidade_m3?: number | null
          created_at?: string | null
          created_by?: string | null
          empresa_id?: number | null
          foto_url?: string | null
          fotos_urls?: string[] | null
          id?: string
          marca?: string | null
          modelo?: string | null
          placa: string
          renavam?: string | null
          tipo: string
          updated_at?: string | null
          updated_by?: string | null
          veiculo_id?: string | null
        }
        Update: {
          ano?: number | null
          ativo?: boolean | null
          capacidade_kg?: number | null
          capacidade_m3?: number | null
          created_at?: string | null
          created_by?: string | null
          empresa_id?: number | null
          foto_url?: string | null
          fotos_urls?: string[] | null
          id?: string
          marca?: string | null
          modelo?: string | null
          placa?: string
          renavam?: string | null
          tipo?: string
          updated_at?: string | null
          updated_by?: string | null
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carrocerias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrocerias_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      certificados_digitais: {
        Row: {
          cnpj_titular: string | null
          created_at: string
          data_validade: string | null
          empresa_id: number
          nome_titular: string | null
          pfx_base64: string
          senha_encriptada: string
          updated_at: string
        }
        Insert: {
          cnpj_titular?: string | null
          created_at?: string
          data_validade?: string | null
          empresa_id: number
          nome_titular?: string | null
          pfx_base64: string
          senha_encriptada: string
          updated_at?: string
        }
        Update: {
          cnpj_titular?: string | null
          created_at?: string
          data_validade?: string | null
          empresa_id?: number
          nome_titular?: string | null
          pfx_base64?: string
          senha_encriptada?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificados_digitais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      chamado_mensagens: {
        Row: {
          anexo_nome: string | null
          anexo_url: string | null
          chamado_id: string
          conteudo: string
          created_at: string
          id: string
          sender_id: string
          sender_nome: string
          sender_tipo: string
        }
        Insert: {
          anexo_nome?: string | null
          anexo_url?: string | null
          chamado_id: string
          conteudo: string
          created_at?: string
          id?: string
          sender_id: string
          sender_nome: string
          sender_tipo: string
        }
        Update: {
          anexo_nome?: string | null
          anexo_url?: string | null
          chamado_id?: string
          conteudo?: string
          created_at?: string
          id?: string
          sender_id?: string
          sender_nome?: string
          sender_tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamado_mensagens_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      chamados: {
        Row: {
          atribuido_a: string | null
          categoria: Database["public"]["Enums"]["categoria_chamado"]
          codigo: string
          created_at: string
          descricao: string
          empresa_id: number | null
          id: string
          prioridade: Database["public"]["Enums"]["prioridade_chamado"]
          resolucao: string | null
          resolvido_em: string | null
          resolvido_por: string | null
          solicitante_email: string
          solicitante_nome: string
          solicitante_tipo: string
          solicitante_user_id: string | null
          status: Database["public"]["Enums"]["status_chamado"]
          titulo: string
          updated_at: string
        }
        Insert: {
          atribuido_a?: string | null
          categoria?: Database["public"]["Enums"]["categoria_chamado"]
          codigo: string
          created_at?: string
          descricao: string
          empresa_id?: number | null
          id?: string
          prioridade?: Database["public"]["Enums"]["prioridade_chamado"]
          resolucao?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          solicitante_email: string
          solicitante_nome: string
          solicitante_tipo: string
          solicitante_user_id?: string | null
          status?: Database["public"]["Enums"]["status_chamado"]
          titulo: string
          updated_at?: string
        }
        Update: {
          atribuido_a?: string | null
          categoria?: Database["public"]["Enums"]["categoria_chamado"]
          codigo?: string
          created_at?: string
          descricao?: string
          empresa_id?: number | null
          id?: string
          prioridade?: Database["public"]["Enums"]["prioridade_chamado"]
          resolucao?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          solicitante_email?: string
          solicitante_nome?: string
          solicitante_tipo?: string
          solicitante_user_id?: string | null
          status?: Database["public"]["Enums"]["status_chamado"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_atribuido_a_fkey"
            columns: ["atribuido_a"]
            isOneToOne: false
            referencedRelation: "torre_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chamados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participantes: {
        Row: {
          chat_id: string
          created_at: string
          empresa_id: number | null
          id: string
          motorista_id: string | null
          tipo_participante: string
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          empresa_id?: number | null
          id?: string
          motorista_id?: string | null
          tipo_participante: string
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          empresa_id?: number | null
          id?: string
          motorista_id?: string | null
          tipo_participante?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participantes_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participantes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participantes_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          entrega_id: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entrega_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entrega_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: true
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invites: {
        Row: {
          accepted_at: string | null
          company_id: number
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
          company_id: number
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
          company_id?: number
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
      config_fiscal: {
        Row: {
          ambiente: number
          cfop_estadual: string
          cfop_interestadual: string
          created_at: string
          empresa_id: number
          icms_aliquota: number
          icms_base_calculo_percentual: number
          icms_situacao_tributaria: string
          id: number
          natureza_operacao: string
          proximo_numero_cte: number
          regime_tributario_emitente: number
          serie_cte: number
          tipo_servico: number
          tomador_padrao: string
          updated_at: string
        }
        Insert: {
          ambiente?: number
          cfop_estadual?: string
          cfop_interestadual?: string
          created_at?: string
          empresa_id: number
          icms_aliquota?: number
          icms_base_calculo_percentual?: number
          icms_situacao_tributaria?: string
          id?: number
          natureza_operacao?: string
          proximo_numero_cte?: number
          regime_tributario_emitente?: number
          serie_cte?: number
          tipo_servico?: number
          tomador_padrao?: string
          updated_at?: string
        }
        Update: {
          ambiente?: number
          cfop_estadual?: string
          cfop_interestadual?: string
          created_at?: string
          empresa_id?: number
          icms_aliquota?: number
          icms_base_calculo_percentual?: number
          icms_situacao_tributaria?: string
          id?: number
          natureza_operacao?: string
          proximo_numero_cte?: number
          regime_tributario_emitente?: number
          serie_cte?: number
          tipo_servico?: number
          tomador_padrao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_fiscal_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
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
      ctes: {
        Row: {
          chave_acesso: string | null
          created_at: string | null
          empresa_id: number | null
          entrega_id: string
          focus_ref: string | null
          focus_status: string | null
          id: string
          numero: string | null
          serie: string | null
          updated_at: string | null
          url: string | null
          valor: number | null
          xml_url: string | null
        }
        Insert: {
          chave_acesso?: string | null
          created_at?: string | null
          empresa_id?: number | null
          entrega_id: string
          focus_ref?: string | null
          focus_status?: string | null
          id?: string
          numero?: string | null
          serie?: string | null
          updated_at?: string | null
          url?: string | null
          valor?: number | null
          xml_url?: string | null
        }
        Update: {
          chave_acesso?: string | null
          created_at?: string | null
          empresa_id?: number | null
          entrega_id?: string
          focus_ref?: string | null
          focus_status?: string | null
          id?: string
          numero?: string | null
          serie?: string | null
          updated_at?: string | null
          url?: string | null
          valor?: number | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ctes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctes_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_validacao: {
        Row: {
          carroceria_id: string | null
          created_at: string
          data_emissao: string | null
          data_vencimento: string | null
          id: string
          motorista_id: string | null
          numero: string
          status: string
          tipo: string
          updated_at: string
          url: string | null
          veiculo_id: string | null
        }
        Insert: {
          carroceria_id?: string | null
          created_at?: string
          data_emissao?: string | null
          data_vencimento?: string | null
          id?: string
          motorista_id?: string | null
          numero: string
          status?: string
          tipo: string
          updated_at?: string
          url?: string | null
          veiculo_id?: string | null
        }
        Update: {
          carroceria_id?: string | null
          created_at?: string
          data_emissao?: string | null
          data_vencimento?: string | null
          id?: string
          motorista_id?: string | null
          numero?: string
          status?: string
          tipo?: string
          updated_at?: string
          url?: string | null
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_validacao_carroceria_id_fkey"
            columns: ["carroceria_id"]
            isOneToOne: false
            referencedRelation: "carrocerias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_validacao_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_validacao_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_invite_links: {
        Row: {
          ativo: boolean
          codigo_acesso: string
          created_at: string
          created_by: string
          empresa_id: number
          expira_em: string
          id: string
          max_usos: number
          nome_link: string | null
          updated_at: string
          usos_realizados: number
        }
        Insert: {
          ativo?: boolean
          codigo_acesso: string
          created_at?: string
          created_by: string
          empresa_id: number
          expira_em: string
          id?: string
          max_usos?: number
          nome_link?: string | null
          updated_at?: string
          usos_realizados?: number
        }
        Update: {
          ativo?: boolean
          codigo_acesso?: string
          created_at?: string
          created_by?: string
          empresa_id?: number
          expira_em?: string
          id?: string
          max_usos?: number
          nome_link?: string | null
          updated_at?: string
          usos_realizados?: number
        }
        Relationships: []
      }
      empresas: {
        Row: {
          classe: Database["public"]["Enums"]["classe_empresa"]
          cnpj_matriz: string | null
          comissao_hubfrete_percent: number
          created_at: string
          dados_bancarios: Json | null
          email: string | null
          id: number
          inscricao_estadual: string | null
          logo_url: string | null
          nome: string | null
          nome_fantasia: string | null
          razao_social: string | null
          telefone: string | null
          tipo: Database["public"]["Enums"]["tipo_empresa"]
        }
        Insert: {
          classe: Database["public"]["Enums"]["classe_empresa"]
          cnpj_matriz?: string | null
          comissao_hubfrete_percent?: number
          created_at?: string
          dados_bancarios?: Json | null
          email?: string | null
          id?: number
          inscricao_estadual?: string | null
          logo_url?: string | null
          nome?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          telefone?: string | null
          tipo: Database["public"]["Enums"]["tipo_empresa"]
        }
        Update: {
          classe?: Database["public"]["Enums"]["classe_empresa"]
          cnpj_matriz?: string | null
          comissao_hubfrete_percent?: number
          created_at?: string
          dados_bancarios?: Json | null
          email?: string | null
          id?: number
          inscricao_estadual?: string | null
          logo_url?: string | null
          nome?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_empresa"]
        }
        Relationships: []
      }
      enderecos_carga: {
        Row: {
          bairro: string | null
          carga_id: string | null
          cep: string
          cidade: string
          codigo_municipio_ibge: string | null
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
          carga_id?: string | null
          cep: string
          cidade: string
          codigo_municipio_ibge?: string | null
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
          carga_id?: string | null
          cep?: string
          cidade?: string
          codigo_municipio_ibge?: string | null
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
      entrega_eventos: {
        Row: {
          created_at: string
          entrega_id: string
          foto_url: string | null
          id: string
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          observacao: string | null
          timestamp: string
          tipo: string
          user_id: string | null
          user_nome: string | null
        }
        Insert: {
          created_at?: string
          entrega_id: string
          foto_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          observacao?: string | null
          timestamp: string
          tipo: string
          user_id?: string | null
          user_nome?: string | null
        }
        Update: {
          created_at?: string
          entrega_id?: string
          foto_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          observacao?: string | null
          timestamp?: string
          tipo?: string
          user_id?: string | null
          user_nome?: string | null
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
          assinatura_recebedor: string | null
          canhoto_url: string | null
          carga_id: string
          carroceria_id: string | null
          carroceria_id_2: string | null
          carrocerias_alocadas: Json | null
          checklist_veiculo: Json | null
          codigo: string | null
          coletado_em: string | null
          created_at: string | null
          created_by: string | null
          cte_gerado_automaticamente: boolean | null
          cte_tentativas_geracao: number | null
          cte_ultimo_erro: string | null
          cte_url: string | null
          documento_recebedor: string | null
          entregue_em: string | null
          foto_comprovante_coleta: string | null
          foto_comprovante_entrega: string | null
          id: string
          manifesto_url: string | null
          motorista_id: string | null
          nome_recebedor: string | null
          notas_fiscais_urls: string[] | null
          numero_cte: string | null
          observacoes: string | null
          outros_documentos: Json | null
          peso_alocado_kg: number | null
          previsao_coleta: string | null
          status: Database["public"]["Enums"]["status_entrega"] | null
          tracking_code: string | null
          updated_at: string | null
          updated_by: string | null
          valor_frete: number | null
          veiculo_id: string | null
        }
        Insert: {
          assinatura_recebedor?: string | null
          canhoto_url?: string | null
          carga_id: string
          carroceria_id?: string | null
          carroceria_id_2?: string | null
          carrocerias_alocadas?: Json | null
          checklist_veiculo?: Json | null
          codigo?: string | null
          coletado_em?: string | null
          created_at?: string | null
          created_by?: string | null
          cte_gerado_automaticamente?: boolean | null
          cte_tentativas_geracao?: number | null
          cte_ultimo_erro?: string | null
          cte_url?: string | null
          documento_recebedor?: string | null
          entregue_em?: string | null
          foto_comprovante_coleta?: string | null
          foto_comprovante_entrega?: string | null
          id?: string
          manifesto_url?: string | null
          motorista_id?: string | null
          nome_recebedor?: string | null
          notas_fiscais_urls?: string[] | null
          numero_cte?: string | null
          observacoes?: string | null
          outros_documentos?: Json | null
          peso_alocado_kg?: number | null
          previsao_coleta?: string | null
          status?: Database["public"]["Enums"]["status_entrega"] | null
          tracking_code?: string | null
          updated_at?: string | null
          updated_by?: string | null
          valor_frete?: number | null
          veiculo_id?: string | null
        }
        Update: {
          assinatura_recebedor?: string | null
          canhoto_url?: string | null
          carga_id?: string
          carroceria_id?: string | null
          carroceria_id_2?: string | null
          carrocerias_alocadas?: Json | null
          checklist_veiculo?: Json | null
          codigo?: string | null
          coletado_em?: string | null
          created_at?: string | null
          created_by?: string | null
          cte_gerado_automaticamente?: boolean | null
          cte_tentativas_geracao?: number | null
          cte_ultimo_erro?: string | null
          cte_url?: string | null
          documento_recebedor?: string | null
          entregue_em?: string | null
          foto_comprovante_coleta?: string | null
          foto_comprovante_entrega?: string | null
          id?: string
          manifesto_url?: string | null
          motorista_id?: string | null
          nome_recebedor?: string | null
          notas_fiscais_urls?: string[] | null
          numero_cte?: string | null
          observacoes?: string | null
          outros_documentos?: Json | null
          peso_alocado_kg?: number | null
          previsao_coleta?: string | null
          status?: Database["public"]["Enums"]["status_entrega"] | null
          tracking_code?: string | null
          updated_at?: string | null
          updated_by?: string | null
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
            foreignKeyName: "entregas_carroceria_id_2_fkey"
            columns: ["carroceria_id_2"]
            isOneToOne: false
            referencedRelation: "carrocerias"
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
            foreignKeyName: "entregas_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      faturas: {
        Row: {
          ano: number
          baixa_por: string | null
          comprovante_url: string | null
          created_at: string
          data_pagamento: string | null
          empresa_id: number
          id: string
          mes: number
          metodo_pagamento: string | null
          observacoes: string | null
          periodo_fim: string
          periodo_inicio: string
          qtd_entregas: number | null
          quinzena: number
          status: string
          tipo: string
          updated_at: string
          valor_bruto: number | null
          valor_comissao: number | null
          valor_liquido: number | null
        }
        Insert: {
          ano: number
          baixa_por?: string | null
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          empresa_id: number
          id?: string
          mes: number
          metodo_pagamento?: string | null
          observacoes?: string | null
          periodo_fim: string
          periodo_inicio: string
          qtd_entregas?: number | null
          quinzena: number
          status?: string
          tipo: string
          updated_at?: string
          valor_bruto?: number | null
          valor_comissao?: number | null
          valor_liquido?: number | null
        }
        Update: {
          ano?: number
          baixa_por?: string | null
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          empresa_id?: number
          id?: string
          mes?: number
          metodo_pagamento?: string | null
          observacoes?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          qtd_entregas?: number | null
          quinzena?: number
          status?: string
          tipo?: string
          updated_at?: string
          valor_bruto?: number | null
          valor_comissao?: number | null
          valor_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "faturas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      filiais: {
        Row: {
          ativa: boolean | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          codigo_municipio_ibge: string | null
          complemento: string | null
          created_at: string
          email: string | null
          empresa_id: number | null
          endereco: string | null
          estado: string | null
          id: number
          is_matriz: boolean | null
          latitude: number | null
          logradouro: string | null
          longitude: number | null
          nome: string | null
          numero: string | null
          responsavel: string | null
          telefone: string | null
        }
        Insert: {
          ativa?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo_municipio_ibge?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: number | null
          endereco?: string | null
          estado?: string | null
          id?: number
          is_matriz?: boolean | null
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          nome?: string | null
          numero?: string | null
          responsavel?: string | null
          telefone?: string | null
        }
        Update: {
          ativa?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo_municipio_ibge?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: number | null
          endereco?: string | null
          estado?: string | null
          id?: number
          is_matriz?: boolean | null
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          nome?: string | null
          numero?: string | null
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
      financeiro_entregas: {
        Row: {
          baixa_por: string | null
          comprovante_url: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string | null
          empresa_embarcadora_id: number | null
          empresa_transportadora_id: number | null
          entrega_id: string
          fatura_embarcador_id: string | null
          fatura_transportadora_id: string | null
          id: string
          metodo_pagamento: string | null
          observacoes: string | null
          status: string
          updated_at: string
          valor_comissao: number
          valor_frete: number
          valor_liquido: number
        }
        Insert: {
          baixa_por?: string | null
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          empresa_embarcadora_id?: number | null
          empresa_transportadora_id?: number | null
          entrega_id: string
          fatura_embarcador_id?: string | null
          fatura_transportadora_id?: string | null
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_comissao?: number
          valor_frete?: number
          valor_liquido?: number
        }
        Update: {
          baixa_por?: string | null
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          empresa_embarcadora_id?: number | null
          empresa_transportadora_id?: number | null
          entrega_id?: string
          fatura_embarcador_id?: string | null
          fatura_transportadora_id?: string | null
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_comissao?: number
          valor_frete?: number
          valor_liquido?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_entregas_empresa_embarcadora_id_fkey"
            columns: ["empresa_embarcadora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_entregas_empresa_transportadora_id_fkey"
            columns: ["empresa_transportadora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_entregas_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_entregas_fatura_embarcador_id_fkey"
            columns: ["fatura_embarcador_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_entregas_fatura_transportadora_id_fkey"
            columns: ["fatura_transportadora_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
        ]
      }
      geofences: {
        Row: {
          ativo: boolean
          created_at: string
          entrega_id: string | null
          id: string
          latitude: number
          longitude: number
          mudar_status_auto: boolean
          nome: string
          notificar_entrada: boolean
          notificar_saida: boolean
          raio_metros: number
          status_apos_entrada: string | null
          status_apos_saida: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          entrega_id?: string | null
          id?: string
          latitude: number
          longitude: number
          mudar_status_auto?: boolean
          nome: string
          notificar_entrada?: boolean
          notificar_saida?: boolean
          raio_metros?: number
          status_apos_entrada?: string | null
          status_apos_saida?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          entrega_id?: string | null
          id?: string
          latitude?: number
          longitude?: number
          mudar_status_auto?: boolean
          nome?: string
          notificar_entrada?: boolean
          notificar_saida?: boolean
          raio_metros?: number
          status_apos_entrada?: string | null
          status_apos_saida?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofences_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
        ]
      }
      gnres: {
        Row: {
          cargas_id: string | null
          codigo_barras: string | null
          created_at: string
          data_vencimento: string
          empresa_id: number
          id: string
          linha_digitavel: string | null
          motivo_rejeicao: string | null
          nfe_id: string | null
          numero_recibo: string | null
          receita: string
          status: string
          uf_favorecida: string
          valor: number
          xml_envio: string | null
          xml_retorno: string | null
        }
        Insert: {
          cargas_id?: string | null
          codigo_barras?: string | null
          created_at?: string
          data_vencimento: string
          empresa_id: number
          id?: string
          linha_digitavel?: string | null
          motivo_rejeicao?: string | null
          nfe_id?: string | null
          numero_recibo?: string | null
          receita: string
          status?: string
          uf_favorecida: string
          valor: number
          xml_envio?: string | null
          xml_retorno?: string | null
        }
        Update: {
          cargas_id?: string | null
          codigo_barras?: string | null
          created_at?: string
          data_vencimento?: string
          empresa_id?: number
          id?: string
          linha_digitavel?: string | null
          motivo_rejeicao?: string | null
          nfe_id?: string | null
          numero_recibo?: string | null
          receita?: string
          status?: string
          uf_favorecida?: string
          valor?: number
          xml_envio?: string | null
          xml_retorno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gnres_cargas_id_fkey"
            columns: ["cargas_id"]
            isOneToOne: false
            referencedRelation: "cargas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gnres_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gnres_nfe_id_fkey"
            columns: ["nfe_id"]
            isOneToOne: false
            referencedRelation: "nfes"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_active_chat: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      ia_search_chat: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          accuracy: number | null
          altitude: number | null
          gps_quality: number | null
          heading: number | null
          id: number
          latitude: number | null
          longitude: number | null
          motivo_coleta: string | null
          motorista_id: string | null
          speed: number | null
          updated_at: string | null
          viagem_id: string | null
        }
        Insert: {
          accuracy?: number | null
          altitude?: number | null
          gps_quality?: number | null
          heading?: number | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          motivo_coleta?: string | null
          motorista_id?: string | null
          speed?: number | null
          updated_at?: string | null
          viagem_id?: string | null
        }
        Update: {
          accuracy?: number | null
          altitude?: number | null
          gps_quality?: number | null
          heading?: number | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          motivo_coleta?: string | null
          motorista_id?: string | null
          speed?: number | null
          updated_at?: string | null
          viagem_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "localizações_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: true
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "viagens"
            referencedColumns: ["id"]
          },
        ]
      }
      manifesto_ctes: {
        Row: {
          cte_id: string | null
          id: string
          manifesto_id: string | null
        }
        Insert: {
          cte_id?: string | null
          id?: string
          manifesto_id?: string | null
        }
        Update: {
          cte_id?: string | null
          id?: string
          manifesto_id?: string | null
        }
        Relationships: []
      }
      manifestos: {
        Row: {
          chave_acesso: string | null
          created_at: string | null
          empresa_id: number | null
          focus_ref: string | null
          focus_status: string | null
          id: string
          numero: string | null
          updated_at: string | null
          url: string | null
          viagem_id: string | null
          xml_url: string | null
        }
        Insert: {
          chave_acesso?: string | null
          created_at?: string | null
          empresa_id?: number | null
          focus_ref?: string | null
          focus_status?: string | null
          id?: string
          numero?: string | null
          updated_at?: string | null
          url?: string | null
          viagem_id?: string | null
          xml_url?: string | null
        }
        Update: {
          chave_acesso?: string | null
          created_at?: string | null
          empresa_id?: number | null
          focus_ref?: string | null
          focus_status?: string | null
          id?: string
          numero?: string | null
          updated_at?: string | null
          url?: string | null
          viagem_id?: string | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manifestos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifestos_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "viagens"
            referencedColumns: ["id"]
          },
        ]
      }
      mdfe_documentos: {
        Row: {
          chave_acesso: string
          created_at: string | null
          cte_id: string | null
          id: string
          mdfe_id: string
          nfe_id: string | null
          tipo: string
        }
        Insert: {
          chave_acesso: string
          created_at?: string | null
          cte_id?: string | null
          id?: string
          mdfe_id: string
          nfe_id?: string | null
          tipo: string
        }
        Update: {
          chave_acesso?: string
          created_at?: string | null
          cte_id?: string | null
          id?: string
          mdfe_id?: string
          nfe_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "mdfe_documentos_cte_id_fkey"
            columns: ["cte_id"]
            isOneToOne: false
            referencedRelation: "ctes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mdfe_documentos_mdfe_id_fkey"
            columns: ["mdfe_id"]
            isOneToOne: false
            referencedRelation: "mdfes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mdfe_documentos_nfe_id_fkey"
            columns: ["nfe_id"]
            isOneToOne: false
            referencedRelation: "nfes"
            referencedColumns: ["id"]
          },
        ]
      }
      mdfes: {
        Row: {
          autorizado_at: string | null
          cancelado_at: string | null
          chave_acesso: string | null
          created_at: string
          empresa_id: number | null
          encerrado_at: string | null
          erro: string | null
          focus_ref: string | null
          ftp_pdf_path: string | null
          ftp_xml_path: string | null
          id: string
          numero: string | null
          pdf_path: string | null
          protocolo: string | null
          serie: string | null
          status: string | null
          updated_at: string
          viagem_id: string
          xml_content: string | null
          xml_path: string | null
        }
        Insert: {
          autorizado_at?: string | null
          cancelado_at?: string | null
          chave_acesso?: string | null
          created_at?: string
          empresa_id?: number | null
          encerrado_at?: string | null
          erro?: string | null
          focus_ref?: string | null
          ftp_pdf_path?: string | null
          ftp_xml_path?: string | null
          id?: string
          numero?: string | null
          pdf_path?: string | null
          protocolo?: string | null
          serie?: string | null
          status?: string | null
          updated_at?: string
          viagem_id: string
          xml_content?: string | null
          xml_path?: string | null
        }
        Update: {
          autorizado_at?: string | null
          cancelado_at?: string | null
          chave_acesso?: string | null
          created_at?: string
          empresa_id?: number | null
          encerrado_at?: string | null
          erro?: string | null
          focus_ref?: string | null
          ftp_pdf_path?: string | null
          ftp_xml_path?: string | null
          id?: string
          numero?: string | null
          pdf_path?: string | null
          protocolo?: string | null
          serie?: string | null
          status?: string | null
          updated_at?: string
          viagem_id?: string
          xml_content?: string | null
          xml_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mdfes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mdfes_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "viagens"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens: {
        Row: {
          anexo_nome: string | null
          anexo_tamanho: number | null
          anexo_tipo: string | null
          anexo_url: string | null
          chat_id: string
          conteudo: string
          created_at: string
          id: string
          lida: boolean
          sender_id: string
          sender_nome: string
          sender_tipo: string
        }
        Insert: {
          anexo_nome?: string | null
          anexo_tamanho?: number | null
          anexo_tipo?: string | null
          anexo_url?: string | null
          chat_id: string
          conteudo: string
          created_at?: string
          id?: string
          lida?: boolean
          sender_id: string
          sender_nome: string
          sender_tipo: string
        }
        Update: {
          anexo_nome?: string | null
          anexo_tamanho?: number | null
          anexo_tipo?: string | null
          anexo_url?: string | null
          chat_id?: string
          conteudo?: string
          created_at?: string
          id?: string
          lida?: boolean
          sender_id?: string
          sender_nome?: string
          sender_tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      motorista_kpis: {
        Row: {
          consumo_estimado_litros: number | null
          created_at: string
          custo_estimado: number | null
          entregas_atrasadas: number | null
          entregas_finalizadas: number | null
          id: string
          km_rodado: number | null
          media_pedagios: number | null
          motorista_id: string
          periodo_fim: string
          periodo_inicio: string
          taxa_atraso: number | null
          tempo_em_rota_minutos: number | null
          tempo_parado_minutos: number | null
          updated_at: string
        }
        Insert: {
          consumo_estimado_litros?: number | null
          created_at?: string
          custo_estimado?: number | null
          entregas_atrasadas?: number | null
          entregas_finalizadas?: number | null
          id?: string
          km_rodado?: number | null
          media_pedagios?: number | null
          motorista_id: string
          periodo_fim: string
          periodo_inicio: string
          taxa_atraso?: number | null
          tempo_em_rota_minutos?: number | null
          tempo_parado_minutos?: number | null
          updated_at?: string
        }
        Update: {
          consumo_estimado_litros?: number | null
          created_at?: string
          custo_estimado?: number | null
          entregas_atrasadas?: number | null
          entregas_finalizadas?: number | null
          id?: string
          km_rodado?: number | null
          media_pedagios?: number | null
          motorista_id?: string
          periodo_fim?: string
          periodo_inicio?: string
          taxa_atraso?: number | null
          tempo_em_rota_minutos?: number | null
          tempo_parado_minutos?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "motorista_kpis_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
        ]
      }
      motorista_referencias: {
        Row: {
          created_at: string | null
          empresa: string | null
          id: string
          motorista_id: string
          nome: string
          ordem: number
          ramo: string | null
          telefone: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          empresa?: string | null
          id?: string
          motorista_id: string
          nome: string
          ordem?: number
          ramo?: string | null
          telefone: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          empresa?: string | null
          id?: string
          motorista_id?: string
          nome?: string
          ordem?: number
          ramo?: string | null
          telefone?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motorista_referencias_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
        ]
      }
      motoristas: {
        Row: {
          ativo: boolean | null
          categoria_cnh: string
          cnh: string
          cnh_digital_url: string | null
          cnh_tem_qrcode: boolean | null
          comprovante_endereco_titular_doc_url: string | null
          comprovante_endereco_titular_nome: string | null
          comprovante_endereco_url: string | null
          comprovante_vinculo_url: string | null
          cpf: string
          created_at: string | null
          email: string | null
          empresa_id: number | null
          foto_url: string | null
          id: string
          jwt: string | null
          nome_completo: string
          possui_ajudante: boolean | null
          push_token: string | null
          senha: string | null
          telefone: string | null
          tipo_cadastro:
            | Database["public"]["Enums"]["tipo_cadastro_motorista"]
            | null
          uf: string | null
          updated_at: string | null
          user_id: string
          validade_cnh: string
        }
        Insert: {
          ativo?: boolean | null
          categoria_cnh: string
          cnh: string
          cnh_digital_url?: string | null
          cnh_tem_qrcode?: boolean | null
          comprovante_endereco_titular_doc_url?: string | null
          comprovante_endereco_titular_nome?: string | null
          comprovante_endereco_url?: string | null
          comprovante_vinculo_url?: string | null
          cpf: string
          created_at?: string | null
          email?: string | null
          empresa_id?: number | null
          foto_url?: string | null
          id?: string
          jwt?: string | null
          nome_completo: string
          possui_ajudante?: boolean | null
          push_token?: string | null
          senha?: string | null
          telefone?: string | null
          tipo_cadastro?:
            | Database["public"]["Enums"]["tipo_cadastro_motorista"]
            | null
          uf?: string | null
          updated_at?: string | null
          user_id: string
          validade_cnh: string
        }
        Update: {
          ativo?: boolean | null
          categoria_cnh?: string
          cnh?: string
          cnh_digital_url?: string | null
          cnh_tem_qrcode?: boolean | null
          comprovante_endereco_titular_doc_url?: string | null
          comprovante_endereco_titular_nome?: string | null
          comprovante_endereco_url?: string | null
          comprovante_vinculo_url?: string | null
          cpf?: string
          created_at?: string | null
          email?: string | null
          empresa_id?: number | null
          foto_url?: string | null
          id?: string
          jwt?: string | null
          nome_completo?: string
          possui_ajudante?: boolean | null
          push_token?: string | null
          senha?: string | null
          telefone?: string | null
          tipo_cadastro?:
            | Database["public"]["Enums"]["tipo_cadastro_motorista"]
            | null
          uf?: string | null
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
      nfes: {
        Row: {
          chave_acesso: string | null
          created_at: string | null
          cte_id: string | null
          data_emissao: string | null
          destinatario_cnpj: string | null
          destinatario_inscricao_estadual: string | null
          destinatario_razao_social: string | null
          entrega_id: string
          erro_validacao: string | null
          ftp_path: string | null
          id: string
          modelo: string | null
          numero: string | null
          numero_nfe: string | null
          peso_bruto: number | null
          remetente_cnpj: string | null
          remetente_inscricao_estadual: string | null
          remetente_razao_social: string | null
          serie: string | null
          status_validacao: string | null
          updated_at: string | null
          url: string | null
          validado_em: string | null
          valor: number | null
          valor_total: number | null
          xml_content: string | null
          xml_path: string | null
          xml_url: string | null
        }
        Insert: {
          chave_acesso?: string | null
          created_at?: string | null
          cte_id?: string | null
          data_emissao?: string | null
          destinatario_cnpj?: string | null
          destinatario_inscricao_estadual?: string | null
          destinatario_razao_social?: string | null
          entrega_id: string
          erro_validacao?: string | null
          ftp_path?: string | null
          id?: string
          modelo?: string | null
          numero?: string | null
          numero_nfe?: string | null
          peso_bruto?: number | null
          remetente_cnpj?: string | null
          remetente_inscricao_estadual?: string | null
          remetente_razao_social?: string | null
          serie?: string | null
          status_validacao?: string | null
          updated_at?: string | null
          url?: string | null
          validado_em?: string | null
          valor?: number | null
          valor_total?: number | null
          xml_content?: string | null
          xml_path?: string | null
          xml_url?: string | null
        }
        Update: {
          chave_acesso?: string | null
          created_at?: string | null
          cte_id?: string | null
          data_emissao?: string | null
          destinatario_cnpj?: string | null
          destinatario_inscricao_estadual?: string | null
          destinatario_razao_social?: string | null
          entrega_id?: string
          erro_validacao?: string | null
          ftp_path?: string | null
          id?: string
          modelo?: string | null
          numero?: string | null
          numero_nfe?: string | null
          peso_bruto?: number | null
          remetente_cnpj?: string | null
          remetente_inscricao_estadual?: string | null
          remetente_razao_social?: string | null
          serie?: string | null
          status_validacao?: string | null
          updated_at?: string | null
          url?: string | null
          validado_em?: string | null
          valor?: number | null
          valor_total?: number | null
          xml_content?: string | null
          xml_path?: string | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfes_cte_id_fkey"
            columns: ["cte_id"]
            isOneToOne: false
            referencedRelation: "ctes"
            referencedColumns: ["id"]
          },
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
          dados: Json | null
          empresa_id: number | null
          id: string
          lida: boolean
          link: string | null
          mensagem: string
          tipo: Database["public"]["Enums"]["tipo_notificacao"]
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dados?: Json | null
          empresa_id?: number | null
          id?: string
          lida?: boolean
          link?: string | null
          mensagem: string
          tipo: Database["public"]["Enums"]["tipo_notificacao"]
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          dados?: Json | null
          empresa_id?: number | null
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string
          tipo?: Database["public"]["Enums"]["tipo_notificacao"]
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      pre_cadastros: {
        Row: {
          analisado_em: string | null
          analisado_por: string | null
          cnpj: string | null
          cpf: string | null
          created_at: string
          email: string
          id: string
          motivo_rejeicao: string | null
          nome: string
          nome_empresa: string | null
          observacoes: string | null
          status: Database["public"]["Enums"]["status_pre_cadastro"]
          telefone: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          id?: string
          motivo_rejeicao?: string | null
          nome: string
          nome_empresa?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_pre_cadastro"]
          telefone?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          motivo_rejeicao?: string | null
          nome?: string
          nome_empresa?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_pre_cadastro"]
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      provas_entrega: {
        Row: {
          assinatura_url: string | null
          checklist: Json
          created_at: string
          documento_recebedor: string | null
          entrega_id: string
          fotos_urls: string[] | null
          id: string
          nome_recebedor: string
          observacoes: string | null
          timestamp: string
        }
        Insert: {
          assinatura_url?: string | null
          checklist?: Json
          created_at?: string
          documento_recebedor?: string | null
          entrega_id: string
          fotos_urls?: string[] | null
          id?: string
          nome_recebedor: string
          observacoes?: string | null
          timestamp: string
        }
        Update: {
          assinatura_url?: string | null
          checklist?: Json
          created_at?: string
          documento_recebedor?: string | null
          entrega_id?: string
          fotos_urls?: string[] | null
          id?: string
          nome_recebedor?: string
          observacoes?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "provas_entrega_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: true
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      torre_users: {
        Row: {
          ativo: boolean
          created_at: string
          email: string | null
          id: string
          nome: string | null
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tracking_historico: {
        Row: {
          accuracy: number | null
          altitude: number | null
          created_at: string
          gps_quality: number | null
          heading: number | null
          id: string
          latitude: number
          longitude: number
          motivo_coleta: string | null
          observacao: string | null
          request_id: string | null
          speed: number | null
          status: Database["public"]["Enums"]["status_entrega"] | null
          tracked_at: string
          viagem_id: string
        }
        Insert: {
          accuracy?: number | null
          altitude?: number | null
          created_at?: string
          gps_quality?: number | null
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          motivo_coleta?: string | null
          observacao?: string | null
          request_id?: string | null
          speed?: number | null
          status?: Database["public"]["Enums"]["status_entrega"] | null
          tracked_at: string
          viagem_id: string
        }
        Update: {
          accuracy?: number | null
          altitude?: number | null
          created_at?: string
          gps_quality?: number | null
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          motivo_coleta?: string | null
          observacao?: string | null
          request_id?: string | null
          speed?: number | null
          status?: Database["public"]["Enums"]["status_entrega"] | null
          tracked_at?: string
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
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
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
      veiculo_custo_config: {
        Row: {
          consumo_rodoviario_km_l: number | null
          consumo_urbano_km_l: number | null
          custo_por_km: number | null
          pedagio_medio: number | null
          updated_at: string
          veiculo_id: string
        }
        Insert: {
          consumo_rodoviario_km_l?: number | null
          consumo_urbano_km_l?: number | null
          custo_por_km?: number | null
          pedagio_medio?: number | null
          updated_at?: string
          veiculo_id: string
        }
        Update: {
          consumo_rodoviario_km_l?: number | null
          consumo_urbano_km_l?: number | null
          custo_por_km?: number | null
          pedagio_medio?: number | null
          updated_at?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculo_custo_config_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: true
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          ano: number | null
          antt_rntrc: string | null
          ativo: boolean | null
          capacidade_kg: number | null
          capacidade_m3: number | null
          carroceria: Database["public"]["Enums"]["tipo_carroceria"]
          carroceria_id_2: string | null
          carroceria_integrada: boolean | null
          comprovante_endereco_proprietario_url: string | null
          created_at: string | null
          created_by: string | null
          documento_veiculo_url: string | null
          empresa_id: number | null
          foto_url: string | null
          fotos_urls: string[] | null
          id: string
          marca: string | null
          modelo: string | null
          motorista_padrao_id: string | null
          placa: string
          proprietario_cpf_cnpj: string | null
          proprietario_nome: string | null
          rastreador: boolean | null
          renavam: string | null
          seguro_ativo: boolean | null
          tipo: Database["public"]["Enums"]["tipo_veiculo"]
          tipo_propriedade:
            | Database["public"]["Enums"]["tipo_propriedade_veiculo"]
            | null
          uf: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          ano?: number | null
          antt_rntrc?: string | null
          ativo?: boolean | null
          capacidade_kg?: number | null
          capacidade_m3?: number | null
          carroceria: Database["public"]["Enums"]["tipo_carroceria"]
          carroceria_id_2?: string | null
          carroceria_integrada?: boolean | null
          comprovante_endereco_proprietario_url?: string | null
          created_at?: string | null
          created_by?: string | null
          documento_veiculo_url?: string | null
          empresa_id?: number | null
          foto_url?: string | null
          fotos_urls?: string[] | null
          id?: string
          marca?: string | null
          modelo?: string | null
          motorista_padrao_id?: string | null
          placa: string
          proprietario_cpf_cnpj?: string | null
          proprietario_nome?: string | null
          rastreador?: boolean | null
          renavam?: string | null
          seguro_ativo?: boolean | null
          tipo: Database["public"]["Enums"]["tipo_veiculo"]
          tipo_propriedade?:
            | Database["public"]["Enums"]["tipo_propriedade_veiculo"]
            | null
          uf?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          ano?: number | null
          antt_rntrc?: string | null
          ativo?: boolean | null
          capacidade_kg?: number | null
          capacidade_m3?: number | null
          carroceria?: Database["public"]["Enums"]["tipo_carroceria"]
          carroceria_id_2?: string | null
          carroceria_integrada?: boolean | null
          comprovante_endereco_proprietario_url?: string | null
          created_at?: string | null
          created_by?: string | null
          documento_veiculo_url?: string | null
          empresa_id?: number | null
          foto_url?: string | null
          fotos_urls?: string[] | null
          id?: string
          marca?: string | null
          modelo?: string | null
          motorista_padrao_id?: string | null
          placa?: string
          proprietario_cpf_cnpj?: string | null
          proprietario_nome?: string | null
          rastreador?: boolean | null
          renavam?: string | null
          seguro_ativo?: boolean | null
          tipo?: Database["public"]["Enums"]["tipo_veiculo"]
          tipo_propriedade?:
            | Database["public"]["Enums"]["tipo_propriedade_veiculo"]
            | null
          uf?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_carroceria_id_2_fkey"
            columns: ["carroceria_id_2"]
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
          {
            foreignKeyName: "veiculos_motorista_padrao_id_fkey"
            columns: ["motorista_padrao_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
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
          viagem_id: string
        }
        Insert: {
          created_at?: string
          entrega_id: string
          id?: string
          ordem?: number
          viagem_id: string
        }
        Update: {
          created_at?: string
          entrega_id?: string
          id?: string
          ordem?: number
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
          carroceria_id: string | null
          checklist_veiculo: Json | null
          codigo: string
          created_at: string
          ended_at: string | null
          fim_em: string | null
          id: string
          inicio_em: string
          km_total: number | null
          manifesto_url: string | null
          metadata: Json | null
          motorista_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["status_viagem"]
          tempo_total_minutos: number | null
          tipo: Database["public"]["Enums"]["tipo_viagem"]
          total_distance_km: number | null
          updated_at: string
          veiculo_id: string | null
        }
        Insert: {
          carroceria_id?: string | null
          checklist_veiculo?: Json | null
          codigo: string
          created_at?: string
          ended_at?: string | null
          fim_em?: string | null
          id?: string
          inicio_em?: string
          km_total?: number | null
          manifesto_url?: string | null
          metadata?: Json | null
          motorista_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["status_viagem"]
          tempo_total_minutos?: number | null
          tipo?: Database["public"]["Enums"]["tipo_viagem"]
          total_distance_km?: number | null
          updated_at?: string
          veiculo_id?: string | null
        }
        Update: {
          carroceria_id?: string | null
          checklist_veiculo?: Json | null
          codigo?: string
          created_at?: string
          ended_at?: string | null
          fim_em?: string | null
          id?: string
          inicio_em?: string
          km_total?: number | null
          manifesto_url?: string | null
          metadata?: Json | null
          motorista_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["status_viagem"]
          tempo_total_minutos?: number | null
          tipo?: Database["public"]["Enums"]["tipo_viagem"]
          total_distance_km?: number | null
          updated_at?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "viagens_carroceria_id_fkey"
            columns: ["carroceria_id"]
            isOneToOne: false
            referencedRelation: "carrocerias"
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
      accept_carga_tx: {
        Args: {
          p_carga_id: string
          p_carroceria_id: string
          p_carrocerias_alocadas?: Json
          p_motorista_id: string
          p_peso_kg: number
          p_previsao_coleta?: string
          p_user_name: string
          p_valor_frete: number
          p_veiculo_id: string
          p_viagem_id: string
        }
        Returns: Json
      }
      create_chat_for_entrega: {
        Args: { p_entrega_id: string }
        Returns: string
      }
      create_viagem_for_carga: {
        Args: {
          p_carga_id: string
          p_motorista_id: string
          p_peso_kg: number
          p_veiculo_id: string
        }
        Returns: Json
      }
      criar_viagem_para_entregas: {
        Args: {
          p_carroceria_id: string
          p_entrega_ids: string[]
          p_motorista_id: string
          p_veiculo_id: string
        }
        Returns: string
      }
      finalizar_entrega_e_verificar_viagem: {
        Args: {
          p_documento_recebedor?: string
          p_entrega_id: string
          p_nome_recebedor?: string
          p_observacoes?: string
        }
        Returns: Json
      }
      finalizar_viagem: { Args: { p_viagem_id: string }; Returns: undefined }
      generate_tracking_code: { Args: never; Returns: string }
      get_admin_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["admin_role"]
      }
      get_public_tracking_info: {
        Args: { _tracking_code: string }
        Returns: Json
      }
      get_user_empresa_id: { Args: { _user_id: string }; Returns: number }
      get_user_empresa_tipo: { Args: { _user_id: string }; Returns: string }
      get_user_filial_ids: { Args: { _user_id: string }; Returns: number[] }
      get_user_motorista_id: { Args: { p_user_id: string }; Returns: string }
      get_viagem_ativa: { Args: { p_motorista_id: string }; Returns: string }
      has_admin_role: {
        Args: {
          _role: Database["public"]["Enums"]["admin_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_chat_participant: {
        Args: { p_chat_id: string; p_user_id: string }
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
      admin_role: "super_admin" | "admin" | "suporte"
      app_role: "admin" | "embarcador" | "transportadora" | "motorista"
      categoria_chamado:
        | "suporte_tecnico"
        | "financeiro"
        | "operacional"
        | "reclamacao"
        | "sugestao"
        | "outros"
      classe_empresa: "INDÚSTRIA" | "LOJA" | "COMÉRCIO"
      forma_pagamento:
        | "a_vista"
        | "faturado_7"
        | "faturado_14"
        | "faturado_21"
        | "faturado_30"
      prioridade_chamado: "baixa" | "media" | "alta" | "urgente"
      status_carga:
        | "publicada"
        | "parcialmente_alocada"
        | "totalmente_alocada"
        | "parcialmente_finalizada"
      status_chamado:
        | "aberto"
        | "em_andamento"
        | "aguardando_resposta"
        | "resolvido"
        | "fechado"
      status_entrega:
        | "aguardando"
        | "saiu_para_coleta"
        | "em_transito"
        | "saiu_para_entrega"
        | "entregue"
        | "problema"
        | "cancelada"
      status_fatura: "aberta" | "fechada" | "paga" | "cancelada"
      status_pre_cadastro: "pendente" | "aprovado" | "rejeitado"
      status_viagem:
        | "em_andamento"
        | "finalizada"
        | "cancelada"
        | "programada"
        | "concluida"
        | "aguardando"
      tipo_cadastro_motorista: "autonomo" | "frota" | "terceirizado"
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
        | "graneleiro"
        | "grade_baixa"
        | "cacamba"
        | "plataforma"
        | "bau"
        | "bau_frigorifico"
        | "bau_refrigerado"
        | "silo"
        | "gaiola"
        | "bug_porta_container"
        | "munk"
        | "apenas_cavalo"
        | "cavaqueira"
        | "hopper"
      tipo_empresa: "EMBARCADOR" | "TRANSPORTADORA"
      tipo_endereco: "origem" | "destino"
      tipo_fatura: "a_receber" | "a_pagar"
      tipo_frete: "cif" | "fob"
      tipo_notificacao:
        | "status_entrega_alterado"
        | "nova_mensagem"
        | "motorista_adicionado"
        | "carga_publicada"
        | "entrega_aceita"
        | "entrega_concluida"
        | "cte_anexado"
      tipo_precificacao: "por_tonelada" | "por_m3" | "fixo" | "por_km"
      tipo_propriedade_veiculo: "pf" | "pj"
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
        | "bitruck"
      tipo_viagem: "urbano" | "rodovia"
      user_ai: "ai" | "user"
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
      admin_role: ["super_admin", "admin", "suporte"],
      app_role: ["admin", "embarcador", "transportadora", "motorista"],
      categoria_chamado: [
        "suporte_tecnico",
        "financeiro",
        "operacional",
        "reclamacao",
        "sugestao",
        "outros",
      ],
      classe_empresa: ["INDÚSTRIA", "LOJA", "COMÉRCIO"],
      forma_pagamento: [
        "a_vista",
        "faturado_7",
        "faturado_14",
        "faturado_21",
        "faturado_30",
      ],
      prioridade_chamado: ["baixa", "media", "alta", "urgente"],
      status_carga: [
        "publicada",
        "parcialmente_alocada",
        "totalmente_alocada",
        "parcialmente_finalizada",
      ],
      status_chamado: [
        "aberto",
        "em_andamento",
        "aguardando_resposta",
        "resolvido",
        "fechado",
      ],
      status_entrega: [
        "aguardando",
        "saiu_para_coleta",
        "em_transito",
        "saiu_para_entrega",
        "entregue",
        "problema",
        "cancelada",
      ],
      status_fatura: ["aberta", "fechada", "paga", "cancelada"],
      status_pre_cadastro: ["pendente", "aprovado", "rejeitado"],
      status_viagem: [
        "em_andamento",
        "finalizada",
        "cancelada",
        "programada",
        "concluida",
        "aguardando",
      ],
      tipo_cadastro_motorista: ["autonomo", "frota", "terceirizado"],
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
        "graneleiro",
        "grade_baixa",
        "cacamba",
        "plataforma",
        "bau",
        "bau_frigorifico",
        "bau_refrigerado",
        "silo",
        "gaiola",
        "bug_porta_container",
        "munk",
        "apenas_cavalo",
        "cavaqueira",
        "hopper",
      ],
      tipo_empresa: ["EMBARCADOR", "TRANSPORTADORA"],
      tipo_endereco: ["origem", "destino"],
      tipo_fatura: ["a_receber", "a_pagar"],
      tipo_frete: ["cif", "fob"],
      tipo_notificacao: [
        "status_entrega_alterado",
        "nova_mensagem",
        "motorista_adicionado",
        "carga_publicada",
        "entrega_aceita",
        "entrega_concluida",
        "cte_anexado",
      ],
      tipo_precificacao: ["por_tonelada", "por_m3", "fixo", "por_km"],
      tipo_propriedade_veiculo: ["pf", "pj"],
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
        "bitruck",
      ],
      tipo_viagem: ["urbano", "rodovia"],
      user_ai: ["ai", "user"],
      usuario_cargo: ["ADMIN", "OPERADOR"],
    },
  },
} as const
