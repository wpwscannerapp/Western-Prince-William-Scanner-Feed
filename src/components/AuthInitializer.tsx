import React, { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const AuthInitializer: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('AuthInitializer: Effect running. Loading:', loading, 'User:', user ? 'present' : 'null');
    if (!loading) {
      if (user) {
        console.log('AuthInitializer: User present, navigating to /home');
        navigate('/home', { replace: true });
      } else {
        console.log('AuthInitializer: No user, navigating to /auth');
        navigate('/auth', { replace: true });
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

  // If not loading and user state is determined, render children (Routes)
  // The actual navigation will have already occurred in the useEffect
  return <Outlet />;
};

export default AuthInitializer;