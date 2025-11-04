"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { handleError } from '@/utils/errorHandler';
import { SettingsService, ContactCard } from '@/services/SettingsService'; // Import ContactCard
import { useIsAdmin } from '@/hooks/useIsAdmin';
import ContactCardForm from './ContactCardForm';
import { AnalyticsService } from '@/services/AnalyticsService';

const contactCardSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: 'Name is required.' }).max(100, { message: 'Name too long.' }),
  title: z.string().max(100, { message: 'Title too long.' }).optional().or(z.literal('')),
  email: z.string().email({ message: 'Invalid email address.' }).optional().or(z.literal('')),
  phone: z.string().min(1, { message: 'Phone number is required.' }).regex(/^\+?[0-9\s\-\(\)]{7,20}$/, { message: 'Invalid phone number format.' }),
});

const contactSettingsSchema = z.object({
  contact_cards: z.array(contactCardSchema),
});

type ContactSettingsFormValues = z.infer<typeof contactSettingsSchema>;

const ContactSettingsForm: React.FC = () => {
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const methods = useForm<ContactSettingsFormValues>({
    resolver: zodResolver(contactSettingsSchema),
    defaultValues: {
      contact_cards: [],
    },
  });

  const { control, handleSubmit, reset } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'contact_cards',
  });

  const fetchContactSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await SettingsService.getContactSettings();
      if (settings && settings.contact_cards && settings.contact_cards.length > 0) {
        const cardsWithIds = (settings.contact_cards as ContactCard[]).map(card => ({ ...card, id: card.id || crypto.randomUUID() }));
        reset({ contact_cards: cardsWithIds });
        AnalyticsService.trackEvent({ name: 'contact_settings_form_loaded', properties: { count: cardsWithIds.length } });
      } else {
        reset({ contact_cards: [{ id: crypto.randomUUID(), name: '', title: '', email: '', phone: '' }] });
        AnalyticsService.trackEvent({ name: 'contact_settings_form_loaded_empty' });
      }
    } catch (err) {
      handleError(err, 'Failed to load contact settings.');
      AnalyticsService.trackEvent({ name: 'contact_settings_form_load_failed', properties: { error: (err as Error).message } });
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
      
      const cardsToSave = values.contact_cards.map(({ id, ...rest }) => rest) as ContactCard[];

      const success = await SettingsService.updateContactSettings(cardsToSave);
      if (success) {
        toast.success('Contact settings saved successfully!', { id: 'save-contact-settings' });
        fetchContactSettings();
        AnalyticsService.trackEvent({ name: 'contact_settings_saved', properties: { count: cardsToSave.length } });
      } else {
        throw new Error('Failed to update contact settings in database.');
      }
    } catch (err) {
      handleError(err, 'Failed to save contact settings.');
      AnalyticsService.trackEvent({ name: 'contact_settings_save_failed', properties: { error: (err as Error).message } });
    } finally {
      setIsSaving(false);
    }
  };

  if (isAdminLoading || isLoading) {
    return (
      <Card className="tw-bg-card tw-border-border tw-shadow-lg">
        <CardContent className="tw-py-8 tw-text-center">
          <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary tw-mx-auto" aria-label="Loading contact settings" />
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
        <CardDescription className="tw-text-muted-foreground">Manage contact cards for the "Contact Us" page.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="tw-space-y-6">
            <div>
              <Label className="tw-mb-2 tw-block">Contact Cards</Label>
              <div className="tw-space-y-4" role="list" aria-label="List of contact cards">
                {fields.length === 0 && (
                  <p className="tw-text-muted-foreground tw-text-center tw-py-4">No contact cards added yet.</p>
                )}
                {fields.map((field, index) => (
                  <ContactCardForm
                    key={field.id}
                    index={index}
                    remove={remove}
                    isLoading={isSaving}
                    fieldPrefix={`contact_cards.${index}`}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  append({ id: crypto.randomUUID(), name: '', title: '', email: '', phone: '' });
                  AnalyticsService.trackEvent({ name: 'contact_card_added' });
                }}
                className="tw-mt-4 tw-w-full"
                disabled={isSaving}
                aria-label="Add new contact card"
              >
                <PlusCircle className="tw-mr-2 tw-h-4 tw-w-4" aria-hidden="true" /> Add Contact Card
              </Button>
            </div>

            <Button type="submit" className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground" disabled={isSaving} aria-label="Save contact settings">
              {isSaving && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
              Save Contact Settings
            </Button>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
};

export default ContactSettingsForm;