import React, { useEffect, useState, useRef } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAuth } from '@/context/AuthContext';
import { NotificationService } from '@/services/NotificationService';
import { SUPABASE_API_TIMEOUT } from '@/config';
import { ProfilePageContext } from './ProfilePageContext';

const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useAppSettings();
  const { user, loading: authLoading } = useAuth();
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
        console.warn('AppSettingsContext.tsx: Web Push initialization timed out (from timeout promise).');
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
      console.error('AppSettingsContext.tsx: Web Push readiness check failed.');
    }
  };

  useEffect(() => {
    initializeWebPushSDK();
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      // Logic for handling user logout if needed
    }
  }, [user, authLoading]);

  return (
    <ProfilePageContext.Provider value={isWebPushInitialized}>
      {children}
    </ProfilePageContext.Provider>
  );
};

export default AppSettingsProvider;