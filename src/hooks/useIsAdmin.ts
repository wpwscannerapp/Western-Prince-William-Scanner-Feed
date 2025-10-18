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
      console.log('useIsAdmin: checkAdminRole started.');
      if (authLoading) {
        console.log('useIsAdmin: authLoading is true, returning early.');
        return; // Wait for auth to finish loading
      }

      if (!user) {
        console.log('useIsAdmin: No user found, setting isAdmin to false and profileLoading to false.');
        setIsAdmin(false);
        setProfileLoading(false);
        return;
      }

      console.log('useIsAdmin: User found, fetching profile role for user ID:', user.id);
      setProfileLoading(true);
      try {
        console.log('useIsAdmin: Calling Supabase to fetch profile role...');
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        console.log('useIsAdmin: Supabase profile fetch completed. Data:', profile, 'Error:', error);

        if (error) {
          handleError(error, 'Failed to fetch user role for admin check.'); // Use handleError
          setIsAdmin(false);
          console.log('useIsAdmin: Error fetching profile, isAdmin set to false.');
        } else if (profile) {
          setIsAdmin(profile.role === 'admin');
          console.log('useIsAdmin: Profile found. Role:', profile.role, 'isAdmin:', profile.role === 'admin');
        } else {
          setIsAdmin(false); // No profile found or role not 'admin'
          console.log('useIsAdmin: No profile data found, isAdmin set to false.');
        }
      } catch (err) {
        handleError(err, 'An unexpected error occurred during admin role check.'); // Use handleError
        setIsAdmin(false);
        console.error('useIsAdmin: Unexpected error in checkAdminRole catch block:', err);
      } finally {
        setProfileLoading(false);
        console.log('useIsAdmin: checkAdminRole finished, profileLoading set to false.');
      }
    };

    checkAdminRole();
  }, [user, authLoading]); // Dependencies for useEffect

  return { isAdmin, loading: profileLoading };
}