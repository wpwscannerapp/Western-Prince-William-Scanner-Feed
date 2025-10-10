import React, { useEffect, useState } from 'react';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, AlertCircle } from 'lucide-react';
import Layout from '@/components/Layout';
import HomePage from '@/pages/HomePage';
import IncidentsPage from '@/pages/IncidentsPage';
import WeatherPage from '@/pages/WeatherPage';
import TrafficPage from '@/pages/TrafficPage';
import ProfilePage from '@/pages/ProfilePage';
import AdminPage from '@/pages/AdminPage';
import PostDetailPage from '@/pages/PostDetailPage';
import { Button } from '@/components/ui/button'; // Import Button for retry
import { SUPABASE_API_TIMEOUT } from '@/config'; // Import timeout constant

const AuthGate: React.FC = () => {
  const { user, loading, error: authError } = useAuth();
  const navigate = useNavigate();
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    console.log('AuthGate: Effect running. Loading:', loading, 'User:', user ? 'present' : 'null', 'Auth Error:', authError);
    if (!loading) {
      if (!user) {
        console.log('AuthGate: No user, navigating to /auth');
        // Only navigate if not already on an auth-related page
        if (!['/auth', '/subscribe', '/reset-password', '/terms-of-service'].includes(window.location.pathname)) {
          navigate('/auth', { replace: true });
        }
      } else {
        console.log('AuthGate: User present. Allowing access to protected routes.');
        // If user is present and we are on the root path, redirect to home
        if (window.location.pathname === '/') {
          navigate('/home', { replace: true });
        }
      }
    }
  }, [loading, user, navigate, authError]);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        console.warn('AuthGate: Authentication loading timed out.');
        setTimeoutReached(true);
      }, SUPABASE_API_TIMEOUT * 2); // Give it a bit more time than a single API call

      return () => clearTimeout(timer);
    } else {
      setTimeoutReached(false); // Reset timeout if loading finishes
    }
  }, [loading]);

  const handleRetry = () => {
    // Force a full page reload to re-initialize everything
    window.location.reload();
  };

  if (loading || (timeoutReached && !user && !authError)) {
    // If loading is true OR timeout is reached and no user/error has been determined yet
    return (
      <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        {timeoutReached && !user && !authError ? (
          <div className="tw-text-center">
            <AlertCircle className="tw-h-12 tw-w-12 tw-text-destructive tw-mx-auto tw-mb-4" />
            <p className="tw-text-lg tw-font-semibold tw-mb-2">Authentication timed out.</p>
            <p className="tw-text-muted-foreground tw-mb-4">
              We're having trouble connecting to the authentication service. Please check your internet connection or try again.
            </p>
            <Button onClick={handleRetry} className="tw-button">
              Retry
            </Button>
          </div>
        ) : (
          <>
            <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
            <p className="tw-ml-2">Initializing authentication...</p>
          </>
        )}
      </div>
    );
  }

  // If not loading and user is null, the useEffect above will navigate to /auth.
  // If not loading and user is present, render the protected routes.
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/home/incidents" element={<IncidentsPage />} />
        <Route path="/home/weather" element={<WeatherPage />} />
        <Route path="/home/traffic" element={<TrafficPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/posts/:postId" element={<PostDetailPage />} />
        {/* Catch-all for any path under AuthGate that isn't explicitly defined */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  );
};

export default AuthGate;