import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthChangeEvent, Session, User, AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { SessionService } from '@/services/SessionService';
import { MAX_CONCURRENT_SESSIONS } from '@/config';
import { ProfileService } from '@/services/ProfileService'; // Import ProfileService

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: AuthError | null;
}

const SESSION_ID_KEY = 'wpw_session_id';

export function useAuth() {
  const [authState, setAuthState] = React.useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    error: null,
  });

  // Function to handle session creation and cleanup
  const handleSessionCreation = React.useCallback(async (session: Session) => {
    if (!session.user || !session.expires_in) return;

    // Always generate a new, unique session ID for this browser instance
    const newSessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_ID_KEY, newSessionId);

    // Fetch user profile to check role
    const profile = await ProfileService.fetchProfile(session.user.id);
    const isCurrentUserAdmin = profile?.role === 'admin';

    // Delete all existing sessions for this user to ensure a clean slate
    // This is crucial to prevent duplicate key errors on 'session_id' if an old entry exists
    await SessionService.deleteAllSessionsForUser(session.user.id);

    // Create a new session record with the newly generated ID
    await SessionService.createSession(session.user.id, newSessionId, session.expires_in);

    if (!isCurrentUserAdmin) {
      // After creating the new session, enforce the concurrent session limit for non-admin users
      await SessionService.deleteOldestSessions(session.user.id, MAX_CONCURRENT_SESSIONS);
    }
  }, []);

  // Function to handle session deletion
  const handleSessionDeletion = React.useCallback(async () => {
    const currentSessionId = localStorage.getItem(SESSION_ID_KEY);
    if (currentSessionId) {
      await SessionService.deleteSession(currentSessionId); // Delete only the specific session
      localStorage.removeItem(SESSION_ID_KEY);
    }
  }, []);

  React.useEffect(() => {
    console.log('useAuth: Initializing auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        console.log('useAuth: onAuthStateChange event:', _event, 'session:', session ? 'present' : 'null');
        setAuthState({ session, user: session?.user || null, loading: false, error: null });

        if (session) {
          // Only trigger session creation logic on actual sign-in or user update events
          // This prevents creating new sessions on every page load if the session is already valid
          if (_event === 'SIGNED_IN' || _event === 'USER_UPDATED') {
            await handleSessionCreation(session);
          }
        } else {
          await handleSessionDeletion();
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('useAuth: getSession result:', session ? 'present' : 'null');
      setAuthState({ session, user: session?.user || null, loading: false, error: null });
      if (session) {
        // If a session exists on initial load, ensure it's properly registered
        // This might be a refresh or direct navigation with an existing session
        // We should still ensure a unique session ID is used and old ones are cleaned up.
        await handleSessionCreation(session);
      } else {
        await handleSessionDeletion();
      }
    });

    return () => {
      console.log('useAuth: Unsubscribing from auth state changes.');
      subscription.unsubscribe();
    };
  }, [handleSessionCreation, handleSessionDeletion]);

  const signUp = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, error: null }));
    console.log('Attempting sign-up with:', { email, password: '***' });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setAuthState(prev => ({ ...prev, error }));
      toast.error(error.message);
      console.error('useAuth: SignUp error:', error);
      return { error };
    }
    toast.success('Signup successful! Please check your email to confirm your account.');
    return { data };
  };

  const signIn = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, error: null }));
    console.log('Attempting sign-in with:', { email, password: '***' });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthState(prev => ({ ...prev, error }));
      toast.error(error.message);
      console.error('useAuth: SignIn error:', error);
      return { error };
    }
    toast.success('Logged in successfully!');
    // Session creation is handled by onAuthStateChange listener
    return { data };
  };

  const signOut = async () => {
    setAuthState(prev => ({ ...prev, error: null }));
    try {
      console.log('Attempting Supabase signOut...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        if (error.message.includes('Auth session missing') || error.message.includes('Invalid session')) {
          console.warn('Supabase signOut: Session already missing or invalid on server. Proceeding with local logout.');
          toast.success('Logged out successfully!');
          setAuthState({ session: null, user: null, loading: false, error: null });
          await handleSessionDeletion();
          return { success: true };
        }
        setAuthState(prev => ({ ...prev, error }));
        console.error('Supabase signOut error:', error);
        toast.error(error.message);
        return { error };
      }
      console.log('Supabase signOut successful.');
      toast.success('Logged out successfully!');
      setAuthState({ session: null, user: null, loading: false, error: null });
      await handleSessionDeletion();
      return { success: true };
    } catch (e: any) {
      console.error('Unexpected error during signOut:', e);
      toast.error(e.message || 'An unexpected error occurred during logout.');
      return { error: e };
    }
  };

  const forgotPassword = async (email: string) => {
    setAuthState(prev => ({ ...prev, error: null }));
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.VITE_APP_URL}/reset-password`,
    });
    if (error) {
      setAuthState(prev => ({ ...prev, error }));
      toast.error(error.message);
      console.error('useAuth: Forgot password error:', error);
      return { error };
    }
    toast.success('Password reset email sent. Check your inbox!');
    return { success: true };
  };

  return { ...authState, signUp, signIn, signOut, forgotPassword };
}