import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { handleError } from '@/utils/errorHandler';
import { SPLASH_DURATION } from '@/config'; // Import from config.ts

const Index = () => {
  const [splashLoading, setSplashLoading] = useState(true);
  const navigate = useNavigate();
  const { user, loading: authLoading, error } = useAuth();

  useEffect(() => {
    const splashDuration = SPLASH_DURATION; // Use constant from config.ts
    document.documentElement.style.setProperty('--splash-duration', `${splashDuration / 1000}s`);

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
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-gradient-to-br tw-from-primary/20 tw-to-background tw-animate-fade-in" aria-label="Loading application">
        <div className="tw-flex tw-flex-col tw-items-center tw-gap-4">
          <img src="/Logo.png" alt="WPW Scanner Logo" className="tw-h-24 tw-animate-pulse" aria-hidden="true" />
          <div className="tw-w-64 tw-h-2 tw-bg-muted tw-rounded-full tw-overflow-hidden">
            <div className="tw-h-full tw-bg-primary tw-animate-progress" />
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Index;