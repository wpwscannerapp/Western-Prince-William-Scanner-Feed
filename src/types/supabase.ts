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
          incident_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          incident_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          incident_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
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
          admin_id: string | null
          audio_url: string | null
          created_at: string | null
          date: string | null
          description: string
          id: string
          image_url: string | null
          latitude: number | null
          location: string
          longitude: number | null
          search_vector: unknown | null
          title: string
          type: string
        }
        Insert: {
          admin_id?: string | null
          audio_url?: string | null
          created_at?: string | null
          date?: string | null
          description: string
          id?: string
          image_url?: string | null
          latitude?: number | null
          location: string
          longitude?: number | null
          search_vector?: unknown | null
          title: string
          type: string
        }
        Update: {
          admin_id?: string | null
          audio_url?: string | null
          created_at?: string | null
          date?: string | null
          description?: string
          id?: string
          image_url?: string | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          search_vector?: unknown | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          incident_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          incident_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          incident_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
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
          preferred_days: string[]
          preferred_end_time: string | null
          preferred_start_time: string | null
          preferred_types: string[]
          prefer_push_notifications: boolean
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
          preferred_days?: string[]
          preferred_end_time?: string | null
          preferred_start_time?: string | null
          preferred_types?: string[]
          prefer_push_notifications?: boolean
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
          preferred_days?: string[]
          preferred_end_time?: string | null
          preferred_start_time?: string | null
          preferred_types?: string[]
          prefer_push_notifications?: boolean
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      notify_web_push_on_new_alert: {
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
  ? (Database[PublicEnumNameOrOptions["schema"]]["Enums"])[EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never