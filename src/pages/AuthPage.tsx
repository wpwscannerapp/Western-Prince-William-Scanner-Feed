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
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 bg-cover bg-center"
      style={{ backgroundImage: 'url(/Logo.jpeg)' }} // Using your new logo as background
    >
      <div className="absolute inset-0 bg-black opacity-50"></div> {/* Adjusted opacity for better logo visibility */}
      <div className="relative z-10 text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">WPW Scanner Feed</h1>
        <p className="text-xl text-blue-200 mb-6">
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