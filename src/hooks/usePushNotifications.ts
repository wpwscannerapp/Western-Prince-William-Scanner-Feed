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
    if (!user || !isSupported) {
      setIsSubscribed(false);
      setIsLoading(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported]);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    setPermissionStatus(Notification.permission);

    if (supported && authReady) {
      NotificationService.ensureWebPushReady().then(ready => {
        if (ready) {
          checkSubscriptionStatus();
        } else {
          setIsLoading(false);
        }
      });
    } else if (authReady) {
      setIsLoading(false);
    }
  }, [authReady, checkSubscriptionStatus]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
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
    } else {
      toast.info('Notification permission denied or dismissed.');
      AnalyticsService.trackEvent({ name: 'notification_permission_denied' });
    }
    return permission;
  }, [permissionStatus]);

  const subscribe = useCallback(async () => {
    if (!user || !isSupported) return;

    setIsLoading(true);
    const permission = await requestPermission();

    if (permission === 'granted') {
      toast.loading('Subscribing to push notifications...', { id: 'push-sub' });
      const subscription = await NotificationService.subscribeUserToPush(user.id);
      
      if (subscription) {
        setIsSubscribed(true);
        toast.success('Successfully subscribed to real-time alerts!', { id: 'push-sub' });
      } else {
        setIsSubscribed(false);
        toast.error('Failed to subscribe. Check console for details.', { id: 'push-sub' });
      }
    } else {
      toast.error('Cannot subscribe without notification permission.');
    }
    setIsLoading(false);
  }, [user, isSupported, requestPermission]);

  const unsubscribe = useCallback(async () => {
    if (!user || !isSupported) return;

    setIsLoading(true);
    toast.loading('Unsubscribing from push notifications...', { id: 'push-unsub' });
    const success = await NotificationService.unsubscribeWebPush(user.id);

    if (success) {
      setIsSubscribed(false);
      toast.success('Successfully unsubscribed from alerts.', { id: 'push-unsub' });
    } else {
      toast.error('Failed to unsubscribe.', { id: 'push-unsub' });
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