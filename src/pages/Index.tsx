import React, { useEffect, useState } from 'react';
import { SPLASH_DURATION } from '@/config'; // Import from config.ts
import { useAuth } from '@/context/AuthContext'; // Import useAuth

interface IndexProps {
  onSplashComplete: () => void;
}

const Index: React.FC<IndexProps> = ({ onSplashComplete }) => {
  const { loading: authLoading } = useAuth(); // Use auth loading state
  const [splashActive, setSplashActive] = useState(true);

  useEffect(() => {
    const splashDuration = SPLASH_DURATION;
    document.documentElement.style.setProperty('--splash-duration', `${splashDuration / 1000}s`);

    const timer = setTimeout(() => {
      setSplashActive(false);
    }, splashDuration);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Once splash is no longer active AND auth loading is complete, signal completion
    if (!splashActive && !authLoading) {
      onSplashComplete();
    }
  }, [splashActive, authLoading, onSplashComplete]);


  if (splashActive || authLoading) { // Show splash if splash is active or auth is still loading
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

  return null; // Don't render anything once splash and auth are complete
};

export default Index;