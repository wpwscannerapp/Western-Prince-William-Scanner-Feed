import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler'; // Ensure handleError is imported

interface UseAdminResult {
  isAdmin: boolean;
  loading: boolean;
}

export function useIsAdmin(): UseAdminResult {
  console.log('useIsAdmin: Hook function called.'); // New log here
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    console.log('useIsAdmin: useEffect triggered. Dependencies:', { authLoading, user: user ? 'present' : 'null' });
    
    const checkAdminRole = async () => {
      if (authLoading) {
        console.log('useIsAdmin: authLoading is true, returning early from checkAdminRole.');
        return; // Wait for auth to finish loading
      }

      if (!user) {
        console.log('useIsAdmin: No user, setting isAdmin to false and profileLoading to false.');
        setIsAdmin(false);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      console.log('useIsAdmin: Fetching user profile role for user ID:', user.id);
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('useIsAdmin: Error fetching user role:', error);
          handleError(error, 'Failed to fetch user role for admin check.'); // Use handleError
          setIsAdmin(false);
        } else if (profile) {
          console.log('useIsAdmin: Profile fetched. Role:', profile.role);
          setIsAdmin(profile.role === 'admin');
        } else {
          console.log('useIsAdmin: No profile found or role not admin, setting isAdmin to false.');
          setIsAdmin(false); // No profile found or role not 'admin'
        }
      } catch (err) {
        console.error('useIsAdmin: Unexpected error during profile fetch:', err);
        handleError(err, 'An unexpected error occurred during admin role check.'); // Use handleError
        setIsAdmin(false);
      } finally {
        console.log('useIsAdmin: Setting profileLoading to false in finally block.');
        setProfileLoading(false);
      }
    };

    checkAdminRole();
  }, [user, authLoading]); // Dependencies for useEffect

  return { isAdmin, loading: profileLoading };
}