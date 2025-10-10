import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthChangeEvent, Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SessionService } from '@/services/SessionService';
import { MAX_CONCURRENT_SESSIONS } from '@/config';
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

  // Ref to ensure initial session check runs only once per component instance
  const initialSessionCheckCompleted = useRef(false); // Renamed for clarity

  useEffect(() => {
    mountCountRef.current += 1;
    console.log(`AuthContext: Mounting AuthProvider (mount count: ${mountCountRef.current})`);
    return () => {
      isMountedRef.current = false;
      console.log(`AuthContext: Unmounting AuthProvider (mount count: ${mountCountRef.current})`);
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
      console.error('AuthContext: Failed to create session.');
      handleError(new Error('Failed to create session record.'), 'Failed to create session record.');
    }
  }, [handleError]);

  const handleSessionDeletion = useCallback(async (userIdToDelete?: string) => {
    console.log('AuthContext: handleSessionDeletion called.');
    const currentSessionId = localStorage.getItem('wpw_session_id');
    if (currentSessionId) {
      console.log('AuthContext: Deleting specific session ID:', currentSessionId);
      await SessionService.deleteSession(currentSessionId);
      localStorage.removeItem('wpw_session_id');
    } else {
      console.log('AuthContext: No specific session ID found in localStorage to delete.');
    }

    if (userIdToDelete) {
      console.log('AuthContext: Deleting all sessions for user:', userIdToDelete);
      await SessionService.deleteAllSessionsForUser(userIdToDelete);
    }
    console.log('AuthContext: Session(s) deleted and removed from localStorage.');
  }, [handleError]);

  // Effect for initial session check and setting up auth state listener
  useEffect(() => {
    // This effect runs twice in Strict Mode, but initialSessionCheckCompleted ref ensures logic runs once per "mount"
    if (initialSessionCheckCompleted.current) {
      console.log('AuthContext: Skipping initial session check on Strict Mode remount.');
      return;
    }
    initialSessionCheckCompleted.current = true; // Mark as checked for this instance

    console.log('AuthContext: Performing initial session check and setting up listener.');

    const getInitialSessionAndSetupListener = async () => {
      try {
        // 1. Get initial session
        const { data: { session: initialSession }, error: initialError } = await supabase.auth.getSession();
        if (isMountedRef.current) {
          setSession(initialSession);
          setUser(initialSession?.user || null);
          setError(initialError);
          setLoading(false); // Set loading to false after initial check
          console.log(`AuthContext: Initial getSession finished. Loading set to false. User: ${initialSession?.user ? 'present' : 'null'}`);

          if (initialSession) {
            await handleSessionCreation(initialSession);
          } else {
            await handleSessionDeletion(undefined);
          }
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          handleError(err, 'Failed to retrieve initial session.');
          setLoading(false); // Ensure loading is false even on error
        }
      }

      // 2. Set up the real-time auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event: AuthChangeEvent, currentSession: Session | null) => {
          console.log(`AuthContext: onAuthStateChange event: ${_event}, session: ${currentSession ? 'present' : 'null'}`);
          if (isMountedRef.current) {
            setSession(currentSession);
            setUser(currentSession?.user || null);
            setError(null); // Clear error on any new auth state change
            // Do NOT set loading here, it was already set to false after initial getSession
            console.log(`AuthContext: Auth state changed. User: ${currentSession?.user ? 'present' : 'null'}`);

            if (currentSession) {
              await handleSessionCreation(currentSession);
            } else {
              await handleSessionDeletion(undefined);
            }
          }
        }
      );

      return () => {
        console.log('AuthContext: Cleanup function for auth state listener.');
        if (subscription) {
          console.log('AuthContext: Unsubscribing from auth state changes');
          subscription.unsubscribe();
        }
      };
    };

    getInitialSessionAndSetupListener();

  }, [handleSessionCreation, handleSessionDeletion, handleError]); // Dependencies for callbacks

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
          setLoading(false); // Ensure loading is false on local logout
          await handleSessionDeletion(user?.id);
          return { success: true };
        }
        handleError(authError, authError.message);
        return { success: false, error: authError };
      }
      toast.success('Logged out successfully!');
      setSession(null);
      setUser(null);
      setLoading(false); // Ensure loading is false on successful logout
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