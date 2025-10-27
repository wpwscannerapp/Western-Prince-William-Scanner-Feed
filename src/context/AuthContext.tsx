"use client";

import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthChangeEvent, Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SessionService } from '@/services/SessionService';
import { MAX_CONCURRENT_SESSIONS, AUTH_INITIALIZATION_TIMEOUT } from '@/config';
import { ProfileService } from '@/services/ProfileService';
import { handleError as globalHandleError } from '@/utils/errorHandler';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from './auth-context-definition';
import { AnalyticsService } from '@/services/AnalyticsService'; // Import AnalyticsService

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isExplicitlySignedIn, setIsExplicitlySignedIn] = useState(false);
  const isMountedRef = useRef(true);
  const userRef = useRef<User | null>(null);
  const queryClient = useQueryClient();
  const authTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const handleError = (err: any, defaultMessage: string) => {
    const authError = err instanceof AuthError ? err : new AuthError(err.message || defaultMessage, err.name);
    if (isMountedRef.current) {
      setError(authError);
    }
    globalHandleError(authError, defaultMessage);
    return authError;
  };

  const handleSessionCreation = useCallback(async (currentSession: Session) => {
    if (!currentSession.user || !currentSession.expires_in) {
      return;
    }

    let currentSessionId = localStorage.getItem('wpw_session_id');
    if (!currentSessionId) {
      currentSessionId = crypto.randomUUID();
      localStorage.setItem('wpw_session_id', currentSessionId);
    }

    const isValid = await SessionService.isValidSession(currentSession.user.id, currentSessionId);
    if (isValid) {
      return;
    }

    try {
      await ProfileService.ensureProfileExists(currentSession.user.id);

      const profile = await ProfileService.fetchProfile(currentSession.user.id);
      // Add null check for profile
      const isCurrentUserAdmin = profile?.role === 'admin';

      if (!isCurrentUserAdmin) {
        await SessionService.deleteOldestSessions(currentSession.user.id, MAX_CONCURRENT_SESSIONS);
      }

      await SessionService.createSession(currentSession, currentSessionId);
      AnalyticsService.trackEvent({ name: 'session_created', properties: { userId: currentSession.user.id } });
    } catch (err) {
      console.error('AuthContext: Error during session management (non-critical for global auth state):', (err as Error).message);
      AnalyticsService.trackEvent({ name: 'session_creation_failed', properties: { userId: currentSession.user.id, error: (err as Error).message } });
    }
  }, []);

  const handleSessionDeletion = useCallback(async (userIdToDelete?: string) => {
    const currentSessionId = localStorage.getItem('wpw_session_id');
    if (currentSessionId) {
      await SessionService.deleteSession(userIdToDelete, currentSessionId);
      localStorage.removeItem('wpw_session_id');
    }

    if (userIdToDelete) {
      await SessionService.deleteAllSessionsForUser(userIdToDelete);
    }
    queryClient.invalidateQueries({ queryKey: ['profile', userIdToDelete] });
    AnalyticsService.trackEvent({ name: 'session_deleted', properties: { userId: userIdToDelete } });
  }, [queryClient]);

  useEffect(() => {
    authTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && !authReady) {
        setAuthReady(true);
        setLoading(false);
        const timeoutError = new AuthError('Authentication initialization timed out.');
        setError(timeoutError);
        globalHandleError(timeoutError, 'Authentication initialization timed out.');
        AnalyticsService.trackEvent({ name: 'auth_init_timeout' });
      }
    }, AUTH_INITIALIZATION_TIMEOUT);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, currentSession: Session | null) => {
        if (isMountedRef.current) {
          if (authTimeoutRef.current) {
            clearTimeout(authTimeoutRef.current);
            authTimeoutRef.current = null;
          }

          if (!authReady) {
            setAuthReady(true);
          }
          setLoading(false);

          setSession(currentSession);
          setUser(currentSession?.user || null);
          setError(null);

          if (_event === 'SIGNED_IN') {
            if (isMountedRef.current) { // Add mounted check
              setIsExplicitlySignedIn(true);
            }
            AnalyticsService.trackEvent({ name: 'auth_state_signed_in', properties: { userId: currentSession?.user?.id } });
          } else if (_event === 'SIGNED_OUT') {
            if (isMountedRef.current) { // Add mounted check
              setIsExplicitlySignedIn(false);
            }
            AnalyticsService.trackEvent({ name: 'auth_state_signed_out', properties: { userId: userRef.current?.id } });
          }

          if (currentSession && (_event === 'SIGNED_IN' || _event === 'INITIAL_SESSION')) {
            void handleSessionCreation(currentSession).catch(e => {
              console.error('AuthContext: Error during background session/profile handling:', (e as Error).message);
            });
          } else if (_event === 'SIGNED_OUT') {
            void handleSessionDeletion(userRef.current?.id).catch(e => {
              console.error('AuthContext: Error during background session deletion:', (e as Error).message);
            });
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
    };
  }, [handleSessionCreation, handleSessionDeletion, authReady]);

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) {
        handleError(authError, authError.message);
        return { error: authError };
      }
      toast.success('Signup successful! Please check your email to confirm your account.');
      return { data };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        handleError(authError, authError.message);
        return { error: authError };
      }
      toast.success('Logged in successfully!');
      if (isMountedRef.current) { // Add mounted check
        setIsExplicitlySignedIn(true);
      }
      return { data };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signOut();
      if (authError) {
        if (authError.message.includes('Auth session missing') || authError.message.includes('Invalid session')) {
          toast.success('Logged out successfully!');
          return { success: true };
        }
        handleError(authError, authError.message);
        return { success: false, error: authError };
      }
      toast.success('Logged out successfully!');
      if (isMountedRef.current) { // Add mounted check
        setIsExplicitlySignedIn(false);
      }
      return { success: true };
    } catch (e: any) {
      handleError(e, e.message || 'An unexpected error occurred during logout.');
      return { success: false, error: e };
    } finally {
      // The onAuthStateChange listener will handle setting loading to false.
    }
  };

  const forgotPassword = async (email: string) => {
    setError(null);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.VITE_APP_URL}/reset-password`,
    });
    if (authError) {
      handleError(authError, authError.message);
      return { success: false, error: authError };
    }
    toast.success('Password reset email sent. Check your inbox!');
    return { success: true };
  };

  const value = {
    session,
    user,
    loading,
    error,
    authReady,
    isExplicitlySignedIn,
    signUp,
    signIn,
    signOut,
    forgotPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};