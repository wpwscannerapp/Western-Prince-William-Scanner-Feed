import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SettingsService, AppSettings } from '@/services/SettingsService';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { hexToHsl, darkenHexColor, hexToRgb } from '@/lib/hexToHsl';

export function useAppSettings() {
  const queryClient = useQueryClient();

  const { data: appSettings, isLoading: isLoadingAppSettings, error: appSettingsError } = useQuery<AppSettings | null, Error>({
    queryKey: ['app_settings'],
    queryFn: () => SettingsService.getSettings(),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  useEffect(() => {
    if (appSettings) {
      // Apply primary color
      document.documentElement.style.setProperty('--app-primary-color-hex', appSettings.primary_color);
      document.documentElement.style.setProperty('--primary', hexToHsl(appSettings.primary_color)); // Set the main --primary HSL variable
      // Calculate and set darker primary color
      document.documentElement.style.setProperty('--app-primary-color-darker-hex', darkenHexColor(appSettings.primary_color, 10)); // Darken by 10%
      // Set primary color RGB for shadows
      document.documentElement.style.setProperty('--app-primary-color-rgb', hexToRgb(appSettings.primary_color));


      // Apply secondary color
      document.documentElement.style.setProperty('--app-secondary-color-hex', appSettings.secondary_color);
      document.documentElement.style.setProperty('--secondary', hexToHsl(appSettings.secondary_color)); // Set the main --secondary HSL variable
      // Calculate and set darker secondary color
      document.documentElement.style.setProperty('--app-secondary-color-darker-hex', darkenHexColor(appSettings.secondary_color, 10)); // Darken by 10%

      // Apply font family
      document.documentElement.style.setProperty('--app-font-family', appSettings.font_family);
      // Also set the base font-family for direct CSS usage if needed
      document.documentElement.style.setProperty('font-family', appSettings.font_family);
      
      // Apply custom CSS
      const customCssId = 'custom-app-css';
      let styleTag = document.getElementById(customCssId) as HTMLStyleElement;
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = customCssId;
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = appSettings.custom_css || '';

      // For logo_url, favicon_url, layout - these would be consumed by specific components
      // For example, a LayoutProvider could use appSettings.layout
      // A Logo component could use appSettings.logo_url
    }
  }, [appSettings]);

  useEffect(() => {
    const channel = supabase
      .channel('public:app_settings_channel') // Unique channel name
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings' }, () => {
        // Invalidate the query to refetch all settings
        queryClient.invalidateQueries({ queryKey: ['app_settings'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (appSettingsError) {
    handleError(appSettingsError, 'Failed to load application settings.');
  }

  return { appSettings, isLoadingAppSettings };
}