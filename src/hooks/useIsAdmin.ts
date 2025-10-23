import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { ProfileService } from '@/services/ProfileService';
import { handleError } from '@/utils/errorHandler';
import { useLocation } from 'react-router-dom';
import { Profile } from '@/services/ProfileService';

interface UseAdminResult {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useIsAdmin(): UseAdminResult {
  const { user, loading: authLoading, authReady, session } = useAuth();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const location = useLocation();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Determine if on the auth page
  const isOnAuthPage = location.pathname === '/auth';

  // Only enable the query if user is present, auth is ready, AND not on the /auth path
  const queryEnabled = !!user && authReady && !isOnAuthPage;
  
  // Log for debugging purposes to understand when the query is enabled/disabled
  console.log('useIsAdmin: Query enabled status:', queryEnabled, { userId: user?.id, authReady, pathname: location.pathname, isOnAuthPage });

  const { data: profile, isLoading: isProfileQueryLoading, isError: isProfileQueryError, error: profileQueryError } = useQuery<Profile | null, Error>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      console.log('useIsAdmin: QueryFn - Fetching profile for user', user?.id);
      if (!user || !session) {
        console.warn('useIsAdmin: QueryFn - No user or session, returning null.');
        return null;
      }
      await ProfileService.ensureProfileExists(user.id, session);
      return ProfileService.fetchProfile(user.id, session);
    },
    enabled: queryEnabled, // Use the new enabled condition
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (!isMountedRef.current) return;

    console.log('useIsAdmin useEffect:', {
      authLoading,
      authReady,
      isProfileQueryLoading,
      userId: user?.id,
      profile,
      isProfileQueryError,
      profileQueryError,
      queryEnabled,
      isOnAuthPage,
    });

    // If on the auth page, or auth is not ready/still loading, ensure isAdmin is false and no error.
    // This ensures the hook is inert on the auth screen.
    if (isOnAuthPage || !authReady || authLoading) {
      if (isAdmin || error) { // Only update state if it's not already the desired default
        console.log('useIsAdmin: Resetting isAdmin state for auth page or initial loading.');
        setIsAdmin(false);
        setError(null);
      }
      return;
    }

    // If query is not enabled for other reasons (e.g., no user after initial auth check), also reset.
    if (!queryEnabled) {
      if (isAdmin || error) {
        console.log('useIsAdmin: Resetting isAdmin state because query is not enabled (e.g., no user after auth check).');
        setIsAdmin(false);
        setError(null);
      }
      return;
    }

    if (isProfileQueryError) {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      setError(handleError(profileQueryError, 'Failed to load admin role.'));
      setIsAdmin(false);
      return;
    }

    if (!user) { // Should be covered by !queryEnabled, but as a safeguard
      setIsAdmin(false);
      setError(null);
      return;
    }

    // Check if profile exists and has a role property
    if (profile && profile.role) {
      console.log('useIsAdmin: Profile found, role:', profile.role);
      setIsAdmin(profile.role === 'admin');
      setError(null);
    } else {
      console.log('useIsAdmin: Profile is null or role is missing.');
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      setIsAdmin(false);
      setError('User profile not found or role is missing.');
    }
  }, [authReady, isProfileQueryLoading, isProfileQueryError, profileQueryError, profile, user, queryClient, authLoading, queryEnabled, session, isOnAuthPage, isAdmin, error]);

  const overallLoading = authLoading || (authReady && isProfileQueryLoading);

  return { isAdmin, loading: overallLoading, error };
}