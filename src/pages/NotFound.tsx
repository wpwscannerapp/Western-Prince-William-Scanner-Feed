"use client";

import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from '@/components/ui/button';
import { AnalyticsService } from '@/services/AnalyticsService'; // Import AnalyticsService

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.error(
        "404 Error: User attempted to access non-existent route:",
        location.pathname,
      );
    }
    AnalyticsService.trackEvent({ name: 'page_not_found', properties: { path: location.pathname } });
  }, [location.pathname]);

  // The logo is now directly referenced from the public directory
  const logoPath = "/Logo.png";
  // Removed CDN path for local logo
  // const cdnLogoPath = `/.netlify/images?url=${encodeURIComponent(logoPath)}&w=192&h=192&fit=contain&fm=auto`;

  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-background tw-p-4">
      <div className="tw-text-center">
        <img 
          src={logoPath} // Direct reference
          alt="Page Not Found" 
          width={192} 
          height={192} 
          className="tw-h-48 tw-mx-auto tw-mb-4" 
          aria-hidden="true" 
        />
        <h1 className="tw-text-4xl tw-font-bold tw-mb-4">404</h1>
        <p className="tw-text-xl tw-text-muted-foreground tw-mb-4">
          Oops! The page <span className="tw-font-mono tw-text-primary">{location.pathname}</span> does not exist.
        </p>
        <div className="tw-flex tw-justify-center tw-gap-4">
          <Button onClick={() => navigate(-1)} className="tw-button">Go Back</Button>
          <Button asChild variant="outline" className="tw-button">
            <a href="/">Return to Home</a>
          </Button>
        </div>
      </div>
      <footer className="tw-w-full tw-py-4 tw-text-center tw-text-xs tw-text-muted-foreground tw-mt-8">
        © {currentYear} Western Prince William Scanner Feed. All rights reserved.
      </footer>
    </div>
  );
};

export default NotFound;