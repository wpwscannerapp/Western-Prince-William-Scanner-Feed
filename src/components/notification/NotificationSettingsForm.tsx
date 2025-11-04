"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { NotificationService } from '@/services/NotificationService';
import { handleError } from '@/utils/errorHandler';
import { AnalyticsService } from '@/services/AnalyticsService';
import { PushSubJson, NotificationSettingsUpdate } from '@/types/supabase';
import { NotificationPreferences } from './NotificationPreferences';
import { NotificationStatus } from './NotificationStatus';
import { NotificationCustomization } from './NotificationCustomization';
import { AllAlertsToggle } from './AllAlertsToggle';
import { notificationSettingsSchema, NotificationSettingsFormValues } from './types';

// --- Interfaces ---
interface NotificationSettingsFormProps {
  isWebPushInitialized: boolean;
}

const NotificationSettingsForm: React.FC<NotificationSettingsFormProps> = ({ isWebPushInitialized }) => {
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  const { handleSubmit, reset, watch } = form;
  const enabled = watch('enabled');
  const receiveAllAlerts = watch('receive_all_alerts');

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
        subscription_failed: 'Failed to subscribe to push notifications. Please check your browser settings and try again.',
        unsubscribe_failed: 'Failed to unsubscribe from push notifications. Please try again.',
        database_update_failed: 'Failed to save settings. Please try again later.',
      };
      handleError(err, errorMessages[err.message] || 'An unexpected error occurred while saving settings.', { id: 'save-settings' });
      AnalyticsService.trackEvent({ name: 'save_notification_settings_failed', properties: { userId: user?.id, reason: err.message, error: (err as Error).message } });
      if (err.message === 'permission_denied') {
        form.setValue('enabled', false);
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
        <FormProvider {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="tw-space-y-6">
            {!isWebPushInitialized && (
              <div className="tw-bg-yellow-100 tw-border-l-4 tw-border-yellow-500 tw-text-yellow-700 tw-p-4 tw-mb-4" role="alert">
                <p className="tw-font-bold">Web Push Not Ready</p>
                <p>Push notification features are temporarily unavailable. Please ensure your browser supports Service Workers and VAPID keys are configured.</p>
              </div>
            )}
            
            <NotificationPreferences isFormDisabled={isFormDisabled} />
            <NotificationStatus isWebPushInitialized={isWebPushInitialized} />
            <AllAlertsToggle isFormDisabled={isFormDisabled} />
            
            {!receiveAllAlerts && enabled && (
              <NotificationCustomization isCustomizationDisabled={isCustomizationDisabled} />
            )}

            <Button type="submit" className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground" disabled={isFormDisabled}>
              {isSaving && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
              Save Settings
            </Button>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
};

export default NotificationSettingsForm;