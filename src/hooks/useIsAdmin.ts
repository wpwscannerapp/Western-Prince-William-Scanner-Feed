import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client'; // Import supabase directly
import { handleError } from '@/utils/errorHandler';
import { useLocation } from 'react-router-dom';
import { SUPABASE_API_TIMEOUT } from '@/config'; // Import SUPABASE_API_TIMEOUT

interface UseAdminResult {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useIsAdmin(): UseAdminResult {
  const { user, loading: authLoading, authReady } = useAuth();
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
      
      // ProfileService.ensureProfileExists is now handled by AuthContext, so we can directly query.
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
            console.warn(`useIsAdmin: No profile found for user ${user.id}. This is unexpected if AuthContext ensured it.`);
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
      const newIsAdminStatus = roleData?.role === 'admin';
      if (newIsAdminStatus !== isAdmin) { // Only update if status has changed
        console.log(`useIsAdmin: Setting isAdmin to ${newIsAdminStatus} for user ${user?.id}. Role: ${roleData?.role}`);
        setIsAdmin(newIsAdminStatus);
      }
      setError(null);
    }
  }, [authReady, isRoleQueryLoading, isRoleQueryError, roleQueryError, roleData, user, authLoading, queryEnabled, isOnAuthPage, isAdmin, error]);

  const overallLoading = authLoading || (authReady && isRoleQueryLoading);

  return { isAdmin, loading: overallLoading, error };
}