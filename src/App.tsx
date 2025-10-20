import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import { useAppSettings } from "./hooks/useAppSettings";
import TopNavBar from "./components/TopNavBar";
import { Button } from "./components/ui/button";
import { AuthProvider, useAuth } from "@/context/AuthContext.tsx";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from '@/components/Layout';
import HomePage from '@/pages/HomePage';
import IncidentsPage from '@/pages/IncidentsPage';
import ProfilePage from '@/pages/ProfilePage';
import AdminPage from '@/pages/AdminPage';
import PostDetailPage from '@/pages/PostDetailPage';
import ContactUsPage from '@/pages/ContactUsPage';
import IncidentArchivePage from '@/pages/IncidentArchivePage';
import React, { useEffect, useState, useRef } from 'react';
import { NotificationService } from './services/NotificationService';
import { SUPABASE_API_TIMEOUT } from './config';
import ErrorBoundary from './components/ErrorBoundary';

const queryClient = new QueryClient();

// Component to apply app settings and render children
const AppSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  useAppSettings(); // This hook handles setting CSS variables
  return <>{children}</>;
};

const App = () => {
  const { user, loading: authLoading } = useAuth(); // Call useAuth directly in App
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider> {/* AuthProvider wraps everything that needs auth context */}
              <AppSettingsProvider>
                <TopNavBar />
                <div className="tw-min-h-screen tw-flex tw-flex-col tw-bg-background tw-text-foreground tw-pt-16">
                  <Routes>
                    <Route path="/" element={<Index />} /> 
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/subscribe" element={<SubscriptionPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/terms-of-service" element={<TermsOfServicePage />} />

                    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                      <Route path="home" element={<HomePage />} />
                      <Route path="home/incidents" element={<IncidentsPage />} />
                      <Route path="home/contact-us" element={<ContactUsPage />} />
                      <Route path="home/archive" element={<IncidentArchivePage />} />
                      <Route path="profile" element={<ProfilePage isWebPushInitialized={isWebPushInitialized} />} /> {/* Pass prop */}
                      <Route path="admin" element={<AdminPage />} />
                      <Route path="posts/:postId" element={<PostDetailPage />} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>

                <Button
                  variant="outline"
                  className="tw-fixed tw-bottom-4 tw-right-4 tw-rounded-full tw-shadow-lg tw-button tw-z-50"
                  onClick={() => window.open('mailto:support@example.com')}
                  aria-label="Send feedback"
                >
                  Feedback
                </Button>
              </AppSettingsProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;