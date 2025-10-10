import React, { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AuthGateProps {
  children?: React.ReactNode;
}

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('AuthGate: Effect running. Loading:', loading, 'User:', user ? 'present' : 'null');
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
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Initializing authentication...</p>
      </div>
    );
  }

  // If not loading and user is null, the useEffect above will navigate to /auth.
  // If not loading and user is present, render the children.
  return <>{children || <Outlet />}</>;
};

export default AuthGate;