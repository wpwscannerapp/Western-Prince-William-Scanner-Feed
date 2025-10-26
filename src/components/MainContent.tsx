import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.tsx';
import { useAppSettings } from '@/hooks/useAppSettings';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Index from '@/pages/Index';
import { lazyLoad } from '@/lib/lazyLoad.tsx'; // Import lazyLoad utility
import { Loader2 } from 'lucide-react'; // For a simple fallback

// Define a common loading fallback for pages
const PageLoadingFallback = () => (
  <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
    <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-label="Loading page" />
    <p className="tw-ml-2">Loading page...</p>
  </div>
);

// Lazy load all page components
const LazyHomePage = lazyLoad(() => import('@/pages/HomePage'), <PageLoadingFallback />);
const LazyIncidentsPage = lazyLoad(() => import('@/pages/IncidentsPage'), <PageLoadingFallback />);
const LazyProfilePage = lazyLoad(() => import('@/pages/ProfilePage'), <PageLoadingFallback />);
const LazyAdminPage = lazyLoad(() => import('@/pages/AdminPage'), <PageLoadingFallback />);
const LazyIncidentDetailPage = lazyLoad(() => import('@/pages/IncidentDetailPage'), <PageLoadingFallback />);
const LazyContactUsPage = lazyLoad(() => import('@/pages/ContactUsPage'), <PageLoadingFallback />);
const LazyIncidentArchivePage = lazyLoad(() => import('@/pages/IncidentArchivePage'), <PageLoadingFallback />);
const LazyFeedbackPage = lazyLoad(() => import('@/pages/FeedbackPage'), <PageLoadingFallback />);
const LazyAuthPage = lazyLoad(() => import('@/pages/AuthPage'), <PageLoadingFallback />);
const LazyLoginPage = lazyLoad(() => import('@/pages/LoginPage'), <PageLoadingFallback />);
const LazySignupPage = lazyLoad(() => import('@/pages/SignupPage'), <PageLoadingFallback />);
const LazySubscriptionPage = lazyLoad(() => import('@/pages/SubscriptionPage'), <PageLoadingFallback />);
const LazyResetPasswordPage = lazyLoad(() => import('@/pages/ResetPasswordPage'), <PageLoadingFallback />);
const LazyTermsOfServicePage = lazyLoad(() => import('@/pages/TermsOfServicePage'), <PageLoadingFallback />);
const LazyNotFound = lazyLoad(() => import('@/pages/NotFound'), <PageLoadingFallback />);


const MainContent: React.FC = () => {
  useAuth(); 
  useAppSettings();

  return (
    <>
      <div className="tw-min-h-screen tw-bg-background tw-text-foreground">
        <Routes>
          <Route path="/" element={<Index />} /> 

          {/* Public routes for authentication and related pages */}
          <Route path="/auth" element={<LazyAuthPage />} />
          <Route path="/auth/login" element={<LazyLoginPage />} />
          <Route path="/auth/signup" element={<LazySignupPage />} />
          <Route path="/subscribe" element={<LazySubscriptionPage />} />
          <Route path="/reset-password" element={<LazyResetPasswordPage />} />
          <Route path="/terms-of-service" element={<LazyTermsOfServicePage />} />

          {/* Protected routes wrapped by ProtectedRoute */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="home" element={<LazyHomePage />} />
            <Route path="home/incidents" element={<LazyIncidentsPage />} />
            <Route path="home/contact-us" element={<LazyContactUsPage />} />
            <Route path="home/archive" element={<LazyIncidentArchivePage />} />
            <Route path="home/feedback" element={<LazyFeedbackPage />} />
            <Route path="profile" element={<LazyProfilePage />} />
            <Route path="admin" element={<LazyAdminPage />} />
            <Route path="incidents/:incidentId" element={<LazyIncidentDetailPage />} />
          </Route>

          {/* Catch-all for 404 - ensure it's after all other specific routes */}
          <Route path="*" element={<LazyNotFound />} />
        </Routes>
      </div>
    </>
  );
};

export default MainContent;