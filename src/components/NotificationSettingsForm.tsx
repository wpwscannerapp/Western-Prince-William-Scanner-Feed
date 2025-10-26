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
import { supabase } from '@/integrations/supabase/client'; // Import supabase for real-time

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
  receive_all_alerts: z.boolean(),
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
  const [alertRealtimeStatus, setAlertRealtimeStatus] = useState<'active' | 'failed' | 'connecting'>('connecting'); // New state for real-time status

  const form = useForm<NotificationSettingsFormValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      enabled: false,
      receive_all_alerts: true,
      preferred_start_time: '',
      preferred_end_time: '',
      preferred_days: [],
    },
  });

  const { handleSubmit, reset, watch, setValue, getValues } = form;
  const enabled = watch('enabled');
  const receiveAllAlerts = watch('receive_all_alerts');
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
          preferred_start_time: settings.preferred_start_time?.substring(0, 5) ?? '', // Format to HH:MM
          preferred_end_time: settings.preferred_end_time?.substring(0, 5) ?? '', // Format to HH:MM
          preferred_days: settings.preferred_days ?? [],
        });
      } else {
        reset({
          enabled: false,
          receive_all_alerts: true,
          preferred_start_time: '',
          preferred_end_time: '',
          preferred_days: [],
        });
      }
      setNotificationPermission(Notification.permission);
    } catch (err) {
      handleError(err, 'Failed to load notification settings.');
    } finally {
      setIsLoading(false);
    }
  }, [user, reset]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchSettings();
    }
  }, [user, authLoading, fetchSettings]);

  // Supabase Real-Time Subscription for Alerts
  useEffect(() => {
    const channel = supabase
      .channel('public:alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        // This callback is for UI updates, not for sending push notifications (that's handled by Netlify function)
        // You could add a toast here to show a new alert has been received in the app
        toast.info(`New Alert: ${payload.new.title}`, {
          description: payload.new.description,
          duration: 5000,
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setAlertRealtimeStatus('active');
          toast.success('Real-time alerts connection active!', { id: 'alert-rt-status', duration: 3000 });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setAlertRealtimeStatus('failed');
          toast.error('Real-time alerts connection failed. Please refresh.', { id: 'alert-rt-status', duration: 5000 });
        } else if (status === 'CLOSED') {
          setAlertRealtimeStatus('failed');
        } else if (status === 'UNSUBSCRIBED') {
          setAlertRealtimeStatus('failed');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setAlertRealtimeStatus('connecting'); // Reset status on unmount
    };
  }, []); // Empty dependency array to run once on mount and cleanup on unmount

  const onSubmit = async (values: NotificationSettingsFormValues) => {
    if (!user) {
      handleError(null, 'You must be logged in to save settings.');
      return;
    }
    if (!isWebPushInitialized) {
      handleError(null, 'Web Push API not ready. Please ensure your browser supports Service Workers and VAPID keys are configured.');
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
        // Ensure time values are stored as 'HH:MM:SS' for TIME WITH TIME ZONE
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
    } else {
      setValue('preferred_days', [...currentDays, day]);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      handleError(null, 'Notifications are not supported by your browser.');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success('Notification permission granted!');
      } else {
        toast.info('Notification permission denied or dismissed.');
      }
      return permission;
    } catch (err) {
      handleError(err, 'Failed to request notification permission.');
      return 'denied';
    }
  };

  const isFormDisabled = isSaving || !isWebPushInitialized;

  if (authLoading || isLoading || !isWebPushInitialized) {
    return (
      <Card className="tw-bg-card tw-border-border tw-shadow-lg">
        <CardContent className="tw-py-8 tw-text-center">
          <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary tw-mx-auto" />
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
          <BellRing className="tw-h-6 tw-w-6 tw-text-primary" /> Notification Settings
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
            />
          </div>
          {notificationPermission === 'denied' && (
            <p className="tw-text-destructive tw-text-sm tw-flex tw-items-center tw-gap-1">
              <XCircle className="tw-h-4 tw-w-4" /> Notifications are blocked by your browser. Please enable them in your browser settings.
            </p>
          )}
          {notificationPermission === 'default' && enabled && (
            <p className="tw-text-yellow-600 tw-text-sm tw-flex tw-items-center tw-gap-1">
              <Info className="tw-h-4 tw-w-4" /> Browser permission pending. Click "Save Settings" to prompt for permission.
            </p>
          )}
          {notificationPermission === 'granted' && enabled && (
            <p className="tw-text-green-600 tw-text-sm tw-flex tw-items-center tw-gap-1">
              <CheckCircle2 className="tw-h-4 tw-w-4" /> Notifications are enabled and granted by your browser.
            </p>
          )}

          {/* Real-time alerts status feedback */}
          <div className="tw-flex tw-items-center tw-gap-2 tw-text-sm">
            <span className="tw-font-medium">Real-time Alerts Status:</span>
            {alertRealtimeStatus === 'connecting' && (
              <span className="tw-flex tw-items-center tw-gap-1 tw-text-muted-foreground">
                <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin" /> Connecting...
              </span>
            )}
            {alertRealtimeStatus === 'active' && (
              <span className="tw-flex tw-items-center tw-gap-1 tw-text-green-600">
                <CheckCircle2 className="tw-h-4 tw-w-4" /> Active
              </span>
            )}
            {alertRealtimeStatus === 'failed' && (
              <span className="tw-flex tw-items-center tw-gap-1 tw-text-destructive">
                <XCircle className="tw-h-4 tw-w-4" /> Failed
              </span>
            )}
          </div>

          <div className="tw-flex tw-items-center tw-justify-between">
            <Label htmlFor="receive_all_alerts" className="tw-text-base">Receive All Alerts</Label>
            <Switch
              id="receive_all_alerts"
              checked={receiveAllAlerts}
              onCheckedChange={(checked) => setValue('receive_all_alerts', checked)}
              disabled={isFormDisabled || !enabled}
            />
          </div>
          {!receiveAllAlerts && enabled && (
            <div className="tw-space-y-4 tw-p-4 tw-border tw-rounded-md tw-bg-muted/20">
              <p className="tw-text-sm tw-text-muted-foreground tw-flex tw-items-center tw-gap-1">
                <Info className="tw-h-4 tw-w-4" /> Customize when you want to receive alerts.
              </p>
              <div>
                <Label htmlFor="preferred_start_time" className="tw-mb-2 tw-block tw-flex tw-items-center tw-gap-2">
                  <Clock className="tw-h-4 tw-w-4" /> Start Time (UTC)
                </Label>
                <Input
                  id="preferred_start_time"
                  type="time"
                  {...form.register('preferred_start_time')}
                  className="tw-bg-input tw-text-foreground"
                  disabled={isFormDisabled || !enabled || receiveAllAlerts}
                />
                {form.formState.errors.preferred_start_time && (
                  <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.preferred_start_time.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="preferred_end_time" className="tw-mb-2 tw-block tw-flex tw-items-center tw-gap-2">
                  <Clock className="tw-h-4 tw-w-4" /> End Time (UTC)
                </Label>
                <Input
                  id="preferred_end_time"
                  type="time"
                  {...form.register('preferred_end_time')}
                  className="tw-bg-input tw-text-foreground"
                  disabled={isFormDisabled || !enabled || receiveAllAlerts}
                />
                {form.formState.errors.preferred_end_time && (
                  <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.preferred_end_time.message}</p>
                )}
              </div>
              <div>
                <Label className="tw-mb-2 tw-block tw-flex tw-items-center tw-gap-2">
                  <CalendarDays className="tw-h-4 tw-w-4" /> Preferred Days
                </Label>
                <div className="tw-flex tw-flex-wrap tw-gap-2">
                  {daysOfWeek.map(day => (
                    <Button
                      key={day}
                      type="button"
                      variant={preferredDays.includes(day) ? 'default' : 'outline'}
                      onClick={() => handleToggleDay(day)}
                      disabled={isFormDisabled || !enabled || receiveAllAlerts}
                      className={preferredDays.includes(day) ? 'tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground' : 'tw-text-muted-foreground hover:tw-text-primary'}
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
            {isSaving && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
            Save Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NotificationSettingsForm;