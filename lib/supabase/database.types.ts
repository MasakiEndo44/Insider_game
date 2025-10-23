export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      game_sessions: {
        Row: {
          answerer_id: string | null
          created_at: string | null
          deadline_epoch: number | null
          difficulty: string
          id: string
          phase: string
          prev_master_id: string | null
          room_id: string
          start_time: string | null
        }
        Insert: {
          answerer_id?: string | null
          created_at?: string | null
          deadline_epoch?: number | null
          difficulty: string
          id?: string
          phase: string
          prev_master_id?: string | null
          room_id: string
          start_time?: string | null
        }
        Update: {
          answerer_id?: string | null
          created_at?: string | null
          deadline_epoch?: number | null
          difficulty?: string
          id?: string
          phase?: string
          prev_master_id?: string | null
          room_id?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_answerer_id_fkey"
            columns: ["answerer_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_prev_master_id_fkey"
            columns: ["prev_master_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      master_topics: {
        Row: {
          category: string | null
          created_at: string | null
          difficulty: string
          id: string
          topic_text: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          difficulty: string
          id?: string
          topic_text: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          difficulty?: string
          id?: string
          topic_text?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          confirmed: boolean | null
          id: string
          is_connected: boolean | null
          is_host: boolean | null
          joined_at: string | null
          last_heartbeat: string | null
          nickname: string
          room_id: string
          user_id: string | null
        }
        Insert: {
          confirmed?: boolean | null
          id?: string
          is_connected?: boolean | null
          is_host?: boolean | null
          joined_at?: string | null
          last_heartbeat?: string | null
          nickname: string
          room_id: string
          user_id?: string | null
        }
        Update: {
          confirmed?: boolean | null
          id?: string
          is_connected?: boolean | null
          is_host?: boolean | null
          joined_at?: string | null
          last_heartbeat?: string | null
          nickname?: string
          room_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          created_at: string | null
          id: string
          outcome: string
          revealed_player_id: string | null
          session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          outcome: string
          revealed_player_id?: string | null
          session_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          outcome?: string
          revealed_player_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_revealed_player_id_fkey"
            columns: ["revealed_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          id: string
          player_id: string
          role: string
          session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          player_id: string
          role: string
          session_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          player_id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string | null
          host_id: string | null
          id: string
          is_suspended: boolean | null
          passphrase_hash: string
          passphrase_lookup_hash: string | null
          phase: string
          suspended_state: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          host_id?: string | null
          id?: string
          is_suspended?: boolean | null
          passphrase_hash: string
          passphrase_lookup_hash?: string | null
          phase?: string
          suspended_state?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          host_id?: string | null
          id?: string
          is_suspended?: boolean | null
          passphrase_hash?: string
          passphrase_lookup_hash?: string | null
          phase?: string
          suspended_state?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_rooms_host"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string | null
          difficulty: string
          id: string
          session_id: string
          topic_text: string
        }
        Insert: {
          created_at?: string | null
          difficulty: string
          id?: string
          session_id: string
          topic_text: string
        }
        Update: {
          created_at?: string | null
          difficulty?: string
          id?: string
          session_id?: string
          topic_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      used_topics: {
        Row: {
          session_id: string
          topic_id: string
        }
        Insert: {
          session_id: string
          topic_id: string
        }
        Update: {
          session_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "used_topics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string | null
          id: string
          player_id: string
          round: number | null
          session_id: string
          vote_type: string
          vote_value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          player_id: string
          round?: number | null
          session_id: string
          vote_type: string
          vote_value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          player_id?: string
          round?: number | null
          session_id?: string
          vote_type?: string
          vote_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_stale_rooms: {
        Args: never
        Returns: {
          deleted_count: number
          deleted_room_ids: string[]
        }[]
      }
      get_server_time: { Args: never; Returns: number }
      manual_room_cleanup: {
        Args: { room_id_to_delete?: string }
        Returns: {
          message: string
          success: boolean
        }[]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

