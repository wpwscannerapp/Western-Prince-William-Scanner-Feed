import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler'; // Ensure handleError is imported

interface UseAdminResult {
  isAdmin: boolean;
  loading: boolean;
}

export function useIsAdmin(): UseAdminResult {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (authLoading) {
        return; // Wait for auth to finish loading
      }

      if (!user) {
        setIsAdmin(false);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          handleError(error, 'Failed to fetch user role for admin check.'); // Use handleError
          setIsAdmin(false);
        } else if (profile) {
          setIsAdmin(profile.role === 'admin');
        } else {
          setIsAdmin(false); // No profile found or role not 'admin'
        }
      } catch (err) {
        handleError(err, 'An unexpected error occurred during admin role check.'); // Use handleError
        setIsAdmin(false);
      } finally {
        setProfileLoading(false);
      }
    };

    checkAdminRole();
  }, [user, authLoading]); // Dependencies for useEffect

  return { isAdmin, loading: profileLoading };
}