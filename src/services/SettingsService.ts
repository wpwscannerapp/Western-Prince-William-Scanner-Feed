"use client";

import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { AnalyticsService } from './AnalyticsService'; // Import AnalyticsService

export interface AppSettings {
  id: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  logo_url: string | null;
  favicon_url: string | null;
  custom_css: string | null;
  layout: Array<{ id: string; type: string; content: string }>;
  updated_at: string;
}

export interface ContactCard {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
}

export interface ContactSettings {
  id: string;
  contact_cards: ContactCard[];
  updated_at: string;
}

export const SettingsService = {
  async getSettings(): Promise<AppSettings | null> {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows found, return default structure
          AnalyticsService.trackEvent({ name: 'app_settings_not_found', properties: { reason: 'default_returned' } });
          return {
            id: 'default', // Placeholder ID
            primary_color: '#2196F3',
            secondary_color: '#4CAF50',
            font_family: 'Inter',
            logo_url: null,
            favicon_url: null,
            custom_css: null,
            layout: [],
            updated_at: new Date().toISOString(),
          };
        }
        handleError(error, `Failed to fetch app settings.`);
        AnalyticsService.trackEvent({ name: 'fetch_app_settings_failed', properties: { error: error.message } });
        return null;
      }
      AnalyticsService.trackEvent({ name: 'app_settings_fetched', properties: { id: data.id } });
      return data as AppSettings;
    } catch (err) {
      handleError(err, `An unexpected error occurred while fetching app settings.`);
      AnalyticsService.trackEvent({ name: 'fetch_app_settings_unexpected_error', properties: { error: (err as Error).message } });
      return null;
    }
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<boolean> {
    try {
      const { data: existingSettings } = await supabase
        .from('app_settings')
        .select('id')
        .limit(1)
        .single();

      let upsertData = { ...settings, updated_at: new Date().toISOString() };
      if (existingSettings) {
        upsertData = { ...upsertData, id: existingSettings.id };
      } else if (!settings.id) {
        delete (upsertData as any).id;
      }

      const { error } = await supabase
        .from('app_settings')
        .upsert(upsertData, { onConflict: 'id' });

      if (error) {
        handleError(error, `Failed to update app settings.`);
        AnalyticsService.trackEvent({ name: 'update_app_settings_failed', properties: { updates: Object.keys(settings), error: error.message } });
        return false;
      }
      AnalyticsService.trackEvent({ name: 'app_settings_updated', properties: { updates: Object.keys(settings) } });
      return true;
    } catch (err) {
      handleError(err, `An unexpected error occurred while updating app settings.`);
      AnalyticsService.trackEvent({ name: 'update_app_settings_unexpected_error', properties: { error: (err as Error).message } });
      return false;
    }
  },

  async insertSettingsHistory(settings: AppSettings): Promise<boolean> {
    try {
      const { error } = await supabase.from('app_settings_history').insert({
        settings: settings,
        layout: settings.layout,
        created_at: new Date().toISOString(),
      });
      if (error) {
        handleError(error, 'Failed to save settings to history.');
        AnalyticsService.trackEvent({ name: 'insert_settings_history_failed', properties: { error: error.message } });
        return false;
      }
      AnalyticsService.trackEvent({ name: 'settings_history_inserted' });
      return true;
    } catch (err) {
      handleError(err, 'An unexpected error occurred while saving settings to history.');
      AnalyticsService.trackEvent({ name: 'insert_settings_history_unexpected_error', properties: { error: (err as Error).message } });
      return false;
    }
  },

  async fetchSettingsHistory(): Promise<
    Array<{ id: string; created_at: string; settings: AppSettings; layout?: AppSettings['layout'] }> | null
  > {
    try {
      const { data, error } = await supabase
        .from('app_settings_history')
        .select('id, created_at, settings, layout')
        .order('created_at', { ascending: false });

      if (error) {
        handleError(error, 'Failed to load version history.');
        AnalyticsService.trackEvent({ name: 'fetch_settings_history_failed', properties: { error: error.message } });
        return null;
      }
      return data || [];
    } catch (err) {
      handleError(err, 'An unexpected error occurred while loading version history.');
      AnalyticsService.trackEvent({ name: 'fetch_settings_history_unexpected_error', properties: { error: (err as Error).message } });
      return null;
    }
  },

  async getSettingsFromHistory(historyId: string): Promise<{ settings: AppSettings, layout: any } | null> {
    try {
      const { data, error } = await supabase
        .from('app_settings_history')
        .select('settings, layout')
        .eq('id', historyId)
        .single();
      if (error) {
        handleError(error, 'Failed to fetch settings from history.');
        AnalyticsService.trackEvent({ name: 'get_settings_from_history_failed', properties: { historyId, error: error.message } });
        return null;
      }
      AnalyticsService.trackEvent({ name: 'settings_from_history_fetched', properties: { historyId } });
      return data as { settings: AppSettings, layout: any };
    } catch (err) {
      handleError(err, 'An unexpected error occurred while fetching settings from history.');
      AnalyticsService.trackEvent({ name: 'get_settings_from_history_unexpected_error', properties: { historyId, error: (err as Error).message } });
      return null;
    }
  },

  async getContactSettings(): Promise<ContactSettings | null> {
    try {
      const { data, error } = await supabase
        .from('contact_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          AnalyticsService.trackEvent({ name: 'contact_settings_not_found', properties: { reason: 'default_returned' } });
          return {
            id: 'default',
            contact_cards: [],
            updated_at: new Date().toISOString(),
          };
        }
        handleError(error, `Failed to fetch contact settings.`);
        AnalyticsService.trackEvent({ name: 'fetch_contact_settings_failed', properties: { error: error.message } });
        return null;
      }
      AnalyticsService.trackEvent({ name: 'contact_settings_fetched', properties: { id: data.id } });
      return data as ContactSettings;
    } catch (err) {
      handleError(err, `An unexpected error occurred while fetching contact settings.`);
      AnalyticsService.trackEvent({ name: 'fetch_contact_settings_unexpected_error', properties: { error: (err as Error).message } });
      return null;
    }
  },

  async updateContactSettings(contactCards: ContactCard[]): Promise<boolean> {
    try {
      const { data: existingSettings } = await supabase
        .from('contact_settings')
        .select('id')
        .limit(1)
        .single();

      let upsertData: Partial<ContactSettings> = {
        contact_cards: contactCards,
        updated_at: new Date().toISOString(),
      };

      if (existingSettings) {
        upsertData.id = existingSettings.id;
      }

      const { error } = await supabase
        .from('contact_settings')
        .upsert(upsertData, { onConflict: 'id' });

      if (error) {
        handleError(error, `Failed to update contact settings.`);
        AnalyticsService.trackEvent({ name: 'update_contact_settings_failed', properties: { count: contactCards.length, error: error.message } });
        return false;
      }
      AnalyticsService.trackEvent({ name: 'contact_settings_updated', properties: { count: contactCards.length } });
      return true;
    } catch (err) {
      handleError(err, `An unexpected error occurred while updating contact settings.`);
      AnalyticsService.trackEvent({ name: 'update_contact_settings_unexpected_error', properties: { error: (err as Error).message } });
      return false;
    }
  },
};