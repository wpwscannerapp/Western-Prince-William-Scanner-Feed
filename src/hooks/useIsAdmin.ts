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
      // Ensure profile exists before fetching. This is crucial.
      await ProfileService.ensureProfileExists(user.id, session);
      return ProfileService.fetchProfile(user.id, session);
    },
    enabled: !!user && authReady,
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: 1000,
  });

  // Effect to handle errors from the profile query
  useEffect(() => {
    if (isMountedRef.current && isProfileQueryError && profileQueryError) {
      console.error('useIsAdmin: Profile query error:', profileQueryError);
      setError(handleError(profileQueryError, 'Failed to load admin role.'));
      setIsAdmin(false);
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    } else if (isMountedRef.current && !isProfileQueryError && error) {
      setError(null);
    }
  }, [isProfileQueryError, profileQueryError, queryClient, user?.id, error]);

  // Main effect to determine isAdmin status and overall loading
  useEffect(() => {
    if (!isMountedRef.current) return;

    const currentOverallLoading = authLoading || (authReady && isProfileQueryLoading);

    if (currentOverallLoading) {
      // If still loading, do not update isAdmin or error states.
      // This prevents flickering during intermediate loading states.
      return;
    }

    // Now that loading is complete (currentOverallLoading is false)
    if (!user) {
      setIsAdmin(false);
      setError(null);
      return;
    }

    if (isProfileQueryError) {
      // Error already handled by the separate useEffect, just ensure isAdmin is false
      setIsAdmin(false);
      return;
    }

    if (profile) {
      setIsAdmin(profile.role === 'admin');
      setError(null); // Clear any previous errors if profile is successfully loaded
    } else {
      // This case should ideally be covered by isProfileQueryError or !user,
      // but as a fallback, if profile is null after loading, it's not admin.
      setIsAdmin(false);
      setError('User profile not found or could not be fetched.');
    }
  }, [authLoading, authReady, isProfileQueryLoading, user, profile, isProfileQueryError]);

  const overallLoading = authLoading || (authReady && isProfileQueryLoading);

  return { isAdmin, loading: overallLoading, error };
}