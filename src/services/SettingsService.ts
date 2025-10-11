import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';

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

export interface ContactSettings {
  id: string;
  phone_numbers: string[];
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
          console.warn('No app_settings found, returning default structure.');
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
        return null;
      }
      return data as AppSettings;
    } catch (err) {
      handleError(err, `An unexpected error occurred while fetching app settings.`);
      return null;
    }
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<boolean> {
    try {
      // Ensure there's always an ID for upsert, or insert if none exists
      const { data: existingSettings } = await supabase
        .from('app_settings')
        .select('id')
        .limit(1)
        .single();

      let upsertData = { ...settings, updated_at: new Date().toISOString() };
      if (existingSettings) {
        upsertData = { ...upsertData, id: existingSettings.id };
      } else if (!settings.id) {
        // If no existing settings and no ID provided, let Supabase generate one
        delete (upsertData as any).id;
      }

      const { error } = await supabase
        .from('app_settings')
        .upsert(upsertData, { onConflict: 'id' }); // Use 'id' for conflict resolution

      if (error) {
        handleError(error, `Failed to update app settings.`);
        return false;
      }
      return true;
    } catch (err) {
      handleError(err, `An unexpected error occurred while updating app settings.`);
      return false;
    }
  },

  async insertSettingsHistory(settings: AppSettings): Promise<boolean> {
    try {
      const { error } = await supabase.from('app_settings_history').insert({
        settings: settings,
        layout: settings.layout, // Store layout separately as requested, though it's in settings JSONB
        created_at: new Date().toISOString(),
      });
      if (error) {
        handleError(error, 'Failed to save settings to history.');
        return false;
      }
      return true;
    } catch (err) {
      handleError(err, 'An unexpected error occurred while saving settings to history.');
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
        return null;
      }
      return data || [];
    } catch (err) {
      handleError(err, 'An unexpected error occurred while loading version history.');
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
        return null;
      }
      return data as { settings: AppSettings, layout: any };
    } catch (err) {
      handleError(err, 'An unexpected error occurred while fetching settings from history.');
      return null;
    }
  },

  // --- Contact Settings Functions ---
  async getContactSettings(): Promise<ContactSettings | null> {
    try {
      const { data, error } = await supabase
        .from('contact_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows found, return default structure
          return {
            id: 'default', // Placeholder ID
            phone_numbers: [],
            updated_at: new Date().toISOString(),
          };
        }
        handleError(error, `Failed to fetch contact settings.`);
        return null;
      }
      return data as ContactSettings;
    } catch (err) {
      handleError(err, `An unexpected error occurred while fetching contact settings.`);
      return null;
    }
  },

  async updateContactSettings(phoneNumbers: string[]): Promise<boolean> {
    try {
      const { data: existingSettings } = await supabase
        .from('contact_settings')
        .select('id')
        .limit(1)
        .single();

      let upsertData: Partial<ContactSettings> = { // Explicitly type as Partial<ContactSettings>
        phone_numbers: phoneNumbers,
        updated_at: new Date().toISOString(),
      };

      if (existingSettings) {
        upsertData.id = existingSettings.id; // Assign directly
      }
      // If no existingSettings, upsertData will not have an 'id', and Supabase will generate one.
      // The `delete (upsertData as any).id;` line is no longer needed.

      const { error } = await supabase
        .from('contact_settings')
        .upsert(upsertData, { onConflict: 'id' });

      if (error) {
        handleError(error, `Failed to update contact settings.`);
        return false;
      }
      return true;
    } catch (err) {
      handleError(err, `An unexpected error occurred while updating contact settings.`);
      return false;
    }
  },
};