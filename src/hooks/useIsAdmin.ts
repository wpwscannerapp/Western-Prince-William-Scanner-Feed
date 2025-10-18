import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';

interface UseAdminResult {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useIsAdmin(): UseAdminResult {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError(null); // Clear any previous error
        return;
      }

      console.log('useIsAdmin: User found, fetching profile role for user ID:', user.id);
      setProfileLoading(true);
      setError(null); // Clear error before new attempt
      
      try {
        console.log('useIsAdmin: Calling Supabase to fetch profile role...');
        const { data: profile, error: supabaseError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        console.log('useIsAdmin: Supabase profile fetch completed. Data:', profile, 'Error:', supabaseError);

        if (supabaseError) {
          const errorMessage = `Failed to fetch user role for admin check: ${supabaseError.message}`;
          handleError(supabaseError, errorMessage);
          setError(errorMessage);
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
        const errorMessage = `An unexpected error occurred during admin role check: ${err.message}`;
        handleError(err, errorMessage);
        setError(errorMessage);
        setIsAdmin(false);
      } finally {
        setProfileLoading(false);
        console.log('useIsAdmin: checkAdminRole finished, profileLoading set to false in finally block.');
      }
    };

    checkAdminRole();

    return () => {
      console.log('useIsAdmin: useEffect cleanup running.');
    };
  }, [user, authLoading]);

  return { isAdmin, loading: profileLoading, error };
}