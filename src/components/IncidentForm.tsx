import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

const incidentFormSchema = z.object({
  type: z.string().min(1, { message: 'Incident type is required.' }).max(100, { message: 'Incident type too long.' }),
  location: z.string().min(1, { message: 'Location is required.' }).max(200, { message: 'Location too long.' }),
  description: z.string().min(10, { message: 'Incident details must be at least 10 characters.' }).max(1000, { message: 'Description too long.' }),
});

type IncidentFormValues = z.infer<typeof incidentFormSchema>;

interface IncidentFormProps {
  onSubmit: (type: string, location: string, description: string) => Promise<boolean>;
  isLoading: boolean;
  initialIncident?: { // New prop for initial values when editing
    type: string;
    location: string;
    description: string;
  };
}

const IncidentForm: React.FC<IncidentFormProps> = ({ onSubmit, isLoading, initialIncident }) => {
  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      type: initialIncident?.type || '',
      location: initialIncident?.location || '',
      description: initialIncident?.description || '',
    },
  });

  useEffect(() => {
    if (initialIncident) {
      form.reset(initialIncident);
    } else {
      form.reset({ type: '', location: '', description: '' });
    }
  }, [initialIncident, form]);

  const handleSubmit = async (values: IncidentFormValues) => {
    const success = await onSubmit(values.type, values.location, values.description);
    if (success && !initialIncident) { // Only reset if it's a new incident, not an edit
      form.reset();
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="tw-space-y-6 tw-p-4 tw-border tw-rounded-lg tw-bg-card tw-shadow-sm">
      <div>
        <Label htmlFor="incident-type" className="tw-mb-2 tw-block">Incident Type</Label>
        <Input
          id="incident-type"
          placeholder="e.g., Structure Fire, Traffic Accident"
          {...form.register('type')}
          className="tw-bg-input tw-text-foreground"
          disabled={isLoading}
        />
        {form.formState.errors.type && (
          <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.type.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="incident-location" className="tw-mb-2 tw-block">Location</Label>
        <Input
          id="incident-location"
          placeholder="e.g., 123 Main St, Gainesville"
          {...form.register('location')}
          className="tw-bg-input tw-text-foreground"
          disabled={isLoading}
        />
        {form.formState.errors.location && (
          <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.location.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="incident-description" className="tw-mb-2 tw-block">Incident Details</Label>
        <Textarea
          id="incident-description"
          placeholder="Provide a detailed description of the incident..."
          {...form.register('description')}
          className="tw-min-h-[100px] tw-bg-input tw-text-foreground"
          disabled={isLoading}
        />
        {form.formState.errors.description && (
          <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.description.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isLoading} className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground">
        {isLoading && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
        {initialIncident ? 'Update Incident' : 'Submit Incident'}
      </Button>
    </form>
  );
};

export default IncidentForm;