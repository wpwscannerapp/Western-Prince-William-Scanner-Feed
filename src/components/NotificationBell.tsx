import React, { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window && user) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          setIsSubscribed(!!subscription);
        });
      });
    } else if (!user) {
      setIsSubscribed(false); // Not subscribed if not logged in
    }
  }, [user]);

  const manageSubscription = async (action: 'subscribe' | 'unsubscribe', subscription?: PushSubscription) => {
    if (!user) {
      toast.error('You must be logged in to manage notifications.');
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action, subscription },
      });

      if (error) {
        console.error(`Error ${action}ing subscription:`, error);
        toast.error(`Failed to ${action} to notifications: ${error.message}`);
        return false;
      }

      toast.success(data.message);
      return true;
    } catch (error: any) {
      console.error(`Unexpected error during ${action} subscription:`, error);
      toast.error(`An unexpected error occurred: ${error.message}`);
      return false;
    }
  };

  const subscribeUser = async () => {
    if (!('serviceWorker' in navigator && 'PushManager' in window)) {
      toast.error('Push notifications are not supported by your browser.');
      return;
    }
    if (!user) {
      toast.error('Please log in to subscribe to notifications.');
      return;
    }

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY || ''),
      });

      const success = await manageSubscription('subscribe', subscription);
      if (success) {
        setIsSubscribed(true);
      }
    } catch (error: any) {
      console.error('Failed to subscribe the user:', error);
      if (Notification.permission === 'denied') {
        toast.error('Notifications are blocked. Please enable them in your browser settings.');
      } else {
        toast.error('Failed to subscribe to notifications. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeUser = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const success = await manageSubscription('unsubscribe', subscription);
        if (success) {
          await subscription.unsubscribe();
          setIsSubscribed(false);
        }
      } else {
        toast.info('No active subscription found to unsubscribe.');
        setIsSubscribed(false); // Ensure state is correct even if no subscription was found locally
      }
    } catch (error: any) {
      console.error('Failed to unsubscribe the user:', error);
      toast.error('Failed to unsubscribe from notifications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSubscription = () => {
    if (isSubscribed) {
      unsubscribeUser();
    } else {
      subscribeUser();
    }
  };

  // Utility function to convert VAPID key
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Disable button if user is not logged in
  const isDisabled = isLoading || !user;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggleSubscription}
      disabled={isDisabled}
      className="tw-text-muted-foreground hover:tw-text-primary"
    >
      {isSubscribed ? <Bell className="tw-h-5 tw-w-5" /> : <BellOff className="tw-h-5 tw-w-5" />}
      <span className="tw-sr-only">{isSubscribed ? 'Disable notifications' : 'Enable notifications'}</span>
    </Button>
  );
};

export default NotificationBell;