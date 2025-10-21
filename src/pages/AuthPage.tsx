import AuthForm from '@/components/AuthForm';
import TeaserPost from '@/components/TeaserPost';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants';
import { handleError } from '@/utils/errorHandler';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Import Button
import { resetSession, testDirectRestApiCall } from '@/utils/supabaseTest'; // Import testDirectRestApiCall

const AuthPage = () => {
  const { user, loading, error, session } = useAuth(); // Get session from useAuth
  const navigate = useNavigate();

  useEffect(() => {
    // Re-enable this redirect. Since /home is no longer a route, it will effectively keep the user on AuthPage
    if (!loading && user) {
      navigate('/home'); // This will attempt to navigate, but since /home is not defined, it will fall back to AuthPage
    }
  }, [user, loading, navigate]);

  const handleDirectRestCall = async () => {
    if (user && session) {
      await testDirectRestApiCall(user.id, session.access_token);
    } else {
      handleError(null, 'User not logged in or session not available for direct REST API call.');
    }
  };

  if (loading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <p>Loading authentication...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground tw-p-4">
        <div className="tw-text-center">
          <h1 className="tw-text-2xl tw-font-bold tw-text-destructive tw-mb-4">Authentication Error</h1>
          <p className="tw-text-muted-foreground">{handleError(error, 'An authentication error occurred.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-gradient-to-br tw-from-primary/10 tw-to-background tw-text-foreground tw-p-4">
      {/* Branded Hero Section */}
      <div className="tw-relative tw-z-20 tw-text-center tw-mb-8 tw-bg-card tw-p-6 tw-rounded-lg tw-shadow-xl">
        <img src="/Logo.png" alt="WPW Scanner Logo" className="tw-h-16 tw-mx-auto tw-mb-4" aria-hidden="true" />
        <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-text-foreground tw-mb-4">{APP_NAME}</h1>
        <p className="tw-text-lg tw-text-muted-foreground tw-mb-6">{APP_DESCRIPTION}</p>
      </div>
      <div className="tw-relative tw-z-10 tw-flex tw-flex-col md:tw-flex-row tw-items-center tw-justify-center tw-gap-8 tw-w-full tw-max-w-5xl tw-px-4 sm:tw-px-6">
        {/* Improved Form Styling */}
        <Card className="tw-w-full md:tw-w-1/2 tw-max-w-md tw-bg-card tw-shadow-lg tw-transition tw-duration-300 hover:tw-shadow-xl">
          <CardContent className="tw-p-6">
            <div aria-label="Authentication form">
              <AuthForm />
            </div>
          </CardContent>
        </Card>
        {/* Conditional TeaserPost with hover effect */}
        {!user && (
          <div className="tw-w-full md:tw-w-1/2 tw-max-w-md tw-transition tw-duration-300 hover:tw-scale-105">
            <TeaserPost />
          </div>
        )}
      </div>
      {/* Debug Buttons */}
      <div className="tw-mt-8 tw-flex tw-gap-4">
        <Button
          onClick={() => resetSession()}
          variant="outline"
          className="tw-text-sm tw-text-muted-foreground hover:tw-text-primary"
        >
          Reset Session (Debug)
        </Button>
        {user && session && (
          <Button
            onClick={handleDirectRestCall}
            variant="outline"
            className="tw-text-sm tw-text-muted-foreground hover:tw-text-primary"
          >
            Test Direct REST API Call
          </Button>
        )}
      </div>
      <p className="tw-mt-8 tw-text-center tw-text-sm tw-text-muted-foreground">© 2025 Western Prince William Scanner Feed</p>
    </div>
  );
};

export default AuthPage;