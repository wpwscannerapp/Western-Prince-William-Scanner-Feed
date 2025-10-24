import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
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

  const isOnAuthPage = location.pathname === '/auth' || location.pathname === '/auth/login' || location.pathname === '/auth/signup';
  // The query is enabled only if a user is present, auth is ready, auth is NOT loading, and not on an auth page.
  const queryEnabled = !!user && authReady && !authLoading && !isOnAuthPage;
  
  console.log('useIsAdmin: Query enabled status:', queryEnabled, { userId: user?.id, authReady, authLoading, pathname: location.pathname, isOnAuthPage });

  const { data: profile, isLoading: isProfileQueryLoading, isError: isProfileQueryError, error: profileQueryError } = useQuery<Profile | null, Error>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      console.log('useIsAdmin: QueryFn - Fetching profile for user', user?.id);
      if (!user || !session) {
        console.warn('useIsAdmin: QueryFn - No user or session, returning null.');
        return null;
      }
      // ensureProfileExists is now handled by AuthContext, so we just fetch the profile
      return ProfileService.fetchProfile(user.id, session);
    },
    enabled: queryEnabled,
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
      profile: profile ? 'present' : 'null', // Log presence, not full object
      isProfileQueryError,
      profileQueryError,
      queryEnabled,
      isOnAuthPage,
    });

    // If on an auth page, or auth is not ready/still loading, ensure isAdmin is false and no error.
    if (isOnAuthPage || !authReady || authLoading) {
      if (isAdmin || error) {
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

    // Handle query errors
    if (isProfileQueryError) {
      setError(handleError(profileQueryError, 'Failed to load admin role.'));
      setIsAdmin(false);
      return;
    }

    // Once profile query is not loading and no error, determine admin status
    if (!isProfileQueryLoading) {
      if (profile && profile.role) {
        console.log('useIsAdmin: Profile data available, role:', profile.role);
        setIsAdmin(profile.role === 'admin');
        setError(null);
      } else {
        // This case should ideally not happen for an authenticated user due to ensureProfileExists
        console.warn('useIsAdmin: Profile data is missing or role is undefined after query completed.');
        setIsAdmin(false);
        setError('User profile data incomplete.');
      }
    }
    // If isProfileQueryLoading is true, we are still waiting for data, so don't update isAdmin/error yet.
  }, [authReady, isProfileQueryLoading, isProfileQueryError, profileQueryError, profile, user, authLoading, queryEnabled, session, isOnAuthPage, isAdmin, error]);

  // The overall loading state for useIsAdmin should be true if auth is loading,
  // or if auth is ready but the profile query is still loading.
  const overallLoading = authLoading || (authReady && isProfileQueryLoading);

  return { isAdmin, loading: overallLoading, error };
}