import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthChangeEvent, Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SessionService } from '@/services/SessionService';
import { MAX_CONCURRENT_SESSIONS } from '@/config';
import { ProfileService } from '@/services/ProfileService';
import { handleError as globalHandleError } from '@/utils/errorHandler';
import { useQueryClient } from '@tanstack/react-query';

export interface AuthContextType {
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const isMountedRef = useRef(true);
  const userRef = useRef<User | null>(null); // To hold the user ID for cleanup after logout
  const queryClient = useQueryClient();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    userRef.current = user; // Keep userRef updated with the latest user object
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
    if (!currentSession.user || !currentSession.expires_in || !currentSession.id) {
      console.log('AuthContext: No user, expires_in, or session ID in session, skipping session creation.');
      return;
    }
    console.log('AuthContext: User ID for session creation:', currentSession.user.id);
    console.log('AuthContext: Supabase Session ID:', currentSession.id);
    console.log('AuthContext: Access Token present:', !!currentSession.access_token);

    // Use the Supabase session ID directly for database tracking
    const supabaseSessionId = currentSession.id;

    const isValid = await SessionService.isValidSession(currentSession.user.id, supabaseSessionId);
    if (isValid) {
      console.log('AuthContext: Database session record is already valid, no action needed.');
      return;
    }

    try {
      const profile = await ProfileService.fetchProfile(currentSession.user.id, currentSession); // Pass session here too
      const isCurrentUserAdmin = profile?.role === 'admin';
      console.log('AuthContext: User role:', profile?.role);

      if (!isCurrentUserAdmin) {
        console.log('AuthContext: User is not admin, checking concurrent sessions.');
        await SessionService.deleteOldestSessions(currentSession.user.id, MAX_CONCURRENT_SESSIONS);
      }

      const createdSession = await SessionService.createSession(currentSession, supabaseSessionId);
      if (createdSession) {
        console.log('AuthContext: Database session record created successfully.');
      } else {
        console.error('AuthContext: Failed to create database session record (error handled by SessionService).');
      }
    } catch (err) {
      console.error('AuthContext: Error during session management:', (err as Error).message);
      handleError(err, 'Failed to manage user session.');
    }
    console.log('AuthContext: handleSessionCreation finished.');
  }, [queryClient]);

  const handleSessionDeletion = useCallback(async (userIdToDelete?: string, supabaseSessionIdToDelete?: string) => {
    console.log('AuthContext: handleSessionDeletion called.');
    if (userIdToDelete && supabaseSessionIdToDelete) {
      console.log('AuthContext: Deleting specific database session record for user:', userIdToDelete, 'session ID:', supabaseSessionIdToDelete);
      await SessionService.deleteSession(userIdToDelete, supabaseSessionIdToDelete);
    } else if (userIdToDelete) {
      console.log('AuthContext: Deleting all database session records for user:', userIdToDelete);
      await SessionService.deleteAllSessionsForUser(userIdToDelete);
    } else {
      console.log('AuthContext: No user ID or session ID provided for database session deletion.');
    }
    // Invalidate profile query after session deletion
    queryClient.invalidateQueries({ queryKey: ['profile', userIdToDelete] });
    console.log('AuthContext: Database session record(s) deleted. Profile cache invalidated.');
  }, [queryClient]);

  useEffect(() => {
    console.log('AuthContext: Setting up onAuthStateChange listener.');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, currentSession: Session | null) => {
        console.log(`AuthContext: onAuthStateChange event: ${_event}, session: ${currentSession ? 'present' : 'null'}`);
        if (isMountedRef.current) {
          setSession(currentSession);
          setUser(currentSession?.user || null);
          setError(null); // Clear any previous errors on auth state change
          setLoading(false);
          setAuthReady(true); // Auth is ready once we've processed the first session event
          console.log(`AuthContext: Auth state changed. Loading set to false. AuthReady set to true. User: ${currentSession?.user ? 'present' : 'null'}`);

          if (currentSession) {
            await handleSessionCreation(currentSession);
          } else {
            // Pass the user ID that was *just* logged out, and the session ID if available
            await handleSessionDeletion(userRef.current?.id, userRef.current?.aud === 'authenticated' ? session?.id : undefined);
          }
        }
      }
    );

    // Cleanup function: unsubscribe when the component unmounts or the effect re-runs
    return () => {
      console.log('AuthContext: Cleaning up onAuthStateChange listener.');
      subscription.unsubscribe();
    };
  }, [handleSessionCreation, handleSessionDeletion, session?.id]); // Add session.id to dependencies

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
          await handleSessionDeletion(userRef.current?.id, session?.id); // Pass session.id here
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
      await handleSessionDeletion(userRef.current?.id, session?.id); // Pass session.id here
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