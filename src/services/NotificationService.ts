import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';

// Define the structure of a native PushSubscription object
export interface PushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface UserNotificationSettings {
  user_id: string;
  push_subscription: PushSubscription | null; // Changed from onesignal_player_id
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
  async initWebPush(userId: string): Promise<boolean> {
    console.log('NotificationService: initWebPush called for user:', userId);
    const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
    console.log('NotificationService: VAPID Public Key being used:', vapidPublicKey); // ADDED LOG

    if (!vapidPublicKey) {
      console.error('NotificationService: VAPID Public Key is not defined in environment variables.');
      handleError(null, 'VAPID Public Key is missing. Push notifications will not work.');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('NotificationService: Service Workers are not supported by this browser.');
      handleError(null, 'Push notifications are not supported by your browser.');
      return false;
    }

    if (Notification.permission !== 'granted') {
      console.log('NotificationService: Notification permission not granted. Skipping subscription attempt.');
      return false; // Do not proceed if permission is not granted
    }

    try {
      console.log('NotificationService: Registering service worker...');
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('NotificationService: Service Worker registered:', registration);

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      let isPushEnabled = !!subscription;

      if (!isPushEnabled) {
        console.log('NotificationService: No existing push subscription found. Subscribing...');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: NotificationService.urlBase64ToUint8Array(vapidPublicKey),
        });
        isPushEnabled = true;
        console.log('NotificationService: New push subscription created:', subscription);
      } else {
        console.log('NotificationService: Existing push subscription found:', subscription);
      }

      // Update user settings in Supabase
      console.log('NotificationService: Calling updateUserNotificationSettings...');
      if (subscription) {
        await NotificationService.updateUserNotificationSettings(userId, {
          push_subscription: subscription.toJSON() as PushSubscription,
          enabled: isPushEnabled,
        });
      } else {
        await NotificationService.updateUserNotificationSettings(userId, {
          push_subscription: null,
          enabled: false,
        });
      }
      console.log('NotificationService: updateUserNotificationSettings call completed.');

      console.log('NotificationService: Web Push initialization successful.');
      return true;
    } catch (err: any) {
      console.error('NotificationService: Web Push initialization failed:', err);
      handleError(err, 'Failed to initialize push notifications. Please ensure your VAPID keys are correct and try again.');
      return false;
    }
  },

  async unsubscribeWebPush(userId: string): Promise<boolean> {
    console.log('NotificationService: unsubscribeWebPush called for user:', userId);
    if (!('serviceWorker' in navigator)) {
      console.warn('NotificationService: Service Workers are not supported by this browser.');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        console.log('NotificationService: Push subscription unsubscribed from browser.');
        await NotificationService.updateUserNotificationSettings(userId, {
          push_subscription: null,
          enabled: false,
        });
        console.log('NotificationService: User notification settings updated after unsubscribe.');
        return true;
      } else {
        console.log('NotificationService: No active push subscription to unsubscribe.');
        await NotificationService.updateUserNotificationSettings(userId, {
          push_subscription: null,
          enabled: false,
        });
        console.log('NotificationService: User notification settings updated (no active subscription).');
        return true;
      }
    } catch (err: any) {
      console.error('NotificationService: Failed to unsubscribe from push notifications:', err);
      handleError(err, 'Failed to unsubscribe from push notifications.');
      return false;
    }
  },

  async getUserNotificationSettings(userId: string): Promise<UserNotificationSettings | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);
    console.log('NotificationService: Fetching user notification settings for user:', userId);

    try {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', userId)
        .abortSignal(controller.signal)
        .limit(1); 

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          console.log('NotificationService: No existing notification settings found for user:', userId);
          return null;
        }
        logSupabaseError('getUserNotificationSettings', error);
        return null;
      }
      console.log('NotificationService: Successfully fetched user notification settings.');
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
    console.log('NotificationService: Updating user notification settings for user:', userId, 'with updates:', updates);
    console.log('NotificationService: Initiating Supabase upsert operation...');

    try {
      const upsertPayload = { user_id: userId, ...updates, updated_at: new Date().toISOString() };
      console.log('NotificationService: Upsert payload:', upsertPayload); // Log the actual payload

      const startTime = Date.now(); // Start timer
      const { data, error } = await supabase
        .from('user_notification_settings')
        .upsert(
          upsertPayload,
          { onConflict: 'user_id' }
        )
        .abortSignal(controller.signal)
        .select()
        .single();
      const endTime = Date.now(); // End timer
      console.log(`NotificationService: Supabase upsert operation completed in ${endTime - startTime}ms.`); // Log duration

      if (error) {
        logSupabaseError('updateUserNotificationSettings', error);
        return null;
      }
      console.log('NotificationService: Successfully updated user notification settings.');
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

  // Utility function to convert VAPID public key to Uint8Array
  urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  },
};