export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      course_generation_requests: {
        Row: {
          course_title: string
          created_at: string | null
          created_by: string | null
          goal: string
          language: string
          request_id: string
          style: string
          topic: string
        }
        Insert: {
          course_title: string
          created_at?: string | null
          created_by?: string | null
          goal: string
          language: string
          request_id?: string
          style: string
          topic: string
        }
        Update: {
          course_title?: string
          created_at?: string | null
          created_by?: string | null
          goal?: string
          language?: string
          request_id?: string
          style?: string
          topic?: string
        }
        Relationships: []
      }
      course_progress: {
        Row: {
          completed_at: string | null
          course_id: string | null
          course_name: string | null
          created_at: string | null
          current_day: number | null
          day1_module1: boolean | null
          day1_module2: boolean | null
          day1_module3: boolean | null
          day2_module1: boolean | null
          day2_module2: boolean | null
          day2_module3: boolean | null
          day3_module1: boolean | null
          day3_module2: boolean | null
          day3_module3: boolean | null
          feedback: string | null
          id: string
          is_active: boolean | null
          last_module_completed_at: string | null
          last_reminder_sent_at: string | null
          learner_id: string | null
          learner_name: string | null
          notes: string | null
          phone_number: string | null
          progress_percent: number | null
          reminder_count: number | null
          reminder_count_day1: number | null
          reminder_count_day2: number | null
          reminder_count_day3: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          course_name?: string | null
          created_at?: string | null
          current_day?: number | null
          day1_module1?: boolean | null
          day1_module2?: boolean | null
          day1_module3?: boolean | null
          day2_module1?: boolean | null
          day2_module2?: boolean | null
          day2_module3?: boolean | null
          day3_module1?: boolean | null
          day3_module2?: boolean | null
          day3_module3?: boolean | null
          feedback?: string | null
          id?: string
          is_active?: boolean | null
          last_module_completed_at?: string | null
          last_reminder_sent_at?: string | null
          learner_id?: string | null
          learner_name?: string | null
          notes?: string | null
          phone_number?: string | null
          progress_percent?: number | null
          reminder_count?: number | null
          reminder_count_day1?: number | null
          reminder_count_day2?: number | null
          reminder_count_day3?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          course_name?: string | null
          created_at?: string | null
          current_day?: number | null
          day1_module1?: boolean | null
          day1_module2?: boolean | null
          day1_module3?: boolean | null
          day2_module1?: boolean | null
          day2_module2?: boolean | null
          day2_module3?: boolean | null
          day3_module1?: boolean | null
          day3_module2?: boolean | null
          day3_module3?: boolean | null
          feedback?: string | null
          id?: string
          is_active?: boolean | null
          last_module_completed_at?: string | null
          last_reminder_sent_at?: string | null
          learner_id?: string | null
          learner_name?: string | null
          notes?: string | null
          phone_number?: string | null
          progress_percent?: number | null
          reminder_count?: number | null
          reminder_count_day1?: number | null
          reminder_count_day2?: number | null
          reminder_count_day3?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          course_name: string
          created_at: string
          created_by: string
          day: number
          id: string
          module_1: string | null
          module_2: string | null
          module_3: string | null
          origin: string
          request_id: string | null
          status: string
          updated_at: string
          visibility: string
        }
        Insert: {
          course_name: string
          created_at?: string
          created_by: string
          day?: number
          id?: string
          module_1?: string | null
          module_2?: string | null
          module_3?: string | null
          origin?: string
          request_id?: string | null
          status?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          course_name?: string
          created_at?: string
          created_by?: string
          day?: number
          id?: string
          module_1?: string | null
          module_2?: string | null
          module_3?: string | null
          origin?: string
          request_id?: string | null
          status?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      learners: {
        Row: {
          assigned_course_id: string | null
          created_at: string
          created_by: string
          email: string
          id: string
          name: string
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_course_id?: string | null
          created_at?: string
          created_by: string
          email: string
          id?: string
          name: string
          phone: string
          status: string
          updated_at?: string
        }
        Update: {
          assigned_course_id?: string | null
          created_at?: string
          created_by?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learners_assigned_course_id_fkey"
            columns: ["assigned_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learners_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages_sent: {
        Row: {
          created_at: string | null
          id: string
          learner_id: string | null
          message_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          learner_id?: string | null
          message_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          learner_id?: string | null
          message_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sent_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_requests: {
        Row: {
          approval_status: string | null
          created_at: string | null
          generated: boolean
          goal: string
          language: string
          name: string
          number: string
          request_id: string
          style: string
          topic: string
        }
        Insert: {
          approval_status?: string | null
          created_at?: string | null
          generated?: boolean
          goal: string
          language: string
          name: string
          number: string
          request_id?: string
          style: string
          topic: string
        }
        Update: {
          approval_status?: string | null
          created_at?: string | null
          generated?: boolean
          goal?: string
          language?: string
          name?: string
          number?: string
          request_id?: string
          style?: string
          topic?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          course_id: string | null
          created_at: string
          day_completed: number | null
          email: string
          id: string
          interactive_responses: string | null
          last_msg: string | null
          module_completed: number | null
          name: string
          next_day: number | null
          next_module: number | null
          phone: string | null
          question_responses: string | null
          responses: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          course_id?: string | null
          created_at?: string
          day_completed?: number | null
          email: string
          id?: string
          interactive_responses?: string | null
          last_msg?: string | null
          module_completed?: number | null
          name: string
          next_day?: number | null
          next_module?: number | null
          phone?: string | null
          question_responses?: string | null
          responses?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          course_id?: string | null
          created_at?: string
          day_completed?: number | null
          email?: string
          id?: string
          interactive_responses?: string | null
          last_msg?: string | null
          module_completed?: number | null
          name?: string
          next_day?: number | null
          next_module?: number | null
          phone?: string | null
          question_responses?: string | null
          responses?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      send_scheduled_messages: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
