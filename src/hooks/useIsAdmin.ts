"use client";

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { useLocation } from 'react-router-dom';
import { SUPABASE_API_TIMEOUT } from '@/config';
import { AnalyticsService } from '@/services/AnalyticsService'; // Import AnalyticsService

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
  const queryEnabled = !!user && authReady && !authLoading && !isOnAuthPage;
  
  const { data: roleData, isLoading: isRoleQueryLoading, isError: isRoleQueryError, error: roleQueryError } = useQuery<{ role: string } | null, Error>({
    queryKey: ['userRole', user?.id],
    queryFn: async () => {
      if (!user) {
        return null;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        if (import.meta.env.DEV) {
          console.error(`useIsAdmin: Role fetch for ${user.id} timed out after ${SUPABASE_API_TIMEOUT}ms.`);
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

    if (isOnAuthPage || !authReady || authLoading) {
      if (isAdmin || error) {
        setIsAdmin(false);
        setError(null);
      }
      return;
    }

    if (!queryEnabled) {
      if (isAdmin || error) {
        setIsAdmin(false);
        setError(null);
      }
      return;
    }

    if (isRoleQueryError) {
      setError(handleError(roleQueryError, 'Failed to load admin role.'));
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
  }, [authReady, isRoleQueryLoading, isRoleQueryError, roleQueryError, roleData, user, authLoading, queryEnabled, isOnAuthPage, isAdmin, error]);

  const overallLoading = authLoading || (authReady && isRoleQueryLoading);

  return { isAdmin, loading: overallLoading, error };
}