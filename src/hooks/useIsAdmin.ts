import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProfileService } from '@/services/ProfileService';
import { handleError } from '@/utils/errorHandler'; // Import handleError
import { useQuery } from '@tanstack/react-query'; // Import useQuery

interface UseAdminResult {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useIsAdmin(): UseAdminResult {
  const { user, loading: authLoading, authReady, session } = useAuth(); // Get session from useAuth
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

  // Use react-query to fetch the profile, which will handle caching and deduplication
  const { data: profile, isLoading: isProfileQueryLoading, isError: isProfileQueryError, error: profileQueryError } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => user ? ProfileService.fetchProfile(user.id, session) : Promise.resolve(null), // Pass session here
    enabled: !!user && authReady, // Only fetch if user is present and auth is ready
    staleTime: 1000 * 60 * 5, // Cache profile for 5 minutes
    retry: 1, // Only retry once for profile fetch to quickly detect persistent issues
    retryDelay: 1000, // Short delay for retry
  });

  useEffect(() => {
    if (!isMountedRef.current) return;

    console.log('useIsAdmin useEffect:', { authLoading, authReady, isProfileQueryLoading, user: user?.id, profile: profile ? 'present' : 'null', isProfileQueryError, profileQueryError });

    if (authLoading || !authReady || isProfileQueryLoading) {
      console.log('useIsAdmin: Setting profileLoading to true due to authLoading, !authReady, or isProfileQueryLoading.');
      setProfileLoading(true);
      return;
    }

    if (isProfileQueryError) {
      const errorMessage = handleError(profileQueryError, 'Failed to load admin role.');
      setError(errorMessage);
      setIsAdmin(false); // Default to false on error
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
      setIsAdmin(profile.role === 'admin');
      setError(null);
    } else {
      setIsAdmin(false);
      setError('User profile not found or accessible.');
    }
    console.log('useIsAdmin: Setting profileLoading to false. Final isAdmin:', isAdmin);
    setProfileLoading(false);
  }, [user, authLoading, authReady, profile, isProfileQueryLoading, isProfileQueryError, profileQueryError, session, isAdmin]); // Add isAdmin to dependency array to prevent stale closure issues

  return { isAdmin, loading: profileLoading, error };
}