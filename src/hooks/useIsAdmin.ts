import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProfileService } from '@/services/ProfileService';
import { handleError } from '@/utils/errorHandler'; // Import handleError
import { useQuery } from '@tanstack/react-query'; // Import useQuery

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

  // Use react-query to fetch the profile, which will handle caching and deduplication
  const { data: profile, isLoading: isProfileQueryLoading, isError: isProfileQueryError, error: profileQueryError } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => user ? ProfileService.fetchProfile(user.id) : Promise.resolve(null),
    enabled: !!user && authReady, // Only fetch if user is present and auth is ready
    staleTime: 1000 * 60 * 5, // Cache profile for 5 minutes
  });

  useEffect(() => {
    if (!isMountedRef.current) return;

    if (authLoading || !authReady || isProfileQueryLoading) {
      setProfileLoading(true);
      return;
    }

    if (isProfileQueryError) {
      const errorMessage = handleError(profileQueryError, 'Failed to load admin role.');
      setError(errorMessage);
      setIsAdmin(false);
      setProfileLoading(false);
      return;
    }

    if (!user) {
      setIsAdmin(false);
      setProfileLoading(false);
      setError(null);
      return;
    }

    if (profile) {
      setIsAdmin(profile.role === 'admin');
      setError(null);
    } else {
      setIsAdmin(false);
      // If no profile is found, it might be a new user or an issue.
      // The ensureProfileExists in AuthContext should handle creation.
      // If it's still null here, it means either it's not created yet or there's an RLS issue.
      // For now, we'll just set isAdmin to false.
      setError('User profile not found or accessible.');
    }
    setProfileLoading(false);
  }, [user, authLoading, authReady, profile, isProfileQueryLoading, isProfileQueryError, profileQueryError]);

  return { isAdmin, loading: profileLoading, error };
}