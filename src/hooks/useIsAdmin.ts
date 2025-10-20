import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '@/context/AuthContext'; // Adjust path
import { ProfileService } from '@/services/ProfileService'; // Adjust path
import { handleError } from '@/utils/errorHandler';

interface UseAdminResult {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useIsAdmin(): UseAdminResult {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useIsAdmin must be used within an AuthProvider');
  }
  const { user, session, authReady } = context;

  console.log('useIsAdmin: authReady:', authReady, 'session:', !!session, 'userId:', user?.id);

  const { data: isAdmin, isLoading: isProfileQueryLoading, isError: isProfileQueryError, error: profileQueryError } = useQuery<boolean, Error>({
    queryKey: ['profile', 'admin', user?.id],
    queryFn: async () => {
      if (!session || !user?.id) {
        console.error('useIsAdmin: No session or user ID available for queryFn.');
        // If enabled is false, this function shouldn't even run, but as a safeguard
        throw new Error('No session or user ID available');
      }
      console.log('useIsAdmin: Fetching profile for user ID:', user.id);
      // Ensure profile exists before fetching it, this handles new user signups
      await ProfileService.ensureProfileExists(user.id, session);
      const profile = await ProfileService.fetchProfile(user.id, session);
      const userIsAdmin = profile?.role === 'admin';
      console.log('useIsAdmin: Profile fetched, role:', profile?.role, 'isAdmin:', userIsAdmin);
      return userIsAdmin;
    },
    enabled: authReady && !!session && !!user?.id,
    retry: 0, // Disable retries to avoid multiple fetches on initial failure
    staleTime: Infinity, // Cache indefinitely
    cacheTime: Infinity, // Prevent eviction
    onError: (err) => {
      console.error('useIsAdmin: Query failed:', err);
      handleError(err, 'Failed to determine admin status.');
    },
  });

  return {
    isAdmin: isAdmin ?? false, // Default to false if data is undefined
    loading: isProfileQueryLoading || !authReady, // Consider loading if auth isn't ready yet
    error: isProfileQueryError ? handleError(profileQueryError, 'Failed to load admin status.') : null,
  };
}