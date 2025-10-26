import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { handleError } from '@/utils/errorHandler';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const feedbackSchema = z.object({
  subject: z.string().max(100, { message: 'Subject too long.' }).optional().or(z.literal('')),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }).max(1000, { message: 'Message too long.' }),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

const FeedbackForm: React.FC = () => {
  const { user } = useAuth();
  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      subject: '',
      message: '',
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (values: FeedbackFormValues) => {
    setIsSubmitting(true);
    toast.loading('Submitting feedback...', { id: 'submit-feedback' });

    try {
      const { error } = await supabase
        .from('feedback_and_suggestions')
        .insert({
          user_id: user?.id || null, // Link to user if logged in, otherwise null
          subject: values.subject || null,
          message: values.message,
        });

      if (error) {
        throw new Error(error.message || 'Failed to submit feedback.');
      }

      toast.success('Feedback submitted successfully! Thank you.', { id: 'submit-feedback' });
      form.reset();
    } catch (err: any) {
      handleError(err, `Failed to submit feedback: ${err.message}`, { id: 'submit-feedback' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="tw-bg-card tw-border-border tw-shadow-lg">
      <CardHeader>
        <CardTitle className="tw-xl tw-font-bold tw-text-foreground">Feedback & Suggestions</CardTitle>
        <CardDescription className="tw-text-muted-foreground">
          Share your thoughts, report issues, or suggest new features.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="tw-space-y-6">
          <div>
            <Label htmlFor="subject" className="tw-mb-2 tw-block">Subject (Optional)</Label>
            <Input
              id="subject"
              placeholder="e.g., Bug Report, Feature Idea"
              {...form.register('subject')}
              className="tw-bg-input tw-text-foreground"
              disabled={isSubmitting}
            />
            {form.formState.errors.subject && (
              <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.subject.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="message" className="tw-mb-2 tw-block">Message</Label>
            <Textarea
              id="message"
              placeholder="Tell us what you think..."
              {...form.register('message')}
              className="tw-min-h-[100px] tw-bg-input tw-text-foreground"
              disabled={isSubmitting}
            />
            {form.formState.errors.message && (
              <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.message.message}</p>
            )}
          </div>

          <Button type="submit" className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
            <Send className="tw-mr-2 tw-h-4 tw-w-4" /> Submit Feedback
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default FeedbackForm;