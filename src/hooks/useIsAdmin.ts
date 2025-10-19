import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProfileService } from '@/services/ProfileService';

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
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchRole = useCallback(async () => {
    if (authLoading) {
      setProfileLoading(true);
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
      // Removed redundant call to ProfileService.ensureProfileExists
      // AuthContext already ensures profile existence during session setup.
      const profile = await ProfileService.fetchProfile(user.id);

      if (!isMountedRef.current) {
        return;
      }

      if (profile) {
        setIsAdmin(profile.role === 'admin');
      } else {
        // No profile found, or profile fetch failed (error handled by ProfileService)
        setIsAdmin(false); 
      }
    } catch (err: any) {
      if (!isMountedRef.current) {
        return;
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
  }, [user, authLoading]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  return { isAdmin, loading: profileLoading, error };
}