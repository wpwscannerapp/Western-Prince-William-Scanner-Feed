import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthChangeEvent, Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SessionService } from '@/services/SessionService';
import { MAX_CONCURRENT_SESSIONS, AUTH_INITIALIZATION_TIMEOUT } from '@/config';
import { ProfileService } from '@/services/ProfileService';
import { handleError as globalHandleError } from '@/utils/errorHandler';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  authReady: boolean;
  signUp: (email: string, password: string) => Promise<{ data?: any; error?: AuthError }>;
  signIn: (email: string, password: string) => Promise<{ data?: any; error?: AuthError }>;
  signOut: () => Promise<{ success: boolean; error?: AuthError }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: AuthError }>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('AuthContext.tsx: AuthProvider rendering');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const isMountedRef = useRef(true);
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
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

    const profile = await ProfileService.fetchProfile(currentSession.user.id);
    const isCurrentUserAdmin = profile?.role === 'admin';

    if (!isCurrentUserAdmin) {
      await SessionService.deleteOldestSessions(currentSession.user.id, MAX_CONCURRENT_SESSIONS);
    }

    await SessionService.createSession(currentSession, currentSessionId);
  }, [handleError]);

  const handleSessionDeletion = useCallback(async (userId: string | undefined) => {
    const currentSessionId = localStorage.getItem('wpw_session_id');

    if (currentSessionId) {
      await SessionService.deleteSession(userId, currentSessionId);
      localStorage.removeItem('wpw_session_id');
    }

    if (userId) {
      await SessionService.deleteAllSessionsForUser(userId);
    }
  }, []);

  // Effect for initial session fetch and setting up the listener
  useEffect(() => {
    const setupAuth = async () => {
      authTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && loading) {
          setLoading(false);
          setAuthReady(true);
          setError(new AuthError('Authentication initialization timed out. Please check your network connection or try again.'));
        }
      }, AUTH_INITIALIZATION_TIMEOUT);

      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        if (isMountedRef.current) {
          setSession(initialSession);
          setUser(initialSession?.user || null);
          setError(sessionError);
          setLoading(false);
          setAuthReady(true);

          if (initialSession) {
            await handleSessionCreation(initialSession);
          }
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(new AuthError(err.message || 'Failed to get initial session.'));
          setLoading(false);
          setAuthReady(true);
        }
        globalHandleError(err, 'An unexpected error occurred during initial session check.');
      } finally {
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }
      }
    };

    setupAuth();

    // Set up the onAuthStateChange listener for subsequent events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, currentSession: Session | null) => {
        // Clear the initial timeout if it's still active, as a state change has occurred
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }

        const userIdBeforeSignOut = (await supabase.auth.getUser()).data.user?.id;

        if (isMountedRef.current) {
          setSession(currentSession);
          setUser(currentSession?.user || null);
          setError(null);
          setLoading(false);
          setAuthReady(true);

          if (currentSession) {
            await handleSessionCreation(currentSession);
          } else if (_event === 'SIGNED_OUT') {
            await handleSessionDeletion(userIdBeforeSignOut);
          } else {
            await handleSessionDeletion(undefined);
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
  }, [handleSessionCreation, handleSessionDeletion]); // Removed 'loading' from dependencies

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
          toast.success('Logged out successfully!');
          setSession(null);
          setUser(null);
          setLoading(false);
          setAuthReady(true);
          return { success: true };
        }
        handleError(authError, authError.message);
        return { success: false, error: authError };
      }
      toast.success('Logged out successfully!');
      setSession(null);
      setUser(null);
      setLoading(false);
      setAuthReady(true);
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
    authReady,
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