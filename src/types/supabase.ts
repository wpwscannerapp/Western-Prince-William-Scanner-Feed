import type { Database } from '@/integrations/supabase/client';

// ------------------------------------------------------------------
// 1. Public schema shortcut
// ------------------------------------------------------------------
export type PublicSchema = Database['public'];

// ------------------------------------------------------------------
// 2. Ready-to-use Row types
// ------------------------------------------------------------------
export type AlertRow = PublicSchema['Tables']['alerts']['Row'];
export type AppSettingsRow = PublicSchema['Tables']['app_settings']['Row'];
export type AppSettingsHistoryRow = PublicSchema['Tables']['app_settings_history']['Row'];
export type CommentRow = PublicSchema['Tables']['comments']['Row'];
export type ContactSettingsRow = PublicSchema['Tables']['contact_settings']['Row'];
export type FeedbackRow = PublicSchema['Tables']['feedback_and_suggestions']['Row'];
export type IncidentRow = PublicSchema['Tables']['incidents']['Row'];
export type LikeRow = PublicSchema['Tables']['likes']['Row'];
export type ProfileRow = PublicSchema['Tables']['profiles']['Row'];
export type NotificationSettingsRow = PublicSchema['Tables']['user_notification_settings']['Row'];

// ------------------------------------------------------------------
// 3. Insert / Update helpers
// ------------------------------------------------------------------
export type AlertInsert = PublicSchema['Tables']['alerts']['Insert'];
export type AlertUpdate = PublicSchema['Tables']['alerts']['Update'];

export type AppSettingsInsert = PublicSchema['Tables']['app_settings']['Insert'];
export type AppSettingsUpdate = PublicSchema['Tables']['app_settings']['Update'];

export type AppSettingsHistoryInsert = PublicSchema['Tables']['app_settings_history']['Insert'];
export type AppSettingsHistoryUpdate = PublicSchema['Tables']['app_settings_history']['Update'];

export type CommentInsert = PublicSchema['Tables']['comments']['Insert'];
export type CommentUpdate = PublicSchema['Tables']['comments']['Update'];

export type ContactSettingsInsert = PublicSchema['Tables']['contact_settings']['Insert'];
export type ContactSettingsUpdate = PublicSchema['Tables']['contact_settings']['Update'];

export type FeedbackInsert = PublicSchema['Tables']['feedback_and_suggestions']['Insert'];
export type FeedbackUpdate = PublicSchema['Tables']['feedback_and_suggestions']['Update'];

export type IncidentInsert = PublicSchema['Tables']['incidents']['Insert'];
export type IncidentUpdate = PublicSchema['Tables']['incidents']['Update'];

export type LikeInsert = PublicSchema['Tables']['likes']['Insert'];
export type LikeUpdate = PublicSchema['Tables']['likes']['Update'];

export type ProfileInsert = PublicSchema['Tables']['profiles']['Insert'];
export type ProfileUpdate = PublicSchema['Tables']['profiles']['Update'];

export type NotificationSettingsInsert = PublicSchema['Tables']['user_notification_settings']['Insert'];
export type NotificationSettingsUpdate = PublicSchema['Tables']['user_notification_settings']['Update'];

// 4. Handy Utility Types
export type IncidentListItem = Pick<
  IncidentRow,
  'id' | 'title' | 'type' | 'date' | 'latitude' | 'longitude' | 'image_url' | 'location' | 'description' | 'admin_id' | 'created_at'
>;

export type RequiredInsert<T> = { [P in keyof T]-?: NonNullable<T[P]> };

export type NewIncident = RequiredInsert<Omit<IncidentInsert, 'id' | 'created_at' | 'search_vector'>>;
export type NewAlert = RequiredInsert<Omit<AlertInsert, 'id' | 'created_at'>>;
export type NewComment = RequiredInsert<Omit<CommentInsert, 'id' | 'created_at'>>;

export type LayoutJson = AppSettingsRow['layout'];
export type ContactCardsJson = ContactSettingsRow['contact_cards'];
export type PushSubJson = NotificationSettingsRow['push_subscription'];

export type CommentWithProfile = CommentRow & {
  profiles: Pick<ProfileRow, 'username' | 'avatar_url'> | null;
};

export type FeedbackWithProfile = FeedbackRow & {
  profiles: Array<Pick<ProfileRow, 'username' | 'id'>> | null;
};

export type ContactCard = ContactCardsJson extends (infer U)[] ? U : never;