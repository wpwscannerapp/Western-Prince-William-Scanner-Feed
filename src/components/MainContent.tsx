"use client";

import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.tsx';
import { useAppSettings } from '@/hooks/useAppSettings';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Index from '@/pages/Index';
import { Loader2 } from 'lucide-react'; // For a simple fallback

// Helper function to ensure default export is used for lazy loading and log errors
const lazyLoad = (factory: () => Promise<any>, path: string) => {
  const LazyComponent = React.lazy(() => factory().then(module => {
    if (!module.default) {
      console.error(`CRITICAL ERROR: Missing default export in ${path}`, module);
      throw new Error(`Missing default export in ${path}`);
    }
    console.log(`SUCCESS: Lazy loaded ${path}`);
    return { default: module.default };
  }).catch(err => {
    console.error(`FAILED: Failed to load module ${path}:`, err);
    throw err;
  }));
  
  if (import.meta.env.DEV) {
    console.log(`DEBUG: Defined lazy component for ${path}`);
  }
  return LazyComponent;
};

// Define a common loading fallback for pages
const PageLoadingFallback = () => (
  <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
    <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-label="Loading page" />
    <p className="tw-ml-2">Loading page...</p>
  </div>
);

// Lazy load all page components using the helper
const HomePage = lazyLoad(() => import('@/pages/HomePage'), '@/pages/HomePage');
const IncidentsPage = lazyLoad(() => import('@/pages/IncidentsPage'), '@/pages/IncidentsPage');
const ProfilePage = lazyLoad(() => import('@/pages/ProfilePage'), '@/pages/ProfilePage');
const AdminPage = lazyLoad(() => import('@/pages/AdminPage'), '@/pages/AdminPage');
const IncidentDetailPage = lazyLoad(() => import('@/pages/IncidentDetailPage'), '@/pages/IncidentDetailPage');
const ContactUsPage = lazyLoad(() => import('@/pages/ContactUsPage'), '@/pages/ContactUsPage');
const IncidentArchivePage = lazyLoad(() => import('@/pages/IncidentArchivePage'), '@/pages/IncidentArchivePage');
const FeedbackPage = lazyLoad(() => import('@/pages/FeedbackPage'), '@/pages/FeedbackPage');
const AuthPage = lazyLoad(() => import('@/pages/AuthPage'), '@/pages/AuthPage');
const LoginPage = lazyLoad(() => import('@/pages/LoginPage'), '@/pages/LoginPage');
const SignupPage = lazyLoad(() => import('@/pages/SignupPage'), '@/pages/SignupPage');
const SubscriptionPage = lazyLoad(() => import('@/pages/SubscriptionPage'), '@/pages/SubscriptionPage');
const ResetPasswordPage = lazyLoad(() => import('@/pages/ResetPasswordPage'), '@/pages/ResetPasswordPage');
const TermsOfServicePage = lazyLoad(() => import('@/pages/TermsOfServicePage'), '@/pages/TermsOfServicePage');
const NotFound = lazyLoad(() => import('@/pages/NotFound'), '@/pages/NotFound');


const MainContent: React.FC = () => {
  useAuth(); 
  useAppSettings();

  return (
    <>
      <div className="tw-min-h-screen tw-bg-background tw-text-foreground">
        <Routes>
          {/* Index page is NOT lazy loaded, so it should load first */}
          <Route path="/" element={<Index />} /> 

          {/* Public routes for authentication and related pages - wrapped in Suspense */}
          <Route path="/auth" element={<Suspense fallback={<PageLoadingFallback />}><AuthPage /></Suspense>} />
          <Route path="/auth/login" element={<Suspense fallback={<PageLoadingFallback />}><LoginPage /></Suspense>} />
          <Route path="/auth/signup" element={<Suspense fallback={<PageLoadingFallback />}><SignupPage /></Suspense>} />
          <Route path="/subscribe" element={<Suspense fallback={<PageLoadingFallback />}><SubscriptionPage /></Suspense>} />
          <Route path="/reset-password" element={<Suspense fallback={<PageLoadingFallback />}><ResetPasswordPage /></Suspense>} />
          <Route path="/terms-of-service" element={<Suspense fallback={<PageLoadingFallback />}><TermsOfServicePage /></Suspense>} />

          {/* Protected routes wrapped by ProtectedRoute - wrapped in Suspense */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="home" element={<Suspense fallback={<PageLoadingFallback />}><HomePage /></Suspense>} />
            <Route path="home/incidents" element={<Suspense fallback={<PageLoadingFallback />}><IncidentsPage /></Suspense>} />
            <Route path="home/contact-us" element={<Suspense fallback={<PageLoadingFallback />}><ContactUsPage /></Suspense>} />
            <Route path="home/archive" element={<Suspense fallback={<PageLoadingFallback />}><IncidentArchivePage /></Suspense>} />
            <Route path="home/feedback" element={<Suspense fallback={<PageLoadingFallback />}><FeedbackPage /></Suspense>} />
            <Route path="profile" element={<Suspense fallback={<PageLoadingFallback />}><ProfilePage /></Suspense>} />
            <Route path="admin" element={<Suspense fallback={<PageLoadingFallback />}><AdminPage /></Suspense>} />
            <Route path="incidents/:incidentId" element={<Suspense fallback={<PageLoadingFallback />}><IncidentDetailPage /></Suspense>} />
          </Route>

          {/* Catch-all for 404 - wrapped in Suspense */}
          <Route path="*" element={<Suspense fallback={<PageLoadingFallback />}><NotFound /></Suspense>} />
        </Routes>
      </div>
    </>
  );
};

export default MainContent;