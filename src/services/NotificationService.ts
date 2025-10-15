import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
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

// Type guard to ensure OneSignal is the SDK object, not the initial array
export const isOneSignalReady = (os: unknown): os is OneSignalSDK => {
  return typeof os === 'object' && os !== null && !Array.isArray(os) && 'Notifications' in os;
};

export const NotificationService = {
  async initOneSignal(userId: string): Promise<boolean> {
    console.log('NotificationService: initOneSignal called.');
    const oneSignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    const oneSignalSafariWebId = import.meta.env.VITE_ONESIGNAL_SAFARI_WEB_ID; // Get Safari Web ID

    if (!oneSignalAppId) {
      console.error('NotificationService: OneSignal App ID is not defined in environment variables.');
      handleError(null, 'OneSignal App ID is missing. Notifications will not work.');
      return false;
    }

    if (!oneSignalSafariWebId) {
      console.warn('NotificationService: OneSignal Safari Web ID (VITE_ONESIGNAL_SAFARI_WEB_ID) is not set. Safari push notifications will not be enabled.');
    }

    return new Promise<boolean>(resolve => {
      console.log('NotificationService: Pushing callback to OneSignalDeferred array.');
      // Ensure window.OneSignalDeferred is an array before pushing, as per OneSignal best practices
      if (typeof window.OneSignalDeferred === 'undefined') {
        window.OneSignalDeferred = [];
      }

      window.OneSignalDeferred.push(async () => {
        console.log('NotificationService: OneSignalDeferred.push callback executed.');
        // Now check window.OneSignal, which should be the actual SDK object
        if (!isOneSignalReady(window.OneSignal)) {
          console.error('NotificationService: OneSignal SDK not loaded or not ready after push callback (window.OneSignal is not ready).');
          handleError(null, 'Push notifications SDK not loaded or not ready.');
          return resolve(false);
        }

        const osSdk: OneSignalSDK = window.OneSignal; // Use window.OneSignal here

        console.log('NotificationService: Initializing OneSignal SDK...');
        // Initialize OneSignal SDK here
        await osSdk.init({
          appId: oneSignalAppId,
          safari_web_id: oneSignalSafariWebId, // Pass Safari Web ID (can be undefined/null)
          allowLocalhostAsSecureOrigin: import.meta.env.DEV,
          notifyButton: {
            enable: false, // We'll manage our own UI
          },
        });
        console.log('NotificationService: OneSignal SDK initialized via NotificationService.');


        if (!osSdk.Notifications.isPushNotificationsSupported()) {
          console.warn('NotificationService: Push notifications are not supported by this browser.');
          return resolve(false);
        }

        try {
          console.log('NotificationService: Adding user_id tag to OneSignal.');
          await osSdk.User.addTag("user_id", userId);
          console.log('NotificationService: OneSignal external user ID set:', userId);

          osSdk.Notifications.addEventListener('subscriptionchange', async (isSubscribed: boolean) => {
            console.log('NotificationService: OneSignal subscriptionchange event:', isSubscribed);
            if (isSubscribed) {
              const player = await osSdk.User.PushSubscription.getFCMToken();
              const playerId = await osSdk.User.PushSubscription.getId();
              console.log('NotificationService: OneSignal subscribed. Player ID:', playerId, 'FCM Token:', player);
              if (playerId) {
                await NotificationService.updateUserNotificationSettings(userId, { onesignal_player_id: playerId, enabled: true });
              }
            } else {
              console.log('NotificationService: OneSignal unsubscribed.');
              await NotificationService.updateUserNotificationSettings(userId, { onesignal_player_id: null, enabled: false });
            }
          });

          const permission = await osSdk.Notifications.permission;
          console.log('NotificationService: Current notification permission:', permission);
          if (permission === 'default') {
            console.log('NotificationService: Requesting notification permission...');
            await osSdk.Notifications.requestPermission();
          }

          const isPushEnabled = await osSdk.Notifications.isPushEnabled();
          const playerId = await osSdk.User.PushSubscription.getId();
          console.log('NotificationService: isPushEnabled:', isPushEnabled, 'Current Player ID:', playerId);

          await NotificationService.updateUserNotificationSettings(userId, {
            onesignal_player_id: playerId,
            enabled: isPushEnabled,
          });
          console.log('NotificationService: OneSignal initialization successful.');
          resolve(true); // Initialization successful
        } catch (err: any) {
          console.error('NotificationService: OneSignal initialization failed:', err);
          handleError(err, 'Failed to initialize push notifications.');
          resolve(false); // Initialization failed
        }
      });
    });
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
        .limit(1); 

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          return null;
        }
        logSupabaseError('getUserNotificationSettings', error);
        return null;
      }
      // If data is an array, return the first element, otherwise null
      return (data && data.length > 0) ? data[0] as UserNotificationSettings : null;
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