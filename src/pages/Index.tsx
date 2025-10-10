import React, { useEffect, useState } from 'react';
import { SPLASH_DURATION } from '@/config'; // Import from config.ts

interface IndexProps {
  onSplashComplete: () => void;
}

const Index: React.FC<IndexProps> = ({ onSplashComplete }) => {
  const [splashActive, setSplashActive] = useState(true);

  useEffect(() => {
    const splashDuration = SPLASH_DURATION;
    document.documentElement.style.setProperty('--splash-duration', `${splashDuration / 1000}s`);

    const timer = setTimeout(() => {
      setSplashActive(false);
      onSplashComplete();
    }, splashDuration);

    return () => clearTimeout(timer);
  }, [onSplashComplete]);

  if (!splashActive) {
    return null; // Don't render anything once splash is complete
  }

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
};

export default Index;