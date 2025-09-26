import React, { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const NotificationBell: React.FC = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, []);

  const subscribeUser = async () => {
    if (!('serviceWorker' in navigator && 'PushManager' in window)) {
      toast.error('Push notifications are not supported by your browser.');
      return;
    }

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY || ''),
      });

      // TODO: Send subscription to your backend server
      console.log('Push subscription:', JSON.stringify(subscription));
      toast.success('Successfully subscribed to notifications!');
      setIsSubscribed(true);
    } catch (error) {
      console.error('Failed to subscribe the user:', error);
      toast.error('Failed to subscribe to notifications. Please try again.');
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
        await subscription.unsubscribe();
        // TODO: Remove subscription from your backend server
        toast.success('Successfully unsubscribed from notifications.');
        setIsSubscribed(false);
      }
    } catch (error) {
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

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggleSubscription}
      disabled={isLoading}
      className="tw-text-muted-foreground hover:tw-text-primary"
    >
      {isSubscribed ? <Bell className="tw-h-5 tw-w-5" /> : <BellOff className="tw-h-5 tw-w-5" />}
      <span className="tw-sr-only">{isSubscribed ? 'Disable notifications' : 'Enable notifications'}</span>
    </Button>
  );
};

export default NotificationBell;