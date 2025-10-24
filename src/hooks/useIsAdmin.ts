import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client'; // Import supabase directly
import { handleError } from '@/utils/errorHandler';
import { useLocation } from 'react-router-dom';
import { ProfileService } from '@/services/ProfileService'; // Still need ProfileService for ensureProfileExists
import { SUPABASE_API_TIMEOUT } from '@/config'; // Import SUPABASE_API_TIMEOUT

interface UseAdminResult {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useIsAdmin(): UseAdminResult {
  const { user, loading: authLoading, authReady } = useAuth(); // Removed session from here
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

  const { data: roleData, isLoading: isRoleQueryLoading, isError: isRoleQueryError, error: roleQueryError } = useQuery<{ role: string } | null, Error>({
    queryKey: ['userRole', user?.id],
    queryFn: async () => {
      console.log('useIsAdmin: QueryFn - Fetching user role for user', user?.id);
      if (!user) {
        console.warn('useIsAdmin: QueryFn - No user, returning null.');
        return null;
      }
      
      // Ensure profile exists before attempting to fetch role
      // This is crucial to prevent issues if a user logs in but their profile isn't yet created.
      try {
        await ProfileService.ensureProfileExists(user.id);
        console.log(`useIsAdmin: Profile ensured for user ${user.id}.`);
      } catch (e) {
        console.error(`useIsAdmin: Failed to ensure profile exists for ${user.id}:`, e);
        // If ensureProfileExists fails, we can't reliably get the role.
        // Let's re-throw to propagate the error to the query.
        throw e;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error(`useIsAdmin: Role fetch for ${user.id} timed out after ${SUPABASE_API_TIMEOUT}ms.`);
      }, SUPABASE_API_TIMEOUT);

      try {
        const { data, error: supabaseError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .abortSignal(controller.signal)
          .single();

        console.log('useIsAdmin: Supabase role query completed. Data:', data, 'Error:', supabaseError);

        if (supabaseError) {
          if (supabaseError.code === 'PGRST116') { // No rows found
            console.warn(`useIsAdmin: No profile found for user ${user.id} after ensureProfileExists. This is unexpected.`);
            return null;
          }
          throw supabaseError;
        }
        return data as { role: string };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          throw new Error('Fetching user role timed out.');
        }
        throw err; // Re-throw other errors
      } finally {
        clearTimeout(timeoutId);
      }
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
      isRoleQueryLoading,
      userId: user?.id,
      roleData: roleData ? 'present' : 'null',
      isRoleQueryError,
      roleQueryError,
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
    if (isRoleQueryError) {
      setError(handleError(roleQueryError, 'Failed to load admin role.'));
      setIsAdmin(false);
      return;
    }

    // Once role query is not loading and no error, determine admin status
    if (!isRoleQueryLoading) {
      if (roleData && roleData.role) {
        console.log('useIsAdmin: Role data available, role:', roleData.role);
        setIsAdmin(roleData.role === 'admin');
        setError(null);
      } else {
        console.warn('useIsAdmin: Role data is missing or role is undefined after query completed.');
        setIsAdmin(false);
        setError('User role data incomplete.');
      }
    }
  }, [authReady, isRoleQueryLoading, isRoleQueryError, roleQueryError, roleData, user, authLoading, queryEnabled, isOnAuthPage, isAdmin, error]);

  const overallLoading = authLoading || (authReady && isRoleQueryLoading);

  return { isAdmin, loading: overallLoading, error };
}