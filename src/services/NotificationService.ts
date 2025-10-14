import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import OneSignal from 'onesignal-web-sdk';
import { SUPABASE_API_TIMEOUT } from '@/config';

export interface UserNotificationSettings {
  user_id: string;
  onesignal_player_id: string | null;
  enabled: boolean;
  preferred_types: string[];
  radius_miles: number;
  latitude: number | null;
  longitude: number | null;
  manual_location_address: string | null;
  updated_at: string;
}

export interface Alert {
  id: string;
  type: string;
  latitude: number;
  longitude: number;
  description: string;
  title: string;
  created_at: string;
}

const logSupabaseError = (functionName: string, error: any) => {
  handleError(error, `Error in ${functionName}`);
};

export const NotificationService = {
  async initOneSignal(userId: string) {
    if (!import.meta.env.VITE_ONESIGNAL_APP_ID) {
      console.error('OneSignal App ID is not defined in environment variables.');
      handleError(null, 'OneSignal App ID is missing. Notifications will not work.');
      return;
    }

    if (!OneSignal.Notifications.isPushNotificationsSupported()) {
      console.warn('Push notifications are not supported by this browser.');
      return;
    }

    try {
      await OneSignal.init({
        appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
        safari_web_id: import.meta.env.VITE_ONESIGNAL_SAFARI_WEB_ID, // Optional for Safari
        allowLocalhostAsSecureOrigin: import.meta.env.DEV,
        notifyButton: {
          enable: false, // We'll manage our own UI
        },
      });
      console.log('OneSignal initialized.');

      // Set external user ID for Supabase user
      OneSignal.setExternalUserId(userId);
      console.log('OneSignal external user ID set:', userId);

      // Add event listener for subscription changes
      OneSignal.Notifications.addEventListener('subscriptionchange', async (isSubscribed: boolean) => {
        console.log('OneSignal subscriptionchange event:', isSubscribed);
        if (isSubscribed) {
          const player = await OneSignal.User.PushSubscription.getFCMToken();
          const playerId = await OneSignal.User.PushSubscription.getId();
          console.log('OneSignal subscribed. Player ID:', playerId, 'FCM Token:', player);
          if (playerId) {
            await NotificationService.updateUserNotificationSettings(userId, { onesignal_player_id: playerId, enabled: true });
          }
        } else {
          console.log('OneSignal unsubscribed.');
          await NotificationService.updateUserNotificationSettings(userId, { onesignal_player_id: null, enabled: false });
        }
      });

      // Request notification permission if not already granted
      const permission = await OneSignal.Notifications.permission;
      if (permission === 'default') {
        console.log('OneSignal: Requesting notification permission...');
        await OneSignal.Notifications.requestPermission();
      }

      // Get current subscription status and player ID
      const isPushEnabled = await OneSignal.Notifications.isPushEnabled();
      const playerId = await OneSignal.User.PushSubscription.getId();
      console.log('OneSignal: isPushEnabled:', isPushEnabled, 'Current Player ID:', playerId);

      // Update Supabase with current OneSignal status
      await NotificationService.updateUserNotificationSettings(userId, {
        onesignal_player_id: playerId,
        enabled: isPushEnabled,
      });

    } catch (err: any) {
      console.error('OneSignal initialization failed:', err);
      handleError(err, 'Failed to initialize push notifications.');
    }
  },

  async getUserNotificationSettings(userId: string): Promise<UserNotificationSettings | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', userId)
        .abortSignal(controller.signal)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          return null;
        }
        logSupabaseError('getUserNotificationSettings', error);
        return null;
      }
      return data as UserNotificationSettings;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching notification settings timed out.');
      } else {
        logSupabaseError('getUserNotificationSettings', err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async updateUserNotificationSettings(
    userId: string,
    updates: Partial<Omit<UserNotificationSettings, 'user_id' | 'updated_at'>>
  ): Promise<UserNotificationSettings | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .upsert(
          { user_id: userId, ...updates, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        .abortSignal(controller.signal)
        .select()
        .single();

      if (error) {
        logSupabaseError('updateUserNotificationSettings', error);
        return null;
      }
      return data as UserNotificationSettings;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Updating notification settings timed out.');
      } else {
        logSupabaseError('updateUserNotificationSettings', err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async createAlert(alert: Omit<Alert, 'id' | 'created_at'>): Promise<Alert | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert(alert)
        .abortSignal(controller.signal)
        .select()
        .single();

      if (error) {
        logSupabaseError('createAlert', error);
        return null;
      }
      return data as Alert;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Creating alert timed out.');
      } else {
        logSupabaseError('createAlert', err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },
};