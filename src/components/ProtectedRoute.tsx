import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'; // Use the useAuth hook

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, error } = useAuth(); // Use the useAuth hook

  console.log('ProtectedRoute: Checking authentication...', { loading, user: user ? 'present' : 'null', error });

  if (loading) {
    console.log('ProtectedRoute: Rendering loading state');
    return (
      <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-animate-spin tw-h-8 tw-w-8 tw-text-primary" />
        <p className="tw-ml-2">Loading authentication...</p>
      </div>
    );
  }

  if (error) {
    console.log('ProtectedRoute: Rendering error state', { error });
    return (
      <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <p className="tw-text-destructive">Error: {error.message}</p>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  console.log('ProtectedRoute: User authenticated, rendering children');
  return <>{children || <Outlet />}</>;
};

export default ProtectedRoute;