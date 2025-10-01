import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SplashScreen from '@/components/SplashScreen';
import { useAuth } from '@/hooks/useAuth';
import { SPLASH_DURATION_MS } from '@/lib/constants'; // Import constant
import { handleError } from '@/utils/errorHandler'; // Import error handler

const Index = () => {
  const [splashLoading, setSplashLoading] = useState(true);
  const navigate = useNavigate();
  const { user, loading: authLoading, error } = useAuth(); // Get error from useAuth

  useEffect(() => {
    // Configurable Splash Duration: Use an environment variable or constant
    const splashDuration = parseInt(import.meta.env.VITE_SPLASH_DURATION || '', 10) || SPLASH_DURATION_MS;
    const timer = setTimeout(() => {
      setSplashLoading(false);
    }, splashDuration);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!splashLoading && !authLoading) {
      if (user) {
        navigate('/home');
      } else {
        navigate('/auth');
      }
    }
  }, [splashLoading, authLoading, user, navigate]);

  // Error Handling: Add error handling for useAuth
  if (error) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-text-center">
          <h1 className="tw-text-2xl tw-font-bold tw-text-destructive tw-mb-4">Authentication Error</h1>
          <p className="tw-text-muted-foreground">{handleError(error, 'An authentication error occurred during startup.')}</p>
        </div>
      </div>
    );
  }

  if (splashLoading || authLoading) {
    return <SplashScreen />;
  }

  return null;
};

export default Index;