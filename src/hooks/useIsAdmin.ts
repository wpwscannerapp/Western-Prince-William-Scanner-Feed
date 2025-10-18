import { useEffect, useState, useRef, useCallback } from 'react';
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

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setProfileLoading(false);
        setIsAdmin(false);
        setError('Role fetch timed out. Please check your network or Supabase configuration.');
      }
    }, SUPABASE_API_TIMEOUT);

    try {
      const profile = await ProfileService.fetchProfile(user.id);

      if (!isMountedRef.current) {
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
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

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      const errorMessage = err.message === 'Request timed out' 
        ? 'Profile fetch timed out. Please check your network or Supabase configuration.'
        : `An unexpected error occurred during admin role check: ${err.message}`;
      handleError(err, errorMessage);
      setError(errorMessage);
      setIsAdmin(false);
    } finally {
      if (isMountedRef.current) {
        setProfileLoading(false);
      }
    }
  }, [user, authLoading, handleError]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  return { isAdmin, loading: profileLoading, error };
}