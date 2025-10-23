import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { SPLASH_DURATION } from '@/config';

const Index: React.FC = () => {
  const { user, authReady, loading: authLoading } = useAuth(); // Get authLoading
  const [minimumSplashDurationPassed, setMinimumSplashDurationPassed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const splashDuration = SPLASH_DURATION || 3000; // Default if undefined or 0
    if (splashDuration > 0) {
      document.documentElement.style.setProperty('--splash-duration', `${splashDuration / 1000}s`);
      const timer = setTimeout(() => {
        console.log('Index: Minimum splash duration passed.');
        setMinimumSplashDurationPassed(true);
      }, splashDuration);
      return () => clearTimeout(timer);
    } else {
      // If splash duration is 0 or less, skip minimum duration
      setMinimumSplashDurationPassed(true);
    }
  }, []);

  useEffect(() => {
    console.log('Index: Navigation check -', { minimumSplashDurationPassed, authReady, authLoading, user }); // Log authLoading

    // Only navigate if both minimum splash duration has passed AND auth is ready AND auth is NOT loading
    if (minimumSplashDurationPassed && authReady && !authLoading) { // Add !authLoading here
      if (user) {
        console.log('Index: Navigating to /home (user authenticated).');
        navigate('/home', { replace: true });
      } else {
        console.log('Index: Navigating to /auth (no user).');
        navigate('/auth', { replace: true });
      }
    } else {
      console.log('Index: Waiting for minimum splash duration, AuthProvider to initialize, or AuthProvider to finish loading.');
    }
  }, [minimumSplashDurationPassed, authReady, authLoading, user, navigate]); // Add authLoading to deps

  // Render splash if either minimum duration hasn't passed OR auth is not ready OR auth is loading
  if (!minimumSplashDurationPassed || !authReady || authLoading) { // Add authLoading here
    console.log('Index: Showing splash screen.');
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

  return null; // Should not be reached as navigation will occur
};

export default Index;