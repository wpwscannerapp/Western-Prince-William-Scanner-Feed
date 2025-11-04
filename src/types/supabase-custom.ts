import { Tables, TablesInsert, TablesUpdate } from './supabase';

// 1. Core Row Types
export type AlertRow                = Tables<'alerts'>;
export type AppSettingsRow          = Tables<'app_settings'>;
export type AppSettingsHistoryRow   = Tables<'app_settings_history'>;
export type CommentRow              = Tables<'comments'>;
export type ContactSettingsRow      = Tables<'contact_settings'>;
export type FeedbackRow             = Tables<'feedback_and_suggestions'>;
export type IncidentRow             = Tables<'incidents'>;
export type LikeRow                 = Tables<'likes'>;
export type ProfileRow              = Tables<'profiles'>;
export type NotificationSettingsRow = Tables<'user_notification_settings'>;

// 2. Insert / Update Types
export type AlertInsert             = TablesInsert<'alerts'>;
export type AlertUpdate             = TablesUpdate<'alerts'>;
export type AppSettingsInsert       = TablesInsert<'app_settings'>;
export type AppSettingsUpdate       = TablesUpdate<'app_settings'>;
export type AppSettingsHistoryInsert= TablesInsert<'app_settings_history'>;
export type AppSettingsHistoryUpdate= TablesUpdate<'app_settings_history'>;
export type CommentInsert           = TablesInsert<'comments'>;
export type CommentUpdate           = TablesUpdate<'comments'>;
export type ContactSettingsInsert   = TablesInsert<'contact_settings'>;
export type ContactSettingsUpdate   = TablesUpdate<'contact_settings'>;
export type FeedbackInsert          = TablesInsert<'feedback_and_suggestions'>;
export type FeedbackUpdate          = TablesUpdate<'feedback_and_suggestions'>;
export type IncidentInsert          = TablesInsert<'incidents'>;
export type IncidentUpdate          = TablesUpdate<'incidents'>;
export type LikeInsert              = TablesInsert<'likes'>;
export type LikeUpdate              = TablesUpdate<'likes'>;
export type ProfileInsert           = TablesInsert<'profiles'>;
export type ProfileUpdate           = TablesUpdate<'profiles'>;
export type NotificationSettingsInsert = TablesInsert<'user_notification_settings'>;
export type NotificationSettingsUpdate = TablesUpdate<'user_notification_settings'>;

// 3. Handy Utility Types
// a) Pick only the columns you need for a query
export type IncidentListItem = Pick<IncidentRow,
  'id' | 'title' | 'type' | 'date' | 'latitude' | 'longitude' | 'image_url'
>;

export type CommentWithProfile = CommentRow & {
  profiles: Pick<ProfileRow, 'username' | 'avatar_url'> | null;
};

// b) Make a column required (useful for inserts)
export type RequiredInsert<T> = { [P in keyof T]-?: NonNullable<T[P]> };

// Example of a new incident type where certain fields are required for insert
export type NewIncident = RequiredInsert<Omit<IncidentInsert, 'id' | 'created_at'>>;

// c) JSON payload helpers
export type LayoutJson      = AppSettingsRow['layout'];
export type ContactCardsJson= ContactSettingsRow['contact_cards'];
export type PushSubJson     = NotificationSettingsRow['push_subscription'];

// Custom type for Incident with admin profile details
export type IncidentWithAdmin = IncidentRow & {
  admin: Pick<ProfileRow, 'first_name' | 'last_name' | 'avatar_url'> | null;
};