import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { SUPABASE_API_TIMEOUT } from '@/config';

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
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true); // To track if the component is mounted

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Only run if auth is not loading and user status is known
    if (!authLoading) {
      const fetchRole = async () => {
        if (!user) {
          setIsAdmin(false);
          setProfileLoading(false);
          setError(null);
          return;
        }

        setProfileLoading(true);
        setError(null);

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        
        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            console.warn(`useIsAdmin: Role fetch timed out after ${SUPABASE_API_TIMEOUT / 1000}s, forcing profileLoading to false.`);
            abortControllerRef.current?.abort(); // Abort the fetch request
            setProfileLoading(false);
            setIsAdmin(false);
            setError('Role fetch timed out. Please check your network or Supabase configuration.');
          }
        }, SUPABASE_API_TIMEOUT);

        try {
          const { data: profile, error: supabaseError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .abortSignal(signal) // Pass the abort signal to the Supabase query
            .single();

          if (!isMountedRef.current) return; // Check after await

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current); // Clear the timeout if the query completes
            timeoutRef.current = null;
          }

          if (supabaseError) {
            if (supabaseError.name === 'AbortError') {
              console.log('useIsAdmin: Supabase query aborted due to timeout.');
            } else {
              const errorMessage = `Failed to fetch user role for admin check: ${supabaseError.message}`;
              handleError(supabaseError, errorMessage);
              setError(errorMessage);
              setIsAdmin(false);
            }
          } else if (profile) {
            setIsAdmin(profile.role === 'admin');
          } else {
            setIsAdmin(false); // No profile found or role not 'admin'
          }
        } catch (err: any) {
          if (!isMountedRef.current) return; // Check after catch

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
          if (isMountedRef.current) { // Ensure final state update only if mounted
            setProfileLoading(false);
            abortControllerRef.current = null; // Clear the controller reference
          }
        }
      };

      fetchRole();
    }

    return () => {
      isMountedRef.current = false; // Set to false on cleanup
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort(); // Abort any pending request on unmount
      }
    };
  }, [user, authLoading]); // Dependencies are user and authLoading

  return { isAdmin, loading: profileLoading, error };
}