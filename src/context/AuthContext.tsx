import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthChangeEvent, Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SessionService } from '@/services/SessionService';
import { MAX_CONCURRENT_SESSIONS, AUTH_INITIALIZATION_TIMEOUT } from '@/config';
import { ProfileService } from '@/services/ProfileService'; // Corrected import syntax
import { handleError as globalHandleError } from '@/utils/errorHandler';
import { useQueryClient } from '@tanstack/react-query';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  authReady: boolean;
  isExplicitlySignedIn: boolean; // New state for explicit sign-in
  signUp: (email: string, password: string) => Promise<{ data?: any; error?: AuthError }>;
  signIn: (email: string, password: string) => Promise<{ data?: any; error?: AuthError }>;
  signOut: () => Promise<{ success: boolean; error?: AuthError }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: AuthError }>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Keep loading true initially
  const [error, setError] = useState<AuthError | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isExplicitlySignedIn, setIsExplicitlySignedIn] = useState(false); // Initialize new state
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
      // Ensure profile exists before proceeding with session management or fetching profile details
      console.log('AuthContext: Calling ProfileService.ensureProfileExists...');
      await ProfileService.ensureProfileExists(currentSession.user.id, currentSession);
      console.log('AuthContext: ProfileService.ensureProfileExists completed.');

      // Fetch profile to determine admin status for session management.
      const profile = await ProfileService.fetchProfile(currentSession.user.id, currentSession);
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
      // Errors from SessionService or ProfileService are already handled internally by those services
      // (e.g., showing toasts, logging to console). We do not want to set the global AuthContext error
      // state here, as it would affect the AuthPage's error display.
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

    // This timeout is for the *very first* auth check.
    authTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && !authReady) { // Check !authReady here
        console.warn(`AuthContext: Auth initialization timed out after ${AUTH_INITIALIZATION_TIMEOUT}ms. Forcing authReady to true and loading to false.`);
        setAuthReady(true);
        setLoading(false); // Ensure loading is false on timeout
        setError(new AuthError('Authentication initialization timed out.'));
      }
    }, AUTH_INITIALIZATION_TIMEOUT);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, currentSession: Session | null) => {
        console.log(`AuthContext: onAuthStateChange event: ${_event}, session: ${currentSession ? 'present' : 'null'}`);
        if (currentSession) {
          console.log('AuthContext: currentSession details:', {
            userId: currentSession.user?.id,
            userEmail: currentSession.user?.email,
            accessTokenLength: currentSession.access_token?.length,
            expiresAt: currentSession.expires_at,
          });
        }

        if (isMountedRef.current) {
          if (authTimeoutRef.current) {
            clearTimeout(authTimeoutRef.current);
            authTimeoutRef.current = null;
          }

          setSession(currentSession);
          setUser(currentSession?.user || null);
          setError(null);

          // Set authReady to true once the first auth state is received and processed
          if (!authReady) { // Only set if not already true
            setAuthReady(true);
            console.log(`AuthContext: AuthReady set to true after first onAuthStateChange.`);
          }

          // --- IMMEDIATE LOADING STATE UPDATE ---
          // Set loading to false immediately based on session presence.
          // Background tasks (handleSessionCreation/Deletion) should not block this.
          console.log('AuthContext: Immediately setting main loading state to false based on session presence.');
          setLoading(false);
          // --- END IMMEDIATE LOADING STATE UPDATE ---

          // Correctly set isExplicitlySignedIn for restored sessions and explicit sign-ins
          if (_event === 'SIGNED_IN' && currentSession) {
            setIsExplicitlySignedIn(true); // Session restored or explicitly signed in
            console.log(`AuthContext: Event SIGNED_IN with session, isExplicitlySignedIn set to true.`);
          } else if (_event === 'SIGNED_OUT') {
            setIsExplicitlySignedIn(false);
            console.log(`AuthContext: Event SIGNED_OUT, isExplicitlySignedIn set to false.`);
          } else {
            // For other events like INITIAL_SESSION, PASSWORD_RECOVERY, TOKEN_REFRSHED, USER_UPDATED,
            // we should not change isExplicitlySignedIn. It should retain its value
            // from the last explicit sign-in or initial session check.
            console.log(`AuthContext: Event ${_event}, isExplicitlySignedIn state unchanged.`);
          }


          try {
            // Handle session creation/deletion in the background
            if (currentSession) {
              console.log('AuthContext: Starting async session/profile handling...');
              await handleSessionCreation(currentSession);
              console.log('AuthContext: Async session/profile handling complete.');
            } else {
              console.log('AuthContext: Starting async session deletion handling...');
              await handleSessionDeletion(userRef.current?.id);
              console.log('AuthContext: Async session deletion handling complete.');
            }
          } catch (e: any) {
            console.error('AuthContext: Error during session/profile handling in onAuthStateChange:', e);
            // Errors from handleSessionCreation are already handled internally and should not
            // set the global AuthContext error state here, as it would affect the AuthPage's error display.
          } finally {
            // No need to set loading here anymore, it's handled above.
            console.log('AuthContext: Main onAuthStateChange handler finished.');
          }
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
  }, [authReady, handleSessionCreation, handleSessionDeletion]);

  const signUp = async (email: string, password: string) => {
    setLoading(true); // Start loading
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) {
        handleError(authError, authError.message);
        return { error: authError };
      }
      toast.success('Signup successful! Please check your email to confirm your account.');
      // After signup, the user is technically "signed in" by Supabase, but not explicitly
      // confirmed by email yet. We should not set isExplicitlySignedIn to true here.
      // It will be set to true upon successful email confirmation and subsequent login.
      return { data };
    } finally {
      setLoading(false); // End loading
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true); // Start loading
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        handleError(authError, authError.message);
        return { error: authError };
      }
      toast.success('Logged in successfully!');
      setIsExplicitlySignedIn(true); // Set to true on successful explicit sign-in
      return { data };
    } finally {
      setLoading(false); // End loading
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
      setIsExplicitlySignedIn(false); // Reset on sign out
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
    isExplicitlySignedIn, // Include in context value
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