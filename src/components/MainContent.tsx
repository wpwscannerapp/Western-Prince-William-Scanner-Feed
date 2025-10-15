import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.tsx';
import { useAppSettings } from '@/hooks/useAppSettings';
import { NotificationService } from '@/services/NotificationService';
import TopNavBar from '@/components/TopNavBar';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import HomePage from '@/pages/HomePage';
import IncidentsPage from '@/pages/IncidentsPage';
import TrafficPage from '@/pages/TrafficPage';
import ProfilePage from '@/pages/ProfilePage';
import AdminPage from '@/pages/AdminPage';
import PostDetailPage from '@/pages/PostDetailPage';
import ContactUsPage from '@/pages/ContactUsPage';
import IncidentArchivePage from '@/pages/IncidentArchivePage';
import AuthPage from '@/pages/AuthPage';
import SubscriptionPage from '@/pages/SubscriptionPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import TermsOfServicePage from '@/pages/TermsOfServicePage';
import NotFound from '@/pages/NotFound';
import { Button } from '@/components/ui/button';
import Index from '@/pages/Index'; // Import Index for the root route

// Type guard to ensure OneSignal is the SDK object, not the initial array
const isOneSignalReady = (os: unknown): os is OneSignalSDK => {
  return typeof os === 'object' && os !== null && !Array.isArray(os) && 'Notifications' in os;
};

const MainContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [isOneSignalInitialized, setIsOneSignalInitialized] = useState(false);

  useAppSettings(); // Apply app settings here

  useEffect(() => {
    const setupOneSignal = async () => {
      if (!authLoading && user) {
        console.log('MainContent: Attempting to initialize OneSignal for user:', user.id);
        const success = await NotificationService.initOneSignal(user.id);
        setIsOneSignalInitialized(success);
      } else if (!authLoading && !user) {
        console.log('MainContent: User logged out, ensuring OneSignal is unsubscribed if active.');
        if (isOneSignalReady(window.OneSignal)) {
          await window.OneSignal.Notifications.setSubscription(false);
        }
        setIsOneSignalInitialized(false); // Reset state on logout
      }
    };
    setupOneSignal();
  }, [user, authLoading]);

  return (
    <>
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
            {/* Removed isOneSignalInitialized prop as ProfilePage consumes it from context */}
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
    </>
  );
};

export default MainContent;