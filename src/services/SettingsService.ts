import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';

export const SettingsService = {
  async getSetting(name: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_name', name)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          return null;
        }
        handleError(error, `Failed to fetch setting: ${name}`);
        return null;
      }
      return data.setting_value;
    } catch (err) {
      handleError(err, `An unexpected error occurred while fetching setting: ${name}`);
      return null;
    }
  },

  async updateSetting(name: string, value: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ setting_name: name, setting_value: value, updated_at: new Date().toISOString() }, { onConflict: 'setting_name' });

      if (error) {
        handleError(error, `Failed to update setting: ${name}`);
        return false;
      }
      return true;
    } catch (err) {
      handleError(err, `An unexpected error occurred while updating setting: ${name}`);
      return false;
    }
  },
};