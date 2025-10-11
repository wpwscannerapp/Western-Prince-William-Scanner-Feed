import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { handleError } from '@/utils/errorHandler';
import { SettingsService } from '@/services/SettingsService';
import { useIsAdmin } from '@/hooks/useIsAdmin';

const phoneSchema = z.object({
  value: z.string().min(1, { message: 'Phone number cannot be empty.' }).regex(/^\+?[0-9\s\-\(\)]{7,20}$/, { message: 'Invalid phone number format.' }),
});

const contactSettingsSchema = z.object({
  phone_numbers: z.array(phoneSchema),
});

type ContactSettingsFormValues = z.infer<typeof contactSettingsSchema>;

const ContactSettingsForm: React.FC = () => {
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ContactSettingsFormValues>({
    resolver: zodResolver(contactSettingsSchema),
    defaultValues: {
      phone_numbers: [{ value: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'phone_numbers',
  });

  const fetchContactSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await SettingsService.getContactSettings();
      if (settings && settings.phone_numbers.length > 0) {
        form.reset({
          phone_numbers: settings.phone_numbers.map(num => ({ value: num })),
        });
      } else {
        form.reset({ phone_numbers: [{ value: '' }] }); // Ensure at least one empty field
      }
    } catch (err) {
      handleError(err, 'Failed to load contact settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdminLoading) {
      fetchContactSettings();
    }
  }, [isAdminLoading]);

  const onSubmit = async (values: ContactSettingsFormValues) => {
    setIsSaving(true);
    try {
      toast.loading('Saving contact settings...', { id: 'save-contact-settings' });
      const numbersToSave = values.phone_numbers
        .map(field => field.value.trim())
        .filter(value => value !== ''); // Filter out empty strings

      const success = await SettingsService.updateContactSettings(numbersToSave);
      if (success) {
        toast.success('Contact settings saved successfully!', { id: 'save-contact-settings' });
        fetchContactSettings(); // Re-fetch to ensure UI is consistent with saved data
      } else {
        throw new Error('Failed to update contact settings in database.');
      }
    } catch (err) {
      handleError(err, 'Failed to save contact settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isAdminLoading || isLoading) {
    return (
      <Card className="tw-bg-card tw-border-border tw-shadow-lg">
        <CardContent className="tw-py-8 tw-text-center">
          <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary tw-mx-auto" />
          <p className="tw-mt-2 tw-text-muted-foreground">Loading contact settings...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="tw-bg-card tw-border-border tw-shadow-lg">
        <CardContent className="tw-py-8 tw-text-center">
          <p className="tw-text-destructive">Access denied. Only Administrators can modify contact settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="tw-bg-card tw-border-border tw-shadow-lg">
      <CardHeader>
        <CardTitle className="tw-text-xl tw-font-bold tw-text-foreground">Contact Settings</CardTitle>
        <CardDescription className="tw-text-muted-foreground">Manage phone numbers for the "Contact Us" page.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="tw-space-y-6">
          <div>
            <Label className="tw-mb-2 tw-block">Phone Numbers</Label>
            <div className="tw-space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="tw-flex tw-items-center tw-gap-2">
                  <Input
                    {...form.register(`phone_numbers.${index}.value`)}
                    placeholder="e.g., +1 (555) 123-4567"
                    className="tw-flex-1 tw-bg-input tw-text-foreground"
                    disabled={isSaving}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={isSaving || fields.length === 1} // Disable if only one field left
                    aria-label="Remove phone number"
                  >
                    <Trash2 className="tw-h-4 tw-w-4" />
                  </Button>
                </div>
              ))}
            </div>
            {form.formState.errors.phone_numbers && (
              <p className="tw-text-destructive tw-text-sm tw-mt-2">
                {form.formState.errors.phone_numbers.message || form.formState.errors.phone_numbers[0]?.value?.message}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ value: '' })}
              className="tw-mt-4 tw-w-full"
              disabled={isSaving}
            >
              <PlusCircle className="tw-mr-2 tw-h-4 tw-w-4" /> Add Phone Number
            </Button>
          </div>

          <Button type="submit" className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground" disabled={isSaving}>
            {isSaving && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
            Save Contact Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ContactSettingsForm;