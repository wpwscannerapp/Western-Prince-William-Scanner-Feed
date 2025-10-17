import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthChangeEvent, Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SessionService } from '@/services/SessionService';
import { MAX_CONCURRENT_SESSIONS, AUTH_INITIALIZATION_TIMEOUT } from '@/config'; // Import AUTH_INITIALIZATION_TIMEOUT
import { ProfileService } from '@/services/ProfileService';
import { handleError as globalHandleError } from '@/utils/errorHandler';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  signUp: (email: string, password: string) => Promise<{ data?: any; error?: AuthError }>;
  signIn: (email: string, password: string) => Promise<{ data?: any; error?: AuthError }>;
  signOut: () => Promise<{ success: boolean; error?: AuthError }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: AuthError }>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start as true
  const [error, setError] = useState<AuthError | null>(null);
  const isMountedRef = useRef(true);
  const mountCountRef = useRef(0);
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for the timeout

  useEffect(() => {
    mountCountRef.current += 1;
    console.log(`AuthContext: Mounting AuthProvider (mount count: ${mountCountRef.current})`);
    return () => {
      isMountedRef.current = false;
      console.log(`AuthContext: Unmounting AuthProvider (mount count: ${mountCountRef.current})`);
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, []);

  const handleError = useCallback((err: any, defaultMessage: string) => {
    const authError = err instanceof AuthError ? err : new AuthError(err.message || defaultMessage, err.name);
    if (isMountedRef.current) {
      setError(authError);
    }
    globalHandleError(authError, defaultMessage);
    return authError;
  }, []);

  const handleSessionCreation = useCallback(async (currentSession: Session) => {
    console.log('AuthContext: handleSessionCreation called with session:', currentSession ? 'present' : 'null');
    if (!currentSession.user || !currentSession.expires_in) {
      console.log('AuthContext: No user or expires_in in session, skipping session creation.');
      return;
    }

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

    const profile = await ProfileService.fetchProfile(currentSession.user.id);
    const isCurrentUserAdmin = profile?.role === 'admin';
    console.log('AuthContext: User role:', profile?.role);

    if (!isCurrentUserAdmin) {
      console.log('AuthContext: User is not admin, checking concurrent sessions.');
      await SessionService.deleteOldestSessions(currentSession.user.id, MAX_CONCURRENT_SESSIONS);
    }

    const createdSession = await SessionService.createSession(currentSession, currentSessionId);
    if (createdSession) {
      console.log('AuthContext: Session created successfully.');
    } else {
      console.error('AuthContext: Failed to create session (error handled by SessionService).');
      // The error message is already displayed by SessionService.handleError
      // No need to call handleError again here with a generic message.
    }
  }, [handleError]);

  const handleSessionDeletion = useCallback(async (userId: string | undefined) => {
    console.log('AuthContext: handleSessionDeletion called.');
    const currentSessionId = localStorage.getItem('wpw_session_id');

    if (currentSessionId) {
      console.log('AuthContext: Deleting specific session ID:', currentSessionId);
      // Pass userId to SessionService.deleteSession for RLS
      await SessionService.deleteSession(userId, currentSessionId);
      localStorage.removeItem('wpw_session_id');
    } else {
      console.log('AuthContext: No specific session ID found in localStorage to delete.');
    }

    if (userId) { // This is for a full user logout, deleting all their sessions
      console.log('AuthContext: Deleting all sessions for user:', userId);
      await SessionService.deleteAllSessionsForUser(userId);
    }
    console.log('AuthContext: Session(s) deleted and removed from localStorage.');
  }, []); // Removed handleError from dependencies as it's not directly used here

  // Effect for setting up auth state listener
  useEffect(() => {
    console.log('AuthContext: useEffect for onAuthStateChange listener triggered.');

    // Set a timeout for initial authentication loading
    authTimeoutRef.current = setTimeout(() => {
      if (loading && isMountedRef.current) {
        console.warn(`AuthContext: Authentication initialization timed out after ${AUTH_INITIALIZATION_TIMEOUT}ms. Setting loading to false.`);
        setLoading(false);
        setError(new AuthError('Authentication initialization timed out. Please check your network connection or try again.'));
      }
    }, AUTH_INITIALIZATION_TIMEOUT);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, currentSession: Session | null) => {
        console.log(`AuthContext: onAuthStateChange callback fired. Event: ${_event}, Session: ${currentSession ? 'present' : 'null'}`);
        
        // Clear the timeout if the auth state changes
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }

        // Capture the user ID before state updates if it's a SIGNED_OUT event
        const userIdBeforeSignOut = user?.id;

        if (isMountedRef.current) {
          setSession(currentSession);
          setUser(currentSession?.user || null);
          setError(null); // Clear any previous errors on auth state change
          console.log(`AuthContext: Setting loading to false. User: ${currentSession?.user ? 'present' : 'null'}`);
          setLoading(false); // Set loading to false once the initial session is processed

          if (currentSession) {
            await handleSessionCreation(currentSession);
          } else if (_event === 'SIGNED_OUT') {
            // Issue 6: Pass the user ID that just signed out for cleanup
            await handleSessionDeletion(userIdBeforeSignOut); // sessionId is not relevant for deleteAllSessionsForUser
          } else {
            // For other null session events (e.g., INITIAL_SESSION with no user)
            await handleSessionDeletion(undefined);
          }
        }
      }
    );

    return () => {
      console.log('AuthContext: Cleanup function for auth state listener. Unsubscribing.');
      subscription.unsubscribe();
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
    };
  }, [handleSessionCreation, handleSessionDeletion, user]); // Issue 5: Include user in dependencies

  const signUp = async (email: string, password: string) => {
    setError(null);
    const { data, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) {
      handleError(authError, authError.message);
      return { error: authError };
    }
    toast.success('Signup successful! Please check your email to confirm your account.');
    return { data };
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      handleError(authError, authError.message);
      return { error: authError };
    }
    toast.success('Logged in successfully!');
    return { data };
  };

  const signOut = async () => {
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signOut();
      if (authError) {
        if (authError.message.includes('Auth session missing') || authError.message.includes('Invalid session')) {
          console.warn('Supabase signOut: Session already missing or invalid on server. Proceeding with local logout.');
          toast.success('Logged out successfully!');
          setSession(null);
          setUser(null);
          setLoading(false);
          // No need to call handleSessionDeletion here, onAuthStateChange will handle it
          return { success: true };
        }
        handleError(authError, authError.message);
        return { success: false, error: authError };
      }
      toast.success('Logged out successfully!');
      setSession(null);
      setUser(null);
      setLoading(false);
      // No need to call handleSessionDeletion here, onAuthStateChange will handle it
      return { success: true };
    } catch (e: any) {
      handleError(e, e.message || 'An unexpected error occurred during logout.');
      return { success: false, error: e };
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