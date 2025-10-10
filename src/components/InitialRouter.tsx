import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const InitialRouter: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('InitialRouter: Effect running. Loading:', loading, 'User:', user ? 'present' : 'null');
    if (!loading) {
      if (user) {
        console.log('InitialRouter: User present, navigating to /home');
        navigate('/home', { replace: true });
      } else {
        console.log('InitialRouter: No user, navigating to /auth');
        navigate('/auth', { replace: true });
      }
    }
  }, [loading, user, navigate]);

  if (loading) {
    console.log('InitialRouter: Still loading auth, showing spinner.');
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <p className="tw-ml-2">Initializing authentication...</p>
      </div>
    );
  }

  // This component's sole purpose is to redirect. It should not render anything else
  // once the loading is complete and navigation has occurred.
  return null;
};

export default InitialRouter;