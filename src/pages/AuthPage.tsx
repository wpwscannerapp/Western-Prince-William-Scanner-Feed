import AuthForm from '@/components/AuthForm';
import TeaserPost from '@/components/TeaserPost';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const AuthPage = () => {
  const { user, loading } = useAuth();
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

  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-p-4 tw-bg-background tw-text-foreground">
      <div className="tw-relative tw-z-20 tw-text-center tw-mb-8 tw-bg-card tw-p-4 tw-rounded-lg tw-shadow-xl">
        <img src="/logo.jpeg" alt="App Logo" className="tw-h-16 tw-w-auto tw-mx-auto tw-mb-4 tw-block" />
        <h1 className="tw-text-4xl tw-font-bold tw-text-foreground tw-mb-4">WPW Scanner Feed</h1>
        <p className="tw-text-xl tw-text-muted-foreground tw-mb-6">
          Join 20,000+ scanner fans for exclusive Prince William County updates!
        </p>
      </div>
      <div className="tw-relative tw-z-10 tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-8 tw-w-full">
        <AuthForm />
        <TeaserPost /> {/* TeaserPost is now always visible, stacking on smaller screens */}
      </div>
    </div>
  );
};

export default AuthPage;