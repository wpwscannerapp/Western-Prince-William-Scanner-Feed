"use client";

import React, { useEffect } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { ProfilePageContext } from './ProfilePageContext';

const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useAppSettings();
  // Removed isWebPushInitialized state and related logic
  // This will be re-added when the new NotificationService is implemented

  useEffect(() => {
    // Placeholder for web push initialization logic
    // This will be re-implemented when the new NotificationService is created
    if (import.meta.env.DEV) {
      console.log('AppSettingsContext: Web Push initialization currently disabled.');
    }
  }, []);

  return (
    <ProfilePageContext.Provider value={false}> {/* Temporarily set to false */}
      {children}
    </ProfilePageContext.Provider>
  );
};

export default AppSettingsProvider;