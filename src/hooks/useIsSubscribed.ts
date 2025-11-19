import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';

interface UseIsSubscribedResult {
  isSubscribed: boolean;
  loading: boolean;
}

export function useIsSubscribed(): UseIsSubscribedResult {
  const { user, loading: authLoading } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    async function checkSubscriptionStatus() {
      if (authLoading) return; // Wait for auth to finish loading

      if (!user) {
        setIsSubscribed(false);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', user.id)
          .single();

        if (error) {
          handleError(error, 'Failed to fetch subscription status.');
          setIsSubscribed(false);
        } else if (profile) {
          // Include 'tester' as a status that grants full access
          setIsSubscribed(profile.subscription_status === 'trialing' || profile.subscription_status === 'active' || profile.subscription_status === 'tester');
        } else {
          setIsSubscribed(false); // No profile found
        }
      } catch (err) {
        handleError(err, 'An unexpected error occurred while checking subscription status.');
        setIsSubscribed(false);
      } finally {
        setProfileLoading(false);
      }
    }

    checkSubscriptionStatus();
  }, [user, authLoading]);

  return { isSubscribed, loading: profileLoading };
}