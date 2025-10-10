import React, { useEffect } from 'react';
import { useNavigate, Routes, Route, Navigate, Outlet } from 'react-router-dom'; // Import Routes, Route, Navigate, Outlet
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import Layout from '@/components/Layout'; // Import Layout
import HomePage from '@/pages/HomePage'; // Import pages
import IncidentsPage from '@/pages/IncidentsPage';
import WeatherPage from '@/pages/WeatherPage';
import TrafficPage from '@/pages/TrafficPage';
import ProfilePage from '@/pages/ProfilePage';
import AdminPage from '@/pages/AdminPage';
import PostDetailPage from '@/pages/PostDetailPage';

// ProtectedRoute component to guard routes (moved here for clarity)
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  console.log('ProtectedRoute: Checking authentication...');
  console.log('ProtectedRoute: Current auth loading state:', loading);

  if (loading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If authenticated, render the Outlet for nested routes
  return <Outlet />;
};

const AuthInitializer: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('AuthInitializer: Effect running. Loading:', loading, 'User:', user ? 'present' : 'null');
    if (!loading) {
      if (user) {
        console.log('AuthInitializer: User present, navigating to /home');
        // Only navigate if not already on a protected route
        if (window.location.pathname === '/') { // Only redirect from root
          navigate('/home', { replace: true });
        }
      } else {
        console.log('AuthInitializer: No user, navigating to /auth');
        // Only navigate if not already on an auth-related page
        if (!['/auth', '/subscribe', '/reset-password', '/terms-of-service'].includes(window.location.pathname)) {
          navigate('/auth', { replace: true });
        }
      }
    }
  }, [loading, user, navigate]);

  if (loading) {
    console.log('AuthInitializer: Still loading auth, showing spinner.');
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Initializing authentication...</p>
      </div>
    );
  }

  // Once auth is loaded, render the protected routes
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/home/incidents" element={<IncidentsPage />} />
          <Route path="/home/weather" element={<WeatherPage />} />
          <Route path="/home/traffic" element={<TrafficPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/posts/:postId" element={<PostDetailPage />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default AuthInitializer;