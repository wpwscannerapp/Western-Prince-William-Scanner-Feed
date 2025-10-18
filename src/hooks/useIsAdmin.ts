import { useEffect, useState, useRef, useCallback } from 'react'; // Added useCallback
import { useAuth } from '@/hooks/useAuth';
import { ProfileService } from '@/services/ProfileService';
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
  const isMountedRef = useRef(true);

  // This useEffect handles component mount/unmount and clears the overall timeout
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  // This useCallback memoizes the fetchRole function to prevent unnecessary re-creations
  const fetchRole = useCallback(async () => {
    console.log('useIsAdmin: fetchRole started inside useCallback.');

    if (authLoading) {
      console.log('useIsAdmin: authLoading is true, waiting for auth to complete inside useCallback.');
      setProfileLoading(true);
      return;
    }

    if (!user) {
      console.log('useIsAdmin: No user, setting isAdmin to false and profileLoading to false inside useCallback.');
      setIsAdmin(false);
      setProfileLoading(false);
      setError(null);
      return;
    }

    console.log('useIsAdmin: User found, fetching profile role for user ID:', user.id);
    setProfileLoading(true);
    setError(null);

    // Set a timeout for the overall role fetching process
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

      if (!isMountedRef.current) return; // Check if component is still mounted after async operation

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current); // Clear the timeout if the query completes successfully
        timeoutRef.current = null;
      }

      if (profile) {
        setIsAdmin(profile.role === 'admin');
        console.log('useIsAdmin: Profile found. Role:', profile.role, 'isAdmin:', profile.role === 'admin');
      } else {
        // ProfileService.fetchProfile will log errors internally, including PGRST116 (no rows)
        setIsAdmin(false); 
        console.log('useIsAdmin: No profile data found or error occurred in ProfileService.fetchProfile, isAdmin set to false.');
      }
    } catch (err: any) {
      if (!isMountedRef.current) return; // Check if component is still mounted after async operation

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current); // Clear the timeout on unexpected error
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
  }, [user, authLoading, handleError]); // Dependencies for useCallback

  // This useEffect triggers fetchRole whenever user or authLoading changes
  useEffect(() => {
    fetchRole();
    // No specific cleanup needed here as the outer useEffect handles overall cleanup
    // and fetchRole itself manages its internal timeout.
  }, [fetchRole]); // Dependency is the memoized fetchRole function

  return { isAdmin, loading: profileLoading, error };
}