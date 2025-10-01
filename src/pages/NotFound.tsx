import { useLocation, useNavigate } from "react-router-dom"; // Import useNavigate
import { useEffect } from "react";
import { Button } from '@/components/ui/button'; // Import Button

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    // Structured Logging: Suppress console.error in production
    if (import.meta.env.DEV) {
      console.error(
        "404 Error: User attempted to access non-existent route:",
        location.pathname,
      );
    }
  }, [location.pathname]);

  return (
    <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background">
      <div className="tw-text-center">
        <h1 className="tw-text-4xl tw-font-bold tw-mb-4">404</h1>
        <p className="tw-text-xl tw-text-muted-foreground tw-mb-4">Oops! Page not found</p>
        <div className="tw-flex tw-justify-center tw-gap-2">
          {/* Add Back Button: Include a "Go Back" button */}
          <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
          <a href="/" className="tw-text-primary hover:tw-text-primary/80 tw-underline tw-flex tw-items-center">
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;