import type { Database } from '@/types/database.types'

export type PublicSchema = Database['public']

export type { Json } from './database.types'; // Explicitly export Json with 'type' keyword

// ---------------------------------------------------------------
// 2. Handy Row aliases (used everywhere)
// ---------------------------------------------------------------
export type AlertRow                = PublicSchema['Tables']['alerts']['Row']
export type AppSettingsRow          = PublicSchema['Tables']['app_settings']['Row']
export type AppSettingsHistoryRow   = PublicSchema['Tables']['app_settings_history']['Row']
export type CommentRow              = PublicSchema['Tables']['comments']['Row']
export type ContactSettingsRow      = PublicSchema['Tables']['contact_settings']['Row']
export type FeedbackRow             = PublicSchema['Tables']['feedback_and_suggestions']['Row']
export type IncidentRow             = PublicSchema['Tables']['incidents']['Row']
export type LikeRow                 = PublicSchema['Tables']['likes']['Row']
export type ProfileRow              = PublicSchema['Tables']['profiles']['Row']

// Using generated type for PushSubscriptionRow
export type PushSubscriptionRow = PublicSchema['Tables']['push_subscriptions']['Row'];


// Utility type for incidents guaranteed to have coordinates
export type IncidentWithCoords = IncidentRow & {
  latitude: number;
  longitude: number;
};

// ---------------------------------------------------------------
// 3. Insert / Update helpers
// ---------------------------------------------------------------
export type AlertInsert = PublicSchema['Tables']['alerts']['Insert']
export type AlertUpdate = PublicSchema['Tables']['alerts']['Update']
export type AppSettingsInsert = PublicSchema['Tables']['app_settings']['Insert']
export type AppSettingsUpdate = PublicSchema['Tables']['app_settings']['Update']
// Using generated type for CommentInsert
export type CommentInsert = PublicSchema['Tables']['comments']['Insert']
// Using generated type for CommentUpdate
export type CommentUpdate = PublicSchema['Tables']['comments']['Update']

export type ContactSettingsInsert = PublicSchema['Tables']['contact_settings']['Insert']
export type ContactSettingsUpdate = PublicSchema['Tables']['contact_settings']['Update']
export type IncidentInsert = PublicSchema['Tables']['incidents']['Insert']
export type IncidentUpdate = PublicSchema['Tables']['incidents']['Update']

// Using generated types for PushSubscriptionInsert and PushSubscriptionUpdate
export type PushSubscriptionInsert = PublicSchema['Tables']['push_subscriptions']['Insert'];
export type PushSubscriptionUpdate = PublicSchema['Tables']['push_subscriptions']['Update'];


export type ProfileInsert = PublicSchema['Tables']['profiles']['Insert']
export type ProfileUpdate = PublicSchema['Tables']['profiles']['Update']

export type IncidentListItem = Pick<
  IncidentRow,
  'id' | 'title' | 'type' | 'date' | 'latitude' | 'longitude' | 'image_url' | 'location' | 'description' | 'admin_id' | 'created_at' | 'audio_url' | 'search_vector'
>;

export type RequiredInsert<T> = { [P in keyof T]-?: NonNullable<T[P]> };

export type NewIncident = RequiredInsert<Omit<IncidentInsert, 'id' | 'created_at' | 'search_vector'>>;
export type NewAlert = RequiredInsert<Omit<AlertInsert, 'id' | 'created_at'>>;
export type NewComment = RequiredInsert<Omit<CommentInsert, 'id' | 'created_at'>>;

export type LayoutJson = Array<{ id: string; type: string; content: string }> | null;
export type ContactCard = { id: string; name: string; title?: string; email?: string; phone?: string }; // Made 'id' non-optional
export type ContactCardsJson = Array<ContactCard> | null;
export type PushSubJson = PushSubscriptionRow['subscription']; // Re-added: Use the JSONB type from the new table

export type CommentWithProfile = CommentRow & {
  profiles: Pick<ProfileRow, 'username' | 'avatar_url'> | null;
  replies?: CommentWithProfile[]; // Added replies for nesting
};

export type FeedbackWithProfile = FeedbackRow & {
  profiles: Array<Pick<ProfileRow, 'username' | 'id'>> | null;
};