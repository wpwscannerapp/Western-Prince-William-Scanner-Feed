import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { SPLASH_DURATION } from '@/config';

const Index: React.FC = () => {
  const { user, loading: authLoading, authReady } = useAuth();
  const [splashActive, setSplashActive] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const splashDuration = SPLASH_DURATION || 3000; // Default if undefined or 0
    if (splashDuration > 0) {
      document.documentElement.style.setProperty('--splash-duration', `${splashDuration / 1000}s`);
      const timer = setTimeout(() => {
        console.log('Index: Splash timer ended, setting splashActive to false.');
        setSplashActive(false);
      }, splashDuration);
      return () => clearTimeout(timer);
    } else {
      // If splash duration is 0 or less, skip splash
      setSplashActive(false);
    }
  }, []);

  useEffect(() => {
    console.log('Index: Navigation check -', { splashActive, authReady, authLoading, user });

    // Only proceed with navigation once auth is ready
    if (authReady) {
      // If splash is still active, wait for it to finish
      if (splashActive) {
        console.log('Index: Auth ready, but splash still active. Waiting for splash to end.');
        return;
      }

      // Splash is not active AND auth is ready, now navigate
      if (user) {
        console.log('Index: Navigating to /home (user authenticated).');
        navigate('/home', { replace: true });
      } else {
        console.log('Index: Navigating to /auth (no user).');
        navigate('/auth', { replace: true });
      }
    } else {
      // Auth is not ready, keep showing loading state (either splash or generic loader)
      console.log('Index: Auth not ready. Waiting for AuthProvider to initialize.');
    }
  }, [splashActive, authReady, user, navigate]);

  // Render splash only if splashActive is true
  if (splashActive) {
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

  // If splash is not active but auth is not ready, show a generic loader
  if (!authReady) {
    console.log('Index: Splash ended, but authReady is false, showing generic loader.');
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <div className="tw-animate-spin tw-h-8 tw-w-8 tw-text-primary" />
        <p className="tw-ml-2">Loading authentication...</p>
      </div>
    );
  }

  return null; // Should not be reached as navigation will occur
};

export default Index;