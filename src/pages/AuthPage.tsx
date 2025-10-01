import AuthForm from '@/components/AuthForm';
import TeaserPost from '@/components/TeaserPost';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants'; // Import constants
import { handleError } from '@/utils/errorHandler'; // Import error handler

const AuthPage = () => {
  const { user, loading, error } = useAuth(); // Extend useAuth to return error
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/home');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <p>Loading authentication...</p>
      </div>
    );
  }

  // Add Error Handling: Display error from useAuth
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
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-p-4 tw-bg-background tw-text-foreground">
      <div className="tw-relative tw-z-20 tw-text-center tw-mb-8 tw-bg-card tw-p-4 tw-rounded-lg tw-shadow-xl">
        <h1 className="tw-text-4xl tw-font-bold tw-text-foreground tw-mb-4">{APP_NAME}</h1>
        <p className="tw-text-xl tw-text-muted-foreground tw-mb-6">
          {APP_DESCRIPTION}
        </p>
      </div>
      <div className="tw-relative tw-z-10 tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-8 tw-w-full">
        <AuthForm />
        {/* Conditional TeaserPost: Only show TeaserPost for non-authenticated users */}
        {!user && <TeaserPost />}
      </div>
    </div>
  );
};

export default AuthPage;