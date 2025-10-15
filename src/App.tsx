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
import { AuthProvider, useAuth } from "@/context/AuthContext.tsx"; // Import useAuth
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from '@/components/Layout';
import HomePage from '@/pages/HomePage';
import IncidentsPage from '@/pages/IncidentsPage';
import TrafficPage from '@/pages/TrafficPage';
import ProfilePage from '@/pages/ProfilePage';
import AdminPage from '@/pages/AdminPage';
import PostDetailPage from '@/pages/PostDetailPage';
import ContactUsPage from '@/pages/ContactUsPage';
import IncidentArchivePage from '@/pages/IncidentArchivePage';
import NotificationSettingsPage from '@/pages/NotificationSettingsPage';
import React, { useEffect } from 'react'; // Import useEffect
import { NotificationService } from './services/NotificationService'; // Import NotificationService

const queryClient = new QueryClient();

// Type guard to ensure OneSignal is the SDK object, not the initial array
const isOneSignalReady = (os: unknown): os is OneSignalSDK => {
  return typeof os === 'object' && os !== null && !Array.isArray(os) && 'Notifications' in os;
};

// Component to apply app settings and render children
const AppSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  useAppSettings(); // This hook handles setting CSS variables
  const { user, loading: authLoading } = useAuth(); // Get user and auth loading state

  useEffect(() => {
    // Initialize OneSignal only when user is authenticated and OneSignal SDK is ready
    if (!authLoading && user && isOneSignalReady(window.OneSignal)) {
      console.log('App.tsx: Initializing OneSignal for user:', user.id);
      NotificationService.initOneSignal(user.id);
    } else if (!authLoading && !user) {
      console.log('App.tsx: User logged out, ensuring OneSignal is unsubscribed if active.');
      if (isOneSignalReady(window.OneSignal)) {
        window.OneSignal.Notifications.setSubscription(false);
      }
    }
  }, [user, authLoading]); // Re-run when user or authLoading changes

  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <AppSettingsProvider>
              <TopNavBar />
              <div className="tw-min-h-screen tw-flex tw-flex-col tw-bg-background tw-text-foreground tw-pt-16">
                <Routes>
                  {/* The root path will now be the splash screen */}
                  <Route path="/" element={<Index />} /> 

                  {/* Public routes that don't require authentication */}
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/subscribe" element={<SubscriptionPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/terms-of-service" element={<TermsOfServicePage />} />

                  {/* Protected routes wrapped by ProtectedRoute */}
                  <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    {/* No index route here, as / is handled by Index.tsx */}
                    <Route path="home" element={<HomePage />} />
                    <Route path="home/incidents" element={<IncidentsPage />} />
                    <Route path="home/traffic" element={<TrafficPage />} />
                    <Route path="home/contact-us" element={<ContactUsPage />} />
                    <Route path="home/archive" element={<IncidentArchivePage />} />
                    <Route path="notifications" element={<NotificationSettingsPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="admin" element={<AdminPage />} />
                    <Route path="posts/:postId" element={<PostDetailPage />} />
                  </Route>

                  {/* Catch-all for 404 - ensure it's after all other specific routes */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>

              {/* Floating Feedback Button */}
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
  );
};

export default App;