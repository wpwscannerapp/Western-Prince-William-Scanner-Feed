import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { useAppSettings } from "./hooks/useAppSettings";
import { AuthProvider, useAuth } from "@/context/AuthContext.tsx";
import React, { useEffect, useState, useRef } from 'react';
import { NotificationService } from './services/NotificationService';
import { SUPABASE_API_TIMEOUT } from './config';
import ErrorBoundary from './components/ErrorBoundary';
import MainContent from './components/MainContent';

const queryClient = new QueryClient();

const AppSettingsProvider = ({ children }: { children: React.ReactNode }) => {
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
        console.warn('App.tsx: Web Push initialization timed out (from timeout promise).');
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
      console.error('App.tsx: Web Push readiness check failed.');
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

const ProfilePageContext = React.createContext<boolean>(false);
export const useProfilePageContext = () => React.useContext(ProfilePageContext);


const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <AppSettingsProvider>
                {/* Render MainContent which contains all routes */}
                <MainContent />
              </AppSettingsProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;