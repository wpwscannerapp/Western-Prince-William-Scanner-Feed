console.log('AuthContext.tsx: Module loaded.'); // Added for debugging
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthChangeEvent, Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SessionService } from '@/services/SessionService';
import { MAX_CONCURRENT_SESSIONS, AUTH_INITIALIZATION_TIMEOUT } from '@/config';
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
  const userRef = useRef<User | null>(null); // To hold the user ID for cleanup after logout
  const queryClient = useQueryClient();
  const authTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Ref for the timeout

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
    if (!currentSession.user || !currentSession.expires_in) {
      console.log('AuthContext: No user or expires_in in session, skipping session creation.');
      return;
    }
    console.log('AuthContext: User ID for session creation:', currentSession.user.id);
    console.log('AuthContext: Access Token present:', !!currentSession.access_token);

    try {
      // Pass the currentSession to ensureProfileExists
      const profileEnsured = await ProfileService.ensureProfileExists(currentSession.user.id, currentSession);
      if (!profileEnsured) {
        console.error('AuthContext: Failed to ensure profile exists for user. Aborting session creation and further profile fetching.');
        // If profile is not ensured, we cannot proceed with session management that relies on profile data.
        // This might indicate a critical issue with the handle_new_user trigger.
        return;
      }
      // Invalidate profile query after ensuring it exists, so other hooks refetch
      queryClient.invalidateQueries({ queryKey: ['profile', currentSession.user.id] });

      // Fetch the profile immediately after ensuring it exists
      const profile = await ProfileService.fetchProfile(currentSession.user.id, currentSession);
      if (profile) {
        // Manually set the profile data in the cache
        queryClient.setQueryData(['profile', currentSession.user.id], profile);
        console.log('AuthContext: Profile data set in cache:', profile);
      } else {
        console.warn('AuthContext: Failed to fetch profile after ensuring existence.');
      }

    } catch (err) {
      console.error('AuthContext: Error during ensureProfileExists/fetchProfile:', (err as Error).message);
      handleError(err, 'Failed to ensure user profile exists or fetch it.');
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
      const profile = await ProfileService.fetchProfile(currentSession.user.id, currentSession); // Pass session here too
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
    // Invalidate profile query after session deletion
    queryClient.invalidateQueries({ queryKey: ['profile', userIdToDelete] });
    console.log('AuthContext: Session(s) deleted and removed from localStorage. Profile cache invalidated.');
  }, [queryClient]);

  useEffect(() => {
    console.log('AuthContext: Setting up onAuthStateChange listener.');

    // Set a timeout for auth initialization
    authTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && !authReady) {
        console.warn(`AuthContext: Auth initialization timed out after ${AUTH_INITIALIZATION_TIMEOUT}ms. Forcing authReady to true.`);
        setAuthReady(true);
        setLoading(false);
        setError(new AuthError('Authentication initialization timed out.'));
      }
    }, AUTH_INITIALIZATION_TIMEOUT);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, currentSession: Session | null) => {
        console.log(`AuthContext: onAuthStateChange event: ${_event}, session: ${currentSession ? 'present' : 'null'}`);
        if (isMountedRef.current) {
          // Clear the timeout if an auth event is received
          if (authTimeoutRef.current) {
            clearTimeout(authTimeoutRef.current);
            authTimeoutRef.current = null;
          }

          setSession(currentSession);
          setUser(currentSession?.user || null);
          setError(null); // Clear any previous errors on auth state change
          
          if (currentSession) {
            await handleSessionCreation(currentSession); // Wait for profile to be fetched and cached
          } else {
            // Pass the user ID that was *just* logged out, if available from userRef
            await handleSessionDeletion(userRef.current?.id);
          }

          // Move these state updates AFTER handleSessionCreation/Deletion
          setLoading(false);
          setAuthReady(true);
          console.log(`AuthContext: Auth state changed. Loading set to false. AuthReady set to true. User: ${currentSession?.user ? 'present' : 'null'}`);
        }
      }
    );

    // Cleanup function: unsubscribe when the component unmounts or the effect re-runs
    return () => {
      console.log('AuthContext: Cleaning up onAuthStateChange listener.');
      subscription.unsubscribe();
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
    };
  }, [handleSessionCreation, handleSessionDeletion]); // Removed authReady from dependencies

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
    return { success: true }; // Corrected return type
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