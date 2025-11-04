import { z } from 'zod';

// --- Validation Schema ---
export const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
  receive_all_alerts: z.boolean(),
  prefer_push_notifications: z.boolean(),
  preferred_start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional().or(z.literal('')),
  preferred_end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional().or(z.literal('')),
  preferred_days: z.array(z.string()),
});

export type NotificationSettingsFormValues = z.infer<typeof notificationSettingsSchema>;

// --- Constants ---
export const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const IDLE_TIMEOUT_MS = 300000; // 5 minutes

// --- Custom Hook Interfaces ---
export interface UseNotificationPermissionsResult {
  notificationPermission: NotificationPermission;
  requestNotificationPermission: () => Promise<NotificationPermission>;
}

export interface UseRealtimeAlertsResult {
  alertRealtimeStatus: 'active' | 'failed' | 'connecting';
}