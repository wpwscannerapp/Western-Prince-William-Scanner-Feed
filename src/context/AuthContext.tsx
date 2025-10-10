import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthChangeEvent, Session, User, AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { SessionService } from '@/services/SessionService';
import { MAX_CONCURRENT_SESSIONS } from '@/config';
import { ProfileService } from '@/services/ProfileService';

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

  const SESSION_ID_KEY = 'wpw_session_id';

  console.log('AuthProvider: Rendering...');

  const handleSessionCreation = useCallback(async (currentSession: Session) => {
    console.log('handleSessionCreation: Called with session:', currentSession ? 'present' : 'null');
    if (!currentSession.user || !currentSession.expires_in) {
      console.log('handleSessionCreation: No user or expires_in, skipping session creation.');
      return;
    }

    const currentSessionId = localStorage.getItem(SESSION_ID_KEY);
    let newSessionId = currentSessionId;

    if (!newSessionId) {
      newSessionId = crypto.randomUUID();
      localStorage.setItem(SESSION_ID_KEY, newSessionId);
      console.log('handleSessionCreation: Generated new session ID:', newSessionId);
    } else {
      console.log('handleSessionCreation: Found existing session ID:', newSessionId);
    }

    const isValid = await SessionService.isValidSession(currentSession.user.id, newSessionId);
    if (isValid) {
      console.log('handleSessionCreation: Session is already valid, no action needed.');
      return;
    }

    const profile = await ProfileService.fetchProfile(currentSession.user.id);
    const isCurrentUserAdmin = profile?.role === 'admin';
    console.log('handleSessionCreation: User role:', profile?.role);

    if (!isCurrentUserAdmin) {
      console.log('handleSessionCreation: User is not admin, checking concurrent sessions.');
      await SessionService.deleteOldestSessions(currentSession.user.id, MAX_CONCURRENT_SESSIONS);
    }

    const createdSession = await SessionService.createSession(currentSession.user.id, newSessionId, currentSession.expires_in);
    if (createdSession) {
      console.log('handleSessionCreation: Session created successfully.');
    } else {
      console.error('handleSessionCreation: Failed to create session.');
    }
  }, []);

  const handleSessionDeletion = useCallback(async () => {
    console.log('handleSessionDeletion: Called.');
    const currentSessionId = localStorage.getItem(SESSION_ID_KEY);
    if (currentSessionId) {
      console.log('handleSessionDeletion: Deleting session ID:', currentSessionId);
      await SessionService.deleteSession(currentSessionId);
      localStorage.removeItem(SESSION_ID_KEY);
      console.log('handleSessionDeletion: Session deleted and removed from localStorage.');
    } else {
      console.log('handleSessionDeletion: No session ID found in localStorage to delete.');
    }
  }, []);

  useEffect(() => {
    console.log('AuthProvider: Mounted. Initializing auth state listener...');

    const getInitialSession = async () => {
      console.log('AuthProvider: getInitialSession started.');
      try {
        const { data: { session: initialSession }, error: initialError } = await supabase.auth.getSession();
        console.log('AuthProvider: getInitialSession result:', initialSession ? 'present' : 'null', 'Error:', initialError);
        if (initialError) {
          setError(initialError);
          console.error('AuthProvider: Error fetching initial session:', initialError);
        }
        setSession(initialSession);
        setUser(initialSession?.user || null);
        if (initialSession) {
          await handleSessionCreation(initialSession);
        } else {
          await handleSessionDeletion();
        }
      } catch (err: any) {
        console.error('AuthProvider: Unexpected error in getInitialSession:', err);
        setError(err);
      } finally {
        setLoading(false); // Ensure loading is always set to false after initial check
        console.log(`AuthProvider: getInitialSession finished. Loading set to false. User: ${user ? 'present' : 'null'}`);
      }
    };

    getInitialSession(); // Call it immediately on mount

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, currentSession: Session | null) => {
        console.log(`AuthProvider: onAuthStateChange event: ${_event}, session: ${currentSession ? 'present' : 'null'}`);
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setError(null); // Clear any previous errors on auth state change

        if (currentSession) {
          await handleSessionCreation(currentSession);
        } else {
          await handleSessionDeletion();
        }
        setLoading(false); // Ensure loading is false after any auth state change
        console.log(`AuthProvider: onAuthStateChange finished. Loading set to false. User: ${user ? 'present' : 'null'}`);
      }
    );

    return () => {
      console.log('AuthProvider: Unmounting. Unsubscribing from auth state changes.');
      subscription.unsubscribe();
    };
  }, [handleSessionCreation, handleSessionDeletion]); // Removed `user` from dependencies

  useEffect(() => {
    console.log('AuthProvider: Current loading state:', loading);
  }, [loading]);

  const signUp = async (email: string, password: string) => {
    setError(null);
    const { data, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) {
      setError(authError);
      toast.error(authError.message);
      return { error: authError };
    }
    toast.success('Signup successful! Please check your email to confirm your account.');
    return { data };
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError);
      toast.error(authError.message);
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
          await handleSessionDeletion();
          return { success: true };
        }
        setError(authError);
        toast.error(authError.message);
        return { success: false, error: authError };
      }
      toast.success('Logged out successfully!');
      setSession(null);
      setUser(null);
      setLoading(false);
      await handleSessionDeletion();
      return { success: true };
    } catch (e: any) {
      setError(e);
      toast.error(e.message || 'An unexpected error occurred during logout.');
      return { success: false, error: e };
    }
  };

  const forgotPassword = async (email: string) => {
    setError(null);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.VITE_APP_URL}/reset-password`,
    });
    if (authError) {
      setError(authError);
      toast.error(authError.message);
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