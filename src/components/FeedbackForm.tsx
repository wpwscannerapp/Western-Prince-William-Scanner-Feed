"use client";

import React, { useState, useEffect } from 'react';
// Removed useForm and zodResolver for simplification
import * as z from 'zod'; // Keep z for schema definition, but not used in simplified form
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

// Keeping schema for reference, but not used in simplified form
const feedbackSchema = z.object({
  subject: z.string().max(100, { message: 'Subject too long.' }).optional().or(z.literal('')),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }).max(1000, { message: 'Message too long.' }),
  contact_email: z.string().email({ message: 'Invalid email address.' }).optional().or(z.literal('')),
  contact_phone: z.string().regex(/^\+?[0-9\s\-\(\)]{7,20}$/, { message: 'Invalid phone number format.' }).optional().or(z.literal('')),
  allow_contact: z.boolean().default(false),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

const FeedbackForm: React.FC = () => {
  if (import.meta.env.DEV) {
    console.log('FeedbackForm component function executed.');
  }

  const { user } = useAuth();
  // Simplified state for the switch
  const [allowContact, setAllowContact] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Keep for button disabled state

  // Debug log to confirm component rendering and state
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('FeedbackForm (Simplified) useEffect executed. allowContact:', allowContact, 'isSubmitting:', isSubmitting);
      console.log('Rendering Switch component in FeedbackForm (Simplified).');
    }
  }, [allowContact, isSubmitting]);

  // Simplified onSubmit for testing purposes
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Prevent default form submission
    setIsSubmitting(true);
    toast.loading('Submitting feedback (simplified)...', { id: 'submit-feedback' });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast.success(`Feedback submitted (simplified)! Allow contact: ${allowContact}`, { id: 'submit-feedback' });
    setIsSubmitting(false);
    AnalyticsService.trackEvent({ name: 'feedback_submitted_simplified', properties: { userId: user?.id, allowContact } });
  };

  return (
    <Card className="tw-bg-card tw-border-border tw-shadow-lg">
      <CardHeader>
        <CardTitle className="tw-xl tw-font-bold tw-text-foreground">Feedback & Suggestions (Simplified)</CardTitle>
        <CardDescription className="tw-text-muted-foreground">
          Share your thoughts, report issues, or suggest new features.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="tw-space-y-6">
          {/* Simplified inputs for demonstration */}
          <div>
            <Label htmlFor="subject" className="tw-mb-2 tw-block">Subject (Optional)</Label>
            <Input
              id="subject"
              placeholder="e.g., Bug Report, Feature Idea"
              className="tw-bg-input tw-text-foreground"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="message" className="tw-mb-2 tw-block">Message</Label>
            <Textarea
              id="message"
              placeholder="Tell us what you think..."
              className="tw-min-h-[100px] tw-bg-input tw-text-foreground"
              disabled={isSubmitting}
            />
          </div>

          <div className="tw-space-y-4 tw-p-4 tw-border tw-rounded-md tw-bg-muted/20">
            <h3 className="tw-text-lg tw-font-semibold tw-flex tw-items-center tw-gap-2">
              <User className="tw-h-5 tw-w-5" /> Contact Information (Optional)
            </h3>
            <div>
              <Label htmlFor="contact_email" className="tw-mb-2 tw-block">Email</Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="your.email@example.com"
                className="tw-bg-input tw-text-foreground"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="contact_phone" className="tw-mb-2 tw-block">Phone Number</Label>
              <Input
                id="contact_phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                className="tw-bg-input tw-text-foreground"
                disabled={isSubmitting}
              />
            </div>
            <div className="tw-flex tw-items-center tw-justify-between">
              <Label htmlFor="allow_contact_switch" className="tw-text-base">Would you like to be contacted regarding your feedback?</Label>
              <Switch
                id="allow_contact_switch"
                checked={allowContact}
                onCheckedChange={setAllowContact}
                disabled={isSubmitting}
                aria-label="Toggle contact preference"
              />
            </div>
          </div>

          <Button type="submit" className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
            <Send className="tw-mr-2 tw-h-4 tw-w-4" /> Submit Feedback (Simplified)
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default FeedbackForm;