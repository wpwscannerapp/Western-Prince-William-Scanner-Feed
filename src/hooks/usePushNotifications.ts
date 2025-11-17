"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NotificationService } from '@/services/NotificationService';
import { toast } from 'sonner';
import { AnalyticsService } from '@/services/AnalyticsService';

interface UsePushNotificationsResult {
  isSupported: boolean;
  isSubscribed: boolean;
  permissionStatus: NotificationPermission;
  isLoading: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const { user, authReady } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(true);

  const checkSubscriptionStatus = useCallback(async () => {
    if (import.meta.env.DEV) console.log('usePushNotifications: checkSubscriptionStatus called.');
    if (!user || !isSupported) {
      if (import.meta.env.DEV) console.log('usePushNotifications: Not checking subscription (no user or not supported).');
      setIsSubscribed(false);
      setIsLoading(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const newIsSubscribed = !!subscription;
      if (import.meta.env.DEV) console.log('usePushNotifications: PushManager.getSubscription() result:', subscription, '-> isSubscribed:', newIsSubscribed);
      setIsSubscribed(newIsSubscribed);
    } catch (error) {
      console.error('usePushNotifications: Error checking subscription status:', error);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported]);

  useEffect(() => {
    if (import.meta.env.DEV) console.log('usePushNotifications: useEffect for initial setup triggered.');
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    setPermissionStatus(Notification.permission);
    if (import.meta.env.DEV) console.log('usePushNotifications: Initial support:', supported, 'Permission:', Notification.permission);

    if (supported && authReady) {
      if (import.meta.env.DEV) console.log('usePushNotifications: Supported and Auth Ready, ensuring Web Push is ready.');
      NotificationService.ensureWebPushReady().then(ready => {
        if (ready) {
          if (import.meta.env.DEV) console.log('usePushNotifications: Web Push ready, checking subscription status.');
          checkSubscriptionStatus();
        } else {
          if (import.meta.env.DEV) console.log('usePushNotifications: Web Push not ready.');
          setIsLoading(false);
        }
      });
    } else if (authReady) {
      if (import.meta.env.DEV) console.log('usePushNotifications: Auth Ready but not supported, or not checking.');
      setIsLoading(false);
    }
  }, [authReady, checkSubscriptionStatus]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (import.meta.env.DEV) console.log('usePushNotifications: requestPermission called. Current status:', permissionStatus);
    if (permissionStatus === 'denied') {
      toast.error('Notifications are blocked by your browser. Please enable them manually.');
      return 'denied';
    }
    if (permissionStatus === 'granted') {
      return 'granted';
    }

    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
    if (permission === 'granted') {
      toast.success('Notification permission granted!');
      AnalyticsService.trackEvent({ name: 'notification_permission_granted' });
      if (import.meta.env.DEV) console.log('usePushNotifications: Notification permission granted.');
    } else {
      toast.info('Notification permission denied or dismissed.');
      AnalyticsService.trackEvent({ name: 'notification_permission_denied' });
      if (import.meta.env.DEV) console.log('usePushNotifications: Notification permission denied or dismissed.');
    }
    return permission;
  }, [permissionStatus]);

  const subscribe = useCallback(async () => {
    if (import.meta.env.DEV) console.log('usePushNotifications: subscribe called.');
    if (!user || !isSupported) {
      if (import.meta.env.DEV) console.warn('usePushNotifications: Cannot subscribe (no user or not supported).');
      return;
    }

    setIsLoading(true);
    const permission = await requestPermission();

    if (permission === 'granted') {
      toast.loading('Subscribing to push notifications...', { id: 'push-sub' });
      const subscription = await NotificationService.subscribeUserToPush(user.id);
      
      if (subscription) {
        setIsSubscribed(true);
        toast.success('Successfully subscribed to real-time alerts!', { id: 'push-sub' });
        if (import.meta.env.DEV) console.log('usePushNotifications: Successfully subscribed.');
      } else {
        setIsSubscribed(false);
        toast.error('Failed to subscribe. Check console for details.', { id: 'push-sub' });
        if (import.meta.env.DEV) console.error('usePushNotifications: Failed to subscribe.');
      }
    } else {
      toast.error('Cannot subscribe without notification permission.');
      if (import.meta.env.DEV) console.warn('usePushNotifications: Cannot subscribe without permission.');
    }
    setIsLoading(false);
  }, [user, isSupported, requestPermission]);

  const unsubscribe = useCallback(async () => {
    if (import.meta.env.DEV) console.log('usePushNotifications: unsubscribe called.');
    if (!user || !isSupported) {
      if (import.meta.env.DEV) console.warn('usePushNotifications: Cannot unsubscribe (no user or not supported).');
      return;
    }

    setIsLoading(true);
    toast.loading('Unsubscribing from push notifications...', { id: 'push-unsub' });
    const success = await NotificationService.unsubscribeWebPush(user.id);

    if (success) {
      setIsSubscribed(false);
      toast.success('Successfully unsubscribed from alerts.', { id: 'push-unsub' });
      if (import.meta.env.DEV) console.log('usePushNotifications: Successfully unsubscribed.');
    } else {
      toast.error('Failed to unsubscribe.', { id: 'push-unsub' });
      if (import.meta.env.DEV) console.error('usePushNotifications: Failed to unsubscribe.');
    }
    setIsLoading(false);
  }, [user, isSupported]);

  return {
    isSupported,
    isSubscribed,
    permissionStatus,
    isLoading,
    subscribe,
    unsubscribe,
  };
}