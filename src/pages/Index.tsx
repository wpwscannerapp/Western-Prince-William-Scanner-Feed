import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { SPLASH_DURATION } from '@/config'; // Import from config.ts

const Index: React.FC = () => {
  const { user, loading: authLoading, authReady } = useAuth(); // Use auth loading and authReady states
  const [splashActive, setSplashActive] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const splashDuration = SPLASH_DURATION;
    document.documentElement.style.setProperty('--splash-duration', `${splashDuration / 1000}s`);

    const timer = setTimeout(() => {
      console.log('Index: Splash timer ended, setting splashActive to false.');
      setSplashActive(false);
    }, splashDuration);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    console.log(`Index: Navigation check - splashActive: ${splashActive}, authReady: ${authReady}, user: ${user ? 'present' : 'null'}`);
    // Only navigate if splash is inactive AND auth is ready
    if (!splashActive && authReady) {
      console.log('Index: Splash inactive and Auth ready. Navigating...');
      if (user) {
        console.log('Index: User authenticated, navigating to /home.');
        navigate('/home', { replace: true });
      } else {
        console.log('Index: User not authenticated, navigating to /auth.');
        navigate('/auth', { replace: true });
      }
    }
  }, [splashActive, authReady, user, navigate]); // Depend on authReady

  // Show splash if splash is active OR auth is still loading
  if (splashActive || authLoading) { 
    console.log('Index: Still showing loading screen (splashActive or authLoading is true).');
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