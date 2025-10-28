"use client";

import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';
import { AnalyticsService } from './AnalyticsService'; // Import AnalyticsService

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
  push_subscription: PushSubscription | null;
  enabled: boolean;
  receive_all_alerts: boolean;
  preferred_start_time: string | null;
  preferred_end_time: string | null;
  preferred_days: string[];
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
  if (import.meta.env.DEV) {
    console.error(`Supabase Error in ${functionName}:`, error);
  }
};

export const NotificationService = {
  async ensureWebPushReady(): Promise<boolean> {
    const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;

    if (!vapidPublicKey || !/^[A-Za-z0-9\-_]+={0,2}$/.test(vapidPublicKey)) {
      handleError(null, 'Invalid VAPID Public Key configuration. Push notifications will not work.');
      AnalyticsService.trackEvent({ name: 'web_push_init_failed', properties: { reason: 'invalid_vapid_key' } });
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      handleError(null, 'Push notifications are not supported by your browser.');
      AnalyticsService.trackEvent({ name: 'web_push_init_failed', properties: { reason: 'service_worker_not_supported' } });
      return false;
    }

    try {
      await navigator.serviceWorker.register('/service-worker.js');
      AnalyticsService.trackEvent({ name: 'web_push_service_worker_registered' });
      return true;
    } catch (err: any) {
      handleError(err, 'Failed to register service worker for push notifications.');
      AnalyticsService.trackEvent({ name: 'web_push_service_worker_registration_failed', properties: { error: err.message } });
      return false;
    }
  },

  async subscribeUserToPush(): Promise<PushSubscription | null> {
    const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;

    if (!vapidPublicKey || !/^[A-Za-z0-9\-_]+={0,2}$/.test(vapidPublicKey)) {
      handleError(null, 'VAPID Public Key is missing or invalid. Cannot subscribe.');
      AnalyticsService.trackEvent({ name: 'push_subscribe_failed', properties: { reason: 'invalid_vapid_key' } }); // Fixed here
      return null;
    }

    if (Notification.permission !== 'granted') {
      handleError(null, 'Notification permission not granted. Please allow notifications to subscribe.');
      AnalyticsService.trackEvent({ name: 'push_subscribe_failed', properties: { reason: 'permission_not_granted' } }); // Fixed here
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: NotificationService.urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });
      }
      AnalyticsService.trackEvent({ name: 'push_subscribed', properties: { endpoint: subscription.endpoint } });
      return subscription.toJSON() as PushSubscription;
    } catch (err: any) {
      handleError(err, 'Failed to subscribe to push notifications. Please ensure your VAPID keys are correct and try again.');
      AnalyticsService.trackEvent({ name: 'push_subscribe_unexpected_error', properties: { error: err.message } });
      return null;
    }
  },

  async unsubscribeWebPush(userId: string): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      AnalyticsService.trackEvent({ name: 'push_unsubscribe_skipped', properties: { reason: 'service_worker_not_supported' } });
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await NotificationService.updateUserNotificationSettings(userId, {
          push_subscription: null,
          enabled: false,
        });
        AnalyticsService.trackEvent({ name: 'push_unsubscribed', properties: { userId } });
        return true;
      } else {
        // If no subscription found, but DB still thinks there is one, update DB
        await NotificationService.updateUserNotificationSettings(userId, {
          push_subscription: null,
          enabled: false,
        });
        AnalyticsService.trackEvent({ name: 'push_unsubscribed_no_active_sub', properties: { userId } });
        return true;
      }
    } catch (err: any) {
      handleError(err, 'Failed to unsubscribe from push notifications.');
      AnalyticsService.trackEvent({ name: 'push_unsubscribe_failed', properties: { userId, error: err.message } });
      return false;
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
        .limit(1); 

      if (error) {
        if (error.code === 'PGRST116') {
          AnalyticsService.trackEvent({ name: 'fetch_notification_settings_not_found', properties: { userId } });
          return null;
        }
        logSupabaseError('getUserNotificationSettings', error);
        AnalyticsService.trackEvent({ name: 'fetch_notification_settings_failed', properties: { userId, error: error.message } });
        return null;
      }
      const settings = (data && data.length > 0) ? data[0] as UserNotificationSettings : null;
      AnalyticsService.trackEvent({ name: 'notification_settings_fetched', properties: { userId, enabled: settings?.enabled } });
      return settings;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching notification settings timed out.');
        AnalyticsService.trackEvent({ name: 'fetch_notification_settings_timeout', properties: { userId } });
      } else {
        logSupabaseError('getUserNotificationSettings', err);
        AnalyticsService.trackEvent({ name: 'fetch_notification_settings_unexpected_error', properties: { userId, error: err.message } });
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
      const upsertPayload = { user_id: userId, ...updates, updated_at: new Date().toISOString() };

      const { data, error } = await supabase
        .from('user_notification_settings')
        .upsert(
          upsertPayload,
          { onConflict: 'user_id' }
        )
        .abortSignal(controller.signal)
        .select()
        .single();

      if (error) {
        logSupabaseError('updateUserNotificationSettings', error);
        AnalyticsService.trackEvent({ name: 'update_notification_settings_failed', properties: { userId, updates: Object.keys(updates), error: error.message } });
        return null;
      }
      AnalyticsService.trackEvent({ name: 'notification_settings_updated', properties: { userId, enabled: data?.enabled } });
      return data as UserNotificationSettings;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Updating notification settings timed out.');
        AnalyticsService.trackEvent({ name: 'update_notification_settings_timeout', properties: { userId } });
      } else {
        logSupabaseError('updateUserNotificationSettings', err);
        AnalyticsService.trackEvent({ name: 'update_notification_settings_unexpected_error', properties: { userId, error: err.message } });
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
        AnalyticsService.trackEvent({ name: 'create_alert_failed', properties: { type: alert.type, error: error.message } });
        return null;
      }
      AnalyticsService.trackEvent({ name: 'alert_created', properties: { alertId: data.id, type: data.type } });
      return data as Alert;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Creating alert timed out.');
        AnalyticsService.trackEvent({ name: 'create_alert_timeout', properties: { type: alert.type } });
      } else {
        logSupabaseError('createAlert', err);
        AnalyticsService.trackEvent({ name: 'create_alert_unexpected_error', properties: { type: alert.type, error: err.message } });
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async fetchAlerts(): Promise<Alert[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .abortSignal(controller.signal);

      if (error) {
        logSupabaseError('fetchAlerts', error);
        AnalyticsService.trackEvent({ name: 'fetch_alerts_failed', properties: { error: error.message } });
        return [];
      }
      AnalyticsService.trackEvent({ name: 'alerts_fetched', properties: { count: data.length } });
      return data as Alert[];
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Fetching alerts timed out.');
        AnalyticsService.trackEvent({ name: 'fetch_alerts_timeout' });
      } else {
        logSupabaseError('fetchAlerts', err);
        AnalyticsService.trackEvent({ name: 'fetch_alerts_unexpected_error', properties: { error: err.message } });
      }
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async updateAlert(alertId: string, updates: Partial<Omit<Alert, 'id' | 'created_at'>>): Promise<Alert | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('alerts')
        .update(updates)
        .eq('id', alertId)
        .abortSignal(controller.signal)
        .select()
        .single();

      if (error) {
        logSupabaseError('updateAlert', error);
        AnalyticsService.trackEvent({ name: 'update_alert_failed', properties: { alertId, updates: Object.keys(updates), error: error.message } });
        return null;
      }
      AnalyticsService.trackEvent({ name: 'alert_updated', properties: { alertId, updates: Object.keys(updates) } });
      return data as Alert;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Updating alert timed out.');
        AnalyticsService.trackEvent({ name: 'update_alert_timeout', properties: { alertId } });
      } else {
        logSupabaseError('updateAlert', err);
        AnalyticsService.trackEvent({ name: 'update_alert_unexpected_error', properties: { alertId, error: err.message } });
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async deleteAlert(alertId: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', alertId)
        .abortSignal(controller.signal);

      if (error) {
        logSupabaseError('deleteAlert', error);
        AnalyticsService.trackEvent({ name: 'delete_alert_failed', properties: { alertId, error: error.message } });
        return false;
      }
      AnalyticsService.trackEvent({ name: 'alert_deleted', properties: { alertId } });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Deleting alert timed out.');
        AnalyticsService.trackEvent({ name: 'delete_alert_timeout', properties: { alertId } });
      } else {
        logSupabaseError('deleteAlert', err);
        AnalyticsService.trackEvent({ name: 'delete_alert_unexpected_error', properties: { alertId, error: err.message } });
      }
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  },

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