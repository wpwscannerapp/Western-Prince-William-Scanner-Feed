import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
      await ProfileService.ensureProfileExists(user.id, session);
      return ProfileService.fetchProfile(user.id, session);
    },
    enabled: !!user && authReady, // Only run query if user is present and auth is ready
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: 1000,
  });

  // Effect to determine isAdmin status and handle errors
  useEffect(() => {
    if (!isMountedRef.current) return;

    // If authentication is still loading or not ready, defer setting isAdmin/error.
    if (authLoading || !authReady) {
      setIsAdmin(false); // Default to false while auth is in progress
      setError(null);
      return;
    }

    // Auth is ready. Now evaluate user and profile status.
    if (!user) {
      // No user after auth is ready means not logged in.
      setIsAdmin(false);
      setError(null);
    } else if (isProfileQueryLoading) {
      // User is logged in, but profile is still being fetched.
      // Keep isAdmin as false (or its previous value) and no error yet.
      setIsAdmin(false); 
      setError(null);
    } else if (isProfileQueryError) {
      // User is logged in, but profile fetching failed.
      setIsAdmin(false);
      setError(handleError(profileQueryError, 'Failed to load admin role.'));
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] }); // Invalidate to allow retry
    } else if (profile) {
      // User is logged in, profile loaded successfully.
      setIsAdmin(profile.role === 'admin');
      setError(null);
    } else {
      // User is logged in, but profile is null (e.g., not found after ensureProfileExists).
      setIsAdmin(false);
      setError('User profile not found or could not be fetched.');
    }
  }, [authLoading, authReady, user, isProfileQueryLoading, isProfileQueryError, profile, profileQueryError, queryClient]);

  const overallLoading = authLoading || (authReady && isProfileQueryLoading);

  return { isAdmin, loading: overallLoading, error };
}