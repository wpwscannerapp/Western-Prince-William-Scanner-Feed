import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContextType, useAuth } from '@/context/AuthContext'; // Corrected import to AuthContextType
import { ProfileService } from '@/services/ProfileService';
import { handleError } from '@/utils/errorHandler';

interface UseAdminResult {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useIsAdmin(): UseAdminResult {
  const context = useAuth(); // Use the useAuth hook directly
  if (context === undefined) {
    throw new Error('useIsAdmin must be used within an AuthProvider');
  }
  const { user, session, authReady } = context as AuthContextType; // Explicitly cast context to AuthContextType

  console.log('useIsAdmin: authReady:', authReady, 'session:', !!session, 'userId:', user?.id);

  const { data: isAdmin, isLoading: isProfileQueryLoading, isError: isProfileQueryError, error: profileQueryError } = useQuery<boolean, Error>({
    queryKey: ['profile', 'admin', user?.id],
    queryFn: async () => {
      if (!session || !user?.id) {
        console.error('useIsAdmin: No session or user ID available for queryFn.');
        throw new Error('No session or user ID available');
      }
      console.log('useIsAdmin: Fetching profile for user ID:', user.id);
      await ProfileService.ensureProfileExists(user.id, session);
      const profile = await ProfileService.fetchProfile(user.id, session);
      const userIsAdmin = profile?.role === 'admin';
      console.log('useIsAdmin: Profile fetched, role:', profile?.role, 'isAdmin:', userIsAdmin);
      return userIsAdmin;
    },
    enabled: authReady && !!session && !!user?.id,
    retry: 0,
    staleTime: Infinity,
    gcTime: Infinity, // Correctly using gcTime for TanStack Query v5
    // Removed onError as it's deprecated in TanStack Query v5.
    // Error handling is now done via the 'error' property returned by useQuery.
  });

  return {
    isAdmin: isAdmin ?? false, // Default to false if data is undefined
    loading: isProfileQueryLoading || !authReady,
    error: isProfileQueryError ? handleError(profileQueryError, 'Failed to load admin status.') : null,
  };
}