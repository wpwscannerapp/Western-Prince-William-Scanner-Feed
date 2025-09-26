import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // If authentication is no longer loading and a user is present, redirect to home
    if (!loading && user) {
      navigate('/home', { replace: true });
    } else if (!loading && !user) {
      // If authentication is no longer loading and no user is present, redirect to auth page
      // This might happen if there was an error or the session couldn't be established
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
      <p className="text-lg">Processing authentication...</p>
    </div>
  );
};

export default AuthCallback;