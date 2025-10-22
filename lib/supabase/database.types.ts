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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      game_sessions: {
        Row: {
          answerer_id: string | null
          created_at: string
          deadline_epoch: number | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id: string
          prev_master_id: string | null
          room_id: string
          start_time: string
        }
        Insert: {
          answerer_id?: string | null
          created_at?: string
          deadline_epoch?: number | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          prev_master_id?: string | null
          room_id: string
          start_time?: string
        }
        Update: {
          answerer_id?: string | null
          created_at?: string
          deadline_epoch?: number | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          prev_master_id?: string | null
          room_id?: string
          start_time?: string
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
          confirmed: boolean
          id: string
          is_connected: boolean
          is_host: boolean
          joined_at: string
          last_heartbeat: string
          nickname: string
          room_id: string
          user_id: string | null
        }
        Insert: {
          confirmed?: boolean
          id?: string
          is_connected?: boolean
          is_host?: boolean
          joined_at?: string
          last_heartbeat?: string
          nickname: string
          room_id: string
          user_id?: string | null
        }
        Update: {
          confirmed?: boolean
          id?: string
          is_connected?: boolean
          is_host?: boolean
          joined_at?: string
          last_heartbeat?: string
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
          created_at: string
          outcome: Database["public"]["Enums"]["game_outcome"]
          revealed_player_id: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          outcome: Database["public"]["Enums"]["game_outcome"]
          revealed_player_id?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          outcome?: Database["public"]["Enums"]["game_outcome"]
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
            isOneToOne: true
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          assigned_at: string
          player_id: string
          role: Database["public"]["Enums"]["player_role"]
          session_id: string
        }
        Insert: {
          assigned_at?: string
          player_id: string
          role: Database["public"]["Enums"]["player_role"]
          session_id: string
        }
        Update: {
          assigned_at?: string
          player_id?: string
          role?: Database["public"]["Enums"]["player_role"]
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
          created_at: string
          host_id: string | null
          id: string
          is_suspended: boolean
          passphrase_hash: string
          passphrase_lookup_hash: string | null
          phase: Database["public"]["Enums"]["game_phase"]
          suspended_state: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          host_id?: string | null
          id?: string
          is_suspended?: boolean
          passphrase_hash: string
          passphrase_lookup_hash?: string | null
          phase?: Database["public"]["Enums"]["game_phase"]
          suspended_state?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          host_id?: string | null
          id?: string
          is_suspended?: boolean
          passphrase_hash?: string
          passphrase_lookup_hash?: string | null
          phase?: Database["public"]["Enums"]["game_phase"]
          suspended_state?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          session_id: string
          topic_text: string
        }
        Insert: {
          created_at?: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          session_id: string
          topic_text: string
        }
        Update: {
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          session_id?: string
          topic_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          id: string
          player_id: string
          round: number
          session_id: string
          vote_type: Database["public"]["Enums"]["vote_type"]
          vote_value: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          round?: number
          session_id: string
          vote_type: Database["public"]["Enums"]["vote_type"]
          vote_value: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          round?: number
          session_id?: string
          vote_type?: Database["public"]["Enums"]["vote_type"]
          vote_value?: string
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
      assign_roles: { Args: { p_session_id: string }; Returns: undefined }
      calc_vote_result: {
        Args: {
          p_round?: number
          p_session_id: string
          p_vote_type: Database["public"]["Enums"]["vote_type"]
        }
        Returns: {
          rank: number
          vote_count: number
          vote_value: string
        }[]
      }
      can_see_topic: { Args: { p_session_id: string }; Returns: boolean }
      ensure_unique_nickname: {
        Args: { p_nickname: string; p_room_id: string }
        Returns: string
      }
      get_my_role: {
        Args: { p_session_id: string }
        Returns: Database["public"]["Enums"]["player_role"]
      }
      get_remaining_seconds: { Args: { p_session_id: string }; Returns: number }
      transition_phase: {
        Args: {
          p_deadline_seconds?: number
          p_new_phase: Database["public"]["Enums"]["game_phase"]
          p_room_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      difficulty_level: "Easy" | "Normal" | "Hard"
      game_outcome: "CITIZENS_WIN" | "INSIDER_WIN" | "ALL_LOSE"
      game_phase:
        | "LOBBY"
        | "DEAL"
        | "TOPIC"
        | "QUESTION"
        | "DEBATE"
        | "VOTE1"
        | "VOTE2"
        | "RESULT"
      player_role: "MASTER" | "INSIDER" | "CITIZEN"
      vote_type: "VOTE1" | "VOTE2" | "RUNOFF"
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
      difficulty_level: ["Easy", "Normal", "Hard"],
      game_outcome: ["CITIZENS_WIN", "INSIDER_WIN", "ALL_LOSE"],
      game_phase: [
        "LOBBY",
        "DEAL",
        "TOPIC",
        "QUESTION",
        "DEBATE",
        "VOTE1",
        "VOTE2",
        "RESULT",
      ],
      player_role: ["MASTER", "INSIDER", "CITIZEN"],
      vote_type: ["VOTE1", "VOTE2", "RUNOFF"],
    },
  },
} as const
