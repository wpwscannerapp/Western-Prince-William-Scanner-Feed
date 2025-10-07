import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.error(
        "404 Error: User attempted to access non-existent route:",
        location.pathname,
      );
    }
  }, [location.pathname]);

  return (
    <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-p-4">
      <div className="tw-text-center">
        <img src="/Logo.png" alt="Page Not Found" className="tw-h-48 tw-mx-auto tw-mb-4" aria-hidden="true" /> {/* Using Logo.png */}
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
    </div>
  );
};

export default NotFound;