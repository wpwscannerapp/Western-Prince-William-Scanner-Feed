"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BellRing, CheckCircle2, XCircle, Info, Clock, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { NotificationService } from '@/services/NotificationService';
import { handleError } from '@/utils/errorHandler';
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsService } from '@/services/AnalyticsService';
import { PushSubJson, NotificationSettingsUpdate, NotificationSettingsInsert } from '@/types/supabase';

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const IDLE_TIMEOUT_MS = 300000; // 5 minutes

const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
  receive_all_alerts: z.boolean(),
  prefer_push_notifications: z.boolean(),
  preferred_start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional().or(z.literal('')),
  preferred_end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional().or(z.literal('')),
  preferred_days: z.array(z.string()),
});

export type NotificationSettingsFormValues = z.infer<typeof notificationSettingsSchema>;

interface NotificationSettingsFormProps {
  isWebPushInitialized: boolean;
}

// --- Custom Hooks ---

interface UseNotificationPermissionsResult {
  notificationPermission: NotificationPermission;
  requestNotificationPermission: () => Promise<NotificationPermission>;
}

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

interface UseRealtimeAlertsResult {
  alertRealtimeStatus: 'active' | 'failed' | 'connecting';
}

const useRealtimeAlerts = (user: any, preferPushNotifications: boolean): UseRealtimeAlertsResult => {
  const [alertRealtimeStatus, setAlertRealtimeStatus] = useState<'active' | 'failed' | 'connecting'>('connecting');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    idleTimeoutRef.current = setTimeout(() => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setAlertRealtimeStatus('connecting'); // Indicate that it's trying to reconnect or is idle
        toast.info('Real-time alerts unsubscribed due to inactivity. Will resubscribe on new activity.', { duration: 3000 });
        AnalyticsService.trackEvent({ name: 'realtime_alerts_auto_unsubscribed_idle' });
      }
    }, IDLE_TIMEOUT_MS);
  }, []);

  const subscribeToAlerts = useCallback(() => {
    if (!user) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    setAlertRealtimeStatus('connecting');
    channelRef.current = supabase
      .channel('public:alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        resetIdleTimer();
        if (!preferPushNotifications) {
          toast.info(`New Alert: ${payload.new.title}`, {
            description: payload.new.description,
            duration: 5000,
          });
        }
        AnalyticsService.trackEvent({ name: 'realtime_alert_received_in_app', properties: { alertId: payload.new.id, type: payload.new.type, toastShown: !preferPushNotifications } });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setAlertRealtimeStatus('active');
          toast.success('Real-time alerts connection active!', { id: 'alert-rt-status', duration: 3000 });
          AnalyticsService.trackEvent({ name: 'realtime_alerts_subscribed' });
          resetIdleTimer();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setAlertRealtimeStatus('failed');
          toast.error('Real-time alerts connection failed. Please refresh.', { id: 'alert-rt-status', duration: 5000 });
          AnalyticsService.trackEvent({ name: 'realtime_alerts_subscription_failed', properties: { status } });
        } else if (status === 'CLOSED' || status === 'UNSUBSCRIBED') {
          setAlertRealtimeStatus('failed');
          AnalyticsService.trackEvent({ name: 'realtime_alerts_unsubscribed_or_closed', properties: { status } });
        }
      });
  }, [user, preferPushNotifications, resetIdleTimer]);

  useEffect(() => {
    subscribeToAlerts();

    return () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setAlertRealtimeStatus('connecting');
      AnalyticsService.trackEvent({ name: 'realtime_alerts_component_unmounted' });
    };
  }, [user, preferPushNotifications, subscribeToAlerts]);

  return { alertRealtimeStatus };
};

// --- Smaller Components ---

interface NotificationPreferenceSwitchesProps {
  isFormDisabled: boolean;
  notificationPermission: NotificationPermission;
  requestNotificationPermission: () => Promise<NotificationPermission>;
}

const NotificationPreferenceSwitches: React.FC<NotificationPreferenceSwitchesProps> = ({
  isFormDisabled,
  notificationPermission,
  requestNotificationPermission,
}) => {
  const { watch, setValue } = useFormContext<NotificationSettingsFormValues>();
  const enabled = watch('enabled');
  const preferPushNotifications = watch('prefer_push_notifications');

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

interface NotificationCustomizationFieldsProps {
  isCustomizationDisabled: boolean;
}

const NotificationCustomizationFields: React.FC<NotificationCustomizationFieldsProps> = ({
  isCustomizationDisabled,
}) => {
  const { watch, setValue, formState: { errors }, getValues } = useFormContext<NotificationSettingsFormValues>();
  const preferredDays = watch('preferred_days');

  const handleToggleDay = (day: string) => {
    const currentDays = getValues('preferred_days');
    if (currentDays.includes(day)) {
      setValue('preferred_days', currentDays.filter((d: string) => d !== day));
      AnalyticsService.trackEvent({ name: 'notification_preferred_day_removed', properties: { day } });
    } else {
      setValue('preferred_days', [...currentDays, day]);
      AnalyticsService.trackEvent({ name: 'notification_preferred_day_added', properties: { day } });
    }
  };

  return (
    <div className="tw-space-y-4 tw-p-4 tw-border tw-rounded-md tw-bg-muted/20">
      <p className="tw-text-sm tw-text-muted-foreground tw-flex tw-items-center tw-gap-1">
        <Info className="tw-h-4 tw-w-4" aria-hidden="true" /> Customize when you want to receive alerts.
      </p>
      <div>
        <Label htmlFor="preferred_start_time" className="tw-mb-2 tw-block tw-flex tw-items-center tw-gap-2">
          <Clock className="tw-h-4 tw-w-4" aria-hidden="true" /> Start Time (UTC)
        </Label>
        <Input
          id="preferred_start_time"
          type="time"
          {...getValues('preferred_start_time')} // Use getValues for register-like behavior
          onChange={(e) => setValue('preferred_start_time', e.target.value)}
          className="tw-bg-input tw-text-foreground"
          disabled={isCustomizationDisabled}
          aria-invalid={errors.preferred_start_time ? "true" : "false"}
          aria-describedby={errors.preferred_start_time ? "start-time-error" : undefined}
        />
        {errors.preferred_start_time && (
          <p id="start-time-error" className="tw-text-destructive tw-text-sm tw-mt-1">{errors.preferred_start_time.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="preferred_end_time" className="tw-mb-2 tw-block tw-flex tw-items-center tw-gap-2">
          <Clock className="tw-h-4 tw-w-4" aria-hidden="true" /> End Time (UTC)
        </Label>
        <Input
          id="preferred_end_time"
          type="time"
          {...getValues('preferred_end_time')} // Use getValues for register-like behavior
          onChange={(e) => setValue('preferred_end_time', e.target.value)}
          className="tw-bg-input tw-text-foreground"
          disabled={isCustomizationDisabled}
          aria-invalid={errors.preferred_end_time ? "true" : "false"}
          aria-describedby={errors.preferred_end_time ? "end-time-error" : undefined}
        />
        {errors.preferred_end_time && (
          <p id="end-time-error" className="tw-text-destructive tw-text-sm tw-mt-1">{errors.preferred_end_time.message}</p>
        )}
      </div>
      <div>
        <Label className="tw-mb-2 tw-block tw-flex tw-items-center tw-gap-2">
          <CalendarDays className="tw-h-4 tw-w-4" aria-hidden="true" /> Preferred Days
        </Label>
        <div className="tw-flex tw-flex-wrap tw-gap-2" role="group" aria-label="Preferred days for notifications">
          {daysOfWeek.map(day => (
            <Button
              key={day}
              type="button"
              variant={preferredDays.includes(day) ? 'default' : 'outline'}
              onClick={() => handleToggleDay(day)}
              disabled={isCustomizationDisabled}
              className={preferredDays.includes(day) ? 'tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground' : 'tw-text-muted-foreground hover:tw-text-primary'}
              aria-pressed={preferredDays.includes(day)}
              aria-label={`Toggle ${day} for notifications`}
            >
              {day}
            </Button>
          ))}
        </div>
        {errors.preferred_days && (
          <p className="tw-text-destructive tw-text-sm tw-mt-1">{errors.preferred_days.message}</p>
        )}
      </div>
    </div>
  );
};

// --- Main Component ---

const NotificationSettingsForm: React.FC<NotificationSettingsFormProps> = ({ isWebPushInitialized }) => {
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { notificationPermission, requestNotificationPermission } = useNotificationPermissions();
  const { alertRealtimeStatus } = useRealtimeAlerts(user, form.watch('prefer_push_notifications'));

  const form = useForm<NotificationSettingsFormValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      enabled: false,
      receive_all_alerts: true,
      prefer_push_notifications: false,
      preferred_start_time: '',
      preferred_end_time: '',
      preferred_days: [],
    },
  });

  const { handleSubmit, reset, watch, setValue } = form;
  const enabled = watch('enabled');
  const receiveAllAlerts = watch('receive_all_alerts');
  const preferPushNotifications = watch('prefer_push_notifications');

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const settings = await NotificationService.getUserNotificationSettings(user.id);
      if (settings) {
        reset({
          enabled: settings.enabled ?? false,
          receive_all_alerts: settings.receive_all_alerts ?? true,
          prefer_push_notifications: settings.prefer_push_notifications ?? false,
          preferred_start_time: settings.preferred_start_time?.substring(0, 5) ?? '',
          preferred_end_time: settings.preferred_end_time?.substring(0, 5) ?? '',
          preferred_days: settings.preferred_days ?? [],
        });
        AnalyticsService.trackEvent({ name: 'notification_settings_loaded', properties: { userId: user.id, enabled: settings.enabled, preferPush: settings.prefer_push_notifications, receiveAll: settings.receive_all_alerts } });
      } else {
        reset({
          enabled: false,
          receive_all_alerts: true,
          prefer_push_notifications: false,
          preferred_start_time: '',
          preferred_end_time: '',
          preferred_days: [],
        });
        AnalyticsService.trackEvent({ name: 'notification_settings_not_found_default_applied', properties: { userId: user.id } });
      }
    } catch (err) {
      handleError(err, 'Failed to load notification settings.');
      AnalyticsService.trackEvent({ name: 'notification_settings_load_failed', properties: { userId: user.id, error: (err as Error).message } });
    } finally {
      setIsLoading(false);
    }
  }, [user, reset]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchSettings();
    }
  }, [user, authLoading, fetchSettings]);

  const onSubmit = async (values: NotificationSettingsFormValues) => {
    if (!user) {
      handleError(null, 'You must be logged in to save settings.');
      AnalyticsService.trackEvent({ name: 'save_notification_settings_failed', properties: { reason: 'not_logged_in' } });
      return;
    }
    if (!isWebPushInitialized) {
      handleError(null, 'Web Push API not ready. Please ensure your browser supports Service Workers and VAPID keys are configured.');
      AnalyticsService.trackEvent({ name: 'save_notification_settings_failed', properties: { reason: 'web_push_not_initialized' } });
      return;
    }

    setIsSaving(true);
    toast.loading('Saving notification settings...', { id: 'save-settings' });
    try {
      let pushSubscription: PushSubJson | null = null;
      let notificationsEnabledInDb = values.enabled;

      if (values.enabled) {
        if (notificationPermission !== 'granted') {
          const permission = await requestNotificationPermission();
          if (permission !== 'granted') {
            notificationsEnabledInDb = false;
            throw new Error('permission_denied');
          }
        }
        const subscription = await NotificationService.subscribeUserToPush();
        if (!subscription) {
          notificationsEnabledInDb = false;
          throw new Error('subscription_failed');
        }
        pushSubscription = subscription;
      } else {
        const unsubscribed = await NotificationService.unsubscribeWebPush(user.id);
        if (!unsubscribed) {
          throw new Error('unsubscribe_failed');
        }
        pushSubscription = null;
        notificationsEnabledInDb = false;
      }

      const updates: NotificationSettingsUpdate = {
        ...values,
        enabled: notificationsEnabledInDb,
        push_subscription: pushSubscription,
        preferred_start_time: values.preferred_start_time ? `${values.preferred_start_time}:00` : null,
        preferred_end_time: values.preferred_end_time ? `${values.preferred_end_time}:00` : null,
      };

      const updatedSettings = await NotificationService.updateUserNotificationSettings(user.id, updates);

      if (updatedSettings) {
        toast.success('Settings saved successfully!', { id: 'save-settings' });
        reset({
          enabled: updatedSettings.enabled ?? false,
          receive_all_alerts: updatedSettings.receive_all_alerts ?? true,
          prefer_push_notifications: updatedSettings.prefer_push_notifications ?? false,
          preferred_start_time: updatedSettings.preferred_start_time?.substring(0, 5) ?? '',
          preferred_end_time: updatedSettings.preferred_end_time?.substring(0, 5) ?? '',
          preferred_days: updatedSettings.preferred_days ?? [],
        });
        AnalyticsService.trackEvent({ name: 'notification_settings_saved', properties: { userId: user.id, enabled: updatedSettings.enabled, preferPush: updatedSettings.prefer_push_notifications, receiveAll: updatedSettings.receive_all_alerts } });
      } else {
        throw new Error('database_update_failed');
      }
    } catch (err: any) {
      const errorMessages: Record<string, string> = {
        permission_denied: 'Notification permission was not granted. Please enable notifications in your browser settings.',
        subscription_failed: 'Failed to subscribe to push notifications. Please check your browser settings and try again.',
        unsubscribe_failed: 'Failed to unsubscribe from push notifications. Please try again.',
        database_update_failed: 'Failed to save settings. Please try again later.',
      };
      handleError(err, errorMessages[err.message] || 'An unexpected error occurred while saving settings.', { id: 'save-settings' });
      AnalyticsService.trackEvent({ name: 'save_notification_settings_failed', properties: { userId: user?.id, reason: err.message, error: (err as Error).message } });
      if (err.message === 'permission_denied') {
        setValue('enabled', false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isFormDisabled = isSaving || !isWebPushInitialized;
  const isCustomizationDisabled = isFormDisabled || !enabled || receiveAllAlerts;

  if (authLoading || isLoading || !isWebPushInitialized) {
    return (
      <Card className="tw-bg-card tw-border-border tw-shadow-lg">
        <CardContent className="tw-py-8 tw-text-center">
          <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary tw-mx-auto" aria-label="Loading notification settings" />
          <p className="tw-mt-2 tw-text-muted-foreground">Loading notification settings...</p>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="tw-bg-card tw-border-border tw-shadow-lg">
        <CardContent className="tw-py-8 tw-text-center">
          <p className="tw-text-destructive">Please log in to manage your notification settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="tw-bg-card tw-border-border tw-shadow-lg">
      <CardHeader>
        <CardTitle className="tw-xl tw-font-bold tw-text-foreground tw-flex tw-items-center tw-gap-2">
          <BellRing className="tw-h-6 tw-w-6 tw-text-primary" aria-hidden="true" /> Notification Settings
        </CardTitle>
        <CardDescription className="tw-text-muted-foreground">
          Customize how you receive real-time emergency alerts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="tw-space-y-6">
          {!isWebPushInitialized && (
            <div className="tw-bg-yellow-100 tw-border-l-4 tw-border-yellow-500 tw-text-yellow-700 tw-p-4 tw-mb-4" role="alert">
              <p className="tw-font-bold">Web Push Not Ready</p>
              <p>Push notification features are temporarily unavailable. Please ensure your browser supports Service Workers and VAPID keys are configured.</p>
            </div>
          )}
          
          <NotificationPreferenceSwitches
            isFormDisabled={isFormDisabled}
            notificationPermission={notificationPermission}
            requestNotificationPermission={requestNotificationPermission}
          />

          <div className="tw-flex tw-items-center tw-gap-2 tw-text-sm">
            <span className="tw-font-medium">Real-time Alerts Status:</span>
            {alertRealtimeStatus === 'connecting' && (
              <span className="tw-flex tw-items-center tw-gap-1 tw-text-muted-foreground">
                <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" /> Connecting...
              </span>
            )}
            {alertRealtimeStatus === 'active' && (
              <span className="tw-flex tw-items-center tw-gap-1 tw-text-green-600">
                <CheckCircle2 className="tw-h-4 tw-w-4" aria-hidden="true" /> Active
              </span>
            )}
            {alertRealtimeStatus === 'failed' && (
              <span className="tw-flex tw-items-center tw-gap-1 tw-text-destructive">
                <XCircle className="tw-h-4 tw-w-4" aria-hidden="true" /> Failed
              </span>
            )}
          </div>

          <div className="tw-space-y-2">
            <div className="tw-flex tw-items-center tw-justify-between">
              <Label htmlFor="receive_all_alerts" className="tw-text-base">Receive All Alerts (24/7, no filters)</Label>
              <Switch
                id="receive_all_alerts"
                checked={receiveAllAlerts}
                onCheckedChange={(checked) => {
                  setValue('receive_all_alerts', checked);
                  if (checked) {
                    setValue('preferred_start_time', '');
                    setValue('preferred_end_time', '');
                    setValue('preferred_days', []);
                  }
                }}
                disabled={isFormDisabled || !enabled}
                aria-label="Toggle receiving all alerts 24/7"
            />
            </div>
            <CardDescription className="tw-text-muted-foreground">
              When enabled, you will receive all alerts at all times, regardless of day or time preferences.
            </CardDescription>
          </div>

          {!receiveAllAlerts && enabled && (
            <NotificationCustomizationFields isCustomizationDisabled={isCustomizationDisabled} />
          )}

          <Button type="submit" className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground" disabled={isFormDisabled}>
            {isSaving && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
            Save Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NotificationSettingsForm;