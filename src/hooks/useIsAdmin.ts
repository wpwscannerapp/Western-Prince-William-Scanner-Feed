import { useEffect, useState, useCallback, useRef } from 'react';
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
  const [profileLoading, setProfileLoading] = useState(true); // Renamed from isAdminLoading for clarity within the hook
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkAdminRole = useCallback(async () => {
    console.log('useIsAdmin: checkAdminRole started.');
    if (authLoading) {
      console.log('useIsAdmin: authLoading is true, returning early.');
      setProfileLoading(false); // Ensure loading state is false if auth is still loading
      return;
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
    
    // Set a timeout for the Supabase query
    timeoutRef.current = setTimeout(() => {
      console.warn('useIsAdmin: Role fetch timed out after 5s, forcing profileLoading to false.');
      setProfileLoading(false);
      setIsAdmin(false);
      setError('Role fetch timed out. Please check your network or Supabase configuration.');
    }, 5000); // 5-second timeout

    try {
      console.log('useIsAdmin: Calling Supabase to fetch profile role...');
      const { data: profile, error: supabaseError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      console.log('useIsAdmin: Supabase profile fetch completed. Data:', profile, 'Error:', supabaseError);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current); // Clear the timeout if the query completes
      }

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
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current); // Clear the timeout on unexpected error
      }
      const errorMessage = `An unexpected error occurred during admin role check: ${err.message}`;
      handleError(err, errorMessage);
      setError(errorMessage);
      setIsAdmin(false);
    } finally {
      setProfileLoading(false);
      console.log('useIsAdmin: checkAdminRole finished, profileLoading set to false in finally block.');
    }
  }, [user, authLoading]); // Dependencies for useCallback

  useEffect(() => {
    checkAdminRole();
    return () => {
      console.log('useIsAdmin: useEffect cleanup running.');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [checkAdminRole]); // Dependency on memoized checkAdminRole

  return { isAdmin, loading: profileLoading, error };
}