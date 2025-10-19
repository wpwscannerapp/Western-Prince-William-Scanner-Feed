import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProfileService } from '@/services/ProfileService';

interface UseAdminResult {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useIsAdmin(): UseAdminResult {
  const { user, loading: authLoading, authReady } = useAuth(); // Get authReady
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchRole = useCallback(async () => {
    // Only proceed if auth is ready and not currently loading
    if (!authReady || authLoading) {
      setProfileLoading(true); // Keep loading true until auth is ready
      return;
    }

    if (!user) {
      setIsAdmin(false);
      setProfileLoading(false);
      setError(null);
      return;
    }

    setProfileLoading(true);
    setError(null);

    try {
      const profile = await ProfileService.fetchProfile(user.id);

      if (!isMountedRef.current) {
        return;
      }

      if (profile) {
        setIsAdmin(profile.role === 'admin');
      } else {
        setIsAdmin(false);
      }
    } catch (err: any) {
      if (!isMountedRef.current) {
        return;
      }
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
  }, [user, authLoading, authReady]); // Add authReady to dependencies

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  return { isAdmin, loading: profileLoading, error };
}