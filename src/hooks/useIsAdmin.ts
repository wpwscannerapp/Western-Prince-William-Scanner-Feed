"use client";

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { handleError as globalHandleError } from '@/utils/errorHandler'; // Renamed to avoid conflict
import { useLocation } from 'react-router-dom';
import { SUPABASE_API_TIMEOUT } from '@/config';
import { AnalyticsService } from '@/services/AnalyticsService'; // Import AnalyticsService

interface UseAdminResult {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

let fetchCount = 0; // Add this at the top of the file

export function useIsAdmin(): UseAdminResult {
  const { user, loading: authLoading, authReady } = useAuth();
  const location = useLocation();

  const isOnAuthPage = location.pathname === '/auth' || location.pathname === '/auth/login' || location.pathname === '/auth/signup';

  // If on an authentication-related page, we don't need to check admin status.
  // Return immediately with non-admin status and not loading for this specific check.
  if (isOnAuthPage) {
    return { isAdmin: false, loading: false, error: null };
  }

  // The rest of the hook logic only runs if not on an auth page.
  // State variables must be declared unconditionally at the top level of the component.
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Enable the query only if user is authenticated and auth is ready and not loading.
  const queryEnabled = !!user && authReady && !authLoading;

  const { data: roleData, isLoading: isRoleQueryLoading, isError: isRoleQueryError, error: roleQueryError } = useQuery<{ role: string } | null, Error>({
    queryKey: ['userRole', user?.id],
    queryFn: async () => {
      if (!user) {
        // This case should ideally not be reached if queryEnabled is false,
        // but it's a good safeguard.
        return null;
      }

      if (import.meta.env.DEV) {
        console.log('useIsAdmin: fetchRole started. Count:', ++fetchCount);
        console.log(`[useIsAdmin] Using SUPABASE_API_TIMEOUT: ${SUPABASE_API_TIMEOUT}ms`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        if (import.meta.env.DEV) {
          console.warn(`useIsAdmin: Role fetch for ${user.id} timed out after ${SUPABASE_API_TIMEOUT}ms. Aborting request.`);
        }
        AnalyticsService.trackEvent({ name: 'fetch_admin_role_timeout', properties: { userId: user.id } });
      }, SUPABASE_API_TIMEOUT);

      try {
        const { data, error: supabaseError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .abortSignal(controller.signal)
          .single();

        if (supabaseError) {
          if (supabaseError.code === 'PGRST116') {
            AnalyticsService.trackEvent({ name: 'fetch_admin_role_profile_not_found', properties: { userId: user.id } });
            return null;
          }
          throw supabaseError;
        }
        AnalyticsService.trackEvent({ name: 'admin_role_fetched', properties: { userId: user.id, role: data.role } });
        return data as { role: string };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // Throw a specific error for the query to catch
          throw new Error('Fetching user role timed out.');
        }
        AnalyticsService.trackEvent({ name: 'fetch_admin_role_failed', properties: { userId: user.id, error: err.message } });
        throw err;
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

    if (isRoleQueryError) {
      // Check if the error is the timeout error we threw
      if (roleQueryError.message === 'Fetching user role timed out.') {
        setError('Failed to load admin role: Request timed out.');
      } else {
        setError(globalHandleError(roleQueryError, 'Failed to load admin role.')); // Use globalHandleError
      }
      setIsAdmin(false);
      return;
    }

    if (!isRoleQueryLoading) {
      const newIsAdminStatus = roleData?.role === 'admin';
      if (newIsAdminStatus !== isAdmin) {
        setIsAdmin(newIsAdminStatus);
      }
      setError(null);
    }
  }, [isRoleQueryLoading, isRoleQueryError, roleQueryError, roleData, isAdmin]);

  // Overall loading state for the admin check itself.
  // This will be true if auth is still loading, or if the role query is loading.
  const overallLoading = authLoading || isRoleQueryLoading;

  return { isAdmin, loading: overallLoading, error };
}