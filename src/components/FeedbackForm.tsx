"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form'; // Import Controller
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Send, User } from 'lucide-react';
import { toast } from 'sonner';
import { handleError } from '@/utils/errorHandler';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AnalyticsService } from '@/services/AnalyticsService';
import { Switch } from '@/components/ui/switch'; // Import Switch

const feedbackSchema = z.object({
  subject: z.string().max(100, { message: 'Subject too long.' }).optional().or(z.literal('')),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }).max(1000, { message: 'Message too long.' }),
  contact_email: z.string().email({ message: 'Invalid email address.' }).optional().or(z.literal('')),
  contact_phone: z.string().regex(/^\+?[0-9\s\-\(\)]{7,20}$/, { message: 'Invalid phone number format.' }).optional().or(z.literal('')),
  allow_contact: z.boolean().default(false),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

const FeedbackForm: React.FC = () => {
  const { user } = useAuth();
  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      subject: '',
      message: '',
      contact_email: user?.email || '', // Pre-fill with user's email if logged in
      contact_phone: '',
      allow_contact: false,
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const allowContact = form.watch('allow_contact'); // Watch the state of allow_contact

  // Debug log to confirm component rendering and state
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('FeedbackForm rendering. allowContact:', allowContact, 'isSubmitting:', isSubmitting);
    }
  }, [allowContact, isSubmitting]);

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
          contact_email: values.contact_email || null,
          contact_phone: values.contact_phone || null,
          allow_contact: values.allow_contact,
        });

      if (error) {
        throw new Error(error.message || 'Failed to submit feedback.');
      }

      toast.success('Feedback submitted successfully! Thank you.', { id: 'submit-feedback' });
      form.reset({
        subject: '',
        message: '',
        contact_email: user?.email || '', // Reset to user's email or empty
        contact_phone: '',
        allow_contact: false,
      });
      AnalyticsService.trackEvent({ name: 'feedback_submitted', properties: { userId: user?.id, subject: values.subject, allowContact: values.allow_contact } });
    } catch (err: any) {
      handleError(err, `Failed to submit feedback: ${err.message}`, { id: 'submit-feedback' });
      AnalyticsService.trackEvent({ name: 'feedback_submission_failed', properties: { userId: user?.id, subject: values.subject, error: err.message } });
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

          <div className="tw-space-y-4 tw-p-4 tw-border tw-rounded-md tw-bg-muted/20" aria-live="polite">
            <h3 className="tw-text-lg tw-font-semibold tw-flex tw-items-center tw-gap-2">
              <User className="tw-h-5 tw-w-5" /> Contact Information (Optional)
            </h3>
            <div>
              <Label htmlFor="contact_email" className="tw-mb-2 tw-block">Email</Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="your.email@example.com"
                {...form.register('contact_email')}
                className="tw-bg-input tw-text-foreground"
                disabled={isSubmitting}
              />
              {form.formState.errors.contact_email && (
                <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.contact_email.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="contact_phone" className="tw-mb-2 tw-block">Phone Number</Label>
              <Input
                id="contact_phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                {...form.register('contact_phone')}
                className="tw-bg-input tw-text-foreground"
                disabled={isSubmitting}
              />
              {form.formState.errors.contact_phone && (
                <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.contact_phone.message}</p>
              )}
            </div>
            <div className="tw-flex tw-items-center tw-justify-between">
              <Label htmlFor="allow_contact_switch" className="tw-text-base tw-text-foreground">Would you like to be contacted regarding your feedback?</Label>
              <div className="tw-flex tw-items-center tw-gap-2"> {/* Added a div to group switch and text */}
                <Controller
                  name="allow_contact"
                  control={form.control}
                  render={({ field }) => {
                    if (import.meta.env.DEV) {
                      console.log('Switch field.value:', field.value);
                    }
                    return (
                      <Switch
                        id="allow_contact_switch"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                        aria-label="Toggle contact preference"
                      />
                    );
                  }}
                />
                <span className="tw-text-sm tw-font-medium tw-text-foreground">
                  {allowContact ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
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