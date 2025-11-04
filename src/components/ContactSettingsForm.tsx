"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { handleError } from '@/utils/errorHandler';
import { SettingsService } from '@/services/SettingsService';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { AnalyticsService } from '@/services/AnalyticsService';
import type { ContactCard } from '@/types/supabase'; // Corrected import path
import { ContactCardForm } from './ContactCardForm'; // Assuming this is the new standalone form

const ContactSettingsForm: React.FC = () => {
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [cards, setCards] = useState<ContactCard[]>([]);
  const [editingCardId, setEditingCardId] = useState<string | null>(null); // null for no edit, 'new' for new card, id for existing

  const fetchContactSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await SettingsService.getContactSettings();
      if (settings && settings.contact_cards && Array.isArray(settings.contact_cards)) {
        const loadedCards = (settings.contact_cards as ContactCard[]).map(card => ({ ...card, id: card.id || crypto.randomUUID() }));
        setCards(loadedCards);
        AnalyticsService.trackEvent({ name: 'contact_settings_form_loaded', properties: { count: loadedCards.length } });
      } else {
        setCards([]);
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

  const handleSaveCards = async (updatedCards: ContactCard[]) => {
    setIsSaving(true);
    try {
      toast.loading('Saving contact settings...', { id: 'save-contact-settings' });
      
      // Remove the temporary 'id' field before saving to DB if it's not part of the schema
      const cardsToSave = updatedCards.map(({ id, ...rest }) => rest);

      const success = await SettingsService.updateContactSettings(cardsToSave);
      if (success) {
        toast.success('Contact settings saved successfully!', { id: 'save-contact-settings' });
        setEditingCardId(null); // Close form after saving
        fetchContactSettings(); // Re-fetch to ensure UI is in sync with DB
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

  const handleAddOrUpdateCard = (card: ContactCard) => {
    let updatedCards: ContactCard[];
    if (editingCardId && editingCardId !== 'new') {
      updatedCards = cards.map((c) => (c.id === editingCardId ? card : c));
    } else {
      updatedCards = [...cards, { ...card, id: crypto.randomUUID() }]; // Ensure new cards have an ID for local state
    }
    setCards(updatedCards);
    handleSaveCards(updatedCards); // Save to DB immediately
  };

  const handleDeleteCard = (id: string) => {
    if (window.confirm('Are you sure you want to delete this contact card?')) {
      const updatedCards = cards.filter((c) => c.id !== id);
      setCards(updatedCards);
      handleSaveCards(updatedCards); // Save to DB immediately
      AnalyticsService.trackEvent({ name: 'contact_card_deleted', properties: { cardId: id } });
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

  const cardToEdit = editingCardId && editingCardId !== 'new' ? cards.find(c => c.id === editingCardId) : undefined;

  return (
    <Card className="tw-bg-card tw-border-border tw-shadow-lg">
      <CardHeader>
        <CardTitle className="tw-text-xl tw-font-bold tw-text-foreground">Contact Settings</CardTitle>
        <CardDescription className="tw-text-muted-foreground">Manage contact cards for the "Contact Us" page.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="tw-space-y-4">
          {cards.length === 0 && !editingCardId ? (
            <p className="tw-text-muted-foreground tw-text-center tw-py-4">No contact cards added yet.</p>
          ) : (
            cards.map((card) => (
              <div key={card.id} className="tw-flex tw-items-center tw-justify-between tw-p-3 tw-border tw-rounded-md tw-bg-muted/20">
                <div>
                  <p className="tw-font-medium tw-text-foreground">{card.name}</p>
                  {card.title && <p className="tw-text-sm tw-text-muted-foreground">{card.title}</p>}
                </div>
                <div className="tw-flex tw-gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingCardId(card.id)}
                    disabled={isSaving}
                    aria-label={`Edit ${card.name}`}
                  >
                    <Edit className="tw-h-4 tw-w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteCard(card.id)}
                    disabled={isSaving}
                    aria-label={`Delete ${card.name}`}
                  >
                    <Trash2 className="tw-h-4 tw-w-4 tw-text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}

          {editingCardId ? (
            <ContactCardForm
              card={cardToEdit}
              onSave={handleAddOrUpdateCard}
              onCancel={() => setEditingCardId(null)}
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingCardId('new')}
              className="tw-mt-4 tw-w-full"
              disabled={isSaving}
              aria-label="Add new contact card"
            >
              <PlusCircle className="tw-mr-2 tw-h-4 tw-w-4" aria-hidden="true" /> Add Contact Card
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactSettingsForm;