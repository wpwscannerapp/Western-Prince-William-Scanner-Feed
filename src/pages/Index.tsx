import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { SPLASH_DURATION } from '@/config';

const Index: React.FC = () => {
  const { user, authReady } = useAuth();
  const [minimumSplashDurationPassed, setMinimumSplashDurationPassed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const splashDuration = SPLASH_DURATION || 3000;
    if (splashDuration > 0) {
      document.documentElement.style.setProperty('--splash-duration', `${splashDuration / 1000}s`);
      const timer = setTimeout(() => {
        setMinimumSplashDurationPassed(true);
      }, splashDuration);
      return () => clearTimeout(timer);
    } else {
      setMinimumSplashDurationPassed(true);
    }
  }, []);

  useEffect(() => {
    // Navigate if minimum splash duration has passed AND auth is ready
    if (minimumSplashDurationPassed && authReady) {
      if (user) { // If a user object exists (either explicit login or restored session)
        navigate('/home', { replace: true });
      } else { // No user object, so not logged in
        navigate('/auth', { replace: true });
      }
    }
  }, [minimumSplashDurationPassed, authReady, user, navigate]);

  if (!minimumSplashDurationPassed || !authReady) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-gradient-to-br tw-from-primary/20 tw-to-background tw-animate-fade-in" role="status" aria-label="Loading application">
        <div className="tw-flex tw-flex-col tw-items-center tw-gap-4">
          <img 
            src="/.netlify/images?url=/Logo.png&w=96&h=96&fit=contain&fm=auto" 
            alt="WPW Scanner Logo" 
            className="tw-h-24 tw-animate-pulse" 
            aria-hidden="true" 
          />
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