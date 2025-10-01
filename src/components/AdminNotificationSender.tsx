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
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';

const notificationSchema = z.object({
  title: z.string().min(1, { message: 'Notification title is required.' }).max(100, { message: 'Title too long.' }),
  body: z.string().min(1, { message: 'Notification body is required.' }).max(500, { message: 'Body too long.' }),
  url: z.string().url({ message: 'Must be a valid URL.' }).optional().or(z.literal('')),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

const AdminNotificationSender: React.FC = () => {
  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: '',
      body: '',
      url: '',
    },
  });

  const [isLoading, setIsLoading] = useState(false); // Changed from React.useState

  const onSubmit = async (values: NotificationFormValues) => {
    setIsLoading(true);
    toast.loading('Queuing notifications...', { id: 'send-notification' });

    try {
      // Fetch all active push subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions') // Use the new table
        .select('subscription');

      if (subError) {
        console.error('Error fetching subscriptions:', subError);
        handleError(subError, 'Failed to fetch subscriptions.', { id: 'send-notification' });
        return;
      }

      if (!subscriptions || subscriptions.length === 0) {
        toast.info('No active subscriptions found to send notifications to.', { id: 'send-notification' });
        return;
      }

      // Send a separate request to the Edge Function for each subscription
      // The Edge Function will store these in the push_notifications table
      const sendPromises = subscriptions.map(async (subRecord) => {
        const { error } = await supabase.functions.invoke('send-push-notification', {
          body: {
            subscription: subRecord.subscription, // subscription is already a JSON object
            title: values.title,
            body: values.body,
            url: values.url,
          },
        });

        if (error) {
          console.error('Error invoking send-push-notification for a subscription:', error);
          // Don't throw here, allow other notifications to be queued
          return { success: false, error: error.message };
        }
        return { success: true };
      });

      const results = await Promise.all(sendPromises);
      const failedCount = results.filter(r => !r.success).length;

      if (failedCount === 0) {
        toast.success('All notifications queued successfully!', { id: 'send-notification' });
        form.reset();
      } else if (failedCount === subscriptions.length) {
        toast.error('Failed to queue any notifications. Please check logs.', { id: 'send-notification' });
      } else {
        toast.warning(`${subscriptions.length - failedCount} notifications queued, ${failedCount} failed.`, { id: 'send-notification' });
        form.reset();
      }

    } catch (err: any) {
      console.error('Unexpected error sending notifications:', err);
      handleError(err, `An unexpected error occurred: ${err.message}`, { id: 'send-notification' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="tw-bg-card tw-border-border tw-shadow-lg">
      <CardHeader>
        <CardTitle className="tw-text-xl tw-font-bold tw-text-foreground">Send Push Notification</CardTitle>
        <CardDescription className="tw-text-muted-foreground">
          Queue real-time updates to all subscribed users. A separate worker will process and send them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="tw-space-y-6">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="New Scanner Update!"
              {...form.register('title')}
              className="tw-mt-1 tw-bg-input tw-text-foreground"
              disabled={isLoading}
            />
            {form.formState.errors.title && (
              <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="body">Message Body</Label>
            <Textarea
              id="body"
              placeholder="Units dispatched to..."
              {...form.register('body')}
              className="tw-mt-1 tw-min-h-[100px] tw-bg-input tw-text-foreground"
              disabled={isLoading}
            />
            {form.formState.errors.body && (
              <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.body.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="url">Link (Optional)</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://your-app.com/posts/123"
              {...form.register('url')}
              className="tw-mt-1 tw-bg-input tw-text-foreground"
              disabled={isLoading}
            />
            {form.formState.errors.url && (
              <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.url.message}</p>
            )}
          </div>

          <Button type="submit" className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground" disabled={isLoading}>
            {isLoading && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
            <Send className="tw-mr-2 tw-h-4 tw-w-4" /> Queue Notifications
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminNotificationSender;