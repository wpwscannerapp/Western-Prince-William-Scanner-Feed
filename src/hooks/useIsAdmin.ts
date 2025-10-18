import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config'; // Import SUPABASE_API_TIMEOUT

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        handleError(new Error('Supabase profile fetch timed out.'), 'Fetching user role timed out.');
      }, SUPABASE_API_TIMEOUT);

      try {
        console.log('useIsAdmin: Calling Supabase to fetch profile role...');
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .abortSignal(controller.signal) // Moved abortSignal here
          .single();
        console.log('useIsAdmin: Supabase profile fetch completed. Data:', profile, 'Error:', error);

        if (error) {
          handleError(error, 'Failed to fetch user role for admin check.');
          setIsAdmin(false);
          console.log('useIsAdmin: Error fetching profile, isAdmin set to false.');
        } else if (profile) {
          setIsAdmin(profile.role === 'admin');
          console.log('useIsAdmin: Profile found. Role:', profile.role, 'isAdmin:', profile.role === 'admin');
        } else {
          setIsAdmin(false); // No profile found or role not 'admin'
          console.log('useIsAdmin: No profile data found, isAdmin set to false.');
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.error('useIsAdmin: Supabase profile fetch aborted due to timeout.');
          // handleError already called by the timeout callback
        } else {
          handleError(err, 'An unexpected error occurred during admin role check.');
        }
        setIsAdmin(false);
      } finally {
        clearTimeout(timeoutId); // Clear the timeout
        setProfileLoading(false);
        console.log('useIsAdmin: checkAdminRole finished, profileLoading set to false.');
      }
    };

    checkAdminRole();
  }, [user, authLoading]); // Dependencies for useEffect

  return { isAdmin, loading: profileLoading };
}