import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = React.useState<AuthState>({
    session: null,
    user: null,
    loading: true,
  });

  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setAuthState({ session, user: session?.user || null, loading: false });
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({ session, user: session?.user || null, loading: false });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast.error(error.message);
      return { error };
    }
    toast.success('Signup successful! Please check your email to confirm your account.');
    return { data };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      return { error };
    }
    toast.success('Logged in successfully!');
    return { data };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return { error };
    }
    toast.success('Logged out successfully!');
    return { success: true };
  };

  const forgotPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password', // You'll need to create this page
    });
    if (error) {
      toast.error(error.message);
      return { error };
    }
    toast.success('Password reset email sent. Check your inbox!');
    return { success: true };
  };

  return { ...authState, signUp, signIn, signOut, forgotPassword };
}