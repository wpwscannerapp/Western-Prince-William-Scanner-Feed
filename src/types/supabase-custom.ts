import { Tables } from './supabase';

// 1. Core Row Types
export type AlertRow                = Tables<'alerts'>['Row'];
export type AppSettingsRow          = Tables<'app_settings'>['Row'];
export type AppSettingsHistoryRow   = Tables<'app_settings_history'>['Row'];
export type CommentRow              = Tables<'comments'>['Row'];
export type ContactSettingsRow      = Tables<'contact_settings'>['Row'];
export type FeedbackRow             = Tables<'feedback_and_suggestions'>['Row'];
export type IncidentRow             = Tables<'incidents'>['Row'];
export type LikeRow                 = Tables<'likes'>['Row'];
export type ProfileRow              = Tables<'profiles'>['Row'];
export type NotificationSettingsRow = Tables<'user_notification_settings'>['Row'];

// 2. Insert / Update Types
export type AlertInsert             = Tables<'alerts'>['Insert'];
export type AlertUpdate             = Tables<'alerts'>['Update'];
export type AppSettingsInsert       = Tables<'app_settings'>['Insert'];
export type AppSettingsUpdate       = Tables<'app_settings'>['Update'];
export type AppSettingsHistoryInsert= Tables<'app_settings_history'>['Insert'];
export type AppSettingsHistoryUpdate= Tables<'app_settings_history'>['Update'];
export type CommentInsert           = Tables<'comments'>['Insert'];
export type CommentUpdate           = Tables<'comments'>['Update'];
export type ContactSettingsInsert   = Tables<'contact_settings'>['Insert'];
export type ContactSettingsUpdate   = Tables<'contact_settings'>['Update'];
export type FeedbackInsert          = Tables<'feedback_and_suggestions'>['Insert'];
export type FeedbackUpdate          = Tables<'feedback_and_suggestions'>['Update'];
export type IncidentInsert          = Tables<'incidents'>['Insert'];
export type IncidentUpdate          = Tables<'incidents'>['Update'];
export type LikeInsert              = Tables<'likes'>['Insert'];
export type LikeUpdate              = Tables<'likes'>['Update'];
export type ProfileInsert           = Tables<'profiles'>['Insert'];
export type ProfileUpdate           = Tables<'profiles'>['Update'];
export type NotificationSettingsInsert = Tables<'user_notification_settings'>['Insert'];
export type NotificationSettingsUpdate = Tables<'user_notification_settings'>['Update'];

// 3. Handy Utility Types
// a) Pick only the columns you need for a query
export type IncidentListItem = Pick<IncidentRow,
  'id' | 'title' | 'type' | 'location' | 'date' | 'latitude' | 'longitude' | 'image_url' | 'admin_id' | 'created_at'
>;

export type CommentWithProfile = CommentRow & {
  profiles: Pick<ProfileRow, 'username' | 'avatar_url'> | null;
};

// b) Make a column required (useful for inserts)
export type RequiredInsert<T> = { [P in keyof T]-?: NonNullable<T[P]> };

// c) JSON payload helpers
export type LayoutJson      = AppSettingsRow['layout'];
export type ContactCardsJson= ContactSettingsRow['contact_cards'];
export type PushSubJson     = NotificationSettingsRow['push_subscription'];

// Custom type for Incident with admin profile details
export type IncidentWithAdmin = IncidentRow & {
  admin: Pick<ProfileRow, 'first_name' | 'last_name' | 'avatar_url'> | null;
};