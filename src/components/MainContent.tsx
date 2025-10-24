import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.tsx';
import { useAppSettings } from '@/hooks/useAppSettings';
import TopNavBar from '@/components/TopNavBar';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import HomePage from '@/pages/HomePage';
import IncidentsPage from '@/pages/IncidentsPage';
import ProfilePage from '@/pages/ProfilePage';
import AdminPage from '@/pages/AdminPage';
import PostDetailPage from '@/pages/PostDetailPage';
import ContactUsPage from '@/pages/ContactUsPage';
import IncidentArchivePage from '@/pages/IncidentArchivePage';
import AuthPage from '@/pages/AuthPage'; // The new Auth landing page
import LoginPage from '@/pages/LoginPage'; // New Login Page
import SignupPage from '@/pages/SignupPage'; // New Signup Page
import SubscriptionPage from '@/pages/SubscriptionPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import TermsOfServicePage from '@/pages/TermsOfServicePage';
import NotFound from '@/pages/NotFound';
import { Button } from '@/components/ui/button';
import Index from '@/pages/Index';

const MainContent: React.FC = () => {
  useAuth(); 
  useAppSettings();

  return (
    <>
      <TopNavBar />
      <div className="tw-min-h-screen tw-flex tw-flex-col tw-bg-background tw-text-foreground tw-pt-16">
        <Routes>
          <Route path="/" element={<Index />} /> 

          {/* Public routes for authentication and related pages */}
          <Route path="/auth" element={<AuthPage />} /> {/* Auth landing page */}
          <Route path="/auth/login" element={<LoginPage />} /> {/* Dedicated Login page */}
          <Route path="/auth/signup" element={<SignupPage />} /> {/* Dedicated Signup page */}
          <Route path="/subscribe" element={<SubscriptionPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />

          {/* Protected routes wrapped by ProtectedRoute */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="home" element={<HomePage />} />
            <Route path="home/incidents" element={<IncidentsPage />} />
            <Route path="home/contact-us" element={<ContactUsPage />} />
            <Route path="home/archive" element={<IncidentArchivePage />} />
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