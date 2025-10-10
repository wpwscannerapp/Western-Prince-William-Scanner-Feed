import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthChangeEvent, Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SessionService } from '@/services/SessionService';
import { MAX_CONCURRENT_SESSIONS } from '@/config';
import { ProfileService } from '@/services/ProfileService';
import { handleError as globalHandleError } from '@/utils/errorHandler'; // Renamed to avoid conflict

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const subscriptionRef = useRef<any>(null); // Track Supabase subscription
  const isMountedRef = useRef(true); // Track component mount state
  const mountCountRef = useRef(0); // For debugging mount/unmount cycles

  const SESSION_ID_KEY = 'wpw_session_id';

  useEffect(() => {
    mountCountRef.current += 1;
    console.log(`AuthContext: Mounting AuthProvider (mount count: ${mountCountRef.current})`);
    return () => {
      isMountedRef.current = false; // Set to false on unmount
      console.log(`AuthContext: Unmounting AuthProvider (mount count: ${mountCountRef.current})`);
    };
  }, []);

  const handleError = useCallback((err: any, defaultMessage: string) => {
    const authError = err instanceof AuthError ? err : new AuthError(err.message || defaultMessage, err.name);
    if (isMountedRef.current) {
      setError(authError);
    }
    globalHandleError(authError, defaultMessage); // Use the global error handler with toast
    return authError;
  }, []);

  const handleSessionCreation = useCallback(async (currentSession: Session) => {
    console.log('AuthContext: handleSessionCreation called with session:', currentSession ? 'present' : 'null');
    if (!currentSession.user || !currentSession.expires_in) {
      console.log('AuthContext: No user or expires_in in session, skipping session creation.');
      return;
    }

    let currentSessionId = localStorage.getItem(SESSION_ID_KEY);
    if (!currentSessionId) {
      currentSessionId = crypto.randomUUID();
      localStorage.setItem(SESSION_ID_KEY, currentSessionId);
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
      console.error('AuthContext: Failed to create session.');
      handleError(new Error('Failed to create session record.'), 'Failed to create session record.');
    }
  }, [handleError]);

  const handleSessionDeletion = useCallback(async (userIdToDelete?: string) => {
    console.log('AuthContext: handleSessionDeletion called.');
    const currentSessionId = localStorage.getItem(SESSION_ID_KEY);
    if (currentSessionId) {
      console.log('AuthContext: Deleting specific session ID:', currentSessionId);
      await SessionService.deleteSession(currentSessionId);
      localStorage.removeItem(SESSION_ID_KEY);
    } else {
      console.log('AuthContext: No specific session ID found in localStorage to delete.');
    }

    // If a userId is provided, also clean up any other sessions for that user
    if (userIdToDelete) {
      console.log('AuthContext: Deleting all sessions for user:', userIdToDelete);
      await SessionService.deleteAllSessionsForUser(userIdToDelete);
    }
    console.log('AuthContext: Session(s) deleted and removed from localStorage.');
  }, [handleError]);

  useEffect(() => {
    console.log('AuthContext: useEffect for auth state listener started.');

    const getInitialSession = async () => {
      console.log('AuthContext: getInitialSession started.');
      let initialSession: Session | null = null;
      try {
        const { data: { session: fetchedSession }, error: initialError } = await supabase.auth.getSession();
        initialSession = fetchedSession;
        console.log('AuthContext: getInitialSession result:', initialSession ? 'present' : 'null', 'Error:', initialError);
        if (initialError) {
          handleError(initialError, 'Error fetching initial session.');
        }
        setSession(initialSession);
        setUser(initialSession?.user || null);
        if (initialSession) {
          await handleSessionCreation(initialSession);
        } else {
          await handleSessionDeletion(undefined);
        }
      } catch (err: any) {
        console.error('AuthContext: Unexpected error in getInitialSession:', err);
        handleError(err, 'Unexpected error during session initialization.');
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          console.log(`AuthContext: getInitialSession finished. Loading set to false. User: ${initialSession?.user ? 'present' : 'null'}`);
        }
      }
    };

    if (!subscriptionRef.current) {
      getInitialSession();

      console.log('AuthContext: Setting up onAuthStateChange listener');
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event: AuthChangeEvent, currentSession: Session | null) => {
          console.log(`AuthContext: onAuthStateChange event: ${_event}, session: ${currentSession ? 'present' : 'null'}`);
          setSession(currentSession);
          setUser(currentSession?.user || null);
          setError(null); // Clear any previous errors on auth state change

          if (currentSession) {
            await handleSessionCreation(currentSession);
          } else {
            await handleSessionDeletion(undefined);
          }
          if (isMountedRef.current) {
            setLoading(false);
            console.log(`AuthContext: onAuthStateChange finished. Loading set to false. User: ${currentSession?.user ? 'present' : 'null'}`);
          }
        }
      );
      subscriptionRef.current = subscription;
    }

    return () => {
      console.log('AuthContext: Cleanup function for auth state listener.');
      if (subscriptionRef.current) {
        console.log('AuthContext: Unsubscribing from auth state changes');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [handleSessionCreation, handleSessionDeletion, handleError]); // Dependencies are stable

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
          await handleSessionDeletion(user?.id);
          return { success: true };
        }
        handleError(authError, authError.message);
        return { success: false, error: authError };
      }
      toast.success('Logged out successfully!');
      setSession(null);
      setUser(null);
      setLoading(false);
      await handleSessionDeletion(user?.id);
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