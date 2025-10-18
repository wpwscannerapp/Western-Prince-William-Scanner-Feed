import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config'; // Import the configurable timeout

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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null); // Ref for AbortController

  const checkAdminRole = useCallback(async () => {
    console.log('useIsAdmin: checkAdminRole started.');
    if (authLoading) {
      console.log('useIsAdmin: authLoading is true, returning early.');
      setProfileLoading(false);
      return;
    }

    if (!user) {
      console.log('useIsAdmin: No user found, setting isAdmin to false and profileLoading to false.');
      setIsAdmin(false);
      setProfileLoading(false);
      setError(null);
      return;
    }

    console.log('useIsAdmin: User found, fetching profile role for user ID:', user.id);
    setProfileLoading(true);
    setError(null);

    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    // Set a timeout for the Supabase query
    timeoutRef.current = setTimeout(() => {
      console.warn(`useIsAdmin: Role fetch timed out after ${SUPABASE_API_TIMEOUT / 1000}s, forcing profileLoading to false.`);
      abortControllerRef.current?.abort(); // Abort the fetch request
      setProfileLoading(false);
      setIsAdmin(false);
      setError('Role fetch timed out. Please check your network or Supabase configuration.');
    }, SUPABASE_API_TIMEOUT); // Use configurable timeout

    try {
      console.log('useIsAdmin: Calling Supabase to fetch profile role...');
      const { data: profile, error: supabaseError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .abortSignal(signal) // Pass the abort signal to the Supabase query
        .single();
      console.log('useIsAdmin: Supabase profile fetch completed. Data:', profile, 'Error:', supabaseError);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current); // Clear the timeout if the query completes
        timeoutRef.current = null;
      }

      if (supabaseError) {
        if (supabaseError.name === 'AbortError') {
          // This error is handled by the timeout callback, no need to re-log
          console.log('useIsAdmin: Supabase query aborted due to timeout.');
        } else {
          const errorMessage = `Failed to fetch user role for admin check: ${supabaseError.message}`;
          handleError(supabaseError, errorMessage);
          setError(errorMessage);
          setIsAdmin(false);
          console.log('useIsAdmin: Error fetching profile, isAdmin set to false.');
        }
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
        timeoutRef.current = null;
      }
      if (err.name === 'AbortError') {
        console.log('useIsAdmin: Catch block - Supabase query aborted due to timeout.');
      } else {
        const errorMessage = `An unexpected error occurred during admin role check: ${err.message}`;
        handleError(err, errorMessage);
        setError(errorMessage);
        setIsAdmin(false);
      }
    } finally {
      setProfileLoading(false);
      console.log('useIsAdmin: checkAdminRole finished, profileLoading set to false in finally block.');
      abortControllerRef.current = null; // Clear the controller reference
    }
  }, [user, authLoading]);

  useEffect(() => {
    checkAdminRole();
    return () => {
      console.log('useIsAdmin: useEffect cleanup running.');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort(); // Abort any pending request on unmount
      }
    };
  }, [checkAdminRole]);

  return { isAdmin, loading: profileLoading, error };
}