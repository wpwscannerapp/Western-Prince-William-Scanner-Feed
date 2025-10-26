"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { NotificationService } from '@/services/NotificationService';
import { SUPABASE_API_TIMEOUT } from '@/config';
import { ProfilePageContext } from './ProfilePageContext';
import { AnalyticsService } from '@/services/AnalyticsService'; // Import AnalyticsService

const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useAppSettings();
  const [isWebPushInitialized, setIsWebPushInitialized] = useState(false);
  const webPushInitAttemptedRef = useRef(false);

  const initializeWebPushSDK = async () => {
    if (webPushInitAttemptedRef.current) {
      return;
    }
    webPushInitAttemptedRef.current = true;

    let timeoutId: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<boolean>(resolve => {
      timeoutId = setTimeout(() => {
        if (import.meta.env.DEV) {
          console.warn('AppSettingsContext.tsx: Web Push initialization timed out (from timeout promise).');
        }
        AnalyticsService.trackEvent({ name: 'web_push_init_timeout' });
        resolve(false);
      }, SUPABASE_API_TIMEOUT);
    });

    const readinessPromise = NotificationService.ensureWebPushReady();

    const success = await Promise.race([
      readinessPromise,
      timeoutPromise
    ]);
    
    clearTimeout(timeoutId!);
    
    setIsWebPushInitialized(success);
    if (!success) {
      if (import.meta.env.DEV) {
        console.error('AppSettingsContext.tsx: Web Push readiness check failed.');
      }
    }
  };

  useEffect(() => {
    initializeWebPushSDK();
  }, []);

  return (
    <ProfilePageContext.Provider value={isWebPushInitialized}>
      {children}
    </ProfilePageContext.Provider>
  );
};

export default AppSettingsProvider;