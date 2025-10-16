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
      alerts: {
        Row: {
          created_at: string | null
          description: string
          id: string
          latitude: number
          longitude: number
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          latitude: number
          longitude: number
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          latitude?: number
          longitude?: number
          title?: string
          type?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          custom_css: string | null
          favicon_url: string | null
          font_family: string
          id: string
          layout: Json | null
          logo_url: string | null
          primary_color: string
          secondary_color: string
          updated_at: string | null
        }
        Insert: {
          custom_css?: string | null
          favicon_url?: string | null
          font_family?: string
          id?: string
          layout?: Json | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          updated_at?: string | null
        }
        Update: {
          custom_css?: string | null
          favicon_url?: string | null
          font_family?: string
          id?: string
          layout?: Json | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      app_settings_history: {
        Row: {
          created_at: string | null
          id: string
          layout: Json | null
          settings: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          layout?: Json | null
          settings: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          layout?: Json | null
          settings?: Json
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_settings: {
        Row: {
          contact_cards: Json
          id: string
          updated_at: string | null
        }
        Insert: {
          contact_cards?: Json
          id?: string
          updated_at?: string | null
        }
        Update: {
          contact_cards?: Json
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      incidents: {
        Row: {
          created_at: string | null
          date: string | null
          description: string
          id: string
          location: string
          search_vector: unknown | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          description: string
          id?: string
          location: string
          search_vector?: unknown | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          date?: string | null
          description?: string
          id?: string
          location?: string
          search_vector?: unknown | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          admin_id: string | null
          created_at: string | null
          id: string
          image_url: string | null
          text: string
          timestamp: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          text: string
          timestamp?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          text?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          first_name: string | null
          id: string
          last_name: string | null
          role: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_settings: {
        Row: {
          enabled: boolean
          latitude: number | null
          longitude: number | null
          manual_location_address: string | null
          preferred_types: string[]
          push_subscription: Json | null
          radius_miles: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          enabled?: boolean
          latitude?: number | null
          longitude?: number | null
          manual_location_address?: string | null
          preferred_types?: string[]
          push_subscription?: Json | null
          radius_miles?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          enabled?: boolean
          latitude?: number | null
          longitude?: number | null
          manual_location_address?: string | null
          preferred_types?: string[]
          push_subscription?: Json | null
          radius_miles?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      notify_onesignal_on_new_alert: {
        Args: Record<PropertyKey, never>
        Returns: unknown
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