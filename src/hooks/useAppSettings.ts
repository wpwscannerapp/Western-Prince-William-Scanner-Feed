import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SettingsService } from '@/services/SettingsService';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';

export function useAppSettings() {
  const queryClient = useQueryClient();

  const { data: primaryColor, isLoading: isLoadingPrimaryColor, error: primaryColorError } = useQuery<string | null, Error>({
    queryKey: ['app_setting', 'primary_color'],
    queryFn: () => SettingsService.getSetting('primary_color'),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  useEffect(() => {
    if (primaryColor) {
      document.documentElement.style.setProperty('--app-primary-color-hex', primaryColor);
      // Convert hex to HSL for Tailwind CSS variables if needed, or use direct hex
      // For simplicity, we'll use the hex directly in globals.css for now.
    }
  }, [primaryColor]);

  useEffect(() => {
    const channel = supabase
      .channel('public:app_settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: 'setting_name=eq.primary_color' }, (payload) => {
        const updatedSetting = payload.new as { setting_name: string; setting_value: string };
        if (updatedSetting.setting_name === 'primary_color') {
          queryClient.invalidateQueries({ queryKey: ['app_setting', 'primary_color'] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (primaryColorError) {
    handleError(primaryColorError, 'Failed to load application settings.');
  }

  return { primaryColor, isLoadingPrimaryColor };
}