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
import { NotificationService } from '@/services/NotificationService'; // Import NotificationService
import { handleError } from '@/utils/errorHandler';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth to get user ID

const notificationSchema = z.object({
  title: z.string().min(1, { message: 'Notification title is required.' }).max(100, { message: 'Title too long.' }),
  body: z.string().min(1, { message: 'Notification body is required.' }).max(500, { message: 'Body too long.' }),
  url: z.string().url({ message: 'Must be a valid URL.' }).optional().or(z.literal('')),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

const AdminNotificationSender: React.FC = () => {
  const { user } = useAuth(); // Get the current user
  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: '',
      body: '',
      url: '',
    },
  });

  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (values: NotificationFormValues) => {
    if (!user) {
      handleError(null, 'You must be logged in to send notifications.');
      return;
    }

    setIsLoading(true);
    toast.loading('Creating alert...', { id: 'send-notification' });

    try {
      // Create an alert in the 'alerts' table.
      // This will trigger the Supabase function which calls the Netlify function.
      const newAlert = await NotificationService.createAlert({
        title: values.title,
        description: values.body,
        type: 'Admin Broadcast', // Default type for admin-sent notifications
        latitude: 0, // Default latitude, consider making this configurable or optional
        longitude: 0, // Default longitude, consider making this configurable or optional
      });

      if (newAlert) {
        toast.success('Alert created and notifications queued!', { id: 'send-notification' });
        form.reset();
      } else {
        throw new Error('Failed to create alert in database.');
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
            />
            {form.formState.errors.title && (
              <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.title.message}</p>
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
            />
            {form.formState.errors.body && (
              <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.body.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="url" className="tw-mb-2 tw-block">Link (Optional)</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://your-app.com/posts/123"
              {...form.register('url')}
              className="tw-bg-input tw-text-foreground"
              disabled={isLoading}
            />
            {form.formState.errors.url && (
              <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.url.message}</p>
            )}
          </div>

          <Button type="submit" className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground" disabled={isLoading}>
            {isLoading && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
            <Send className="tw-mr-2 tw-h-4 tw-w-4" /> Create Alert & Queue Notifications
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminNotificationSender;