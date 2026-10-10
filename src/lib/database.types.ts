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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          card_id: string | null
          created_at: string
          details: Json
          id: number
          link_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          card_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          link_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          card_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          link_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "card_links"
            referencedColumns: ["id"]
          },
        ]
      }
      card_filters: {
        Row: {
          card_id: string
          filter_id: string
        }
        Insert: {
          card_id: string
          filter_id: string
        }
        Update: {
          card_id?: string
          filter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_filters_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_filters_filter_id_fkey"
            columns: ["filter_id"]
            isOneToOne: false
            referencedRelation: "filters"
            referencedColumns: ["id"]
          },
        ]
      }
      card_links: {
        Row: {
          card_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["link_kind"]
          label: string
          sort_order: number
          url: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["link_kind"]
          label: string
          sort_order?: number
          url: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["link_kind"]
          label?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_links_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          filter_text: string
          has_downloads: boolean
          has_project_files: boolean
          id: string
          loom_url: string | null
          preview_end: number | null
          preview_start: number
          published_at: string | null
          search_tsv: unknown
          section_id: string
          slug: string
          sort_order: number
          source_url: string | null
          status: Database["public"]["Enums"]["card_status"]
          title: string
          updated_at: string
          youtube_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          filter_text?: string
          has_downloads?: boolean
          has_project_files?: boolean
          id?: string
          loom_url?: string | null
          preview_end?: number | null
          preview_start?: number
          published_at?: string | null
          search_tsv?: unknown
          section_id: string
          slug: string
          sort_order?: number
          source_url?: string | null
          status?: Database["public"]["Enums"]["card_status"]
          title: string
          updated_at?: string
          youtube_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          filter_text?: string
          has_downloads?: boolean
          has_project_files?: boolean
          id?: string
          loom_url?: string | null
          preview_end?: number | null
          preview_start?: number
          published_at?: string | null
          search_tsv?: unknown
          section_id?: string
          slug?: string
          sort_order?: number
          source_url?: string | null
          status?: Database["public"]["Enums"]["card_status"]
          title?: string
          updated_at?: string
          youtube_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      filter_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      filters: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_quick: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_quick?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_quick?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "filters_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "filter_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          all_access: boolean
          created_at: string
          display_name: string
          email: string
          expires_at: string | null
          id: string
          is_active: boolean
          must_change_password: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          all_access?: boolean
          created_at?: string
          display_name?: string
          email: string
          expires_at?: string | null
          id: string
          is_active?: boolean
          must_change_password?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          all_access?: boolean
          created_at?: string
          display_name?: string
          email?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          kind: Database["public"]["Enums"]["section_kind"]
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          kind: Database["public"]["Enums"]["section_kind"]
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          kind?: Database["public"]["Enums"]["section_kind"]
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      user_filter_access: {
        Row: {
          filter_id: string
          user_id: string
        }
        Insert: {
          filter_id: string
          user_id: string
        }
        Update: {
          filter_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_filter_access_filter_id_fkey"
            columns: ["filter_id"]
            isOneToOne: false
            referencedRelation: "filters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_filter_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_card_links: {
        Args: { p_card: string }
        Returns: {
          id: string
          kind: Database["public"]["Enums"]["link_kind"]
          label: string
          sort_order: number
          url: string
        }[]
      }
      admin_link_open_counts: {
        Args: never
        Returns: {
          card_id: string
          last_opened: string
          opens: number
        }[]
      }
      admin_merge_filters: {
        Args: { p_from: string; p_into: string }
        Returns: undefined
      }
      admin_reorder: {
        Args: { p_ids: string[]; p_kind: string }
        Returns: undefined
      }
      admin_save_card_links: {
        Args: { p_card: string; p_links: Json }
        Returns: undefined
      }
      admin_set_card_filters: {
        Args: { p_card: string; p_filters: string[] }
        Returns: undefined
      }
      browse_cards: {
        Args: {
          p_after_id?: string
          p_after_num?: number
          p_after_ts?: string
          p_filters?: string[]
          p_include_drafts?: boolean
          p_limit?: number
          p_q?: string
          p_section?: string
          p_sort?: string
        }
        Returns: {
          description: string
          filter_slugs: string[]
          has_downloads: boolean
          has_project_files: boolean
          id: string
          loom_url: string
          preview_end: number
          preview_start: number
          section_slug: string
          slug: string
          sort_num: number
          sort_ts: string
          source_url: string
          status: Database["public"]["Enums"]["card_status"]
          title: string
          youtube_id: string
        }[]
      }
      filter_counts: {
        Args: { p_section?: string }
        Returns: {
          card_count: number
          filter_id: string
        }[]
      }
      mark_password_changed: { Args: never; Returns: undefined }
      release_asset_link: {
        Args: { p_link: string; p_user: string }
        Returns: string
      }
    }
    Enums: {
      card_status: "draft" | "published"
      link_kind: "project" | "download"
      section_kind: "effect" | "music" | "sound" | "font" | "text"
      user_role: "admin" | "editor"
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
      card_status: ["draft", "published"],
      link_kind: ["project", "download"],
      section_kind: ["effect", "music", "sound", "font", "text"],
      user_role: ["admin", "editor"],
    },
  },
} as const
