"use client";

import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { AnalyticsService } from './AnalyticsService';
import { AppSettingsRow, AppSettingsUpdate, AppSettingsInsert, ContactSettingsRow, ContactSettingsUpdate, ContactCardsJson, LayoutJson, ContactCard, ContactSettingsInsert } from '@/types/supabase';

export type AppSettings = AppSettingsRow; // Alias AppSettingsRow to AppSettings for existing usage

export type ContactSettings = ContactSettingsRow; // Alias ContactSettingsRow to ContactSettings for existing usage

export type LayoutComponent = {
  id: string;
  type: string;
  content: string;
}; // Defined based on LayoutJson structure

export const SettingsService = {
  async getSettings(): Promise<AppSettingsRow | null> {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // No rows found, return default structure
        handleError(error, `Failed to fetch app settings.`);
        AnalyticsService.trackEvent({ name: 'fetch_app_settings_failed', properties: { error: error.message } });
        return null;
      }
      if (!data) {
        AnalyticsService.trackEvent({ name: 'app_settings_not_found', properties: { reason: 'default_returned' } });
        return {
          id: 'default', // Placeholder ID
          primary_color: '#2196F3',
          secondary_color: '#4CAF50',
          font_family: 'Inter',
          logo_url: null,
          favicon_url: null,
          custom_css: null,
          layout: [] as LayoutJson,
          updated_at: new Date().toISOString(),
        };
      }
      AnalyticsService.trackEvent({ name: 'app_settings_fetched', properties: { id: data.id } });
      return data;
    } catch (err) {
      handleError(err, `An unexpected error occurred while fetching app settings.`);
      AnalyticsService.trackEvent({ name: 'fetch_app_settings_unexpected_error', properties: { error: (err as Error).message } });
      return null;
    }
  },

  async updateSettings(settings: AppSettingsUpdate): Promise<boolean> {
    try {
      const { data: existingSettings } = await supabase
        .from('app_settings')
        .select('id')
        .limit(1)
        .single();

      let upsertData: AppSettingsUpdate = { ...settings, updated_at: new Date().toISOString() };
      if (existingSettings) {
        upsertData = { ...upsertData, id: existingSettings.id };
      } else if (!settings.id) {
        // If no existing settings and no ID provided, ensure ID is not passed to upsert
        const { id, ...rest } = upsertData;
        upsertData = rest;
      }

      const { data, error } = await supabase
        .from('app_settings')
        .upsert(upsertData as AppSettingsInsert, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        handleError(error, `Failed to update app settings.`);
        AnalyticsService.trackEvent({ name: 'update_app_settings_failed', properties: { updates: Object.keys(settings), error: error.message } });
        return false;
      }
      AnalyticsService.trackEvent({ name: 'app_settings_updated', properties: { updates: Object.keys(settings) } });
      return !!data;
    } catch (err) {
      handleError(err, `An unexpected error occurred while updating app settings.`);
      AnalyticsService.trackEvent({ name: 'update_app_settings_unexpected_error', properties: { error: (err as Error).message } });
      return false;
    }
  },

  async insertSettingsHistory(settings: AppSettingsRow): Promise<boolean> {
    try {
      const { error } = await supabase.from('app_settings_history').insert({
        settings: settings as unknown as LayoutJson, // Cast to Json as per schema
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
    Array<{ id: string; created_at: string; settings: AppSettingsRow; layout?: LayoutJson }> | null
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
      return data as Array<{ id: string; created_at: string; settings: AppSettingsRow; layout?: LayoutJson }> || [];
    } catch (err) {
      handleError(err, 'An unexpected error occurred while loading version history.');
      AnalyticsService.trackEvent({ name: 'fetch_settings_history_unexpected_error', properties: { error: (err as Error).message } });
      return null;
    }
  },

  async getSettingsFromHistory(historyId: string): Promise<{ settings: AppSettingsRow, layout: LayoutJson } | null> {
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
      return data as { settings: AppSettingsRow, layout: LayoutJson };
    } catch (err) {
      handleError(err, 'An unexpected error occurred while fetching settings from history.');
      AnalyticsService.trackEvent({ name: 'get_settings_from_history_unexpected_error', properties: { historyId, error: (err as Error).message } });
      return null;
    }
  },

  async getContactSettings(): Promise<ContactSettingsRow | null> {
    try {
      const { data, error } = await supabase
        .from('contact_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        handleError(error, `Failed to fetch contact settings.`);
        AnalyticsService.trackEvent({ name: 'fetch_contact_settings_failed', properties: { error: error.message } });
        return null;
      }
      if (!data) {
        AnalyticsService.trackEvent({ name: 'contact_settings_not_found', properties: { reason: 'default_returned' } });
        return {
          id: 'default',
          contact_cards: [] as ContactCardsJson,
          updated_at: new Date().toISOString(),
        };
      }
      AnalyticsService.trackEvent({ name: 'contact_settings_fetched', properties: { id: data.id } });
      return data;
    } catch (err) {
      handleError(err, `An unexpected error occurred while fetching contact settings.`);
      AnalyticsService.trackEvent({ name: 'fetch_contact_settings_unexpected_error', properties: { error: (err as Error).message } });
      return null;
    }
  },

  async updateContactSettings(contactCards: Omit<ContactCard, 'id'>[]): Promise<boolean> {
    try {
      const { data: existingSettings } = await supabase
        .from('contact_settings')
        .select('id')
        .limit(1)
        .single();

      let upsertData: ContactSettingsUpdate = {
        contact_cards: contactCards as unknown as ContactCardsJson, // Cast to Json as per schema
        updated_at: new Date().toISOString(),
      };

      if (existingSettings) {
        upsertData.id = existingSettings.id;
      }

      const { data, error } = await supabase
        .from('contact_settings')
        .upsert(upsertData as ContactSettingsInsert, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        handleError(error, `Failed to update contact settings.`);
        AnalyticsService.trackEvent({ name: 'update_contact_settings_failed', properties: { count: contactCards.length, error: error.message } });
        return false;
      }
      AnalyticsService.trackEvent({ name: 'contact_settings_updated', properties: { count: contactCards.length } });
      return !!data;
    } catch (err) {
      handleError(err, `An unexpected error occurred while updating contact settings.`);
      AnalyticsService.trackEvent({ name: 'update_contact_settings_unexpected_error', properties: { error: (err as Error).message } });
      return false;
    }
  },

  getChangedFields: (
    original: AppSettingsRow,
    updated: Partial<AppSettingsRow>
  ): string[] => {
    const orig = original as Record<string, unknown>;
    const upd = updated as Record<string, unknown>;

    return Object.keys(upd).filter(
      k => orig[k] !== upd[k]
    );
  }
};