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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      doctor_hospitals: {
        Row: {
          doctor_id: string
          hospital_id: string
        }
        Insert: {
          doctor_id: string
          hospital_id: string
        }
        Update: {
          doctor_id?: string
          hospital_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_hospitals_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_profiles: {
        Row: {
          accepts_urgent: boolean
          available: boolean
          created_at: string
          crm: string
          crm_state: string
          crm_verified: boolean
          has_rqe: boolean
          hourly_rate: number | null
          updated_at: string
          user_id: string
          years_experience: number
        }
        Insert: {
          accepts_urgent?: boolean
          available?: boolean
          created_at?: string
          crm: string
          crm_state: string
          crm_verified?: boolean
          has_rqe?: boolean
          hourly_rate?: number | null
          updated_at?: string
          user_id: string
          years_experience?: number
        }
        Update: {
          accepts_urgent?: boolean
          available?: boolean
          created_at?: string
          crm?: string
          crm_state?: string
          crm_verified?: boolean
          has_rqe?: boolean
          hourly_rate?: number | null
          updated_at?: string
          user_id?: string
          years_experience?: number
        }
        Relationships: []
      }
      doctor_specialties: {
        Row: {
          doctor_id: string
          specialty_id: string
        }
        Insert: {
          doctor_id: string
          specialty_id: string
        }
        Update: {
          doctor_id?: string
          specialty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_specialties_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          note: string | null
          scheduler_id: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          note?: string | null
          scheduler_id: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          note?: string | null
          scheduler_id?: string
        }
        Relationships: []
      }
      hospitals: {
        Row: {
          address: string | null
          city: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          phone: string | null
          state: string
          status: string
          type: string
          verified: boolean
          website: string | null
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          phone?: string | null
          state: string
          status?: string
          type?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          phone?: string | null
          state?: string
          status?: string
          type?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
          shift_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
          shift_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          shift_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          email_notifications_enabled: boolean
          full_name: string
          id: string
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          email_notifications_enabled?: boolean
          full_name?: string
          id: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          email_notifications_enabled?: boolean
          full_name?: string
          id?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          doctor_id: string
          hospital_id: string | null
          id: string
          punctuality: number | null
          rating: number
          relationship: number | null
          reviewer_id: string
          technical: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          doctor_id: string
          hospital_id?: string | null
          id?: string
          punctuality?: number | null
          rating: number
          relationship?: number | null
          reviewer_id: string
          technical?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          doctor_id?: string
          hospital_id?: string | null
          id?: string
          punctuality?: number | null
          rating?: number
          relationship?: number | null
          reviewer_id?: string
          technical?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_profiles: {
        Row: {
          created_at: string
          hospital_id: string | null
          job_title: string | null
          organization: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hospital_id?: string | null
          job_title?: string | null
          organization: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hospital_id?: string | null
          job_title?: string | null
          organization?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_profiles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_applications: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          message: string | null
          payment_status: string
          shift_id: string
          status: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          message?: string | null
          payment_status?: string
          shift_id: string
          status?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          message?: string | null
          payment_status?: string
          shift_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_applications_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_invites: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          message: string | null
          scheduler_id: string
          shift_id: string
          status: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          message?: string | null
          scheduler_id: string
          shift_id: string
          status?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          message?: string | null
          scheduler_id?: string
          shift_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_invites_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          created_by: string
          end_time: string
          hospital_id: string
          id: string
          is_urgent: boolean
          notes: string | null
          payment: number | null
          shift_date: string
          slots: number
          specialty_id: string | null
          start_time: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_time?: string
          hospital_id: string
          id?: string
          is_urgent?: boolean
          notes?: string | null
          payment?: number | null
          shift_date: string
          slots?: number
          specialty_id?: string | null
          start_time?: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_time?: string
          hospital_id?: string
          id?: string
          is_urgent?: boolean
          notes?: string | null
          payment?: number | null
          shift_date?: string
          slots?: number
          specialty_id?: string | null
          start_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      specialties: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
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
      verification_requests: {
        Row: {
          created_at: string
          doctor_id: string
          document_path: string
          id: string
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_note: string | null
          selfie_path: string
          status: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          document_path: string
          id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          selfie_path: string
          status?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          document_path?: string
          id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          selfie_path?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_own_account: { Args: never; Returns: undefined }
      get_doctor_reliability: {
        Args: { _doctor_id: string }
        Returns: {
          accepted_invites: number
          answered_invites: number
          total_invites: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_doctor_locations: {
        Args: never
        Returns: {
          city: string
          state: string
        }[]
      }
      notify_user: {
        Args: {
          _body: string
          _link: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      search_doctors: {
        Args: {
          _city?: string
          _limit?: number
          _max_rate?: number
          _min_rating?: number
          _min_years?: number
          _offset?: number
          _only_available?: boolean
          _only_rqe?: boolean
          _only_urgent?: boolean
          _sort?: string
          _specialty_id?: string
          _state?: string
          _term?: string
        }
        Returns: {
          accepts_urgent: boolean
          available: boolean
          avatar_url: string
          city: string
          crm: string
          crm_state: string
          full_name: string
          has_rqe: boolean
          hourly_rate: number
          rating_avg: number
          rating_count: number
          specialty_names: string[]
          state: string
          total_count: number
          user_id: string
          years_experience: number
        }[]
      }
    }
    Enums: {
      app_role: "medico" | "escalista" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["medico", "escalista", "admin"],
    },
  },
} as const
