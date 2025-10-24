import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { SPLASH_DURATION } from '@/config';

const Index: React.FC = () => {
  const { user, authReady, loading: authLoading } = useAuth(); // Removed isExplicitlySignedIn from destructuring as it's not used for primary navigation here
  const [minimumSplashDurationPassed, setMinimumSplashDurationPassed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const splashDuration = SPLASH_DURATION || 3000;
    if (splashDuration > 0) {
      document.documentElement.style.setProperty('--splash-duration', `${splashDuration / 1000}s`);
      const timer = setTimeout(() => {
        console.log('Index: Minimum splash duration passed.');
        setMinimumSplashDurationPassed(true);
      }, splashDuration);
      return () => clearTimeout(timer);
    } else {
      setMinimumSplashDurationPassed(true);
    }
  }, []);

  useEffect(() => {
    console.log('Index: Navigation check -', {
      minimumSplashDurationPassed,
      authReady,
      authLoading, // Keep for logging, but not for condition
      user: user ? 'present' : 'null',
      currentPath: location.pathname
    });

    // Navigate if minimum splash duration has passed AND auth is ready
    if (minimumSplashDurationPassed && authReady) {
      if (user) { // If a user object exists (either explicit login or restored session)
        console.log('Index: Navigating to /home (user session present) from', location.pathname);
        navigate('/home', { replace: true });
      } else { // No user object, so not logged in
        console.log('Index: Navigating to /auth (no user session) from', location.pathname);
        navigate('/auth', { replace: true });
      }
    } else {
      console.log('Index: Waiting for minimum splash duration or AuthProvider to initialize. Current path:', location.pathname);
    }
  }, [minimumSplashDurationPassed, authReady, user, navigate, location.pathname]); // Removed authLoading and isExplicitlySignedIn from deps

  if (!minimumSplashDurationPassed || !authReady) { // Removed authLoading from this condition
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

  return null;
};

export default Index;