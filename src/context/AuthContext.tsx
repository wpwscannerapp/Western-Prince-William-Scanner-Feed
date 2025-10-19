import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthChangeEvent, Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SessionService } from '@/services/SessionService';
import { MAX_CONCURRENT_SESSIONS } from '@/config';
import { ProfileService } from '@/services/ProfileService';
import { handleError as globalHandleError } from '@/utils/errorHandler';
import { useQueryClient } from '@tanstack/react-query';

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
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const isMountedRef = useRef(true);
  const userRef = useRef<User | null>(null);
  const authListenerRef = useRef<any>(null); // Ref to hold the Supabase auth subscription
  const queryClient = useQueryClient();

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Ensure the listener is unsubscribed only once when the component truly unmounts
      if (authListenerRef.current) {
        authListenerRef.current.unsubscribe();
        authListenerRef.current = null;
        console.log('AuthContext: Cleanup function for auth state listener. Unsubscribed.');
      }
    };
  }, []);

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

    try {
      const profileEnsured = await ProfileService.ensureProfileExists(currentSession.user.id);
      if (!profileEnsured) {
        console.error('AuthContext: Failed to ensure profile exists for user. Aborting session creation.');
        return;
      }
    } catch (err) {
      console.error('AuthContext: Error during ensureProfileExists:', (err as Error).message);
      handleError(err, 'Failed to ensure user profile exists.');
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

    try {
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
      }
    } catch (err) {
      console.error('AuthContext: Error during session management:', (err as Error).message);
      handleError(err, 'Failed to manage user session.');
    }
    console.log('AuthContext: handleSessionCreation finished.');
  }, [queryClient]);

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
    // Only set up the listener once
    if (!authListenerRef.current) {
      console.log('AuthContext: Setting up onAuthStateChange listener for the first time.');

      // Initial session check
      supabase.auth.getSession().then(async ({ data: { session: initialSession }, error: initialError }) => {
        console.log('AuthContext: Initial session fetch completed.', { session: !!initialSession, user: initialSession?.user ?? null, error: initialError?.message });
        if (isMountedRef.current) {
          setSession(initialSession);
          setUser(initialSession?.user || null);
          setError(initialError);
          setLoading(false);
          setAuthReady(true);
          console.log(`AuthContext: Initial state set. Loading: false, AuthReady: true. User: ${initialSession?.user ? 'present' : 'null'}`);

          if (initialSession) {
            await handleSessionCreation(initialSession);
          } else {
            await handleSessionDeletion(userRef.current?.id);
          }
        }
      });

      authListenerRef.current = supabase.auth.onAuthStateChange(
        async (_event: AuthChangeEvent, currentSession: Session | null) => {
          console.log(`AuthContext: onAuthStateChange event: ${_event}, session: ${currentSession ? 'present' : 'null'}`);
          if (isMountedRef.current) {
            setSession(currentSession);
            setUser(currentSession?.user || null);
            setError(null);
            setLoading(false);
            setAuthReady(true);
            console.log(`AuthContext: Auth state changed. Loading set to false. AuthReady set to true. User: ${currentSession?.user ? 'present' : 'null'}`);

            if (currentSession) {
              await handleSessionCreation(currentSession);
            } else {
              await handleSessionDeletion(userRef.current?.id);
            }
          }
        }
      ).data.subscription;
    }

    // The cleanup function for this useEffect will now only run once when the component truly unmounts
    // and will unsubscribe the listener via the ref.
    return () => {
      // No need to unsubscribe here, as it's handled in the outer useEffect's cleanup
    };
  }, [handleSessionCreation, handleSessionDeletion]);

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
          setAuthReady(true);
          await handleSessionDeletion(userRef.current?.id);
          queryClient.invalidateQueries({ queryKey: ['profile'] });
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
      await handleSessionDeletion(userRef.current?.id);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
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