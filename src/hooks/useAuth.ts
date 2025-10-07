import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthChangeEvent, Session, User, AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';
// Removed: import { SUPABASE_API_TIMEOUT } from '@/config'; 

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: AuthError | null;
}

export function useAuth() {
  const [authState, setAuthState] = React.useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    error: null,
  });

  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setAuthState({ session, user: session?.user || null, loading: false, error: null });
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({ session, user: session?.user || null, loading: false, error: null });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
    return { data };
  };

  const signOut = async () => {
    setAuthState(prev => ({ ...prev, error: null }));
    try {
      console.log('Attempting Supabase signOut...'); // Debug log
      const { error } = await supabase.auth.signOut();
      if (error) {
        setAuthState(prev => ({ ...prev, error }));
        console.error('Supabase signOut error:', error); // Detailed error log
        toast.error(error.message);
        return { error };
      }
      console.log('Supabase signOut successful.'); // Debug log
      toast.success('Logged out successfully!');
      // Explicitly reset auth state after successful logout
      setAuthState({ session: null, user: null, loading: false, error: null });
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