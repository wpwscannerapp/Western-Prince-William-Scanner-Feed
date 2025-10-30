import React, { Suspense } from 'react'; // Import Suspense
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.tsx';
import { useAppSettings } from '@/hooks/useAppSettings';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Index from '@/pages/Index';
import { Loader2 } from 'lucide-react'; // For a simple fallback

// Directly import HomePage and IncidentsPage
import HomePage from '@/pages/HomePage';
import IncidentsPage from '@/pages/IncidentsPage';

// Define a common loading fallback for pages
const PageLoadingFallback = () => (
  <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
    <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-label="Loading page" />
    <p className="tw-ml-2">Loading page...</p>
  </div>
);

// Lazy load other page components directly with React.lazy
const ProfilePage = React.lazy(() => import('@/pages/ProfilePage'));
const AdminPage = React.lazy(() => import('@/pages/AdminPage'));
const IncidentDetailPage = React.lazy(() => import('@/pages/IncidentDetailPage'));
const ContactUsPage = React.lazy(() => import('@/pages/ContactUsPage'));
const IncidentArchivePage = React.lazy(() => import('@/pages/IncidentArchivePage'));
const FeedbackPage = React.lazy(() => import('@/pages/FeedbackPage'));
const AuthPage = React.lazy(() => import('@/pages/AuthPage'));
const LoginPage = React.lazy(() => import('@/pages/LoginPage'));
const SignupPage = React.lazy(() => import('@/pages/SignupPage'));
const SubscriptionPage = React.lazy(() => import('@/pages/SubscriptionPage'));
const ResetPasswordPage = React.lazy(() => import('@/pages/ResetPasswordPage'));
const TermsOfServicePage = React.lazy(() => import('@/pages/TermsOfServicePage'));
const NotFound = React.lazy(() => import('@/pages/NotFound'));


const MainContent: React.FC = () => {
  useAuth(); 
  useAppSettings();

  return (
    <>
      <div className="tw-min-h-screen tw-bg-background tw-text-foreground">
        <Routes>
          <Route path="/" element={<Index />} /> 

          {/* Public routes for authentication and related pages */}
          <Route path="/auth" element={<Suspense fallback={<PageLoadingFallback />}><AuthPage /></Suspense>} />
          <Route path="/auth/login" element={<Suspense fallback={<PageLoadingFallback />}><LoginPage /></Suspense>} />
          <Route path="/auth/signup" element={<Suspense fallback={<PageLoadingFallback />}><SignupPage /></Suspense>} />
          <Route path="/subscribe" element={<Suspense fallback={<PageLoadingFallback />}><SubscriptionPage /></Suspense>} />
          <Route path="/reset-password" element={<Suspense fallback={<PageLoadingFallback />}><ResetPasswordPage /></Suspense>} />
          <Route path="/terms-of-service" element={<Suspense fallback={<PageLoadingFallback />}><TermsOfServicePage /></Suspense>} />

          {/* Protected routes wrapped by ProtectedRoute */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="home" element={<HomePage />} /> {/* Direct import */}
            <Route path="home/incidents" element={<IncidentsPage />} /> {/* Direct import */}
            <Route path="home/contact-us" element={<Suspense fallback={<PageLoadingFallback />}><ContactUsPage /></Suspense>} />
            <Route path="home/archive" element={<Suspense fallback={<PageLoadingFallback />}><IncidentArchivePage /></Suspense>} />
            <Route path="home/feedback" element={<Suspense fallback={<PageLoadingFallback />}><FeedbackPage /></Suspense>} />
            <Route path="profile" element={<Suspense fallback={<PageLoadingFallback />}><ProfilePage /></Suspense>} />
            <Route path="admin" element={<Suspense fallback={<PageLoadingFallback />}><AdminPage /></Suspense>} />
            <Route path="incidents/:incidentId" element={<Suspense fallback={<PageLoadingFallback />}><IncidentDetailPage /></Suspense>} />
          </Route>

          {/* Catch-all for 404 - ensure it's after all other specific routes */}
          <Route path="*" element={<Suspense fallback={<PageLoadingFallback />}><NotFound /></Suspense>} />
        </Routes>
      </div>
    </>
  );
};

export default MainContent;