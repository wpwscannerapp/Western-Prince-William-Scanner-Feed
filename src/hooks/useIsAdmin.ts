import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Profile, ProfileService } from '@/services/ProfileService';
import { handleError } from '@/utils/errorHandler';

interface UseAdminResult {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useIsAdmin(): UseAdminResult {
  const { user, loading: authLoading, authReady, session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const { data: profile, isLoading: isProfileQueryLoading, isError: isProfileQueryError, error: profileQueryError } = useQuery<Profile | null, Error>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user || !session) return null;
      await ProfileService.ensureProfileExists(user.id, session);
      return ProfileService.fetchProfile(user.id, session);
    },
    enabled: !!user && authReady, // Query is enabled only when user is present and auth is ready
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: 1000,
  });

  // Combine all loading states into one clear variable
  // Loading is true if auth is still loading, or if auth is not yet ready, or if the profile query is still loading.
  const overallLoading = authLoading || !authReady || isProfileQueryLoading;

  // Effect to handle errors from the profile query
  useEffect(() => {
    if (!isMountedRef.current) return;

    if (isProfileQueryError && profileQueryError) {
      console.error('useIsAdmin: Profile query error:', profileQueryError);
      setError(handleError(profileQueryError, 'Failed to load admin role.'));
      setIsAdmin(false); // Ensure isAdmin is false on error
    } else if (!isProfileQueryError && error) {
      setError(null); // Clear error if query becomes successful
    }
  }, [isProfileQueryError, profileQueryError, error]);

  // Main effect to determine isAdmin status when loading is complete
  useEffect(() => {
    if (!isMountedRef.current) return;

    if (overallLoading) {
      // Still loading, do not update final isAdmin or error states yet.
      // This prevents flickering during intermediate loading states.
      return;
    }

    // Loading is complete, now determine the final state
    if (!user) {
      setIsAdmin(false);
      setError(null);
    } else if (isProfileQueryError) {
      // Error already handled by the separate error effect, just ensure isAdmin is false
      setIsAdmin(false);
    } else if (profile) {
      setIsAdmin(profile.role === 'admin');
      setError(null);
    } else {
      // Fallback if profile is null after loading, but no explicit error
      // This might happen if ensureProfileExists failed silently or returned null
      setIsAdmin(false);
      setError('User profile not found or could not be fetched.');
    }
  }, [overallLoading, user, profile, isProfileQueryError]);

  console.log('useIsAdmin: Returning', { isAdmin, loading: overallLoading, error });

  return { isAdmin, loading: overallLoading, error };
}