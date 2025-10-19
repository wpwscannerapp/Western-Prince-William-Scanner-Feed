import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProfileService } from '@/services/ProfileService';
import { handleError } from '@/utils/errorHandler'; // Import handleError

interface UseAdminResult {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useIsAdmin(): UseAdminResult {
  const { user, loading: authLoading, authReady } = useAuth();
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
    if (!authReady || authLoading) {
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
      // Ensure profile exists before attempting to fetch it
      await ProfileService.ensureProfileExists(user.id);
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
      const errorMessage = handleError(err, 'An unexpected error occurred during admin role check.');
      setError(errorMessage);
      setIsAdmin(false);
    } finally {
      if (isMountedRef.current) {
        setProfileLoading(false);
      }
    }
  }, [user, authLoading, authReady]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  return { isAdmin, loading: profileLoading, error };
}