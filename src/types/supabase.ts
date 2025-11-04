import type { Database } from '@/integrations/supabase/types'

export type PublicSchema = Database['public']

export type AlertRow                = PublicSchema['Tables']['alerts']['Row']
export type AppSettingsRow          = PublicSchema['Tables']['app_settings']['Row']
export type AppSettingsHistoryRow   = PublicSchema['Tables']['app_settings_history']['Row']
export type CommentRow              = PublicSchema['Tables']['comments']['Row']
export type ContactSettingsRow      = PublicSchema['Tables']['contact_settings']['Row']
export type FeedbackRow             = PublicSchema['Tables']['feedback_and_suggestions']['Row']
export type IncidentRow             = PublicSchema['Tables']['incidents']['Row']
export type LikeRow                 = PublicSchema['Tables']['likes']['Row']
export type ProfileRow              = PublicSchema['Tables']['profiles']['Row']
export type NotificationSettingsRow = PublicSchema['Tables']['user_notification_settings']['Row']

export type IncidentInsert = PublicSchema['Tables']['incidents']['Insert']
export type IncidentUpdate = PublicSchema['Tables']['incidents']['Update']
export type NotificationSettingsInsert = PublicSchema['Tables']['user_notification_settings']['Insert']
export type NotificationSettingsUpdate = PublicSchema['Tables']['user_notification_settings']['Update']

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