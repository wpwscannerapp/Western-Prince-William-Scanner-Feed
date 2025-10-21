import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { ProfileService } from '@/services/ProfileService';
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

  const { data: profile, isLoading: isProfileQueryLoading, isError: isProfileQueryError, error: profileQueryError } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => user ? ProfileService.fetchProfile(user.id, session) : Promise.resolve(null),
    enabled: !!user && authReady,
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: 1000,
    onError: (err) => {
      console.error('Profile query error:', err);
      if (isMountedRef.current) {
        setError(handleError(err, 'Failed to load admin role.'));
        setIsAdmin(false);
      }
    },
  });

  useEffect(() => {
    if (!isMountedRef.current) return;

    if (!authReady || authLoading) {
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

    if (profile) {
      setIsAdmin(profile.role === 'admin'); // Adjusted to use 'role' from your schema
      setError(null);
    } else {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      setIsAdmin(false);
      setError('User profile not found.');
    }
  }, [authReady, isProfileQueryLoading, isProfileQueryError, profileQueryError, profile, user, queryClient, authLoading]);

  const overallLoading = authLoading || (authReady && isProfileQueryLoading);

  return { isAdmin, loading: overallLoading, error };
}