import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Profile, ProfileService } from '@/services/ProfileService'; // Ensure Profile is imported
import { handleError } from '@/utils/errorHandler';

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
      await ProfileService.ensureProfileExists(user.id, session); // Ensure profile before fetching
      return ProfileService.fetchProfile(user.id, session);
    },
    enabled: !!user && authReady,
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: 1000,
  });

  // Handle errors using a separate useEffect
  useEffect(() => {
    if (isMountedRef.current && isProfileQueryError && profileQueryError) {
      console.error('useIsAdmin: Profile query error:', profileQueryError);
      setError(handleError(profileQueryError, 'Failed to load admin role.'));
      setIsAdmin(false);
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] }); // Invalidate on error
    } else if (isMountedRef.current && !isProfileQueryError) {
      setError(null); // Clear error if it resolves
    }
  }, [isProfileQueryError, profileQueryError, queryClient, user?.id]);


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
    });

    if (!authReady || authLoading) {
      setIsAdmin(false);
      setError(null);
      return;
    }

    // Error handling is now managed by the separate useEffect above
    // if (isProfileQueryError) {
    //   queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    //   setError(handleError(profileQueryError, 'Failed to load admin role.'));
    //   setIsAdmin(false);
    //   return;
    // }

    if (!user) {
      setIsAdmin(false);
      setError(null);
      return;
    }

    if (profile) { // profile is now guaranteed to be of type Profile due to explicit typing in useQuery
      console.log('useIsAdmin: Profile found, role:', profile.role);
      setIsAdmin(profile.role === 'admin');
      // Error is cleared by the separate useEffect if query is not in error state
    } else {
      console.log('useIsAdmin: Profile is null');
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      setIsAdmin(false);
      setError('User profile not found.');
    }
  }, [authReady, isProfileQueryLoading, profile, user, queryClient, authLoading]); // Removed isProfileQueryError, profileQueryError from dependencies as they are watched in separate useEffect

  const overallLoading = authLoading || (authReady && isProfileQueryLoading);

  return { isAdmin, loading: overallLoading, error };
}