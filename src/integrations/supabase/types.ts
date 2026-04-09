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
      pedidos: {
        Row: {
          bairro: string | null
          cedula: string
          cep: string | null
          cidade: string
          codigo_rastreamento: string
          complemento: string | null
          comprovante_url: string | null
          conta_shopee: string
          created_at: string
          criativo: string | null
          data_entrada: string
          data_envio: string | null
          data_pagamento: string | null
          departamento: string
          email: string | null
          etiqueta_envio_url: string | null
          forma_pagamento: string
          hora_pagamento: string | null
          id: string
          nome: string
          numero: string | null
          observacoes: string
          pais: string
          plataforma: string
          produto: string
          quantidade: number
          rua: string | null
          status_cobranca: string
          status_envio: string
          status_pagamento: string
          telefone: string
          updated_at: string
          user_id: string
          valor: number
          valor_frete: number
          vendedor: string | null
          wpp_cobranca: string
        }
        Insert: {
          bairro?: string | null
          cedula?: string
          cep?: string | null
          cidade?: string
          codigo_rastreamento?: string
          complemento?: string | null
          comprovante_url?: string | null
          conta_shopee?: string
          created_at?: string
          criativo?: string | null
          data_entrada?: string
          data_envio?: string | null
          data_pagamento?: string | null
          departamento?: string
          email?: string | null
          etiqueta_envio_url?: string | null
          forma_pagamento?: string
          hora_pagamento?: string | null
          id?: string
          nome: string
          numero?: string | null
          observacoes?: string
          pais?: string
          plataforma?: string
          produto?: string
          quantidade?: number
          rua?: string | null
          status_cobranca?: string
          status_envio?: string
          status_pagamento?: string
          telefone?: string
          updated_at?: string
          user_id: string
          valor?: number
          valor_frete?: number
          vendedor?: string | null
          wpp_cobranca?: string
        }
        Update: {
          bairro?: string | null
          cedula?: string
          cep?: string | null
          cidade?: string
          codigo_rastreamento?: string
          complemento?: string | null
          comprovante_url?: string | null
          conta_shopee?: string
          created_at?: string
          criativo?: string | null
          data_entrada?: string
          data_envio?: string | null
          data_pagamento?: string | null
          departamento?: string
          email?: string | null
          etiqueta_envio_url?: string | null
          forma_pagamento?: string
          hora_pagamento?: string | null
          id?: string
          nome?: string
          numero?: string | null
          observacoes?: string
          pais?: string
          plataforma?: string
          produto?: string
          quantidade?: number
          rua?: string | null
          status_cobranca?: string
          status_envio?: string
          status_pagamento?: string
          telefone?: string
          updated_at?: string
          user_id?: string
          valor?: number
          valor_frete?: number
          vendedor?: string | null
          wpp_cobranca?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country_lock: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          country_lock?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          country_lock?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saques: {
        Row: {
          comprovante_url: string | null
          created_at: string
          data_pagamento: string | null
          data_solicitacao: string
          id: string
          observacoes: string | null
          status: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_solicitacao?: string
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_solicitacao?: string
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_config: {
        Row: {
          attendance_webhook_active: boolean
          attendance_webhook_url: string
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
          webhook_url: string
        }
        Insert: {
          attendance_webhook_active?: boolean
          attendance_webhook_url?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
          webhook_url?: string
        }
        Update: {
          attendance_webhook_active?: boolean
          attendance_webhook_url?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
          webhook_url?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          matched_by: string | null
          payload: Json
          pedido_id: string | null
          pedido_nome: string | null
          status_mapeado: string | null
          status_recebido: string
          success: boolean
          user_id: string | null
          webhook_type: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          matched_by?: string | null
          payload?: Json
          pedido_id?: string | null
          pedido_nome?: string | null
          status_mapeado?: string | null
          status_recebido: string
          success?: boolean
          user_id?: string | null
          webhook_type?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          matched_by?: string | null
          payload?: Json
          pedido_id?: string | null
          pedido_nome?: string | null
          status_mapeado?: string | null
          status_recebido?: string
          success?: boolean
          user_id?: string | null
          webhook_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "afiliado"
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
      app_role: ["admin", "afiliado"],
    },
  },
} as const
