"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { handleError } from '@/utils/errorHandler';
import { AnalyticsService } from '@/services/AnalyticsService';
import { NotificationSettingsFormValues, UseNotificationPermissionsResult } from './types';

// --- Custom Hooks ---

const useNotificationPermissions = (): UseNotificationPermissionsResult => {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    setNotificationPermission(Notification.permission);
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      handleError(null, 'Notifications are not supported by your browser.');
      AnalyticsService.trackEvent({ name: 'notification_permission_request_failed', properties: { reason: 'not_supported' } });
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success('Notification permission granted!');
        AnalyticsService.trackEvent({ name: 'notification_permission_granted' });
      } else {
        toast.info('Notification permission denied or dismissed.');
        AnalyticsService.trackEvent({ name: 'notification_permission_denied' });
      }
      return permission;
    } catch (err) {
      handleError(err, 'Failed to request notification permission.');
      AnalyticsService.trackEvent({ name: 'notification_permission_request_error', properties: { error: (err as Error).message } });
      return 'denied';
    }
  }, []);

  return { notificationPermission, requestNotificationPermission };
};

// --- Component ---

interface NotificationPreferencesProps {
  isFormDisabled: boolean;
}

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ isFormDisabled }) => {
  const { watch, setValue } = useFormContext<NotificationSettingsFormValues>();
  const enabled = watch('enabled');
  const preferPushNotifications = watch('prefer_push_notifications');
  const { notificationPermission, requestNotificationPermission } = useNotificationPermissions();

  return (
    <>
      <div className="tw-flex tw-items-center tw-justify-between">
        <Label htmlFor="enabled" className="tw-text-base">Enable Push Notifications</Label>
        <Switch
          id="enabled"
          checked={enabled}
          onCheckedChange={async (checked) => {
            setValue('enabled', checked);
            if (checked && notificationPermission === 'default') {
              const permission = await requestNotificationPermission();
              if (permission !== 'granted') {
                setValue('enabled', false);
                toast.error('Notifications disabled due to permission denial.');
              }
            }
          }}
          disabled={isFormDisabled || notificationPermission === 'denied'}
          aria-label="Toggle push notifications"
        />
      </div>
      {notificationPermission === 'denied' && (
        <p className="tw-text-destructive tw-text-sm tw-flex tw-items-center tw-gap-1">
          <XCircle className="tw-h-4 tw-w-4" aria-hidden="true" /> Notifications are blocked by your browser. Please enable them in your browser settings.
        </p>
      )}
      {notificationPermission === 'default' && enabled && (
        <p className="tw-text-yellow-600 tw-text-sm tw-flex tw-items-center tw-gap-1">
          <Info className="tw-h-4 tw-w-4" aria-hidden="true" /> Browser permission pending. Click "Save Settings" to prompt for permission.
        </p>
      )}
      {notificationPermission === 'granted' && enabled && (
        <p className="tw-text-green-600 tw-text-sm tw-flex tw-items-center tw-gap-1">
          <CheckCircle2 className="tw-h-4 tw-w-4" aria-hidden="true" /> Notifications are enabled and granted by your browser.
        </p>
      )}

      <div className="tw-flex tw-items-center tw-justify-between">
        <Label htmlFor="prefer_push_notifications" className="tw-text-base">Prefer Push Notifications (Suppress in-app toasts)</Label>
        <Switch
          id="prefer_push_notifications"
          checked={preferPushNotifications}
          onCheckedChange={(checked) => setValue('prefer_push_notifications', checked)}
          disabled={isFormDisabled || !enabled}
          aria-label="Toggle preference for push notifications over in-app toasts"
        />
      </div>
    </>
  );
};