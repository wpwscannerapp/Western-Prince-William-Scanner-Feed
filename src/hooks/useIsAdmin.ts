import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProfileService } from '@/services/ProfileService'; // Import ProfileService
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
  const isMountedRef = useRef(true); // To track if the component is mounted

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchRole = async () => {
      console.log('useIsAdmin: fetchRole started.');
      
      // Only proceed if authLoading is false (meaning auth state has been determined)
      if (authLoading) {
        console.log('useIsAdmin: authLoading is true, waiting for auth to complete.');
        setProfileLoading(true); // Keep loading true while auth is still loading
        return;
      }

      if (!user) {
        console.log('useIsAdmin: No user, setting isAdmin to false and profileLoading to false.');
        setIsAdmin(false);
        setProfileLoading(false);
        setError(null);
        return;
      }

      console.log('useIsAdmin: User found, fetching profile role for user ID:', user.id);
      setProfileLoading(true);
      setError(null);

      // ProfileService.fetchProfile already handles its own AbortController and timeout
      // We'll still keep a local timeout for the overall hook logic if needed,
      // but the actual fetch will be managed by ProfileService.
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          console.warn(`useIsAdmin: Overall role fetch timed out after ${SUPABASE_API_TIMEOUT / 1000}s, forcing profileLoading to false.`);
          setProfileLoading(false);
          setIsAdmin(false);
          setError('Role fetch timed out. Please check your network or Supabase configuration.');
        }
      }, SUPABASE_API_TIMEOUT);

      try {
        console.log('useIsAdmin: Calling ProfileService.fetchProfile...');
        const profile = await ProfileService.fetchProfile(user.id);

        if (!isMountedRef.current) return; // Check after await

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current); // Clear the local timeout if the query completes
          timeoutRef.current = null;
        }

        if (profile) {
          setIsAdmin(profile.role === 'admin'); // Correctly checking the 'role' value
          console.log('useIsAdmin: Profile found. Role:', profile.role, 'isAdmin:', profile.role === 'admin');
        } else {
          // ProfileService.fetchProfile will log errors internally, including PGRST116 (no rows)
          setIsAdmin(false); 
          console.log('useIsAdmin: No profile data found or error occurred in ProfileService.fetchProfile, isAdmin set to false.');
        }
      } catch (err: any) {
        if (!isMountedRef.current) return; // Check after catch

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current); // Clear the local timeout on unexpected error
          timeoutRef.current = null;
        }
        // ProfileService.fetchProfile should handle its own errors and timeouts,
        // but if an unexpected error bubbles up here, log it.
        const errorMessage = `An unexpected error occurred during admin role check: ${err.message}`;
        handleError(err, errorMessage);
        setError(errorMessage);
        setIsAdmin(false);
      } finally {
        if (isMountedRef.current) { // Ensure final state update only if mounted
          setProfileLoading(false);
          console.log('useIsAdmin: fetchRole finished, profileLoading set to false in finally block.');
        }
      }
    };

    fetchRole();

    return () => {
      console.log('useIsAdmin: useEffect cleanup running.');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, authLoading]); // Dependencies are user and authLoading

  return { isAdmin, loading: profileLoading, error };
}