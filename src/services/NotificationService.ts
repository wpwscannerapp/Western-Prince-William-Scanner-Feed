"use client";

import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';
import { AnalyticsService } from './AnalyticsService';
import { AlertRow, AlertUpdate, NewAlert, PushSubscriptionInsert, PushSubscriptionRow, Json } from '@/types/supabase'; // Import Json type

export type PushSubscription = PushSubscriptionRow['subscription'];
export type Alert = AlertRow;

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
      if (import.meta.env.DEV) console.warn('NotificationService: VAPID Public Key is missing or invalid.');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      handleError(null, 'Push notifications are not supported by your browser.');
      AnalyticsService.trackEvent({ name: 'web_push_init_failed', properties: { reason: 'service_worker_not_supported' } });
      if (import.meta.env.DEV) console.warn('NotificationService: Service Worker not supported.');
      return false;
    }

    try {
      // Register the service worker (VitePWA handles the file generation)
      await navigator.serviceWorker.register('/service-worker.js');
      AnalyticsService.trackEvent({ name: 'web_push_service_worker_registered' });
      if (import.meta.env.DEV) console.log('NotificationService: Service Worker registered successfully.');
      return true;
    } catch (err: any) {
      handleError(err, 'Failed to register service worker for push notifications.');
      AnalyticsService.trackEvent({ name: 'web_push_service_worker_registration_failed', properties: { error: err.message } });
      if (import.meta.env.DEV) console.error('NotificationService: Service Worker registration failed:', err);
      return false;
    }
  },

  async subscribeUserToPush(userId: string): Promise<PushSubscription | null> {
    const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
    if (import.meta.env.DEV) console.log('NotificationService: Attempting to subscribe user to push notifications.');

    if (!vapidPublicKey || !/^[A-Za-z0-9\-_]+={0,2}$/.test(vapidPublicKey)) {
      handleError(null, 'VAPID Public Key is missing or invalid. Cannot subscribe.');
      if (import.meta.env.DEV) console.warn('NotificationService: VAPID Public Key is missing or invalid during subscription attempt.');
      return null;
    }

    if (Notification.permission !== 'granted') {
      handleError(null, 'Notification permission not granted. Please allow notifications to subscribe.');
      if (import.meta.env.DEV) console.warn('NotificationService: Notification permission not granted.');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (import.meta.env.DEV) console.log('NotificationService: Existing subscription found:', subscription);

      if (!subscription) {
        if (import.meta.env.DEV) console.log('NotificationService: No existing subscription, attempting to create new one.');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: NotificationService.urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });
        if (import.meta.env.DEV) console.log('NotificationService: New subscription created:', subscription);
      }
      
      const pushSubJson = subscription.toJSON() as PushSubscription;

      // Explicitly remove the 'endpoint' property from the JSON object
      // as it's a generated column in the database and cannot be inserted directly.
      const { endpoint: _, ...subscriptionWithoutEndpoint } = pushSubJson;

      // Save subscription to Supabase
      const subscriptionInsert: PushSubscriptionInsert = {
        user_id: userId,
        subscription: subscriptionWithoutEndpoint as Json, // Cast to Json as endpoint is removed
      };

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(subscriptionInsert, { onConflict: 'user_id, endpoint' }); // Keep onConflict with endpoint

      if (error) {
        logSupabaseError('subscribeUserToPush - DB Save', error);
        AnalyticsService.trackEvent({ name: 'push_subscribe_db_save_failed', properties: { userId, error: error.message } });
        if (import.meta.env.DEV) console.error('NotificationService: Failed to save subscription to DB:', error);
        return null;
      }

      AnalyticsService.trackEvent({ name: 'push_subscribed', properties: { userId, endpoint: subscription.endpoint } });
      if (import.meta.env.DEV) console.log('NotificationService: User subscribed and saved to DB.');
      return pushSubJson;
    } catch (err: any) {
      handleError(err, 'Failed to subscribe to push notifications. Please ensure your VAPID keys are correct and try again.');
      AnalyticsService.trackEvent({ name: 'push_subscribe_unexpected_error', properties: { error: err.message } });
      if (import.meta.env.DEV) console.error('NotificationService: Unexpected error during subscription:', err);
      return null;
    }
  },

  async unsubscribeWebPush(userId: string): Promise<boolean> {
    if (import.meta.env.DEV) console.log('NotificationService: Attempting to unsubscribe user from push notifications.');
    if (!('serviceWorker' in navigator)) {
      if (import.meta.env.DEV) console.warn('NotificationService: Service Worker not supported, cannot unsubscribe.');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (import.meta.env.DEV) console.log('NotificationService: Found existing subscription for unsubscribe:', subscription);

      if (subscription) {
        await subscription.unsubscribe();
        if (import.meta.env.DEV) console.log('NotificationService: Browser subscription unsubscribed.');
      }
      
      // Remove all subscriptions for this user/endpoint combination from DB
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription?.endpoint || ''); // Use the new endpoint column for deletion

      if (error) {
        logSupabaseError('unsubscribeWebPush - DB Delete', error);
        AnalyticsService.trackEvent({ name: 'push_unsubscribe_db_delete_failed', properties: { userId, error: error.message } });
        if (import.meta.env.DEV) console.error('NotificationService: Failed to delete subscription from DB:', error);
        return false;
      }

      AnalyticsService.trackEvent({ name: 'push_unsubscribed', properties: { userId } });
      if (import.meta.env.DEV) console.log('NotificationService: User unsubscribed and removed from DB.');
      return true;
    } catch (err: any) {
      handleError(err, 'Failed to unsubscribe from push notifications.');
      AnalyticsService.trackEvent({ name: 'push_unsubscribe_failed', properties: { userId, error: err.message } });
      if (import.meta.env.DEV) console.error('NotificationService: Unexpected error during unsubscription:', err);
      return false;
    }
  },

  // --- Alert Management (Kept from previous implementation) ---

  async createAlert(alert: NewAlert): Promise<AlertRow | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    if (import.meta.env.DEV) console.log('NotificationService: Attempting to create alert:', alert);

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
        if (import.meta.env.DEV) console.error('NotificationService: Failed to insert alert:', error);
        return null;
      }
      AnalyticsService.trackEvent({ name: 'alert_created', properties: { alertId: data.id, type: data.type } });
      if (import.meta.env.DEV) console.log('NotificationService: Alert inserted successfully:', data);
      return data;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        handleError(new Error('Request timed out'), 'Creating alert timed out.');
        AnalyticsService.trackEvent({ name: 'create_alert_timeout', properties: { type: alert.type } });
        if (import.meta.env.DEV) console.error('NotificationService: Creating alert timed out.');
      } else {
        logSupabaseError('createAlert', err);
        AnalyticsService.trackEvent({ name: 'create_alert_unexpected_error', properties: { type: alert.type, error: err.message } });
        if (import.meta.env.DEV) console.error('NotificationService: Unexpected error creating alert:', err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
      if (import.meta.env.DEV) console.log('NotificationService: createAlert finished.');
    }
  },

  async fetchAlerts(): Promise<AlertRow[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_API_TIMEOUT);

    try {
      // Querying the alerts_safe view instead of the raw alerts table
      const { data, error } = await supabase
        .from('alerts_safe') // Changed to alerts_safe view
        .select('*') // Now safe to use '*' with the view
        .order('created_at', { ascending: false })
        .abortSignal(controller.signal);

      if (error) {
        logSupabaseError('fetchAlerts', error);
        AnalyticsService.trackEvent({ name: 'fetch_alerts_failed', properties: { error: error.message } });
        return [];
      }
      AnalyticsService.trackEvent({ name: 'alerts_fetched', properties: { count: data.length } });
      return data as AlertRow[];
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

  async updateAlert(alertId: string, updates: AlertUpdate): Promise<AlertRow | null> {
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
      return data;
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