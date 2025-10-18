import { useState, useEffect, useCallback, useRef } from 'react';
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

  const fetchRole = useCallback(async () => {
    if (authLoading) {
      // Still loading auth, keep profileLoading true and wait
      setProfileLoading(true);
      return;
    }

    if (!user) {
      // No user, so definitely not an admin
      setIsAdmin(false);
      setProfileLoading(false);
      setError(null);
      return;
    }

    setProfileLoading(true);
    setError(null);

    // Clear any previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout for the profile fetch
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && profileLoading) { // Only set error if still loading
        setProfileLoading(false);
        setIsAdmin(false);
        setError('Role fetch timed out. Please check your network or Supabase configuration.');
        handleError(new Error('Role fetch timed out'), 'Role fetch timed out.');
      }
    }, SUPABASE_API_TIMEOUT); // Using the imported constant here

    try {
      const profile = await ProfileService.fetchProfile(user.id);

      if (!isMountedRef.current) {
        return; // Component unmounted, do nothing
      }

      // Clear the timeout if the fetch completes before it fires
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (profile) {
        setIsAdmin(profile.role === 'admin');
      } else {
        // No profile found, or profile fetch failed (error handled by ProfileService)
        setIsAdmin(false); 
      }
    } catch (err: any) {
      if (!isMountedRef.current) {
        return; // Component unmounted, do nothing
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // handleError is already called by ProfileService, just set local error state
      const errorMessage = err.message === 'Request timed out' 
        ? 'Profile fetch timed out. Please check your network or Supabase configuration.'
        : `An unexpected error occurred during admin role check: ${err.message}`;
      setError(errorMessage);
      setIsAdmin(false);
    } finally {
      if (isMountedRef.current) {
        setProfileLoading(false);
      }
    }
  }, [user, authLoading]); // Depend on user and authLoading

  useEffect(() => {
    fetchRole();
  }, [fetchRole]); // Re-run when fetchRole changes

  return { isAdmin, loading: profileLoading, error };
}