import React from 'react';
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

  const [isLoading, setIsLoading] = React.useState(false);

  const onSubmit = async (values: NotificationFormValues) => {
    setIsLoading(true);
    toast.loading('Sending notifications...', { id: 'send-notification' });

    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: values,
      });

      if (error) {
        console.error('Error sending notifications:', error);
        toast.error(`Failed to send notifications: ${error.message}`, { id: 'send-notification' });
      } else {
        toast.success(data.message || 'Notifications sent successfully!', { id: 'send-notification' });
        form.reset();
      }
    } catch (err: any) {
      console.error('Unexpected error sending notifications:', err);
      toast.error(`An unexpected error occurred: ${err.message}`, { id: 'send-notification' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="tw-bg-card tw-border-border tw-shadow-lg">
      <CardHeader>
        <CardTitle className="tw-text-xl tw-font-bold tw-text-foreground">Send Push Notification</CardTitle>
        <CardDescription className="tw-text-muted-foreground">
          Send real-time updates to all subscribed users.
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
            <Send className="tw-mr-2 tw-h-4 tw-w-4" /> Send Notification
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminNotificationSender;