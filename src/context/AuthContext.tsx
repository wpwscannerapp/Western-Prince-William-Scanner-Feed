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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isExplicitlySignedIn, setIsExplicitlySignedIn] = useState(false); // Default to false
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
    console.log('AuthContext: handleSessionCreation called with session:', currentSession ? 'present' : 'null');
    if (!currentSession.user || !currentSession.expires_in) {
      console.log('AuthContext: No user or expires_in in session, skipping session creation.');
      return;
    }
    console.log('AuthContext: User ID for session creation:', currentSession.user.id);
    console.log('AuthContext: Access Token present:', !!currentSession.access_token);

    let currentSessionId = localStorage.getItem('wpw_session_id');
    if (!currentSessionId) {
      currentSessionId = crypto.randomUUID();
      localStorage.setItem('wpw_session_id', currentSessionId);
      console.log('AuthContext: Generated new session ID:', currentSessionId);
    } else {
      console.log('AuthContext: Found existing session ID:', currentSessionId);
    }

    const isValid = await SessionService.isValidSession(currentSession.user.id, currentSessionId);
    if (isValid) {
      console.log('AuthContext: Session is already valid, no action needed.');
      return;
    }

    try {
      console.log('AuthContext: Calling ProfileService.ensureProfileExists...');
      await ProfileService.ensureProfileExists(currentSession.user.id);
      console.log('AuthContext: ProfileService.ensureProfileExists completed.');

      const profile = await ProfileService.fetchProfile(currentSession.user.id);
      const isCurrentUserAdmin = profile?.role === 'admin';
      console.log('AuthContext: User role for session management:', profile?.role);

      if (!isCurrentUserAdmin) {
        console.log('AuthContext: User is not admin, checking concurrent sessions.');
        await SessionService.deleteOldestSessions(currentSession.user.id, MAX_CONCURRENT_SESSIONS);
      }

      const createdSession = await SessionService.createSession(currentSession, currentSessionId);
      if (createdSession) {
        console.log('AuthContext: Session created successfully.');
      } else {
        console.error('AuthContext: Failed to create session (error handled by SessionService).');
      }
    } catch (err) {
      console.error('AuthContext: Error during session management (non-critical for global auth state):', (err as Error).message);
    }
    console.log('AuthContext: handleSessionCreation finished.');
  }, []);

  const handleSessionDeletion = useCallback(async (userIdToDelete?: string) => {
    console.log('AuthContext: handleSessionDeletion called.');
    const currentSessionId = localStorage.getItem('wpw_session_id');
    if (currentSessionId) {
      console.log('AuthContext: Deleting specific session ID:', currentSessionId);
      await SessionService.deleteSession(userIdToDelete, currentSessionId);
      localStorage.removeItem('wpw_session_id');
    } else {
      console.log('AuthContext: No specific session ID found in localStorage to delete.');
    }

    if (userIdToDelete) {
      console.log('AuthContext: Deleting all sessions for user:', userIdToDelete);
      await SessionService.deleteAllSessionsForUser(userIdToDelete);
    }
    queryClient.invalidateQueries({ queryKey: ['profile', userIdToDelete] });
    console.log('AuthContext: Session(s) deleted and removed from localStorage. Profile cache invalidated.');
  }, [queryClient]);

  useEffect(() => {
    console.log('AuthContext: Setting up onAuthStateChange listener.');

    authTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && !authReady) {
        console.warn(`AuthContext: Auth initialization timed out after ${AUTH_INITIALIZATION_TIMEOUT}ms. Forcing authReady to true and loading to false.`);
        setAuthReady(true);
        setLoading(false);
        setError(new AuthError('Authentication initialization timed out.'));
      }
    }, AUTH_INITIALIZATION_TIMEOUT);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, currentSession: Session | null) => {
        console.log(`AuthContext: onAuthStateChange event: ${_event}`);
        console.log(`AuthContext: currentSession: ${currentSession ? 'present' : 'null'}`);
        console.log(`AuthContext: isExplicitlySignedIn BEFORE state update: ${isExplicitlySignedIn}`);
        console.log(`AuthContext: State BEFORE update - authReady: ${authReady}, loading: ${loading}`);

        if (isMountedRef.current) {
          if (authTimeoutRef.current) {
            clearTimeout(authTimeoutRef.current);
            authTimeoutRef.current = null;
          }

          // Set authReady and loading states immediately as the initial auth check is complete.
          // This ensures the UI can react quickly without waiting for background async tasks.
          if (!authReady) { // Ensure it's only set once
            setAuthReady(true);
            console.log(`AuthContext: AuthReady set to true after first onAuthStateChange.`);
          }
          setLoading(false); // Always set loading to false once auth state is determined
          console.log('AuthContext: Setting main loading state to false after initial synchronous state updates.');

          // Synchronous state updates for session and user
          setSession(currentSession);
          setUser(currentSession?.user || null);
          setError(null);

          // Update isExplicitlySignedIn based on event
          if (_event === 'SIGNED_IN') {
            setIsExplicitlySignedIn(true);
            console.log(`AuthContext: Event SIGNED_IN, isExplicitlySignedIn set to true.`);
          } else if (_event === 'SIGNED_OUT') {
            setIsExplicitlySignedIn(false);
            console.log(`AuthContext: Event SIGNED_OUT, isExplicitlySignedIn set to false.`);
          } else {
            console.log(`AuthContext: Event ${_event}, isExplicitlySignedIn state unchanged (current value: ${isExplicitlySignedIn}).`);
          }

          // Await profile and session handling for SIGNED_IN and INITIAL_SESSION
          // These can run in the background and should not block authReady/loading
          if (currentSession && (_event === 'SIGNED_IN' || _event === 'INITIAL_SESSION')) {
            console.log('AuthContext: Initiating async session/profile handling in background...');
            void handleSessionCreation(currentSession).catch(e => {
              console.error('AuthContext: Error during background session/profile handling:', (e as Error).message);
            });
            console.log('AuthContext: Async session/profile handling initiated.');
          } else if (_event === 'SIGNED_OUT') {
            console.log('AuthContext: Starting async session deletion handling in background for SIGNED_OUT...');
            void handleSessionDeletion(userRef.current?.id).catch(e => {
              console.error('AuthContext: Error during background session deletion:', (e as Error).message);
            });
            console.log('AuthContext: Async session deletion handling initiated.');
          }
          
          console.log('AuthContext: Main onAuthStateChange handler finished.');
          console.log(`AuthContext: State AFTER handler - authReady: ${authReady}, loading: ${loading}, isExplicitlySignedIn: ${isExplicitlySignedIn}`);
        }
      }
    );

    return () => {
      console.log('AuthContext: Cleaning up onAuthStateChange listener.');
      subscription.unsubscribe();
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
    };
  }, [handleSessionCreation, handleSessionDeletion]); // Added handleSessionCreation and handleSessionDeletion to deps

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
      setIsExplicitlySignedIn(true); // Set to true ONLY on explicit sign-in
      console.log('AuthContext: signIn successful, isExplicitlySignedIn set to true.');
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
          console.warn('Supabase signOut: Session already missing or invalid on server. Proceeding with local logout.');
          toast.success('Logged out successfully!');
          return { success: true };
        }
        handleError(authError, authError.message);
        return { success: false, error: authError };
      }
      toast.success('Logged out successfully!');
      setIsExplicitlySignedIn(false); // Set to false on sign-out
      console.log('AuthContext: signOut successful, isExplicitlySignedIn set to false.');
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