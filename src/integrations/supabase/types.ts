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
      blocked_slots: {
        Row: {
          blocked_date: string
          created_at: string
          end_time: string
          id: string
          professional_id: string
          reason: string | null
          start_time: string
        }
        Insert: {
          blocked_date: string
          created_at?: string
          end_time: string
          id?: string
          professional_id: string
          reason?: string | null
          start_time: string
        }
        Update: {
          blocked_date?: string
          created_at?: string
          end_time?: string
          id?: string
          professional_id?: string
          reason?: string | null
          start_time?: string
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          created_at: string
          id: string
          payment_reminder_enabled: boolean | null
          payment_reminder_template: string | null
          professional_id: string
          reminder_days_before: number | null
          reminder_enabled: boolean | null
          session_reminder_template: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_reminder_enabled?: boolean | null
          payment_reminder_template?: string | null
          professional_id: string
          reminder_days_before?: number | null
          reminder_enabled?: boolean | null
          session_reminder_template?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_reminder_enabled?: boolean | null
          payment_reminder_template?: string | null
          professional_id?: string
          reminder_days_before?: number | null
          reminder_enabled?: boolean | null
          session_reminder_template?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"] | null
          created_at: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          professional_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"] | null
          created_at?: string
          description: string
          expense_date: string
          id?: string
          notes?: string | null
          professional_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"] | null
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          professional_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      google_calendar_events: {
        Row: {
          color_id: string | null
          created_at: string
          description: string | null
          end_time: string
          event_type: string | null
          google_event_id: string
          id: string
          is_all_day: boolean | null
          professional_id: string
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          color_id?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          event_type?: string | null
          google_event_id: string
          id?: string
          is_all_day?: boolean | null
          professional_id: string
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          color_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          event_type?: string | null
          google_event_id?: string
          id?: string
          is_all_day?: boolean | null
          professional_id?: string
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          professional_id: string
          refresh_token: string
          sync_enabled: boolean
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          professional_id: string
          refresh_token: string
          sync_enabled?: boolean
          token_expires_at: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          professional_id?: string
          refresh_token?: string
          sync_enabled?: boolean
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_records: {
        Row: {
          ai_summary: string | null
          audio_transcription: string | null
          content: string | null
          created_at: string
          id: string
          patient_id: string
          professional_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          audio_transcription?: string | null
          content?: string | null
          created_at?: string
          id?: string
          patient_id: string
          professional_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          audio_transcription?: string | null
          content?: string | null
          created_at?: string
          id?: string
          patient_id?: string
          professional_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          patient_id: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          patient_id?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          patient_id?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_invites: {
        Row: {
          created_at: string
          email: string | null
          expires_at: string
          id: string
          patient_id: string | null
          professional_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          patient_id?: string | null
          professional_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          patient_id?: string | null
          professional_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_invites_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          birth_date: string | null
          city: string | null
          clinical_notes: string | null
          cpf: string | null
          created_at: string
          email: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          professional_id: string
          session_price: number | null
          state: string | null
          updated_at: string
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          clinical_notes?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          professional_id: string
          session_price?: number | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          clinical_notes?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          professional_id?: string
          session_price?: number | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      professional_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          professional_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          professional_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          professional_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          crp: string | null
          email: string
          full_name: string
          id: string
          language: string | null
          phone: string | null
          session_duration: number | null
          session_price: number | null
          specialty: string | null
          state: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          crp?: string | null
          email: string
          full_name: string
          id?: string
          language?: string | null
          phone?: string | null
          session_duration?: number | null
          session_price?: number | null
          specialty?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          crp?: string | null
          email?: string
          full_name?: string
          id?: string
          language?: string | null
          phone?: string | null
          session_duration?: number | null
          session_price?: number | null
          specialty?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          duration: number | null
          google_event_id: string | null
          id: string
          is_recurring: boolean | null
          meet_link: string | null
          notes: string | null
          paid_at: string | null
          patient_id: string
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          price: number
          professional_id: string
          recurrence_rule: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["session_status"] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          google_event_id?: string | null
          id?: string
          is_recurring?: boolean | null
          meet_link?: string | null
          notes?: string | null
          paid_at?: string | null
          patient_id: string
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          price: number
          professional_id: string
          recurrence_rule?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["session_status"] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          google_event_id?: string | null
          id?: string
          is_recurring?: boolean | null
          meet_link?: string | null
          notes?: string | null
          paid_at?: string | null
          patient_id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          price?: number
          professional_id?: string
          recurrence_rule?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["session_status"] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      app_role: "professional" | "patient"
      expense_category:
        | "rent"
        | "utilities"
        | "supplies"
        | "software"
        | "marketing"
        | "education"
        | "other"
      payment_status: "pending" | "paid" | "overdue" | "cancelled"
      session_status: "scheduled" | "completed" | "cancelled" | "no_show"
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
      app_role: ["professional", "patient"],
      expense_category: [
        "rent",
        "utilities",
        "supplies",
        "software",
        "marketing",
        "education",
        "other",
      ],
      payment_status: ["pending", "paid", "overdue", "cancelled"],
      session_status: ["scheduled", "completed", "cancelled", "no_show"],
    },
  },
} as const
