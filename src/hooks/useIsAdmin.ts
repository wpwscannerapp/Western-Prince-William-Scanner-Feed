import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { ProfileService } from '@/services/ProfileService';
import { handleError } from '@/utils/errorHandler';
import { useLocation } from 'react-router-dom'; // Import useLocation
import { Profile } from '@/services/ProfileService'; // Import Profile type

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
  const location = useLocation(); // Get current location

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Only enable the query if user is present, auth is ready, AND not on the /auth path
  const queryEnabled = !!user && authReady && location.pathname !== '/auth';
  console.log('useIsAdmin: Query enabled status:', queryEnabled, { userId: user?.id, authReady, pathname: location.pathname });

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
    // onError is not a direct option for useQuery in @tanstack/react-query v4/v5.
    // Error handling is done via isError and error return values, or global QueryClient config.
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
    });

    // If auth is not ready, still loading, or query is not enabled, reset state
    if (!authReady || authLoading || !queryEnabled) {
      setIsAdmin(false);
      setError(null);
      return;
    }

    if (isProfileQueryError) {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      setError(handleError(profileQueryError, 'Failed to load admin role.'));
      setIsAdmin(false);
      return;
    }

    if (!user) {
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
  }, [authReady, isProfileQueryLoading, isProfileQueryError, profileQueryError, profile, user, queryClient, authLoading, queryEnabled, session]);

  const overallLoading = authLoading || (authReady && isProfileQueryLoading);

  return { isAdmin, loading: overallLoading, error };
}