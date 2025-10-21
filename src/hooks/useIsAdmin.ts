import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProfileService } from '@/services/ProfileService';
import { handleError } from '@/utils/errorHandler';
import { useQuery } from '@tanstack/react-query';

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

  const { data: profile, isLoading: isProfileQueryLoading, isError: isProfileQueryError, error: profileQueryError } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => { // Made async to allow logging before the call
      console.log('[useIsAdmin] queryFn: Executing. User:', user?.id, 'Session present:', !!session);
      if (!user) {
        console.log('[useIsAdmin] queryFn: No user, returning null.');
        return null;
      }
      // Explicitly check session here before calling ProfileService
      if (!session) {
        console.warn('[useIsAdmin] queryFn: User present but session is null. Cannot fetch profile.');
        return null;
      }
      return ProfileService.fetchProfile(user.id, session);
    },
    enabled: !!user && authReady, // Only run query when user is present AND auth is ready
    staleTime: 1000 * 60 * 5,
    retry: 1,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (!isMountedRef.current) return;

    console.log('useIsAdmin useEffect: Current state for profile processing:', { authLoading, authReady, isProfileQueryLoading, user: user?.id, profile, isProfileQueryError, profileQueryError });

    // If auth is not ready or still loading, we can't determine admin status yet.
    if (!authReady || authLoading) {
      setIsAdmin(false);
      setError(null); // Clear any previous errors
      return;
    }

    if (isProfileQueryError) {
      const errorMessage = handleError(profileQueryError, 'Failed to load admin role.');
      setError(errorMessage);
      setIsAdmin(false);
      return;
    }

    if (!user) {
      // If auth is ready but no user, then not admin.
      setIsAdmin(false);
      setError(null);
      return;
    }

    if (profile) {
      console.log('useIsAdmin: Profile found, checking role:', profile.role);
      setIsAdmin(profile.role === 'admin');
      setError(null);
    } else {
      console.log('useIsAdmin: Profile is null or undefined after authReady.');
      setIsAdmin(false);
      setError('User profile not found or accessible.');
    }
    console.log('useIsAdmin: Finished processing profile. Final isAdmin:', isAdmin);
  }, [user, authReady, profile, isProfileQueryLoading, isProfileQueryError, profileQueryError, session, authLoading]);

  // The `loading` state for useIsAdmin should now directly reflect `authLoading` OR `isProfileQueryLoading`
  // This ensures that if auth is still loading, useIsAdmin is also loading.
  // And if auth is ready, but profile is still fetching, useIsAdmin is loading.
  const overallLoading = authLoading || (authReady && isProfileQueryLoading);

  return { isAdmin, loading: overallLoading, error };
}