"use client";

import React, { useEffect, useState } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { ProfilePageContext } from './ProfilePageContext';
import { NotificationService } from '@/services/NotificationService';

const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useAppSettings(); 
  const [isWebPushInitialized, setIsWebPushInitialized] = useState(false);

  useEffect(() => {
    NotificationService.ensureWebPushReady().then(ready => {
      setIsWebPushInitialized(ready);
    });
  }, []);

  return (
    <ProfilePageContext.Provider value={isWebPushInitialized}>
      {children}
    </ProfilePageContext.Provider>
  );
};

export default AppSettingsProvider;