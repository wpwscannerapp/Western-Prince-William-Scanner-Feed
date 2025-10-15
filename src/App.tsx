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
import React, { useEffect, useState, useRef } from 'react'; // Import useEffect, useState, useRef
import { NotificationService, isOneSignalReady } from './services/NotificationService'; // Import NotificationService and isOneSignalReady

const queryClient = new QueryClient();

// Component to apply app settings and render children
const AppSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  useAppSettings(); // This hook handles setting CSS variables
  const { user, loading: authLoading } = useAuth(); // Get user and auth loading state
  const [isOneSignalInitialized, setIsOneSignalInitialized] = useState(false);
  const oneSignalInitAttemptedRef = useRef(false); // To prevent multiple init calls

  const initializeOneSignalSDK = async (userId: string) => {
    if (oneSignalInitAttemptedRef.current) {
      console.log('App.tsx: OneSignal initialization already attempted, skipping.');
      return;
    }
    oneSignalInitAttemptedRef.current = true;

    console.log('App.tsx: Attempting to initialize OneSignal for user:', userId);
    const timeoutPromise = new Promise<boolean>(resolve => setTimeout(() => {
      console.warn('App.tsx: OneSignal initialization timed out.');
      resolve(false);
    }, 15000)); // 15 seconds timeout

    const success = await Promise.race([
      NotificationService.initOneSignal(userId),
      timeoutPromise
    ]);
    setIsOneSignalInitialized(success);
    if (!success) {
      console.error('App.tsx: OneSignal initialization failed or timed out.');
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      // First, check if OneSignal is already available globally
      if (isOneSignalReady(window.OneSignal)) {
        console.log('App.tsx: window.OneSignal SDK object is ALREADY available. Initializing directly.');
        initializeOneSignalSDK(user.id);
      } else {
        console.log('App.tsx: window.OneSignal SDK object is NOT yet available. Setting up MutationObserver.');
        // If not, set up a MutationObserver to detect when it becomes available
        const observer = new MutationObserver((mutationsList, observerInstance) => {
          for (const mutation of mutationsList) {
            if (mutation.type === 'childList' || mutation.type === 'attributes') {
              if (isOneSignalReady(window.OneSignal)) {
                console.log('App.tsx: MutationObserver detected window.OneSignal SDK object. Initializing.');
                initializeOneSignalSDK(user.id);
                observerInstance.disconnect(); // Stop observing once found
                return;
              }
            }
          }
        });

        // Observe the entire document for changes
        observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });

        // Also, try to initialize via the deferred queue as a primary method
        initializeOneSignalSDK(user.id);

        return () => {
          observer.disconnect();
        };
      }
    } else if (!authLoading && !user) {
      console.log('App.tsx: User logged out, ensuring OneSignal is unsubscribed if active.');
      if (isOneSignalReady(window.OneSignal)) {
        const osSdk: OneSignalSDK = window.OneSignal;
        osSdk.Notifications.setSubscription(false).then(() => {
          console.log('App.tsx: OneSignal subscription set to false on logout.');
        }).catch(err => {
          console.error('App.tsx: Error setting OneSignal subscription to false on logout:', err);
        });
      }
      setIsOneSignalInitialized(false); // Reset state on logout
      oneSignalInitAttemptedRef.current = false; // Reset flag on logout
    }
  }, [user, authLoading]); // Re-run when user or authLoading changes

  // Pass isOneSignalInitialized down through context or props if needed by children
  // For now, we'll pass it directly to ProfilePage
  return (
    <ProfilePageContext.Provider value={isOneSignalInitialized}>
      {children}
    </ProfilePageContext.Provider>
  );
};

// Create a context for isOneSignalInitialized
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
                    <Route path="home/traffic" element={<TrafficPage />} />
                    <Route path="home/contact-us" element={<ContactUsPage />} />
                    <Route path="home/archive" element={<IncidentArchivePage />} />
                    {/* Removed the standalone notifications route as it's part of ProfilePage */}
                    {/* <Route path="notifications" element={<NotificationSettingsPage />} /> */}
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