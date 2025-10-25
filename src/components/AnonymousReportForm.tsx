import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { handleError } from '@/utils/errorHandler';

const reportSchema = z.object({
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }).max(500, { message: 'Description too long.' }),
  location: z.string().min(3, { message: 'Location is required.' }).max(100, { message: 'Location too long.' }),
  type: z.string().min(1, { message: 'Incident type is required.' }),
});

type ReportFormValues = z.infer<typeof reportSchema>;

const incidentTypes = ['Fire', 'Crime', 'Accident', 'Medical', 'Other'];

const AnonymousReportForm: React.FC = () => {
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      description: '',
      location: '',
      type: '',
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (values: ReportFormValues) => {
    setIsSubmitting(true);
    toast.loading('Submitting report...', { id: 'submit-report' });

    try {
      // The URL for the Netlify Edge Function
      const functionUrl = `${import.meta.env.VITE_APP_URL}/.netlify/functions/submit-anonymous-report`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit report.');
      }

      toast.success('Anonymous report submitted successfully! Thank you.', { id: 'submit-report' });
      form.reset();
    } catch (err: any) {
      handleError(err, `Failed to submit report: ${err.message}`, { id: 'submit-report' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="tw-bg-card tw-border-border tw-shadow-lg">
      <CardHeader>
        <CardTitle className="tw-xl tw-font-bold tw-text-foreground">Anonymous Incident Report</CardTitle>
        <CardDescription className="tw-text-muted-foreground">
          Report an incident without logging in. Your submission helps keep the community informed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="tw-space-y-6">
          <div>
            <Label htmlFor="type" className="tw-mb-2 tw-block">Incident Type</Label>
            <Select
              value={form.watch('type')}
              onValueChange={(value) => form.setValue('type', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="type" className="tw-w-full">
                <SelectValue placeholder="Select incident type" />
              </SelectTrigger>
              <SelectContent>
                {incidentTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.type.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="location" className="tw-mb-2 tw-block">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Main St & Elm Ave, Gainesville"
              {...form.register('location')}
              className="tw-bg-input tw-text-foreground"
              disabled={isSubmitting}
            />
            {form.formState.errors.location && (
              <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.location.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description" className="tw-mb-2 tw-block">Description</Label>
            <Textarea
              id="description"
              placeholder="Provide details about the incident..."
              {...form.register('description')}
              className="tw-min-h-[100px] tw-bg-input tw-text-foreground"
              disabled={isSubmitting}
            />
            {form.formState.errors.description && (
              <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.description.message}</p>
            )}
          </div>

          <Button type="submit" className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
            <Send className="tw-mr-2 tw-h-4 tw-w-4" /> Submit Report
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AnonymousReportForm;