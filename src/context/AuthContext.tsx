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

  // Log AuthProvider mount
  console.log('AuthProvider: Rendering...');

  const handleSessionCreation = useCallback(async (currentSession: Session) => {
    if (!currentSession.user || !currentSession.expires_in) return;

    const currentSessionId = localStorage.getItem(SESSION_ID_KEY);
    let newSessionId = currentSessionId;

    if (!newSessionId) {
      newSessionId = crypto.randomUUID();
      localStorage.setItem(SESSION_ID_KEY, newSessionId);
    }

    const isValid = await SessionService.isValidSession(currentSession.user.id, newSessionId);
    if (isValid) {
      return;
    }

    const profile = await ProfileService.fetchProfile(currentSession.user.id);
    const isCurrentUserAdmin = profile?.role === 'admin';

    if (!isCurrentUserAdmin) {
      await SessionService.deleteOldestSessions(currentSession.user.id, MAX_CONCURRENT_SESSIONS);
    }

    await SessionService.createSession(currentSession.user.id, newSessionId, currentSession.expires_in);
  }, []);

  const handleSessionDeletion = useCallback(async () => {
    const currentSessionId = localStorage.getItem(SESSION_ID_KEY);
    if (currentSessionId) {
      await SessionService.deleteSession(currentSessionId);
      localStorage.removeItem(SESSION_ID_KEY);
    }
  }, []);

  useEffect(() => {
    console.log('AuthProvider: Mounted. Initializing auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, currentSession: Session | null) => {
        console.log(`AuthProvider: onAuthStateChange event: ${_event} session: ${currentSession ? 'present' : 'null'}`);
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setError(null);
        setLoading(false); // Always set loading to false after the first auth state change
        console.log(`AuthProvider: State after onAuthStateChange: loading=${false}, user=${currentSession?.user ? 'present' : 'null'}`);


        if (currentSession) {
          await handleSessionCreation(currentSession);
        } else {
          await handleSessionDeletion();
        }
      }
    );

    return () => {
      console.log('AuthProvider: Unmounting. Unsubscribing from auth state changes.');
      subscription.unsubscribe();
    };
  }, [handleSessionCreation, handleSessionDeletion]); // Dependencies for useCallback functions

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