"use client";

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SettingsService, AppSettings } from '@/services/SettingsService';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { hexToHsl, darkenHexColor, hexToRgb } from '@/lib/hexToHsl';
import { AnalyticsService } from '@/services/AnalyticsService'; // Import AnalyticsService

export function useAppSettings() {
  const queryClient = useQueryClient();

  const { data: appSettings, isLoading: isLoadingAppSettings, error: appSettingsError } = useQuery<AppSettings | null, Error>({
    queryKey: ['app_settings'],
    queryFn: () => SettingsService.getSettings(),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (appSettings) {
      document.documentElement.style.setProperty('--app-primary-color-hex', appSettings.primary_color);
      document.documentElement.style.setProperty('--primary', hexToHsl(appSettings.primary_color));
      document.documentElement.style.setProperty('--app-primary-color-darker-hex', darkenHexColor(appSettings.primary_color, 10));
      document.documentElement.style.setProperty('--app-primary-color-rgb', hexToRgb(appSettings.primary_color));

      document.documentElement.style.setProperty('--app-secondary-color-hex', appSettings.secondary_color);
      document.documentElement.style.setProperty('--secondary', hexToHsl(appSettings.secondary_color));
      document.documentElement.style.setProperty('--app-secondary-color-darker-hex', darkenHexColor(appSettings.secondary_color, 10));

      document.documentElement.style.setProperty('--app-font-family', appSettings.font_family);
      document.documentElement.style.setProperty('font-family', appSettings.font_family);
      
      const customCssId = 'custom-app-css';
      let styleTag = document.getElementById(customCssId) as HTMLStyleElement;
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = customCssId;
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = appSettings.custom_css || '';
      AnalyticsService.trackEvent({ name: 'app_settings_applied', properties: { primaryColor: appSettings.primary_color, fontFamily: appSettings.font_family } });
    }
  }, [appSettings]);

  useEffect(() => {
    const channel = supabase
      .channel('public:app_settings_channel')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['app_settings'] });
        AnalyticsService.trackEvent({ name: 'app_settings_realtime_update_received' });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (appSettingsError) {
    handleError(appSettingsError, 'Failed to load application settings.');
    AnalyticsService.trackEvent({ name: 'load_app_settings_failed', properties: { error: appSettingsError.message } });
  }

  return { appSettings, isLoadingAppSettings };
}