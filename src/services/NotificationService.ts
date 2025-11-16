"use client";

import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';
import { AnalyticsService } from './AnalyticsService';
import { AlertRow, AlertUpdate, NewAlert, PushSubscriptionInsert, PushSubscriptionRow } from '@/types/supabase';

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
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      handleError(null, 'Push notifications are not supported by your browser.');
      AnalyticsService.trackEvent({ name: 'web_push_init_failed', properties: { reason: 'service_worker_not_supported' } });
      return false;
    }

    try {
      // Register the service worker (VitePWA handles the file generation)
      await navigator.serviceWorker.register('/service-worker.js');
      AnalyticsService.trackEvent({ name: 'web_push_service_worker_registered' });
      return true;
    } catch (err: any) {
      handleError(err, 'Failed to register service worker for push notifications.');
      AnalyticsService.trackEvent({ name: 'web_push_service_worker_registration_failed', properties: { error: err.message } });
      return false;
    }
  },

  async subscribeUserToPush(userId: string): Promise<PushSubscription | null> {
    const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;

    if (!vapidPublicKey || !/^[A-Za-z0-9\-_]+={0,2}$/.test(vapidPublicKey)) {
      handleError(null, 'VAPID Public Key is missing or invalid. Cannot subscribe.');
      return null;
    }

    if (Notification.permission !== 'granted') {
      handleError(null, 'Notification permission not granted. Please allow notifications to subscribe.');
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
      
      const pushSubJson = subscription.toJSON() as PushSubscription;

      // Save subscription to Supabase
      const subscriptionInsert: PushSubscriptionInsert = {
        user_id: userId,
        subscription: pushSubJson,
      };

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(subscriptionInsert, { onConflict: 'user_id, subscription->>endpoint' });

      if (error) {
        logSupabaseError('subscribeUserToPush - DB Save', error);
        // Non-critical error, but log it
        AnalyticsService.trackEvent({ name: 'push_subscribe_db_save_failed', properties: { userId, error: error.message } });
        return null;
      }

      AnalyticsService.trackEvent({ name: 'push_subscribed', properties: { userId, endpoint: subscription.endpoint } });
      return pushSubJson;
    } catch (err: any) {
      handleError(err, 'Failed to subscribe to push notifications. Please ensure your VAPID keys are correct and try again.');
      AnalyticsService.trackEvent({ name: 'push_subscribe_unexpected_error', properties: { error: err.message } });
      return null;
    }
  },

  async unsubscribeWebPush(userId: string): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }
      
      // Remove all subscriptions for this user/endpoint combination from DB
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('subscription->>endpoint', subscription?.endpoint || '');

      if (error) {
        logSupabaseError('unsubscribeWebPush - DB Delete', error);
        AnalyticsService.trackEvent({ name: 'push_unsubscribe_db_delete_failed', properties: { userId, error: error.message } });
        return false;
      }

      AnalyticsService.trackEvent({ name: 'push_unsubscribed', properties: { userId } });
      return true;
    } catch (err: any) {
      handleError(err, 'Failed to unsubscribe from push notifications.');
      AnalyticsService.trackEvent({ name: 'push_unsubscribe_failed', properties: { userId, error: err.message } });
      return false;
    }
  },

  // --- Alert Management (Kept from previous implementation) ---

  async createAlert(alert: NewAlert): Promise<AlertRow | null> {
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
      return data;
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

  async fetchAlerts(): Promise<AlertRow[]> {
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
      return data;
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