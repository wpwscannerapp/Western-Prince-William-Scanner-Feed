import { useEffect } from 'react'; // Import useEffect
import AuthForm from '@/components/AuthForm';
import TeaserPost from '@/components/TeaserPost';
import { useAuth } from '@/hooks/useAuth';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants';
import { handleError } from '@/utils/errorHandler';
import { Card, CardContent } from '@/components/ui/card';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
  const { user, loading, error } = useAuth(); 
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const navigate = useNavigate();

  console.log('AuthPage: isAdmin status:', isAdmin, 'isAdminLoading:', isAdminLoading);

  // Move the redirect logic into a useEffect hook
  useEffect(() => {
    if (!loading && user) {
      console.log('AuthPage: User already authenticated, redirecting to /home.');
      navigate('/home', { replace: true });
    }
  }, [user, loading, navigate]); // Depend on user and loading to re-run when they change

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
          <h1 className="tw-2xl tw-font-bold tw-text-destructive tw-mb-4">Authentication Error</h1>
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
      <p className="tw-mt-8 tw-text-center tw-text-sm tw-text-muted-foreground">© 2025 Western Prince William Scanner Feed</p>
    </div>
  );
};

export default AuthPage;