"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { NotificationService } from '@/services/NotificationService';
import { handleError } from '@/utils/errorHandler';
import { useAuth } from '@/hooks/useAuth';
import { AnalyticsService } from '@/services/AnalyticsService';
import { NewAlert } from '@/types/supabase';

const notificationSchema = z.object({
  title: z.string().min(1, { message: 'Notification title is required.' }).max(100, { message: 'Title too long.' }),
  body: z.string().min(1, { message: 'Notification body is required.' }).max(500, { message: 'Body too long.' }),
  type: z.string().min(1, { message: 'Alert type is required.' }).max(50, { message: 'Type too long.' }),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

const AdminNotificationSender: React.FC = () => {
  const { user } = useAuth();
  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: '',
      body: '',
      type: 'Broadcast',
      latitude: 38.8048, // Default to Manassas, VA area
      longitude: -77.4731,
    },
  });

  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (values: NotificationFormValues) => {
    if (!user) {
      handleError(null, 'You must be logged in to send notifications.');
      AnalyticsService.trackEvent({ name: 'send_notification_failed', properties: { reason: 'not_logged_in' } });
      return;
    }

    setIsLoading(true);
    toast.loading('Creating alert...', { id: 'send-notification' });

    try {
      const newAlertData: NewAlert = {
        title: values.title,
        description: values.body,
        type: values.type,
        latitude: values.latitude,
        longitude: values.longitude,
      };

      const newAlert = await NotificationService.createAlert(newAlertData);

      if (newAlert) {
        toast.success('Alert created and notifications queued!', { id: 'send-notification' });
        form.reset({
          title: '',
          body: '',
          type: 'Broadcast',
          latitude: 38.8048,
          longitude: -77.4731,
        });
        AnalyticsService.trackEvent({ name: 'notification_sent', properties: { title: values.title, userId: user.id } });
      } else {
        throw new Error('Failed to create alert in database.');
      }

    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('Unexpected error sending notifications:', err);
      }
      handleError(err, `An unexpected error occurred: ${err.message}`, { id: 'send-notification' });
      AnalyticsService.trackEvent({ name: 'send_notification_failed', properties: { title: values.title, userId: user.id, error: err.message } });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="tw-bg-card tw-border-border tw-shadow-lg">
      <CardHeader>
        <CardTitle className="tw-xl tw-font-bold tw-text-foreground">Send Push Notification</CardTitle>
        <CardDescription className="tw-text-muted-foreground">
          Create an alert that will trigger real-time push notifications to all subscribed users.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="tw-space-y-6">
          <div>
            <Label htmlFor="title" className="tw-mb-2 tw-block">Title</Label>
            <Input
              id="title"
              placeholder="New Scanner Update!"
              {...form.register('title')}
              className="tw-bg-input tw-text-foreground"
              disabled={isLoading}
              aria-invalid={form.formState.errors.title ? "true" : "false"}
              aria-describedby={form.formState.errors.title ? "title-error" : undefined}
            />
            {form.formState.errors.title && (
              <p id="title-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="body" className="tw-mb-2 tw-block">Message Body</Label>
            <Textarea
              id="body"
              placeholder="Units dispatched to..."
              {...form.register('body')}
              className="tw-min-h-[100px] tw-bg-input tw-text-foreground"
              disabled={isLoading}
              aria-invalid={form.formState.errors.body ? "true" : "false"}
              aria-describedby={form.formState.errors.body ? "body-error" : undefined}
            />
            {form.formState.errors.body && (
              <p id="body-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.body.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="type" className="tw-mb-2 tw-block">Alert Type</Label>
            <Input
              id="type"
              placeholder="e.g., Broadcast, Fire, Police"
              {...form.register('type')}
              className="tw-bg-input tw-text-foreground"
              disabled={isLoading}
              aria-invalid={form.formState.errors.type ? "true" : "false"}
              aria-describedby={form.formState.errors.type ? "type-error" : undefined}
            />
            {form.formState.errors.type && (
              <p id="type-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.type.message}</p>
            )}
          </div>

          <div className="tw-grid tw-grid-cols-2 tw-gap-4">
            <div>
              <Label htmlFor="latitude" className="tw-mb-2 tw-block">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                placeholder="38.8048"
                {...form.register('latitude', { valueAsNumber: true })}
                className="tw-bg-input tw-text-foreground"
                disabled={isLoading}
              />
              {form.formState.errors.latitude && (
                <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.latitude.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="longitude" className="tw-mb-2 tw-block">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                placeholder="-77.4731"
                {...form.register('longitude', { valueAsNumber: true })}
                className="tw-bg-input tw-text-foreground"
                disabled={isLoading}
              />
              {form.formState.errors.longitude && (
                <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.longitude.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground" disabled={isLoading}>
            {isLoading && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
            <Send className="tw-mr-2 tw-h-4 tw-w-4" aria-hidden="true" /> Create Alert & Queue Notifications
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminNotificationSender;