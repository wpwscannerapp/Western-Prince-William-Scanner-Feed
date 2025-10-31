"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
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
import { NotificationService, PushSubscription } from '@/services/NotificationService';
import { handleError } from '@/utils/errorHandler';
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsService } from '@/services/AnalyticsService'; // Import AnalyticsService

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const IDLE_TIMEOUT_MS = 300000; // 5 minutes

const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
  receive_all_alerts: z.boolean(),
  prefer_push_notifications: z.boolean(),
  customize_time_and_days: z.boolean(), // New field
  preferred_start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional().or(z.literal('')),
  preferred_end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional().or(z.literal('')),
  preferred_days: z.array(z.string()),
});

type NotificationSettingsFormValues = z.infer<typeof notificationSettingsSchema>;

interface NotificationSettingsFormProps {
  isWebPushInitialized: boolean;
}

const NotificationSettingsForm: React.FC<NotificationSettingsFormProps> = ({ isWebPushInitialized }) => {
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [alertRealtimeStatus, setAlertRealtimeStatus] = useState<'active' | 'failed' | 'connecting'>('connecting');

  const form = useForm<NotificationSettingsFormValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      enabled: false,
      receive_all_alerts: true,
      prefer_push_notifications: false,
      customize_time_and_days: false, // Default to false
      preferred_start_time: '',
      preferred_end_time: '',
      preferred_days: [],
    },
  });

  const { handleSubmit, reset, watch, setValue, getValues } = form;
  const enabled = watch('enabled');
  const receiveAllAlerts = watch('receive_all_alerts');
  const preferPushNotifications = watch('prefer_push_notifications');
  const customizeTimeAndDays = watch('customize_time_and_days'); // Watch new field
  const preferredDays = watch('preferred_days');

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
          customize_time_and_days: settings.customize_time_and_days ?? false, // Set new field
          preferred_start_time: settings.preferred_start_time?.substring(0, 5) ?? '',
          preferred_end_time: settings.preferred_end_time?.substring(0, 5) ?? '',
          preferred_days: settings.preferred_days ?? [],
        });
        AnalyticsService.trackEvent({ name: 'notification_settings_loaded', properties: { userId: user.id, enabled: settings.enabled, preferPush: settings.prefer_push_notifications, customize: settings.customize_time_and_days } });
      } else {
        reset({
          enabled: false,
          receive_all_alerts: true,
          prefer_push_notifications: false,
          customize_time_and_days: false,
          preferred_start_time: '',
          preferred_end_time: '',
          preferred_days: [],
        });
        AnalyticsService.trackEvent({ name: 'notification_settings_not_found_default_applied', properties: { userId: user.id } });
      }
      setNotificationPermission(Notification.permission);
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

  // Real-time alerts subscription and auto-unsubscribe logic
  useEffect(() => {
    if (!user) return;

    let idleTimeout: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribeToAlerts = () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      setAlertRealtimeStatus('connecting');
      channel = supabase
        .channel('public:alerts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
          // Reset idle timer on new alert
          resetIdleTimer();
          if (!preferPushNotifications) { // Only show toast if push-only mode is NOT preferred
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
            resetIdleTimer(); // Start idle timer after successful subscription
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setAlertRealtimeStatus('failed');
            toast.error('Real-time alerts connection failed. Please refresh.', { id: 'alert-rt-status', duration: 5000 });
            AnalyticsService.trackEvent({ name: 'realtime_alerts_subscription_failed', properties: { status } });
          } else if (status === 'CLOSED' || status === 'UNSUBSCRIBED') {
            setAlertRealtimeStatus('failed');
            AnalyticsService.trackEvent({ name: 'realtime_alerts_unsubscribed_or_closed', properties: { status } });
          }
        });
    };

    const resetIdleTimer = () => {
      if (idleTimeout) {
        clearTimeout(idleTimeout);
      }
      idleTimeout = setTimeout(() => {
        if (channel) {
          supabase.removeChannel(channel);
          setAlertRealtimeStatus('connecting'); // Indicate that it's trying to reconnect or is idle
          toast.info('Real-time alerts unsubscribed due to inactivity. Will resubscribe on new activity.', { duration: 3000 });
          AnalyticsService.trackEvent({ name: 'realtime_alerts_auto_unsubscribed_idle' });
        }
      }, IDLE_TIMEOUT_MS);
    };

    // Initial subscription
    subscribeToAlerts();

    // Cleanup function
    return () => {
      if (idleTimeout) {
        clearTimeout(idleTimeout);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
      setAlertRealtimeStatus('connecting'); // Reset status on unmount
      AnalyticsService.trackEvent({ name: 'realtime_alerts_component_unmounted' });
    };
  }, [user, preferPushNotifications]); // Re-run effect if user or preferPushNotifications changes

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
      let pushSubscription: PushSubscription | null = null;
      let notificationsEnabledInDb = values.enabled;

      if (values.enabled) {
        if (notificationPermission !== 'granted') {
          const permission = await Notification.requestPermission();
          setNotificationPermission(permission);
          if (permission !== 'granted') {
            notificationsEnabledInDb = false;
            throw new Error('permission_denied');
          }
        }
        pushSubscription = await NotificationService.subscribeUserToPush();
        if (!pushSubscription) {
          notificationsEnabledInDb = false;
          throw new Error('subscription_failed');
        }
      } else {
        const unsubscribed = await NotificationService.unsubscribeWebPush(user.id);
        if (!unsubscribed) {
          throw new Error('unsubscribe_failed');
        }
        pushSubscription = null;
        notificationsEnabledInDb = false;
      }

      const updatedSettings = await NotificationService.updateUserNotificationSettings(user.id, {
        ...values,
        enabled: notificationsEnabledInDb,
        push_subscription: pushSubscription,
        preferred_start_time: values.preferred_start_time ? `${values.preferred_start_time}:00` : null,
        preferred_end_time: values.preferred_end_time ? `${values.preferred_end_time}:00` : null,
      });

      if (updatedSettings) {
        toast.success('Settings saved successfully!', { id: 'save-settings' });
        setNotificationPermission(Notification.permission);
        reset({
          ...updatedSettings,
          preferred_start_time: updatedSettings.preferred_start_time?.substring(0, 5) ?? '',
          preferred_end_time: updatedSettings.preferred_end_time?.substring(0, 5) ?? '',
        });
        AnalyticsService.trackEvent({ name: 'notification_settings_saved', properties: { userId: user.id, enabled: updatedSettings.enabled, preferPush: updatedSettings.prefer_push_notifications, customize: updatedSettings.customize_time_and_days } });
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

  const handleToggleDay = (day: string) => {
    const currentDays = getValues('preferred_days');
    if (currentDays.includes(day)) {
      setValue('preferred_days', currentDays.filter((d: string) => d !== day));
      AnalyticsService.trackEvent({ name: 'notification_preferred_day_removed', properties: { userId: user?.id, day } });
    } else {
      setValue('preferred_days', [...currentDays, day]);
      AnalyticsService.trackEvent({ name: 'notification_preferred_day_added', properties: { userId: user?.id, day } });
    }
  };

  const requestNotificationPermission = async () => {
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
  };

  const isFormDisabled = isSaving || !isWebPushInitialized;

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

          <div className="tw-space-y-2">
            <div className="tw-flex tw-items-center tw-justify-between">
              <Label htmlFor="receive_all_alerts" className="tw-text-base">Receive All Alerts (24/7, no filters)</Label>
              <Switch
                id="receive_all_alerts"
                checked={receiveAllAlerts}
                onCheckedChange={(checked) => {
                  setValue('receive_all_alerts', checked);
                  if (checked) {
                    setValue('customize_time_and_days', false); // Disable custom settings if receiving all alerts
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

          <div className="tw-space-y-2">
            <div className="tw-flex tw-items-center tw-justify-between">
              <Label htmlFor="customize_time_and_days" className="tw-text-base">Customize Day and Time</Label>
              <Switch
                id="customize_time_and_days"
                checked={customizeTimeAndDays}
                onCheckedChange={(checked) => setValue('customize_time_and_days', checked)}
                disabled={isFormDisabled || !enabled || receiveAllAlerts} // Disabled if not enabled or receiving all alerts
                aria-label="Toggle custom day and time for alerts"
              />
            </div>
            <CardDescription className="tw-text-muted-foreground">
              When enabled, you can specify preferred days and time ranges for receiving alerts.
            </CardDescription>
          </div>

          {customizeTimeAndDays && enabled && !receiveAllAlerts && (
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
                  {...form.register('preferred_start_time')}
                  className="tw-bg-input tw-text-foreground"
                  disabled={isFormDisabled || !enabled || receiveAllAlerts || !customizeTimeAndDays}
                  aria-invalid={form.formState.errors.preferred_start_time ? "true" : "false"}
                  aria-describedby={form.formState.errors.preferred_start_time ? "start-time-error" : undefined}
                />
                {form.formState.errors.preferred_start_time && (
                  <p id="start-time-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.preferred_start_time.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="preferred_end_time" className="tw-mb-2 tw-block tw-flex tw-items-center tw-gap-2">
                  <Clock className="tw-h-4 tw-w-4" aria-hidden="true" /> End Time (UTC)
                </Label>
                <Input
                  id="preferred_end_time"
                  type="time"
                  {...form.register('preferred_end_time')}
                  className="tw-bg-input tw-text-foreground"
                  disabled={isFormDisabled || !enabled || receiveAllAlerts || !customizeTimeAndDays}
                  aria-invalid={form.formState.errors.preferred_end_time ? "true" : "false"}
                  aria-describedby={form.formState.errors.preferred_end_time ? "end-time-error" : undefined}
                />
                {form.formState.errors.preferred_end_time && (
                  <p id="end-time-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.preferred_end_time.message}</p>
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
                      disabled={isFormDisabled || !enabled || receiveAllAlerts || !customizeTimeAndDays}
                      className={preferredDays.includes(day) ? 'tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground' : 'tw-text-muted-foreground hover:tw-text-primary'}
                      aria-pressed={preferredDays.includes(day)}
                      aria-label={`Toggle ${day} for notifications`}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
                {form.formState.errors.preferred_days && (
                  <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.preferred_days.message}</p>
                )}
              </div>
            </div>
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