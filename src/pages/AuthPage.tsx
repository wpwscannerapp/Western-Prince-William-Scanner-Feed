import React from 'react';
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
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="relative z-20 text-center mb-8 bg-card p-4 rounded-lg shadow-xl">
        <img src="/logo.jpeg" alt="App Logo" className="h-16 w-auto mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-foreground mb-4">WPW Scanner Feed</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Join 20,000+ scanner fans for exclusive Prince William County updates!
        </p>
      </div>
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-8 w-full">
        <AuthForm />
        <div className="hidden md:block">
          <TeaserPost />
        </div>
      </div>
    </div>
  );
};

export default AuthPage;