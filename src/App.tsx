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
// import TrafficPage from '@/pages/TrafficPage'; // Removed TrafficPage import
import ProfilePage from '@/pages/ProfilePage';
import AdminPage from '@/pages/AdminPage';
import PostDetailPage from '@/pages/PostDetailPage';
import ContactUsPage from '@/pages/ContactUsPage';
import IncidentArchivePage from '@/pages/IncidentArchivePage';
import React, { useEffect, useState, useRef } from 'react'; // Import useEffect, useState, useRef
import { NotificationService } from './services/NotificationService'; // Import NotificationService

const queryClient = new QueryClient();

// Component to apply app settings and render children
const AppSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  useAppSettings(); // This hook handles setting CSS variables
  const { user, loading: authLoading } = useAuth(); // Get user and auth loading state
  const [isWebPushInitialized, setIsWebPushInitialized] = useState(false); // Renamed state
  const webPushInitAttemptedRef = useRef(false); // To prevent multiple init calls

  const initializeWebPushSDK = async (userId: string) => { // Renamed function
    if (webPushInitAttemptedRef.current) {
      console.log('App.tsx: Web Push initialization already attempted, skipping.');
      return;
    }
    webPushInitAttemptedRef.current = true;

    console.log('App.tsx: Attempting to initialize Web Push for user:', userId);
    const timeoutPromise = new Promise<boolean>(resolve => setTimeout(() => {
      console.warn('App.tsx: Web Push initialization timed out.');
      resolve(false);
    }, 15000)); // 15 seconds timeout

    const success = await Promise.race([
      NotificationService.initWebPush(userId), // Call native Web Push init
      timeoutPromise
    ]);
    setIsWebPushInitialized(success);
    if (!success) {
      console.error('App.tsx: Web Push initialization failed or timed out.');
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      initializeWebPushSDK(user.id);
    } else if (!authLoading && !user) {
      console.log('App.tsx: User logged out, ensuring Web Push is unsubscribed if active.');
      // On logout, attempt to unsubscribe from push notifications
      // Ensure userId is always a string, even if user is null/undefined
      const userIdToUnsubscribe = user ? user.id : 'anonymous'; // Fixed TypeScript error here
      NotificationService.unsubscribeWebPush(userIdToUnsubscribe).then(() => {
        console.log('App.tsx: Web Push subscription unsubscribed on logout.');
      }).catch((err: any) => { // Explicitly type err as any
        console.error('App.tsx: Error unsubscribing Web Push on logout:', err);
      });
      setIsWebPushInitialized(false); // Reset state on logout
      webPushInitAttemptedRef.current = false; // Reset flag on logout
    }
  }, [user, authLoading]); // Re-run when user or authLoading changes

  // Pass isWebPushInitialized down through context or props if needed by children
  // For now, we'll pass it directly to ProfilePage
  return (
    <ProfilePageContext.Provider value={isWebPushInitialized}>
      {children}
    </ProfilePageContext.Provider>
  );
};

// Create a context for isWebPushInitialized
const ProfilePageContext = React.createContext<boolean>(false);
export const useProfilePageContext = () => React.useContext(ProfilePageContext);


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
                    {/* <Route path="home/traffic" element={<TrafficPage />} /> */} {/* Removed TrafficPage route */}
                    <Route path="home/contact-us" element={<ContactUsPage />} />
                    <Route path="home/archive" element={<IncidentArchivePage />} />
                    {/* Removed the standalone notifications route as it's part of ProfilePage */}
                    {/* <Route path="notifications" element={<NotificationSettingsPage />} */}
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