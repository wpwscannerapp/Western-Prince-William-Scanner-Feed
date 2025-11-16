"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { AnalyticsService } from '@/services/AnalyticsService';

const NotificationSettingsForm: React.FC = () => {
  const { user } = useAuth();
  const {
    isSupported,
    isSubscribed,
    permissionStatus,
    isLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const handleToggleSubscription = () => {
    if (isSubscribed) {
      unsubscribe();
      AnalyticsService.trackEvent({ name: 'notification_toggle_off' });
    } else {
      subscribe();
      AnalyticsService.trackEvent({ name: 'notification_toggle_on' });
    }
  };

  if (!user) {
    return (
      <Card className="tw-bg-card tw-border-border tw-shadow-lg">
        <CardContent className="tw-py-8 tw-text-center">
          <p className="tw-text-destructive">You must be logged in to manage notification settings.</p>
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card className="tw-bg-card tw-border-border tw-shadow-lg">
        <CardContent className="tw-py-8 tw-text-center">
          <p className="tw-text-destructive tw-flex tw-items-center tw-justify-center tw-gap-2">
            <XCircle className="tw-h-5 tw-w-5" /> Push Notifications are not supported by your browser.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="tw-bg-card tw-border-border tw-shadow-lg">
      <CardHeader>
        <CardTitle className="tw-xl tw-font-bold tw-text-foreground tw-flex tw-items-center tw-gap-2">
          <Bell className="tw-h-6 tw-w-6 tw-text-primary" /> Push Notification Settings
        </CardTitle>
        <CardDescription className="tw-text-muted-foreground">
          Receive real-time alerts directly to your device, even when the app is closed.
        </CardDescription>
      </CardHeader>
      <CardContent className="tw-space-y-4">
        <div className="tw-flex tw-items-center tw-justify-between tw-p-3 tw-border tw-rounded-md">
          <div className="tw-space-y-1">
            <p className="tw-font-medium tw-text-foreground">Subscription Status</p>
            {isSubscribed ? (
              <span className="tw-text-sm tw-text-green-600 tw-flex tw-items-center tw-gap-1">
                <CheckCircle2 className="tw-h-4 tw-w-4" /> Subscribed and Active
              </span>
            ) : (
              <span className="tw-text-sm tw-text-destructive tw-flex tw-items-center tw-gap-1">
                <XCircle className="tw-h-4 tw-w-4" /> Not Subscribed
              </span>
            )}
          </div>
          <Button
            onClick={handleToggleSubscription}
            disabled={isLoading || permissionStatus === 'denied'}
            className={isSubscribed ? 'tw-bg-destructive hover:tw-bg-destructive/90' : 'tw-bg-primary hover:tw-bg-primary/90'}
          >
            {isLoading && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
            {isSubscribed ? 'Unsubscribe' : 'Subscribe Now'}
          </Button>
        </div>

        <div className="tw-p-3 tw-border tw-rounded-md tw-bg-muted/20 tw-space-y-2">
          <p className="tw-font-medium tw-text-foreground">Browser Permission</p>
          {permissionStatus === 'granted' && (
            <p className="tw-text-sm tw-text-green-600 tw-flex tw-items-center tw-gap-1">
              <CheckCircle2 className="tw-h-4 tw-w-4" /> Granted
            </p>
          )}
          {permissionStatus === 'denied' && (
            <p className="tw-text-sm tw-text-destructive tw-flex tw-items-center tw-gap-1">
              <XCircle className="tw-h-4 tw-w-4" /> Denied (Must be enabled in browser settings)
            </p>
          )}
          {permissionStatus === 'default' && (
            <p className="tw-text-sm tw-text-yellow-600 tw-flex tw-items-center tw-gap-1">
              <Bell className="tw-h-4 tw-w-4" /> Pending (Click Subscribe to prompt)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettingsForm;