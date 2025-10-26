import TeaserIncident from '@/components/TeaserIncident';
import { useAuth } from '@/hooks/useAuth';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants';
import { handleError } from '@/utils/errorHandler';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

const AuthPage = () => {
  const { user, loading, error } = useAuth(); 
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if user is present and auth is not loading, regardless of explicit sign-in
    if (!loading && user) { 
      navigate('/home', { replace: true });
    }
  }, [user, loading, navigate]);

  // If there's an error, display it. This is a critical state.
  if (error) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-text-center">
          <h1 className="tw-2xl tw-font-bold tw-text-destructive tw-mb-4">Authentication Error</h1>
          <p className="tw-text-muted-foreground">{handleError(error, 'An authentication error occurred.')}</p>
        </div>
      </div>
    );
  }

  // If loading is true AND user is explicitly signed in, it means a redirect is imminent.
  // Return null to prevent flicker before the useEffect handles the navigation.
  if (loading && user) { // Simplified condition
    return null;
  }

  // Otherwise, render the login/signup options. This covers:
  // 1. !loading && !user (no session)
  // 2. !loading && user (restored session, but useEffect will redirect)
  // 3. loading && !user (initial check, no session found yet - show content immediately)
  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-gradient-to-br tw-from-primary/10 tw-to-background tw-text-foreground tw-p-4">
      {/* Branded Hero Section */}
      <div className="tw-relative tw-z-20 tw-text-center tw-mb-8 tw-bg-card tw-p-6 tw-rounded-lg tw-shadow-xl">
        <img 
          src="/.netlify/images?url=/Logo.png&w=64&h=64&fit=contain&fm=auto" 
          alt="WPW Scanner Logo" 
          className="tw-h-16 tw-mx-auto tw-mb-4" 
          aria-hidden="true" 
        />
        <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-text-foreground tw-mb-4">{APP_NAME}</h1>
        <p className="tw-text-lg tw-text-muted-foreground tw-mb-6">{APP_DESCRIPTION}</p>
        <div className="tw-flex tw-flex-col sm:tw-flex-row tw-gap-4 tw-justify-center">
          <Button onClick={() => navigate('/auth/login')} className="tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground tw-text-lg tw-py-6">
            Login
          </Button>
          <Button onClick={() => navigate('/auth/signup')} variant="outline" className="tw-text-lg tw-py-6">
            Sign Up
          </Button>
        </div>
      </div>
      <div className="tw-relative tw-z-10 tw-flex tw-flex-col md:tw-flex-row tw-items-center tw-justify-center tw-gap-8 tw-w-full tw-max-w-5xl tw-px-4 sm:tw-px-6">
        {/* Conditional TeaserIncident with hover effect */}
        {!user && ( // Only show teaser if no user is present (even restored session)
          <div className="tw-w-full md:tw-w-1/2 tw-max-w-md tw-transition tw-duration-300 hover:tw-scale-105">
            <TeaserIncident />
          </div>
        )}
      </div>
      <p className="tw-mt-8 tw-text-center tw-text-sm tw-text-muted-foreground">© 2025 Western Prince William Scanner Feed</p>
    </div>
  );
};

export default AuthPage;