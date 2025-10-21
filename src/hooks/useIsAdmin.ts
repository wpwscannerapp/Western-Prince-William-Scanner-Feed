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
  const [profileLoading, setProfileLoading] = useState(true);
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
    retry: 1,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (!isMountedRef.current) return;

    console.log('useIsAdmin useEffect: Current state:', { authLoading, authReady, isProfileQueryLoading, user: user?.id, profile, isProfileQueryError, profileQueryError });

    if (authLoading || !authReady || isProfileQueryLoading) {
      console.log('useIsAdmin: Setting profileLoading to true due to authLoading, !authReady, or isProfileQueryLoading.');
      setProfileLoading(true);
      return;
    }

    if (isProfileQueryError) {
      const errorMessage = handleError(profileQueryError, 'Failed to load admin role.');
      setError(errorMessage);
      setIsAdmin(false);
      setProfileLoading(false);
      return;
    }

    if (!user) {
      setIsAdmin(false);
      setProfileLoading(false);
      setError(null);
      return;
    }

    if (profile) {
      console.log('useIsAdmin: Profile found, checking role:', profile.role);
      setIsAdmin(profile.role === 'admin');
      setError(null);
    } else {
      console.log('useIsAdmin: Profile is null or undefined.');
      setIsAdmin(false);
      setError('User profile not found or accessible.');
    }
    console.log('useIsAdmin: Setting profileLoading to false. Final isAdmin:', isAdmin);
    setProfileLoading(false);
  }, [user, authLoading, authReady, profile, isProfileQueryLoading, isProfileQueryError, profileQueryError, session]); // Removed 'isAdmin' from dependencies
  // The 'isAdmin' state is derived from 'profile.role', so 'profile' is the primary dependency.

  return { isAdmin, loading: profileLoading, error };
}