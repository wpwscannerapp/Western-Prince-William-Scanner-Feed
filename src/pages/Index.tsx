import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom'; // Import Outlet to render children
import { SPLASH_DURATION } from '@/config'; // Import from config.ts

const Index = () => {
  const [splashLoading, setSplashLoading] = useState(true);

  useEffect(() => {
    const splashDuration = SPLASH_DURATION; // Use constant from config.ts
    document.documentElement.style.setProperty('--splash-duration', `${splashDuration / 1000}s`);

    const timer = setTimeout(() => {
      setSplashLoading(false);
    }, splashDuration);

    return () => clearTimeout(timer);
  }, []);

  if (splashLoading) {
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

  // Once splash is done, render the Outlet. AuthGate will handle the actual auth check and routing.
  return <Outlet />;
};

export default Index;