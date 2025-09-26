import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SplashScreen from '@/components/SplashScreen';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const [splashLoading, setSplashLoading] = useState(true);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashLoading(false);
    }, 3000); // Show splash screen for 3 seconds

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!splashLoading && !authLoading) {
      if (user) {
        navigate('/home');
      } else {
        navigate('/auth');
      }
    }
  }, [splashLoading, authLoading, user, navigate]);

  if (splashLoading || authLoading) {
    return <SplashScreen />;
  }

  return null;
};

export default Index;