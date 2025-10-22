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
  const isMountedRef = useRef(true);

  // State for the admin status and any specific error from this hook
  const [isAdmin, setIsAdmin] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const {
    data: profile,
    isLoading: isProfileQueryLoading,
    isError: isProfileQueryError,
    error: profileQueryError,
  } = useQuery<Profile | null, Error>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user || !session) {
        console.log('useIsAdmin: QueryFn - No user or session, returning null.');
        return null;
      }
      console.log(`useIsAdmin: QueryFn - Fetching profile for user ${user.id}.`);
      await ProfileService.ensureProfileExists(user.id, session);
      return ProfileService.fetchProfile(user.id, session);
    },
    enabled: !!user && authReady, // Query is enabled only when user is present and auth is ready
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 3,
    retryDelay: 1000,
  });

  // Determine loading state: true if auth is loading, or if auth is ready but profile query is still loading
  const loading = authLoading || (authReady && isProfileQueryLoading);

  // Effect to update isAdmin and localError based on profile query results
  useEffect(() => {
    if (!isMountedRef.current) return;

    console.log('useIsAdmin: Profile data/status changed.', {
      user: user ? 'present' : 'null',
      authReady,
      isProfileQueryLoading,
      isProfileQueryError,
      profile: profile ? 'present' : 'null',
      profileRole: profile?.role,
      profileQueryError,
    });

    if (!user) {
      // No user logged in
      setIsAdmin(false);
      setLocalError(null);
      console.log('useIsAdmin: No user, isAdmin set to false.');
    } else if (isProfileQueryError) {
      // Profile query failed
      setIsAdmin(false);
      setLocalError(handleError(profileQueryError, 'Failed to load admin role.'));
      console.log('useIsAdmin: Profile query error, isAdmin set to false.');
    } else if (profile) {
      // Profile loaded successfully
      setIsAdmin(profile.role === 'admin');
      setLocalError(null);
      console.log('useIsAdmin: Profile loaded, isAdmin set to', profile.role === 'admin');
    } else if (authReady && !isProfileQueryLoading && !profile && !isProfileQueryError) {
      // Auth is ready, query finished, no profile, no error (e.g., profileEnsured returned false)
      setIsAdmin(false);
      setLocalError('User profile not found or could not be fetched.');
      console.log('useIsAdmin: Auth ready, query finished, but no profile found. isAdmin set to false.');
    }
    // If still loading (authLoading or isProfileQueryLoading), don't change state yet.
  }, [user, authReady, profile, isProfileQueryLoading, isProfileQueryError, profileQueryError]);

  console.log('useIsAdmin: Returning', { isAdmin, loading, error: localError });

  return { isAdmin, loading, error: localError };
}