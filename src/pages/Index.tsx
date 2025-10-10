import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { SPLASH_DURATION } from '@/config'; // Import from config.ts

const Index = () => {
  const [splashLoading, setSplashLoading] = useState(true);
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    const splashDuration = SPLASH_DURATION; // Use constant from config.ts
    document.documentElement.style.setProperty('--splash-duration', `${splashDuration / 1000}s`);

    const timer = setTimeout(() => {
      setSplashLoading(false);
      navigate('/initial-route-check', { replace: true }); // Navigate after splash
    }, splashDuration);

    return () => clearTimeout(timer);
  }, [navigate]); // Add navigate to dependency array

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

  // This component should not render anything after navigation
  return null;
};

export default Index;