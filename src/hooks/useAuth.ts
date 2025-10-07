import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthChangeEvent, Session, User, AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { SessionService } from '@/services/SessionService'; // Import SessionService
import { MAX_CONCURRENT_SESSIONS } from '@/config'; // Import MAX_CONCURRENT_SESSIONS

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

    const currentSessionId = localStorage.getItem(SESSION_ID_KEY);
    let newSessionId = currentSessionId;

    if (!newSessionId) {
      newSessionId = crypto.randomUUID();
      localStorage.setItem(SESSION_ID_KEY, newSessionId);
    }

    // Check if this session_id is already valid for this user
    const isValid = await SessionService.isValidSession(session.user.id, newSessionId);
    if (isValid) {
      // Session already exists and is valid, no need to create a new one or delete old ones
      return;
    }

    // Delete oldest sessions if limit is exceeded
    await SessionService.deleteOldestSessions(session.user.id, MAX_CONCURRENT_SESSIONS);

    // Create a new session record
    await SessionService.createSession(session.user.id, newSessionId, session.expires_in);
  }, []);

  // Function to handle session deletion
  const handleSessionDeletion = React.useCallback(async () => {
    const currentSessionId = localStorage.getItem(SESSION_ID_KEY);
    if (currentSessionId) {
      await SessionService.deleteSession(currentSessionId);
      localStorage.removeItem(SESSION_ID_KEY);
    }
  }, []);

  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        setAuthState({ session, user: session?.user || null, loading: false, error: null });

        if (session) {
          await handleSessionCreation(session);
        } else {
          await handleSessionDeletion();
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setAuthState({ session, user: session?.user || null, loading: false, error: null });
      if (session) {
        await handleSessionCreation(session);
      } else {
        await handleSessionDeletion();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [handleSessionCreation, handleSessionDeletion]);

  const signUp = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, error: null }));
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setAuthState(prev => ({ ...prev, error }));
      toast.error(error.message);
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
      return { error };
    }
    toast.success('Logged in successfully!');
    // Session creation is handled by onAuthStateChange listener
    return { data };
  };

  const signOut = async () => {
    setAuthState(prev => ({ ...prev, error: null }));
    try {
      console.log('Attempting Supabase signOut...'); // Debug log
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        if (error.message.includes('Auth session missing') || error.message.includes('Invalid session')) {
          console.warn('Supabase signOut: Session already missing or invalid on server. Proceeding with local logout.');
          toast.success('Logged out successfully!');
          setAuthState({ session: null, user: null, loading: false, error: null });
          await handleSessionDeletion(); // Ensure local session is also cleared
          return { success: true };
        }
        setAuthState(prev => ({ ...prev, error }));
        console.error('Supabase signOut error:', error); // Detailed error log
        toast.error(error.message);
        return { error };
      }
      console.log('Supabase signOut successful.'); // Debug log
      toast.success('Logged out successfully!');
      setAuthState({ session: null, user: null, loading: false, error: null });
      await handleSessionDeletion(); // Ensure local session is also cleared
      return { success: true };
    } catch (e: any) {
      console.error('Unexpected error during signOut:', e); // Catch unexpected errors
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
      return { error };
    }
    toast.success('Password reset email sent. Check your inbox!');
    return { success: true };
  };

  return { ...authState, signUp, signIn, signOut, forgotPassword };
}